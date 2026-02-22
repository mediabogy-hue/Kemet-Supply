export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminDb } from "@/firebase/server-init";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Bosta Webhook Receiver
 * - Stores raw webhook payload for auditing
 * - Updates shipment/order status if identifiers exist
 *
 * IMPORTANT:
 * - Keep it tolerant: never crash build/runtime due to unexpected payload
 * - Always return 200 quickly to avoid retries storms
 */
export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb();

    const payload = await req.json().catch(() => ({}));
    const headersObj: Record<string, string> = {};
    req.headers.forEach((v, k) => (headersObj[k] = v));

    // 1) Save raw webhook (audit)
    await adminDb.collection("webhooks_bosta").add({
      provider: "bosta",
      receivedAt: FieldValue.serverTimestamp(),
      headers: headersObj,
      payload,
    });

    // 2) Best-effort mapping (optional)
    // Try to find identifiers commonly used:
    const shipmentId =
      payload?.shipmentId ||
      payload?.data?.shipmentId ||
      payload?.trackingNumber ||
      payload?.data?.trackingNumber ||
      payload?.code ||
      null;

    const orderId =
      payload?.orderId ||
      payload?.data?.orderId ||
      payload?.reference ||
      payload?.data?.reference ||
      null;

    const status =
      payload?.status ||
      payload?.data?.status ||
      payload?.state ||
      payload?.data?.state ||
      null;

    // Update shipment doc if exists
    if (shipmentId) {
      const ref = adminDb.collection("shipments").doc(String(shipmentId));
      await ref.set(
        {
          lastWebhookAt: FieldValue.serverTimestamp(),
          lastWebhookStatus: status ?? "unknown",
          lastWebhookPayload: payload,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Update order doc if exists
    if (orderId) {
      const ref = adminDb.collection("orders").doc(String(orderId));
      await ref.set(
        {
          shipping: {
            provider: "bosta",
            lastWebhookAt: FieldValue.serverTimestamp(),
            status: status ?? "unknown",
            shipmentId: shipmentId ? String(shipmentId) : undefined,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Important: do not fail hard. Return 200 to avoid webhook retry storms.
    return NextResponse.json({ ok: true, error: e?.message || "error" });
  }
}