import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { MdSearch, MdBusiness, MdEmail, MdPhone, MdLocationOn, MdPrint } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";

export default function Report() {
  const { user } = useAuth();
  const [passport, setPassport] = useState("");
  const [booking, setBooking] = useState(null);
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
        setBooking(snapshot.docs[0].data());
        toast.success("Booking found!");
      } else {
        setBooking(null);
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
const generatePDF = () => {
  if (!booking) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const startX = margin;
  const startY = margin;

  // Company Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("OS TRAVELS & TOURS", startX + contentWidth / 2, startY + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Your Trusted Travel Partner", startX + contentWidth / 2, startY + 16, { align: 'center' });

  // Report Title
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, startY + 22, contentWidth, 8, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("VISA BOOKING REPORT", startX + contentWidth / 2, startY + 28, { align: 'center' });

  // Compact Customer Information Table
  autoTable(doc, {
    startY: startY + 34,
    margin: { left: startX, right: startX },
    tableWidth: contentWidth,
    head: [["Field 1", "Value 1", "Field 2", "Value 2"]],
    headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
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

  doc.save(`OS_Travels_Booking_${booking.passport}_${new Date().toISOString().split('T')[0]}.pdf`);
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
      <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-4xl border border-gray-100">
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

        {/* Booking Details Card */}
        {booking && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MdBusiness className="text-2xl" />
                Customer Details
              </h3>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Personal Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Passport:</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{booking.passport}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Name:</span> <span className="font-semibold">{booking.fullName}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Visa Type:</span> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">{booking.visaType}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Country:</span> <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">{booking.country}</span></p>
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Application Details</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Date:</span> <span className="bg-gray-100 px-2 py-1 rounded">{booking.date}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Expiry:</span> <span className="bg-gray-100 px-2 py-1 rounded">{booking.expiryDate || "Not set"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Status:</span> 
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        booking.visaStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                        booking.visaStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.visaStatus}
                      </span>
                    </p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Payment:</span> 
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        booking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Financial Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Total Fee:</span> <span className="font-bold text-lg text-green-600">{booking.totalFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Received:</span> <span className="font-semibold text-blue-600">{booking.receivedFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Remaining:</span> <span className="font-semibold text-red-600">{booking.remainingFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Reference:</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{booking.embassyFee || "Not set"}</span></p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><MdEmail className="text-gray-500" /> <span className="font-medium text-gray-600">Email:</span> <span className="text-blue-600">{booking.email || "Not provided"}</span></p>
                    <p className="flex items-center gap-2"><MdPhone className="text-gray-500" /> <span className="font-medium text-gray-600">Phone:</span> <span className="font-mono">{booking.phone || "Not provided"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Remarks:</span> <span className="bg-gray-100 px-2 py-1 rounded text-sm">{booking.remarks || "No remarks"}</span></p>
                  </div>
                </div>
              </div>

              {/* PDF Download Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={generatePDF}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                >
                  <MdPrint className="text-2xl" />
                  📄 Download Professional PDF Report
                </button>
                <p className="text-sm text-gray-500 mt-2">Generated by {user.email} on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Company Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2024 OS Travels & Tours. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1"><MdLocationOn />Office # 3, Aaly Plaza, Fazal-e-Haq Road, Block E G 6/2 Blue Area, Islamabad, 44000</span>
           
          </div>
        </div>
      </div>
    </div>
    <Footer/>
    </>
  );
}
import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { MdSearch, MdBusiness, MdEmail, MdPhone, MdLocationOn, MdPrint } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";

export default function Report() {
  const { user } = useAuth();
  const [passport, setPassport] = useState("");
  const [booking, setBooking] = useState(null);
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
        setBooking(snapshot.docs[0].data());
        toast.success("Booking found!");
      } else {
        setBooking(null);
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
const generatePDF = () => {
  if (!booking) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const startX = margin;
  const startY = margin;

  // Company Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("OS TRAVELS & TOURS", startX + contentWidth / 2, startY + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Your Trusted Travel Partner", startX + contentWidth / 2, startY + 16, { align: 'center' });

  // Report Title
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, startY + 22, contentWidth, 8, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("VISA BOOKING REPORT", startX + contentWidth / 2, startY + 28, { align: 'center' });

  // Compact Customer Information Table
  autoTable(doc, {
    startY: startY + 34,
    margin: { left: startX, right: startX },
    tableWidth: contentWidth,
    head: [["Field 1", "Value 1", "Field 2", "Value 2"]],
    headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
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

  doc.save(`OS_Travels_Booking_${booking.passport}_${new Date().toISOString().split('T')[0]}.pdf`);
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
      <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-4xl border border-gray-100">
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

        {/* Booking Details Card */}
        {booking && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MdBusiness className="text-2xl" />
                Customer Details
              </h3>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Personal Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Passport:</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{booking.passport}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Name:</span> <span className="font-semibold">{booking.fullName}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Visa Type:</span> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">{booking.visaType}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Country:</span> <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">{booking.country}</span></p>
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Application Details</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Date:</span> <span className="bg-gray-100 px-2 py-1 rounded">{booking.date}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Expiry:</span> <span className="bg-gray-100 px-2 py-1 rounded">{booking.expiryDate || "Not set"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Status:</span> 
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        booking.visaStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                        booking.visaStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.visaStatus}
                      </span>
                    </p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Payment:</span> 
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        booking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Financial Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Total Fee:</span> <span className="font-bold text-lg text-green-600">{booking.totalFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Received:</span> <span className="font-semibold text-blue-600">{booking.receivedFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Remaining:</span> <span className="font-semibold text-red-600">{booking.remainingFee || "0"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Reference:</span> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{booking.embassyFee || "Not set"}</span></p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-700 text-lg mb-3 border-b border-gray-200 pb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2"><MdEmail className="text-gray-500" /> <span className="font-medium text-gray-600">Email:</span> <span className="text-blue-600">{booking.email || "Not provided"}</span></p>
                    <p className="flex items-center gap-2"><MdPhone className="text-gray-500" /> <span className="font-medium text-gray-600">Phone:</span> <span className="font-mono">{booking.phone || "Not provided"}</span></p>
                    <p className="flex items-center gap-2"><span className="font-medium text-gray-600">Remarks:</span> <span className="bg-gray-100 px-2 py-1 rounded text-sm">{booking.remarks || "No remarks"}</span></p>
                  </div>
                </div>
              </div>

              {/* PDF Download Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={generatePDF}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                >
                  <MdPrint className="text-2xl" />
                  📄 Download Professional PDF Report
                </button>
                <p className="text-sm text-gray-500 mt-2">Generated by {user.email} on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Company Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2024 OS Travels & Tours. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1"><MdLocationOn />Office # 3, Aaly Plaza, Fazal-e-Haq Road, Block E G 6/2 Blue Area, Islamabad, 44000</span>
           
          </div>
        </div>
      </div>
    </div>
    <Footer/>
    </>
  );
}
