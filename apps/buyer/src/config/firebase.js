import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDaDUuAWcl4zbWq3BEjiByyjBW-E3vM3z8",
  authDomain: "dealsworld-2a21c.firebaseapp.com",
  projectId: "dealsworld-2a21c",
  storageBucket: "dealsworld-2a21c.firebasestorage.app",
  messagingSenderId: "472465378383",
  appId: "1:472465378383:web:1b8357dd7317153518ae3a",
  measurementId: "G-SR53LJC7BF",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// From Firebase console: Authentication > Sign-in method > Google > Web SDK configuration
// (Google Sign-In must be enabled for this project before this is usable.)
export const GOOGLE_WEB_CLIENT_ID =
  "472465378383-kl2r12cj4sse31qmoao8eg5u6fcn444d.apps.googleusercontent.com";
