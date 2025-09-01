import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MdSearch, MdFilterList, MdClear } from "react-icons/md";

export default function Search() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    visaStatus: "All",
    paymentStatus: "All",
    country: "All"
  });

  // Fetch user's bookings
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Sort by date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      setAllBookings(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch your bookings");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Search and filter function
  useEffect(() => {
    if (!allBookings.length) return;

    let filtered = allBookings;

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(booking => 
        (booking.passport && booking.passport.toLowerCase().includes(term)) ||
        (booking.fullName && booking.fullName.toLowerCase().includes(term)) ||
        (booking.country && booking.country.toLowerCase().includes(term)) ||
        (booking.visaType && booking.visaType.toLowerCase().includes(term))
      );
    }

    // Apply filters
    if (filters.visaStatus !== "All") {
      filtered = filtered.filter(booking => booking.visaStatus === filters.visaStatus);
    }

    if (filters.paymentStatus !== "All") {
      filtered = filtered.filter(booking => booking.paymentStatus === filters.paymentStatus);
    }

    if (filters.country !== "All") {
      filtered = filtered.filter(booking => booking.country === filters.country);
    }

    setSearchResults(filtered);
  }, [searchTerm, filters, allBookings]);

  // Get unique countries for filter
  const uniqueCountries = [...new Set(allBookings.map(b => b.country).filter(Boolean))];

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      visaStatus: "All",
      paymentStatus: "All",
      country: "All"
    });
    setSearchTerm("");
  };

  // Show message if not logged in
  if (!user) {
  return (
      <div className="pt-20 p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to search your visa records.</p>
        </div>
    </div>
    );
  }

  return (
    <div className="pt-20 p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Search Visa Records</h1>
          <p className="text-gray-600">Find and filter your visa applications by passport number, name, country, or other criteria.</p>
          
          {/* User Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 inline-block">
            <p className="text-blue-800 text-sm">
              <strong>Logged in as:</strong> {user.email}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              You can only search through your own visa records.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search by passport number, name, country, or visa type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <MdClear />
                </button>
              )}
            </div>
            
            <button
              onClick={clearFilters}
              className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <MdClear />
              Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MdFilterList className="text-blue-500 text-xl" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visa Status</label>
              <select
                value={filters.visaStatus}
                onChange={(e) => setFilters({...filters, visaStatus: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Processing">Processing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Search Results</h3>
              <div className="text-sm text-gray-600">
                {loading ? "Loading..." : `${searchResults.length} record${searchResults.length !== 1 ? 's' : ''} found`}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="text-blue-600 animate-pulse">Loading your data...</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || Object.values(filters).some(f => f !== "All") 
                ? "No records found matching your search criteria." 
                : "No visa records found for your account."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
                  <tr>
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Passport</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Visa Type</th>
                    <th className="px-6 py-3">Country</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Fee</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3">Visa Status</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((booking, index) => (
                    <tr key={booking.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        {booking.passport || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {booking.fullName || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {booking.visaType || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {booking.country || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {booking.date || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {booking.totalFee || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booking.paymentStatus === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {booking.paymentStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          booking.visaStatus === 'Approved' 
                            ? 'bg-green-100 text-green-800'
                            : booking.visaStatus === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.visaStatus || "Processing"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {!loading && allBookings.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{allBookings.length}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {allBookings.filter(b => b.visaStatus === 'Approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {allBookings.filter(b => b.visaStatus === 'Processing').length}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {allBookings.filter(b => b.visaStatus === 'Rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



