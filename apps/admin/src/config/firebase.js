import { initializeApp } from "firebase/app";
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
export const auth = getAuth(app);
