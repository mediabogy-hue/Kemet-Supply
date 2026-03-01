import 'server-only';
import { NextResponse } from "next/server";
import { getAdminDb } from '@/firebase/server-init';
import type { Order } from '@/lib/types';
import admin from 'firebase-admin';

export async function handleGetPendingSettlements() {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error("API Error: handleGetPendingSettlements: Firebase Admin DB is not initialized. This is likely due to a missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
            return NextResponse.json({ error: "فشل الاتصال الآمن بقاعدة البيانات من الخادم. قد تكون هناك مشكلة في إعدادات الخادم." }, { status: 503 });
        }

        const ordersRef = adminDb.collection('orders');
        const snapshot = await ordersRef.where('status', '==', 'Delivered').get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const pendingSettlements: any[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.isSettled !== true) {
                const serializableOrder: any = { ...data, id: doc.id };
                for (const key in serializableOrder) {
                    if (serializableOrder[key] instanceof admin.firestore.Timestamp) {
                        serializableOrder[key] = serializableOrder[key].toDate().toISOString();
                    }
                }
                pendingSettlements.push(serializableOrder);
            }
        });
        
        pendingSettlements.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

        return NextResponse.json(pendingSettlements);

    } catch (error: any) {
        console.error('API Error: handleGetPendingSettlements:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
