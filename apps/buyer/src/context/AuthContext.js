import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, GOOGLE_WEB_CLIENT_ID } from "../config/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const register = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);
  const loginWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type !== "success") return;
    const credential = GoogleAuthProvider.credential(response.data.idToken);
    return signInWithCredential(auth, credential);
  };
  const logout = async () => {
    // Detach this device from the account's push notifications before
    // signing out - otherwise a device that switches accounts (shared/test
    // phone) keeps getting the old account's pushes, since nothing else
    // ever clears users/{uid}.expoPushToken (see usePushToken.js).
    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { expoPushToken: null },
          { merge: true },
        );
      } catch (error) {
        console.warn("Failed to clear push token on logout:", error);
      }
    }
    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
