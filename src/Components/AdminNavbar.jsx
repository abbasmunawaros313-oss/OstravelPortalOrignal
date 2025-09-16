import { useState } from "react";
import { Link } from "react-router-dom";
import { MdLogout, MdMenu, MdClose } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

function AdminNavbar() {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="backdrop-blur-lg bg-white border-b border-white/30 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to={'/adminhome'} className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center font-bold text-white shadow-lg">
            OS
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Portal Admin
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-5 justify-center items-center">
          <Link
            to={"/adminhome"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Home 🏠
          </Link>
          <Link
            to={"/admin-dashboard"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Dashboard 📊
          </Link>
          <Link
            to={"/AdminTicketBookings"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Tickets ✈️
          </Link>
          <Link
            to={"/umrahbookings"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Umrah Bookings 🕋
          </Link>
           <Link
            to={"/adminHotelDet"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
           Hotel Bookings 🏨
          </Link>
         <Link
            to={"/medicalInsurancedet"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
           Medical Insurance 🏥
          </Link>
           <Link
            to={"/customer-country"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Marketing 🚀
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-700">
            {menuOpen ? <MdClose size={28} /> : <MdMenu size={28} />}
          </button>
          <button
            onClick={logout}
            className="flex items-center bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer"
          >
            <MdLogout />
            Logout
          </button>
        </div>

        {/* Profile / Admin Icon for desktop */}
        <div className="hidden md:flex">
          <button
            onClick={logout}
            className="flex items-center bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer"
          >
            <MdLogout />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-white/20 border-b border-white/30 backdrop-blur-lg">
          <Link
            to={"/adminhome"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Home 🏠
          </Link>
          <Link
            to={"/admin-dashboard"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard 📊
          </Link>
          <Link
            to={"/AdminTicketBookings"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Tickets ✈️
          </Link>
          <Link
            to={"/umrahbookings"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Umrah Bookings 🕋
          </Link>
           <Link
            to={"/adminHotelDet"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
           Hotel Bookings 🏨
          </Link>
          <Link
            to={"/customer-country"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
            onClick={() => setMenuOpen(false)}
          >
            Marketing 🚀
          </Link>
        </div>
      )}
    </nav>
  );
}

export default AdminNavbar;
