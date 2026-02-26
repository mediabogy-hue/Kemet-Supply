
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "@/firebase/config";

// Assert that the config values are not undefined
const nonNullableConfig: FirebaseOptions = {
    apiKey: firebaseConfig.apiKey!,
    authDomain: firebaseConfig.authDomain!,
    projectId: firebaseConfig.projectId!,
    storageBucket: firebaseConfig.storageBucket!,
    messagingSenderId: firebaseConfig.messagingSenderId!,
    appId: firebaseConfig.appId!,
};

// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(nonNullableConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore with offline persistence
// Using a function to handle HMR (Hot Module Replacement) correctly
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  // This can happen in HMR if the app is already initialized.
  db = getFirestore(app);
}
export { db };
