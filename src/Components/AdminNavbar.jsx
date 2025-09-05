import { Link } from "react-router-dom";

function AdminNavbar() {
    return(
         <nav className="backdrop-blur-lg bg-white/20 border-b border-white/30 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center font-bold text-white shadow-lg">
            OS
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Portal Admin
          </span>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link
           to={"/adminhome"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Home
          </Link>
          <Link
            to={"/admin-dashboard"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
          <Link
            to={"/AdminTicketBookings"}
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Tickets
          </Link>
          <Link
            href="/umrah-bookings"
            className="text-gray-700 font-medium hover:text-blue-600 transition"
          >
            Umrah Bookings
          </Link>
        </div>

        {/* Profile / Admin Icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold cursor-pointer shadow-md">
          A
        </div>
      </div>
    </nav>
    )
}
export default AdminNavbar;
