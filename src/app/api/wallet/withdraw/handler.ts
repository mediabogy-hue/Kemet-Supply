import 'server-only';
import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/types";

export async function handleWithdraw(req: Request) {
    try {
        const { getAdminApp, getAdminDb, FieldValue } = await import("@/firebase/server-init");
        const adminApp = getAdminApp();
        const adminDb = getAdminDb();
        
        if (!adminApp || !adminDb) {
            console.error("Withdrawal failed: Firebase Admin SDK is not configured.");
            return NextResponse.json({ error: "فشل الاتصال الآمن بقاعدة البيانات من الخادم. قد تكون هناك مشكلة في إعدادات الخادم." }, { status: 503 });
        }

        const authorization = req.headers.get("Authorization");
        if (!authorization?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authorization.split("Bearer ")[1];

        const body = await req.json().catch(() => ({}));
        const amount = Number(body?.amount);
        const method = body?.method;
        const paymentIdentifier = body?.paymentIdentifier;

        if (!Number.isFinite(amount) || amount <= 0 || !method || !paymentIdentifier) {
            return NextResponse.json(
                { error: "Invalid payload: amount, method, and paymentIdentifier are required" },
                { status: 400 }
            );
        }
        
        const decodedToken = await adminApp.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }
        const userData = userDoc.data()! as UserProfile;
        const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown User';
        
        const walletRef = adminDb.doc(`wallets/${userId}`);
        const walletDoc = await walletRef.get();
        const availableBalance = walletDoc.exists() ? walletDoc.data()?.availableBalance || 0 : 0;
        
        if (amount > availableBalance) {
          return NextResponse.json({ error: "Insufficient funds." }, { status: 400 });
        }

        const batch = adminDb.batch();

        const newId = adminDb.collection('id_generator').doc().id;

        const userWithdrawalRef = adminDb.doc(`users/${userId}/withdrawalRequests/${newId}`);
        const adminWithdrawalRef = adminDb.doc(`adminWithdrawalRequests/${newId}`);

        const withdrawalData = {
          id: newId,
          userId: userId,
          userName: userName,
          amount: amount,
          method: method,
          paymentIdentifier: paymentIdentifier,
          status: "Pending",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        batch.set(userWithdrawalRef, withdrawalData);
        batch.set(adminWithdrawalRef, withdrawalData);

        batch.update(walletRef, {
          availableBalance: FieldValue.increment(-amount),
          pendingWithdrawals: FieldValue.increment(amount),
          updatedAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        return NextResponse.json({ success: true, id: newId });
      } catch (e: any) {
        console.error("Withdrawal Handler Error:", e);
        if (e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error') {
            return NextResponse.json({ error: "Authentication token is invalid." }, { status: 401 });
        }
        return NextResponse.json(
          { error: e?.message || "Server error in handler" },
          { status: 500 }
        );
      }
}
