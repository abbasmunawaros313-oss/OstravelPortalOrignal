import { useAuth } from "../context/AuthContext";
import { RiLogoutBoxRLine, RiMenu3Line, RiCloseLine } from "react-icons/ri";
import { useState } from "react";

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
              <h1 className="text-xl font-bold text-gray-800">
                <span className="text-blue-600">Os</span>
                <span className="text-gray-800">Travel</span>
                <span className="text-green-600">Portal</span>
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/bookings" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Bookings
            </a>
            <a href="/approved-visas" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Approved Visas
            </a>
            <a href="/deleted-visas" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Deleted Visas
            </a>
            <a href="/countries" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Countries
            </a>
            <a href="/search" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Search
            </a>
            <a href="/reports" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Reports
            </a>
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
            <a href="/bookings" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Bookings
            </a>
            <a href="/approved-visas" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Approved Visas
            </a>
            <a href="/deleted-visas" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Deleted Visas
            </a>
            <a href="/countries" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Countries
            </a>
            <a href="/search" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Search
            </a>
            <a href="/reports" className="text-gray-600 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
              Reports
            </a>
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