
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "@/firebase/config";

// This is the standard, robust way to initialize Firebase in a Next.js environment.
// It avoids HMR (Hot Module Replacement) issues by checking if an app is already initialized.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, auth, storage, db };
