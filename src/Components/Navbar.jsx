import { useAuth } from "../context/AuthContext";
import { RiLogoutBoxRLine, RiMenu3Line, RiCloseLine } from "react-icons/ri";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar({ userName }) {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/home">
                <h1 className="text-xl font-bold text-gray-800 cursor-pointer">
                  <span className="text-blue-600">Os</span>
                  <span className="text-gray-800">Travel</span>
                  <span className="text-green-600">Portal</span>
                </h1>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/bookings" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Bookings
            </Link>
            <Link to="/approved-visas" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
             Visa Records
            </Link>
            <Link to="/tickiting" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Ticketing
            </Link>
            <Link to="/countries" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Countries
            </Link>
            <Link to="/search" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Search
            </Link>
            <Link to="/reports" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Reports
            </Link>
          </div>

          {/* User Menu and Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-gray-700 text-sm font-medium">{userName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RiLogoutBoxRLine />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {isMenuOpen ? <RiCloseLine size={24} /> : <RiMenu3Line size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            <Link to="/bookings" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Bookings
            </Link>
            <Link to="/approved-visas" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Visa Records
            </Link>
            <Link to="/deleted-visas" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Deleted Visas
            </Link>
            <Link to="/countries" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Countries
            </Link>
            <Link to="/search" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Search
            </Link>
            <Link to="/reports" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Reports
            </Link>
            <div className="border-t pt-4 mt-4">
              <span className="text-gray-700 text-sm font-medium block px-3 py-2">{userName}</span>
              <button
                onClick={handleLogout}
                className="w-full text-left bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RiLogoutBoxRLine />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
