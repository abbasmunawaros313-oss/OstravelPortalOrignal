import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MdSearch, MdFilterList, MdClear } from "react-icons/md";

// Helper function to get the start of different time periods
const getPeriodStart = (period) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'Today':
      return start;
    case 'Yesterday':
      start.setDate(now.getDate() - 1);
      return start;
    case 'This Week':
      const day = start.getDay();
      start.setDate(now.getDate() - day);
      return start;
    case 'This Month':
      start.setDate(1);
      return start;
    default:
      return null;
  }
};

export default function Search() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    visaStatus: "All",
    paymentStatus: "All",
    country: "All",
    dateRange: "All"
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
    if (!allBookings.length) {
      setSearchResults([]);
      return;
    }

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

    if (filters.dateRange !== "All") {
      const startDate = getPeriodStart(filters.dateRange);
      if (startDate) {
        filtered = filtered.filter(booking => {
          const bookingDate = new Date(booking.date);
          return bookingDate >= startDate;
        });
      }
    }

    setSearchResults(filtered);
  }, [searchTerm, filters, allBookings]);

  // Get unique countries for filter
  const uniqueCountries = [...new Set(allBookings.map(b => b.country).filter(Boolean))];

  // Calculate financial stats
  const totalPaidEarnings = searchResults
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, booking) => sum + (parseFloat(booking.totalFee) || 0), 0);

  const pendingPayments = searchResults
    .filter(b => b.paymentStatus === 'Unpaid')
    .reduce((sum, booking) => sum + (parseFloat(booking.totalFee) || 0), 0);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      visaStatus: "All",
      paymentStatus: "All",
      country: "All",
      dateRange: "All"
    });
    setSearchTerm("");
  };

  // Show message if not logged in
  if (!user) {
    return (
      <div className="pt-20 p-6 min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center bg-gray-800/80 p-10 rounded-2xl shadow-lg backdrop-blur-md border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">Please log in to search your visa records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 p-6 min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Search Visa Records
          </h1>
          <p className="text-gray-400 text-lg">
            Find and filter your visa applications by passport, name, country, or other criteria.
          </p>
          
          {/* User Info & Quick Stats Box */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 col-span-1 sm:col-span-2 md:col-span-1">
              <p className="text-gray-300 text-sm">
                <strong>Logged in as:</strong> {user.email}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                You can only search through your own visa records.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 text-center border border-gray-700">
              <div className="text-3xl font-bold text-blue-400">{searchResults.length}</div>
              <div className="text-sm text-gray-400 mt-1">Total Bookings</div>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 text-center border border-gray-700">
              <div className="text-3xl font-bold text-green-400">{totalPaidEarnings.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-1">Total Paid Earnings</div>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 text-center border border-gray-700">
              <div className="text-3xl font-bold text-red-400">{pendingPayments.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-1">Pending Payments</div>
            </div>
          </div>
        </div>

        {/* Search Bar & Clear Button */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search by passport number, name, country, or visa type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <MdClear />
                </button>
              )}
            </div>
            
            <button
              onClick={clearFilters}
              className="w-full md:w-auto px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <MdClear />
              Clear All
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <MdFilterList className="text-2xl" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Visa Status</label>
              <select
                value={filters.visaStatus}
                onChange={(e) => setFilters({...filters, visaStatus: e.target.value})}
                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Processing">Processing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters({...filters, country: e.target.value})}
                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Dates</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-gray-800">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Search Results</h3>
              <div className="text-sm text-gray-400">
                {loading ? "Loading..." : `${searchResults.length} record${searchResults.length !== 1 ? 's' : ''} found`}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="text-blue-400 animate-pulse">Loading your data...</div>
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
                <thead className="bg-gray-800 text-gray-300">
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
                <tbody className="divide-y divide-gray-700">
                  {searchResults.map((booking, index) => (
                    <tr 
                      key={booking.id} 
                      className={`transition-colors ${
                        index % 2 === 0 ? "bg-gray-900" : "bg-gray-950"
                      } hover:bg-gray-700`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4 font-mono text-sm">{booking.passport || "-"}</td>
                      <td className="px-6 py-4 font-medium">{booking.fullName || "-"}</td>
                      <td className="px-6 py-4">{booking.visaType || "-"}</td>
                      <td className="px-6 py-4">{booking.country || "-"}</td>
                      <td className="px-6 py-4">{booking.date || "-"}</td>
                      <td className="px-6 py-4 text-gray-400">{booking.totalFee || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.paymentStatus === 'Paid' 
                            ? 'bg-green-600/20 text-green-400' 
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {booking.paymentStatus || "Unpaid"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.visaStatus === 'Approved' 
                            ? 'bg-green-600/20 text-green-400'
                            : booking.visaStatus === 'Rejected'
                            ? 'bg-red-600/20 text-red-400'
                            : 'bg-yellow-600/20 text-yellow-400'
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
        {!loading && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-blue-400">{searchResults.length}</div>
              <div className="text-sm text-gray-400 mt-1">Total Records</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-green-400">
                {searchResults.filter(b => b.visaStatus === 'Approved').length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Approved</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-yellow-400">
                {searchResults.filter(b => b.visaStatus === 'Processing').length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Processing</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-red-400">
                {searchResults.filter(b => b.visaStatus === 'Rejected').length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Rejected</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
