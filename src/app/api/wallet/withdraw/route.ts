
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminApp, getAdminDb } from "@/firebase/server-init";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
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
    
    const adminApp = getAdminApp();
    const decodedToken = await adminApp.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    const userDoc = await getAdminDb().collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const userData = userDoc.data()!;
    const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Unknown User';

    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    // Generate one ID to be used for both documents
    const newId = adminDb.collection('id_generator').doc().id;

    // 1. Create the request in the user's private subcollection
    const userWithdrawalRef = adminDb.doc(`users/${userId}/withdrawalRequests/${newId}`);
    
    // 2. Create a denormalized copy for the admin panel
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

    await batch.commit();

    return NextResponse.json({ success: true, id: newId });
  } catch (e: any) {
    console.error("Withdrawal API Error:", e);
    if (e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error') {
        return NextResponse.json({ error: "Authentication token is invalid." }, { status: 401 });
    }
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
