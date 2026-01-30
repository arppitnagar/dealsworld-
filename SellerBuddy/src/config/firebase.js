import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Uncomment if using Auth

// Replace these with your actual Firebase project settings from the Console
const firebaseConfig = {
  apiKey: "AIzaSyDaDUuAWcl4zbWq3BEjiByyjBW-E3vM3z8",
  authDomain: "dealsworld-2a21c.firebaseapp.com",
  projectId: "dealsworld-2a21c",
  storageBucket: "dealsworld-2a21c.firebasestorage.app",
  messagingSenderId: "472465378383",
  appId: "1:472465378383:web:1b8357dd7317153518ae3a",
  measurementId: "G-SR53LJC7BF",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance
export const db = getFirestore(app);
export const auth = getAuth(app); // Export auth
