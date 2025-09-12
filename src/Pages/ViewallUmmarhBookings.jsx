import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, where } from "firebase/firestore";
import { FaSpinner, FaEdit, FaSave, FaDownload, FaTimes, FaSearch } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import Footer from "../Components/Footer";
import { useAuth } from "../context/AuthContext";

function ViewallUmmarhBookings() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, "ummrahBookings"),
      where("createdByUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        profit: Number(doc.data().received) - Number(doc.data().payable),
      }));
      setBookings(data);
      setFilteredBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFilterAndSearch = () => {
    let tempBookings = [...bookings];

    // Apply date filter first
    const now = new Date();
    let startDate;

    switch (activeFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "thisWeek":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case "thisMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "thisYear":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        // No date filter, use all bookings
        break;
    }

    if (startDate) {
      tempBookings = tempBookings.filter((booking) => {
        return booking.createdAt >= startDate;
      });
    }

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      tempBookings = tempBookings.filter((booking) =>
        Object.values(booking).some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(lowerCaseSearchTerm)
        )
      );
    }

    setFilteredBookings(tempBookings);
  };

  useEffect(() => {
    handleFilterAndSearch();
  }, [activeFilter, searchTerm, bookings]);

  const totals = filteredBookings.reduce(
    (acc, booking) => {
      acc.received += Number(booking.received || 0);
      acc.payable += Number(booking.payable || 0);
      acc.profit += Number(booking.profit || 0);
      return acc;
    },
    { received: 0, payable: 0, profit: 0 }
  );

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "";
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diff = (outDate - inDate) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditData({ ...b });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...editData, [name]: value };

    if (name === "payable") {
      updated.profit = Number(updated.received || 0) - Number(value || 0);
    }

    if (name === "makkahCheckIn" || name === "makkahCheckOut") {
      updated.makkahNights = calculateNights(
        updated.makkahCheckIn,
        updated.makkahCheckOut
      );
    }

    if (name === "madinahCheckIn" || name === "madinahCheckOut") {
      updated.madinahNights = calculateNights(
        updated.madinahCheckIn,
        updated.madinahCheckOut
      );
    }

    if (name === "makkahCheckInagain" || name === "makkahCheckOutagain") {
      updated.makkahagainNights = calculateNights(
        updated.makkahCheckInagain,
        updated.makkahCheckOutagain
      );
    }
    setEditData(updated);
  };

  const saveEdit = async (id) => {
    try {
      setSaving(true);
      const docRef = doc(db, "ummrahBookings", id);
      const { ...updateFields } = editData;
      await updateDoc(docRef, updateFields);
      toast.success("Booking updated!");
      setEditingId(null);
      setEditData({});
    } catch (err) {
      toast.error("Failed to update booking");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const generateUmrahPDF = (booking) => {
    if (!booking) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const startX = margin;
    const startY = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("OS TRAVELS & TOURS", pageWidth / 2, startY + 10, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Your Trusted Umrah Partner", pageWidth / 2, startY + 16, { align: "center" });

    doc.setDrawColor(50, 50, 50);
    doc.line(margin, startY + 20, pageWidth - margin, startY + 20);

    doc.setFillColor(34, 139, 34);
    doc.rect(startX, startY + 25, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("UMRAH BOOKING REPORT", pageWidth / 2, startY + 31, { align: "center" });

    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: startY + 38,
      margin: { left: startX, right: startX },
      tableWidth: contentWidth,
      head: [["Field", "Value", "Field", "Value"]],
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      body: [
        ["Full Name", booking.fullName || "-", "Phone", booking.phone || "-"],
        ["Passport Number", booking.passportNumber || "-", "Visa Number", booking.visaNumber || "-"],
        ["Vendor", booking.vendor || "-", "Profit", `${booking.profit || 0}`],
        ["Payable", `PKR ${booking.payable || 0}`, "Received", `PKR ${booking.received || 0}`],
        ["Makkah Hotel", booking.makkahHotel || "-", "Nights", booking.makkahNights || "-"],
        ["Check In", booking.makkahCheckIn || "-", "Check Out", booking.makkahCheckOut || "-"],
        ["Madinah Hotel", booking.madinahHotel || "-", "Nights", booking.madinahNights || "-"],
        ["Check In", booking.madinahCheckIn || "-", "Check Out", booking.madinahCheckOut || "-"],
        ["2nd Makkah Hotel", booking.makkahagainhotel || "-", "Nights", booking.makkahagainNights || "-"],
        ["Check In", booking.makkahCheckInagain || "-", "Check Out", booking.makkahCheckOutagain || "-"],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    let finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Authorized by OS Travels & Tours", margin, finalY);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin, finalY, {
      align: "right",
    });

    doc.save(`Umrah_Booking_${booking.passportNumber}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const getEditInputType = (key) => {
    if (key.includes("date")) return "date";
    if (key.includes("nights") || key.includes("payable")) return "number";
    return "text";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            All Umrah Bookings 🕋
          </h1>
          <p className="text-gray-400 text-lg">
            A comprehensive list of all Umrah booking records.
          </p>
        </div>

        {/* Search Bar and Filter */}
        <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="relative flex-1 w-full">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Name, Passport, or Phone..."
                className="w-full bg-gray-800 text-white rounded-lg px-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-gray-400 hover:text-white transition-colors"
                title="Clear Search"
              >
                <FaTimes size={20} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 mr-2">Filter By:</span>
            {["all", "today", "yesterday", "thisWeek", "thisMonth", "thisYear"].map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-600 p-6 rounded-xl shadow-lg border border-green-500">
            <p className="text-sm uppercase font-semibold text-white/80">Total Received</p>
            <p className="text-3xl font-bold text-white mt-2">PKR {totals.received.toLocaleString()}</p>
          </div>
          <div className="bg-red-600 p-6 rounded-xl shadow-lg border border-red-500">
            <p className="text-sm uppercase font-semibold text-white/80">Total Payable</p>
            <p className="text-3xl font-bold text-white mt-2">PKR {totals.payable.toLocaleString()}</p>
          </div>
          <div className="bg-yellow-600 p-6 rounded-xl shadow-lg border border-yellow-500">
            <p className="text-sm uppercase font-semibold text-white/80">Total Profit</p>
            <p className="text-3xl font-bold text-white mt-2">PKR {totals.profit.toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center p-10 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-lg text-gray-400">No bookings found for the selected filter and search term.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Client Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Passport / Visa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Financials (PKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Hotels & Nights
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {filteredBookings.map((booking, index) => (
                  <tr key={booking.id} className="hover:bg-gray-800 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{booking.fullName}</div>
                      <div className="text-xs text-gray-400">{booking.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        Passport: <span className="text-white">{booking.passportNumber}</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        Visa: <span className="text-white">{booking.visaNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-green-400">Received: {booking.received}</div>
                      <div className="text-red-400">Payable: {booking.payable}</div>
                      <div className="text-yellow-400 font-bold">Profit: {booking.profit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">
                        <span className="font-semibold text-blue-400">Makkah:</span> {booking.makkahHotel} ({booking.makkahNights} nights)
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="font-semibold text-green-400">Madinah:</span> {booking.madinahHotel} ({booking.madinahNights} nights)
                      </div>
                      {booking.makkahagainhotel && (
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold text-blue-400">2nd Makkah:</span> {booking.makkahagainhotel} ({booking.makkahagainNights} nights)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(booking)}
                          className="text-blue-500 hover:text-blue-300 transition-colors"
                          title="Edit"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button
                          onClick={() => generateUmrahPDF(booking)}
                          className="text-orange-500 hover:text-orange-300 transition-colors"
                          title="Download PDF"
                        >
                          <FaDownload size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 w-full max-w-3xl relative my-8">
            <button
              onClick={cancelEdit}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Booking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(editData).map((key) =>
                key === "id" ||
                key === "createdAt" ||
                key === "createdByUid" ||
                key === "createdByEmail" ||
                key === "createdByName" ||
                key === "profit" ||
                key === "received" ? (
                  key === "received" && (
                    <div key={key} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <p className="bg-gray-800 text-gray-500 rounded-lg px-4 py-3 border border-gray-700 cursor-not-allowed">
                        {editData[key]}
                      </p>
                    </div>
                  )
                ) : (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-400 capitalize mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type={getEditInputType(key)}
                      value={editData[key] || ""}
                      onChange={handleEditChange}
                      name={key}
                      className="bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )
              )}
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={cancelEdit}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveEdit(editingId)}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default ViewallUmmarhBookings;
