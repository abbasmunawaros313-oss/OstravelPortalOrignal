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
import AdminHome from "./Pages/AdminHome";
import UmmrahBokkingDet from "./Pages/UmmrahBokkingDet";
import EmployeeRecord from "./Pages/EmployeeRecord";
import CountriesWiseDet from "./Pages/CountriesWiseDet";
import ViewallUmmarhBookings from "./Pages/ViewallUmmarhBookings";
import HotelBookings from "./Pages/HotelBookings";
import ViewAllHotelBookings from "./Pages/ViewAllhotelbookings";
import HoetlDetAdminSide from "./Pages/HoetlDetAdminSide";
import MedicalInsurence from "./Pages/MedicalInsurence";
import ViewAllMedicalBookings from "./Pages/ViewAllMedicalBookings";
import AdminSideMedicalInsurrance from "./Pages/AdminSideMedicalInsurrance";
import CustomerCountryPage from "./Pages/CustomerCountryPage";
import SendEmailPage  from "./Pages/SendEmailPage";

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
       <Route
        path="/adminhome"
        element ={
          <ProtectedRoute>
            <AdminHome />
          </ProtectedRoute>
        }
        />
        <Route
        path="/umrahbookings"
        element ={
          <ProtectedRoute>
            <UmmrahBokkingDet/>
          </ProtectedRoute>
        }
        />
      <Route
      path="employee-record"
      element = {
      <ProtectedRoute>
        <EmployeeRecord/>
      </ProtectedRoute>
      }
      />
       <Route
         path="/countrywise-det/:countryName"
         element={
           <ProtectedRoute>
             <CountriesWiseDet />
           </ProtectedRoute>
         }
      />
      <Route
        path="/adminHotelDet"
        element={
          <ProtectedRoute>
            <HoetlDetAdminSide/>
          </ProtectedRoute>
        }
      
      />
        <Route
        path="/medicalInsurancedet"
        element={
          <ProtectedRoute>
            <AdminSideMedicalInsurrance/>
          </ProtectedRoute>
        }
        />
        <Route
          path="/customer-country"
          element={
            <ProtectedRoute>
              <CustomerCountryPage />
            </ProtectedRoute>
          }
        
        />
       <Route
  path="/send-email/:country"
  element={
    <ProtectedRoute>
      <SendEmailPage />
    </ProtectedRoute>
  }
/>

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
        <Route
        path="viewAllUmmrahBookings"
        element ={
          <ProtectedRoute>
            <ViewallUmmarhBookings/>
          </ProtectedRoute>
        }
        />
        <Route
            path="/hotelbookings"
            element={
              <ProtectedRoute>
                <HotelBookings/>
              </ProtectedRoute>
            }
       />
       <Route
        path="/viewallHotelbookings"
        element={
          <ProtectedRoute>
            <ViewAllHotelBookings/>
          </ProtectedRoute>
        }
       />
       <Route
        path="/medical-insurance"
        element={
          <ProtectedRoute>
            <MedicalInsurence/>
          </ProtectedRoute>
        }
       />
       <Route
        path="/viewAllmedBookings"
        element={
          <ProtectedRoute>
            <ViewAllMedicalBookings/>
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
