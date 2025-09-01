import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Countries() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    try {
      setLoading(true);
      // Only fetch bookings for the current user
      const q = query(
        collection(db, "bookings"), 
        where("userId", "==", user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Sort by date (newest first) in memory
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB - dateA;
        });
        
        setBookings(sortedData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data ❌");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch data ❌");
      setLoading(false);
    }
  }, [user]);

  // Group bookings by country
  const groupedByCountry = bookings.reduce((acc, booking) => {
    if (!booking.country) return acc; // skip if no country
    if (!acc[booking.country]) acc[booking.country] = [];
    acc[booking.country].push(booking);
    return acc;
  }, {});

  // Show message if not logged in
  if (!user) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to view your country statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Visa Applications by Country</h1>
        
        {/* User Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            <strong>Logged in as:</strong> {user.email}
          </p>
          <p className="text-blue-600 text-xs mt-1">
            You can only see your own visa applications grouped by country.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-blue-600 animate-pulse">Loading your data...</div>
        </div>
      ) : (
        <>
          {/* Country Boxes */}
          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
            {Object.keys(groupedByCountry).length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No country data found for your account
              </div>
            ) : (
              Object.keys(groupedByCountry).map((country) => (
                <div
                  key={country}
                  onClick={() =>
                    setSelectedCountry(
                      selectedCountry === country ? null : country
                    )
                  }
                  className={`cursor-pointer rounded-xl shadow-lg p-6 text-center transition-all 
                    ${
                      selectedCountry === country
                        ? "bg-green-200 scale-105"
                        : "bg-white hover:bg-blue-50"
                    }`}
                >
                  <h2 className="text-lg font-semibold mb-2">{country}</h2>
                  <p className="text-gray-600">
                    {groupedByCountry[country].length} Applicant{groupedByCountry[country].length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Applicants for selected country */}
          {selectedCountry && (
            <div className="mt-10 bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Applicants for {selectedCountry}
                </h2>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Close
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Passport</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Visa Type</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Fee</th>
                      <th className="px-4 py-2">Payment</th>
                      <th className="px-4 py-2">Visa Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCountry[selectedCountry].map((b, index) => (
                      <tr
                        key={b.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2 font-medium text-gray-600">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 font-mono text-sm">{b.passport || "-"}</td>
                        <td className="px-4 py-2 font-medium">{b.fullName || "-"}</td>
                        <td className="px-4 py-2">{b.visaType || "-"}</td>
                        <td className="px-4 py-2">{b.date || "-"}</td>
                        <td className="px-4 py-2">{b.totalFee || "-"}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            b.paymentStatus === 'Paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {b.paymentStatus || "Unpaid"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            b.visaStatus === 'Approved' 
                              ? 'bg-green-100 text-green-800'
                              : b.visaStatus === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {b.visaStatus || "Processing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
