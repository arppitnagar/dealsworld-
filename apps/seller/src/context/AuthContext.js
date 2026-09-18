import React, { createContext, useState, useEffect, useContext } from "react";
import { auth, db, GOOGLE_WEB_CLIENT_ID } from "../config/firebase"; // Ensure your firebase config exports 'auth'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listens for login/logout changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        ensureProfile(user).catch((error) => {
          console.warn("Failed to seed seller profile:", error);
        });
      }
    });
    return unsubscribe;
  }, []);

  const ensureProfile = async (nextUser) => {
    if (!nextUser?.uid) return;
    const ref = doc(db, "users", nextUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        {
          email: nextUser.email || "",
          role: "seller",
          approvalStatus: "approved",
          status: "active",
          theme: "light",
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const data = snap.data();
    if (!data?.role) {
      await setDoc(ref, { role: "seller" }, { merge: true });
    }
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const register = async (email, password) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    if (credential?.user?.uid) {
      const ref = doc(db, "users", credential.user.uid);
      await setDoc(
        ref,
        {
          email: credential.user.email || email,
          role: "seller",
          approvalStatus: "approved",
          status: "active",
          theme: "light",
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    return credential;
  };
  const loginWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type !== "success") return;
    const credential = GoogleAuthProvider.credential(response.data.idToken);
    return signInWithCredential(auth, credential);
  };
  const logout = async () => {
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, loginWithGoogle, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
