import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB7OY5mJqooB1uZbDBVR-b6ZCNcPu-azag",
  authDomain: "eastern-burner-38chg.firebaseapp.com",
  projectId: "eastern-burner-38chg",
  storageBucket: "eastern-burner-38chg.firebasestorage.app",
  messagingSenderId: "808716905954",
  appId: "1:808716905954:web:eba2b4c87a8d58d6f41dbb"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  }, "ai-studio-courtonline-a8966e92-b486-4eea-a78a-3de4816736bc");
} catch {
  try {
    firestoreDb = getFirestore(app, "ai-studio-courtonline-a8966e92-b486-4eea-a78a-3de4816736bc");
  } catch {
    try {
      firestoreDb = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      });
    } catch {
      firestoreDb = getFirestore(app);
    }
  }
}

export const db = firestoreDb;
export default app;

