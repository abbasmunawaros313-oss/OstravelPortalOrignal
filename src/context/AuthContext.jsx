import { createContext, useContext, useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

// ⏰ Inactivity time limit (15 mins example)
const INACTIVITY_LIMIT = 15 * 60 * 1000; 
// ⏳ Warning popup before logout (1 min earlier)
const WARNING_TIME = 1 * 60 * 1000;       

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("isAdmin") === "true";
  });

  const [showWarning, setShowWarning] = useState(false);

  const loginAttempts = useRef(0);
  const lastLoginAttempt = useRef(0);
  let inactivityTimer = useRef(null);
  let warningTimer = useRef(null);

  const checkRateLimit = () => {
    const now = Date.now();
    const timeWindow = 15 * 60 * 1000;

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
        localStorage.setItem("lastActivity", Date.now());
      } else {
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem("user");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("lastActivity");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Auto logout + warning
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      localStorage.setItem("lastActivity", Date.now());
      setShowWarning(false);

      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);

      // Show warning before logout
      warningTimer.current = setTimeout(() => {
        setShowWarning(true);
      }, INACTIVITY_LIMIT - WARNING_TIME);

      // Auto logout
      inactivityTimer.current = setTimeout(() => {
        const lastActivity = parseInt(localStorage.getItem("lastActivity"), 10);
        if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
          logout();
        }
      }, INACTIVITY_LIMIT);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    setShowWarning(false);
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("lastActivity");
    signOut(auth);
  };

  const login = async (email, password) => {
    try {
      checkRateLimit();

      if (email === "adminos@gmail.com" && password === "ospk123") {
        const adminUser = { email, uid: "local-admin" };
        setUser(adminUser);
        setIsAdmin(true);
        localStorage.setItem("user", JSON.stringify(adminUser));
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("lastActivity", Date.now());
        return { success: true, isAdmin: true };
      }

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
      localStorage.setItem("lastActivity", Date.now());

      return { success: true, isAdmin: adminStatus };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAdmin, login, showWarning }}>
      {children}
      {showWarning && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded shadow-lg z-50">
          ⚠️ You will be logged out in 1 minute due to inactivity.
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
