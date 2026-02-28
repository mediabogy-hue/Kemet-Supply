import 'server-only';
import { NextResponse } from "next/server";

export async function handleBostaWebhook(req: Request) {
  try {
    const { getAdminDb, FieldValue } = await import("@/firebase/server-init");
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error("Bosta Webhook: Admin DB not configured. Skipping webhook processing.");
      return NextResponse.json({ ok: true, message: "Admin not configured, webhook ignored." });
    }

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
    console.error("Bosta Webhook Handler Error:", e);
    return NextResponse.json({ ok: true, error: e?.message || "error" });
  }
}
