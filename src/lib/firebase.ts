import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "global-history-gsjh2",
  appId: "1:838024832974:web:69809cf0a71ca5fd4aed9f",
  apiKey: "AIzaSyA5iJQdZMrCnyKdtJIlUt8-yAD4W2MGpdg",
  authDomain: "global-history-gsjh2.firebaseapp.com",
  storageBucket: "global-history-gsjh2.firebasestorage.app",
  messagingSenderId: "838024832974"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, "ai-studio-banglahelpbot-7ecbb14d-c96d-41d3-a672-48397e799d7e");
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
