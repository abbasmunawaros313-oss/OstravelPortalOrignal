import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import {
  MdSearch,
  MdBusiness,
  MdPrint,
  MdLocationOn,
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
      const q = query(
        collection(db, "bookings"),
        where("passport", "==", passport)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const results = snapshot.docs.map((doc) => doc.data());
        setBookings(results);

        if (results.length === 1) {
          setSelectedBooking(results[0]); // Auto-select if only 1
        } else {
          setSelectedBooking(null); // Require manual selection
        }

        toast.success(`${results.length} booking(s) found!`);
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
        ["Reference", booking.reference || "-", "Embassy Fee", booking.embassyFee || "-"],
        ["Payment Status", booking.paymentStatus || "-", "Email", booking.email || "-"],
        ["Phone", booking.phone || "-", "Remarks", booking.remarks || "No remarks"],
       
        ["Vendor Fee", booking.vendorFee || "-", "VendorContact", booking.vendorContact || "-"],
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

  // If not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="bg-gray-800 p-12 rounded-3xl shadow-2xl text-center border border-gray-700 animate-fadeIn">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Access Denied
          </h2>
          <p className="text-lg text-gray-400">
            Please log in to access the reports section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center bg-gray-950 text-gray-100 p-8">
        <div className="bg-gray-900 shadow-2xl rounded-3xl p-8 w-full max-w-5xl border border-gray-800 animate-fadeIn" style={{ animationDelay: '0s' }}>
          {/* Header Section */}
          <div className="text-center mb-10 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full mb-4 shadow-lg">
              <MdBusiness className="text-white text-3xl" />
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
              OS Travels & Tours
            </h1>
            <p className="text-gray-400 text-xl font-light">
              Visa Booking Report System
            </p>
            <div className="mt-6 text-sm text-gray-400 bg-gray-800 px-5 py-2 rounded-full inline-block border border-gray-700">
              Logged in as:{" "}
              <span className="font-semibold text-purple-400">{user.email}</span>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 mb-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-2xl font-semibold text-gray-200 mb-5 flex items-center gap-3">
              <MdSearch className="text-purple-400" /> Search Booking Report
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Enter Passport Number"
                value={passport}
                onChange={(e) => setPassport(e.target.value)}
                className="flex-1 px-5 py-3 bg-gray-900 text-gray-200 placeholder-gray-500 rounded-xl shadow-inner border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-300"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <div className="mb-8 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
              <h3 className="text-xl font-semibold text-gray-200 mb-4">
                Select Booking
              </h3>
              <ul className="space-y-3">
                {bookings.map((b, idx) => (
                  <li
                    key={idx}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedBooking?.passport === b.passport &&
                      selectedBooking?.country === b.country
                        ? "border-purple-500 bg-gray-800 shadow-lg"
                        : "border-gray-700 bg-gray-800 hover:bg-gray-700 hover:border-purple-500"
                    }`}
                    style={{ animation: `fadeIn 0.3s ease-out forwards`, animationDelay: `${0.6 + idx * 0.1}s` }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <span className="text-gray-300">
                        <strong className="text-white">{b.fullName}</strong>{" "}
                        ({b.passport}) -{" "}
                        <span className="text-purple-400 font-medium">
                          {b.country}
                        </span>
                      </span>
                      <span className="text-sm text-gray-500 mt-2 sm:mt-0">
                        {b.date}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Booking Details */}
          {selectedBooking && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-5">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <MdBusiness className="text-3xl" />
                  Customer Details
                </h3>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-300 text-lg mb-4 border-b border-gray-700 pb-2">
                      Personal Information
                    </h4>
                    <div className="space-y-2 text-gray-400">
                      <p>
                        <b>Passport:</b>{" "}
                        <span className="text-white">{selectedBooking.passport}</span>
                      </p>
                      <p>
                        <b>Name:</b>{" "}
                        <span className="text-white">{selectedBooking.fullName}</span>
                      </p>
                      <p>
                        <b>Visa Type:</b>{" "}
                        <span className="text-white">{selectedBooking.visaType}</span>
                      </p>
                      <p>
                        <b>Country:</b>{" "}
                        <span className="text-white">{selectedBooking.country}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300 text-lg mb-4 border-b border-gray-700 pb-2">
                      Application Details
                    </h4>
                    <div className="space-y-2 text-gray-400">
                      <p>
                        <b>Date:</b>{" "}
                        <span className="text-white">{selectedBooking.date}</span>
                      </p>
                      <p>
                        <b>Expiry:</b>{" "}
                        <span className="text-white">
                          {selectedBooking.expiryDate || "Not set"}
                        </span>
                      </p>
                      <p>
                        <b>Status:</b>{" "}
                        <span className="text-white">{selectedBooking.visaStatus}</span>
                      </p>
                      <p>
                        <b>Payment:</b>{" "}
                        <span className="text-white">
                          {selectedBooking.paymentStatus}
                        </span>
                      </p>
                      <p>
                        <b>Vendor:</b>{" "}
                        <span className="text-white">{selectedBooking.vendor || "-"}</span>
                      </p>
                      <p>
                        <b>Vendor Contact:</b>{" "}
                        <span className="text-white">
                          {selectedBooking.vendorContact || "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => generatePDF(selectedBooking)}
                    className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <MdPrint className="text-2xl" />
                    Download PDF Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Company Footer */}
          <div className="mt-12 text-center text-gray-600 text-sm animate-fadeIn" style={{ animationDelay: '1s' }}>
            <p className="mb-2">
              © 2025{" "}
              <span className="text-purple-400 font-semibold">
                OS Travels & Tours
              </span>
              . All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-4 text-gray-500">
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
