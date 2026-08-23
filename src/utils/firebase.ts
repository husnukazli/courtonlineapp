import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDSW8V5HOhu1Tm_n1hqxnkMENLbhzXICew",
  authDomain: "courtonline-7b325.firebaseapp.com",
  projectId: "courtonline-7b325",
  storageBucket: "courtonline-7b325.firebasestorage.app",
  messagingSenderId: "330459246212",
  appId: "1:330459246212:web:a98cae58cf114c8ea19cd1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export default app;
