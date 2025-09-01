import { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Track login attempts (rate limiting)
  const loginAttempts = useRef(0);
  const lastLoginAttempt = useRef(0);

  const checkRateLimit = () => {
    const now = Date.now();
    const timeWindow = 15 * 60 * 1000; // 15 minutes

    if (now - lastLoginAttempt.current > timeWindow) {
      loginAttempts.current = 0;
    }

    if (loginAttempts.current >= 5) {
      const remainingTime = Math.ceil(
        (timeWindow - (now - lastLoginAttempt.current)) / 1000 / 60
      );
      throw new Error(
        `Too many login attempts. Please try again in ${remainingTime} minutes.`
      );
    }

    loginAttempts.current++;
    lastLoginAttempt.current = now;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);

      if (firebaseUser) {
        try {
          // Check Firestore for admin role
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            setIsAdmin(true);
          } else {
            // Fallback: check env admin
            if (firebaseUser.email === import.meta.env.VITE_ADMIN_EMAIL) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    signOut(auth);
  };

  const loginAsAdmin = async (email, password) => {
    try {
      checkRateLimit();

      // ✅ Hardcoded admin login bypass (no Firebase needed)
      if (email === "adminos@gmail.com" && password === "ospk123") {
        setUser({ email, uid: "local-admin" });
        setIsAdmin(true);
        return { success: true };
      }

      // ✅ Otherwise use Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check Firestore role
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
          return { success: true };
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }

      // Fallback: env admin email
      if (userCredential.user.email === import.meta.env.VITE_ADMIN_EMAIL) {
        setIsAdmin(true);
        return { success: true };
      } else {
        return { success: false, error: "Not authorized as admin" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAdmin, loginAsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
