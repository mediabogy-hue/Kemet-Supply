import 'server-only';
import { NextResponse } from "next/server";
import type { Order, Wallet } from '@/lib/types';
import admin from 'firebase-admin';

async function safelyIncrementWallet(
    transaction: admin.firestore.Transaction,
    db: admin.firestore.Firestore,
    userId: string,
    amount: number
): Promise<void> {
    if (typeof userId !== 'string' || userId.trim() === '' || !Number.isFinite(amount)) {
        return;
    }

    const walletRef = db.collection('wallets').doc(userId);
    const walletDoc = await transaction.get(walletRef);

    if (walletDoc.exists) {
        const currentData = walletDoc.data() as Wallet;
        const currentBalance = Number(currentData.availableBalance || 0);

        if (isNaN(currentBalance)) {
             // If balance is not a number, overwrite it instead of incrementing.
            transaction.update(walletRef, {
                availableBalance: amount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
             transaction.update(walletRef, {
                availableBalance: admin.firestore.FieldValue.increment(amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    } else {
        // Create a full, valid wallet object if it doesn't exist.
        transaction.set(walletRef, {
            id: userId,
            availableBalance: amount,
            pendingBalance: 0,
            pendingWithdrawals: 0,
            totalWithdrawn: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
}


export async function handleSettleOrder(req: Request) {
    try {
        const { getAdminApp, getAdminDb, FieldValue } = await import("@/firebase/server-init");
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
            
        if (!adminApp || !adminDb) {
            console.error("API Error in handleSettleOrder: Firebase Admin DB is not initialized. This is likely due to a missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
            return NextResponse.json({ error: "فشل الاتصال الآمن بقاعدة البيانات من الخادم. قد تكون هناك مشكلة في إعدادات الخادم." }, { status: 503 });
        }

        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];
        const decodedToken = await adminApp.auth().verifyIdToken(idToken);
        
        const userProfileDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userProfileDoc.exists) {
             return NextResponse.json({ error: "Unauthorized: User profile not found." }, { status: 403 });
        }
        const userRole = userProfileDoc.data()?.role;
        if (userRole !== 'Admin' && userRole !== 'FinanceManager') {
            return NextResponse.json({ error: "Unauthorized: Insufficient permissions." }, { status: 403 });
        }

        const { orderId } = await req.json();
        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ error: "Invalid payload: orderId is required." }, { status: 400 });
        }
        
        await adminDb.runTransaction(async (transaction) => {
            const orderRef = adminDb.collection('orders').doc(orderId);
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists()) {
                throw new Error(`Order ${orderId} not found.`);
            }
            
            const orderData = orderDoc.data() as Order;

            if (orderData.isSettled === true) {
                return;
            }

            if (orderData.status !== 'Delivered') {
                throw new Error(`Order ${orderId} is not in 'Delivered' state.`);
            }

            const dropshipperId = orderData.dropshipperId;
            const dropshipperCommission = Number(orderData.totalCommission || 0);
            
            const merchantId = orderData.merchantId;
            const orderTotalAmount = Number(orderData.totalAmount || 0);
            const orderPlatformFee = Number(orderData.platformFee || 0);
            const merchantProfit = orderTotalAmount - dropshipperCommission - orderPlatformFee;

            if (dropshipperId && dropshipperCommission > 0) {
                await safelyIncrementWallet(transaction, adminDb, dropshipperId, dropshipperCommission);
            }

            if (merchantId && merchantProfit > 0) {
              await safelyIncrementWallet(transaction, adminDb, merchantId, merchantProfit);
            }
            
            transaction.update(orderRef, { isSettled: true, updatedAt: FieldValue.serverTimestamp() });
        });

        return NextResponse.json({ success: true, message: `Order ${orderId} settled successfully.` });

    } catch (e: any) {
        console.error(`FATAL: API settlement failed for order:`, e);
        return NextResponse.json(
          { error: e?.message || "An unknown server error occurred during settlement." },
          { status: 500 }
        );
    }
}
