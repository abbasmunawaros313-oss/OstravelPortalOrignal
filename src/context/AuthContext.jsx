import { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

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
      if (firebaseUser) {
        const userData = {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        };

        let role = "employee"; // default
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            role = userDoc.data().role || "employee";
          }
        } catch (err) {
          console.error("Error fetching role:", err);
        }

        const adminStatus = role === "admin";
        setUser(userData);
        setIsAdmin(adminStatus);

        // ✅ persist
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("isAdmin", adminStatus ? "true" : "false");
      } else {
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem("user");
        localStorage.removeItem("isAdmin");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    signOut(auth);
  };

  // ✅ Unified login
  const login = async (email, password) => {
    try {
      checkRateLimit();

      // Hardcoded admin bypass (optional)
      if (email === "adminos@gmail.com" && password === "ospk123") {
        const adminUser = { email, uid: "local-admin" };
        setUser(adminUser);
        setIsAdmin(true);
        localStorage.setItem("user", JSON.stringify(adminUser));
        localStorage.setItem("isAdmin", "true");
        return { success: true, isAdmin: true };
      }

      // Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;
      const userData = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
      };

      let role = "employee";
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          role = userDoc.data().role || "employee";
        }
      } catch (err) {
        console.error("Error fetching role:", err);
      }

      const adminStatus = role === "admin";
      setUser(userData);
      setIsAdmin(adminStatus);

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("isAdmin", adminStatus ? "true" : "false");

      return { success: true, isAdmin: adminStatus };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAdmin, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
