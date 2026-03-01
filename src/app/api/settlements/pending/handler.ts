import 'server-only';
import { NextResponse } from "next/server";
import { getAdminDb } from '@/firebase/server-init';
import type { Order } from '@/lib/types';
import admin from 'firebase-admin';

export async function handleGetPendingSettlements() {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            throw new Error("Firebase Admin DB is not initialized.");
        }

        const ordersRef = adminDb.collection('orders');
        const snapshot = await ordersRef.where('status', '==', 'Delivered').get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const pendingSettlements: Partial<Order>[] = [];

        snapshot.forEach(doc => {
            try {
                const data = doc.data();
                if (data.isSettled === true) {
                    return; 
                }

                if (!data.id || !data.createdAt?.toDate) {
                    console.warn(`Skipping malformed order document: ${doc.id}`);
                    return;
                }
                
                const serializableOrder: any = { ...data, id: doc.id };
                
                for (const key in serializableOrder) {
                    if (serializableOrder[key] instanceof admin.firestore.Timestamp) {
                        serializableOrder[key] = serializableOrder[key].toDate().toISOString();
                    }
                }

                pendingSettlements.push(serializableOrder);
            } catch (e: any) {
                console.error(`Error processing order document ${doc.id}:`, e.message);
            }
        });
        
        pendingSettlements.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

        return NextResponse.json(pendingSettlements);

    } catch (error: any) {
        console.error('API Error: handleGetPendingSettlements:', error);
        return NextResponse.json({ error: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
