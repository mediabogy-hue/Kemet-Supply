
import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/types";

// Next.js route segment config
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    // Dynamically import server-only modules ONLY at runtime inside the function.
    // This prevents the Next.js build process from crashing during static analysis.
    const { getAdminApp, getAdminDb } = await import("@/firebase/server-init");
    const { FieldValue } = await import("firebase-admin/firestore");

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
    const adminDb = getAdminDb();
    
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
