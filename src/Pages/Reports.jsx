import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import {
  MdSearch,
  MdBusiness,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdPrint,
} from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";

export default function Report() {
  const { user } = useAuth();
  const [passport, setPassport] = useState("");
  const [bookings, setBookings] = useState([]); // multiple results
  const [selectedBooking, setSelectedBooking] = useState(null); // one booking
  const [loading, setLoading] = useState(false);

  // 🔎 Search Booking
  const handleSearch = async () => {
    if (!passport) {
      toast.error("Enter a passport number");
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("passport", "==", passport));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const results = snapshot.docs.map((doc) => doc.data());
        setBookings(results);
        setSelectedBooking(null);
        toast.success(`${results.length} booking(s) found! Select one.`);
      } else {
        setBookings([]);
        setSelectedBooking(null);
        toast.error("No booking found");
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Error fetching booking");
    } finally {
      setLoading(false);
    }
  };

  // 📄 Generate PDF
  const generatePDF = (booking) => {
    if (!booking) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const startX = margin;
    const startY = margin;

    // Company Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      "OS TRAVELS & TOURS",
      startX + contentWidth / 2,
      startY + 10,
      { align: "center" }
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Your Trusted Travel Partner",
      startX + contentWidth / 2,
      startY + 16,
      { align: "center" }
    );

    // Report Title
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, startY + 22, contentWidth, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(
      "VISA BOOKING REPORT",
      startX + contentWidth / 2,
      startY + 28,
      { align: "center" }
    );

    // Table
    autoTable(doc, {
      startY: startY + 34,
      margin: { left: startX, right: startX },
      tableWidth: contentWidth,
      head: [["Field 1", "Value 1", "Field 2", "Value 2"]],
      headStyles: {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      body: [
        ["Passport Number", booking.passport || "-", "Full Name", booking.fullName || "-"],
        ["Visa Type", booking.visaType || "-", "Application Date", booking.date || "-"],
        ["Expiry Date", booking.expiryDate || "-", "Sent To Embassy", booking.sentToEmbassy || "-"],
        ["Received From Embassy", booking.receivedFromEmbassy || "-", "Country", booking.country || "-"],
        ["Visa Status", booking.visaStatus || "-", "Total Fee", `${booking.totalFee || "0"}`],
        ["Received Fee", `${booking.receivedFee || "0"}`, "Remaining Fee", `${booking.remainingFee || "0"}`],
        ["Payment Status", booking.paymentStatus || "-", "Email", booking.email || "-"],
        ["Phone", booking.phone || "-", "Remarks", booking.remarks || "No remarks"],
      ],
      styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    doc.save(
      `OS_Travels_Booking_${booking.passport}_${booking.country}_${new Date()
        .toISOString()
        .split("T")[0]}.pdf`
    );
  };

  // Show message if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-3xl border border-gray-100 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to access the reports section.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-5xl border border-gray-100">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mb-4">
              <MdBusiness className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">OS Travels & Tours</h1>
            <p className="text-gray-600 text-lg">Visa Booking Report System</p>
            <div className="mt-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full inline-block">
              Logged in as: <span className="font-semibold text-blue-600">{user.email}</span>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border border-blue-100 mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MdSearch className="text-blue-500" /> Search Booking Report
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Passport Number"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <MdSearch className="text-lg" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Multiple Results */}
          {bookings.length > 1 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select Booking</h3>
              <ul className="space-y-2">
                {bookings.map((b, idx) => (
                  <li
                    key={idx}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      selectedBooking?.passport === b.passport &&
                      selectedBooking?.country === b.country
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        <strong>{b.fullName}</strong> ({b.passport}) -{" "}
                        <span className="text-blue-600">{b.country}</span>
                      </span>
                      <span className="text-sm text-gray-500">{b.date}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Booking Details */}
          {selectedBooking && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MdBusiness className="text-2xl" />
                  Customer Details
                </h3>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Personal Information</h4>
                    <p><b>Passport:</b> {selectedBooking.passport}</p>
                    <p><b>Name:</b> {selectedBooking.fullName}</p>
                    <p><b>Visa Type:</b> {selectedBooking.visaType}</p>
                    <p><b>Country:</b> {selectedBooking.country}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b pb-2">Application Details</h4>
                    <p><b>Date:</b> {selectedBooking.date}</p>
                    <p><b>Expiry:</b> {selectedBooking.expiryDate || "Not set"}</p>
                    <p><b>Status:</b> {selectedBooking.visaStatus}</p>
                    <p><b>Payment:</b> {selectedBooking.paymentStatus}</p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => generatePDF(selectedBooking)}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl"
                  >
                    <MdPrint className="text-2xl" />
                    Download PDF Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Company Footer */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>© 2024 OS Travels & Tours. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <MdLocationOn />
                Office # 3, Aaly Plaza, Blue Area, Islamabad, 44000
              </span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
