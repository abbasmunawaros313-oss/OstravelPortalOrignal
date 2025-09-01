import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./Authentication/Login";
import Bookings from "./Pages/Bookings";
import ApprovedVisas from "./Pages/ApprovedVisas";
import DeletedVisas from "./Pages/DeletedVisas";
import Countries from "./Pages/Countries";
import Search from "./Pages/Search";
import Reports from "./Pages/Reports";
import AdminLogin from "./Pages/AdminLogin";
import AdminDashboard from "./Pages/AdminDashboard";
import Navbar from "./Components/Navbar";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/" element={<Navigate to="/admin-dashboard" />} />
        {/* ✅ fallback when logged out or wrong route */}
        <Route path="*" element={<Navigate to="/admin-login" />} />
      </Routes>
    );
  }

  // Regular user routes
  return (
    <>
      {user && <Navbar userName={user.email} />}
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/bookings" />}
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <Bookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approved-visas"
          element={
            <ProtectedRoute>
              <ApprovedVisas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deleted-visas"
          element={
            <ProtectedRoute>
              <DeletedVisas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/countries"
          element={
            <ProtectedRoute>
              <Countries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route
          path="/"
          element={user ? <Navigate to="/bookings" /> : <Navigate to="/login" />}
        />
        {/* ✅ fallback when logged out */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
