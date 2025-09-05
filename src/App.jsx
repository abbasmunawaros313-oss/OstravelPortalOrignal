import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./Authentication/Login";
import Bookings from "./Pages/Bookings";
import ApprovedVisas from "./Pages/ApprovedVisas";
import DeletedVisas from "./Pages/DeletedVisas"
import Countries from "./Pages/Countries";
import Search from "./Pages/Search";
import Reports from "./Pages/Reports";
import AdminLogin from "./Pages/AdminLogin";
import AdminDashboard from "./Pages/AdminDashboard";
import Navbar from "./Components/Navbar";
import Home from "./Pages/Home";
import Ticketing from "./Pages/Ticketing";
import Viewall from "./Pages/Viewall";
import AdminTicketBookings from "./Pages/AdminTicketBookings";
import UmmrahBookings from "./Pages/UmmrahBookings";
// 🔒 Protected Route
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

// 🟢 Admin Routes
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/AdminTicketBookings" element={<AdminTicketBookings/>}/>
      {/* ✅ fallback for admin */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}

// 🔵 User Routes
function UserRoutes({ user }) {
  return (
    <>
      {user && <Navbar userName={user.email} />}
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/home" />}
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
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
        <Route
          path="/tickiting"
          element ={
            <ProtectedRoute>

              <Ticketing/>
            </ProtectedRoute>
          }
        />
        <Route
         path="/viewall"
         element={
          <ProtectedRoute>
            <Viewall/>
          </ProtectedRoute>
         }
        />
        <Route
        path="/adminTicketDashboard"
        element ={
          <ProtectedRoute>
            <AdminTicketBookings/>
          </ProtectedRoute>
        }
        />
          <Route
        path="/umrahbookings"
        element ={
          <ProtectedRoute>
            <UmmrahBookings/>
          </ProtectedRoute>
        }
        />
        {/* ✅ fallback for users */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>
    </>
  );
}

// 🔗 Main App Content
function AppContent() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) return <AdminRoutes />;
  return <UserRoutes user={user} />;
}

// 🚀 Root App
function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
