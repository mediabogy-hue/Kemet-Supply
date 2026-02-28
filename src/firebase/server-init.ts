import "server-only";
import admin from "firebase-admin";

export const FieldValue = admin.firestore.FieldValue;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    const sa = JSON.parse(raw);
    if (sa.private_key && sa.private_key.includes("\\n")) {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }
    return sa;
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e);
    return null;
  }
}

/**
 * ✅ Lazy init: لا تعمل initialize وقت الاستيراد.
 * يتم الاستدعاء فقط داخل API routes / server actions.
 */
export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const sa = loadServiceAccount();
  if (!sa) {
    console.error("CRITICAL: Missing or invalid FIREBASE_SERVICE_ACCOUNT_KEY. Server-side admin features will be disabled.");
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  });
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) return null;
  return app.firestore();
}
