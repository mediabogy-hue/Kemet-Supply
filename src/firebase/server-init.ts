import "server-only";
import admin from "firebase-admin";

export const FieldValue = admin.firestore.FieldValue;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  const sa = JSON.parse(raw);

  // Important: keep multiline key valid
  if (sa.private_key && sa.private_key.includes("\\n")) {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }

  return sa;
}

/**
 * ✅ Lazy init: لا تعمل initialize وقت الاستيراد.
 * يتم الاستدعاء فقط داخل API routes / server actions.
 */
export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const sa = loadServiceAccount();
  if (!sa) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
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
  return getAdminApp().firestore();
}
