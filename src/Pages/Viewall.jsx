import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MdSearch, MdClear, MdDownload, MdEdit, MdSave } from "react-icons/md";
import Footer from "../Components/Footer";
import toast from "react-hot-toast";

const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "First"];
const BOOKING_STATUS = ["Booked", "Approved", "Cancelled"];

export default function Viewall() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [searchRef, setSearchRef] = useState("");
  const [searchId, setSearchId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("alltime");

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  // 🔹 Fetch all bookings in real time for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "ticketBookings"),
      where("createdByUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(arr);
    });
    return () => unsub();
  }, [user]);

  // 🔹 Filter bookings based on selected time range
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return bookings.filter((booking) => {
      const bookingDate = booking.createdAt?.toDate();
      if (!bookingDate) return false;

      switch (filter) {
        case "today":
          return bookingDate >= today;
        case "last7days":
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return bookingDate >= sevenDaysAgo;
        case "thismonth":
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return bookingDate >= startOfMonth;
        case "alltime":
        default:
          return true;
      }
    });
  }, [bookings, filter]);

  // 🔹 Search bookings
  const doSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    let arr = [];

    if (searchRef) {
      const q = query(
        collection(db, "ticketBookings"),
        where("pnr", "==", searchRef.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      const searchByRef = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr = arr.concat(searchByRef);
    }

    if (searchId) {
      const q1 = query(
        collection(db, "ticketBookings"),
        where("passenger.passport", "==", searchId.trim())
      );
      const snap1 = await getDocs(q1);
      const searchByPassport = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr = arr.concat(searchByPassport);

      const q2 = query(
        collection(db, "ticketBookings"),
        where("passenger.cnic", "==", searchId.trim())
      );
      const snap2 = await getDocs(q2);
      const searchByCnic = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr = arr.concat(searchByCnic);
    }

    // Remove duplicates based on ID and filter by date range
    const unique = arr.reduce((acc, cur) => {
      acc[cur.id] = cur;
      return acc;
    }, {});

    const uniqueArr = Object.values(unique);

    const filteredAndSearched = uniqueArr.filter((booking) => {
      const bookingDate = booking.createdAt?.toDate();
      if (!bookingDate) return false;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filter) {
        case "today":
          return bookingDate >= today;
        case "last7days":
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return bookingDate >= sevenDaysAgo;
        case "thismonth":
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return bookingDate >= startOfMonth;
        case "alltime":
        default:
          return true;
      }
    });

    setResults(filteredAndSearched);
    setLoading(false);
  };

  // 📄 Download PDF
  const downloadPDF = (data, filename, title) => {
    const doc = new jsPDF();
    doc.setFontSize(14).text(title, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["PNR", "Route", "Dates", "Pax", "Class", "Passenger", "Price", "Payable", "Profit", "Status", "Added By"]],
      body: data.map((r) => [
        r.pnr,
        `${r.from} → ${r.to}`,
        r.returnDate ? `${r.departure} • ${r.returnDate}` : r.departure,
        r.totalPax,
        r.travelClass,
        `${r.passenger?.fullName}\n${r.passenger?.passport} | ${r.passenger?.cnic} | ${r.passenger?.phone}`,
        r.price,
        r.payable,
        r.profit,
        r.status,
        r.createdByEmail,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`${filename}.pdf`);
  };

  // 📊 Download CSV
  const downloadCSV = (data, filename) => {
    const headers = [
      "PNR,Route,Dates,Pax,Class,Passenger,Price,Payable,Profit,Status,Added By",
    ];
    const rows = data.map((r) =>
      [
        r.pnr,
        `${r.from} → ${r.to}`,
        r.returnDate ? `${r.departure} • ${r.returnDate}` : r.departure,
        r.totalPax,
        r.travelClass,
        `"${r.passenger?.fullName} (${r.passenger?.passport} | ${r.passenger?.cnic} | ${r.passenger?.phone})"`,
        r.price,
        r.payable,
        r.profit,
        r.status,
        r.createdByEmail,
      ].join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Edit Button Click
  const handleEdit = (booking) => {
    setEditingId(booking.id);
    setFormData(booking);
  };

  // Handle Form Field Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle Save Button Click
  const handleSave = async () => {
    setLoading(true);
    try {
      const bookingRef = doc(db, "ticketBookings", editingId);
      await updateDoc(bookingRef, {
        pnr: formData.pnr,
        from: formData.from,
        to: formData.to,
        departure: formData.departure,
        returnDate: formData.returnDate,
        totalPax: formData.totalPax,
        travelClass: formData.travelClass,
        airlinePref: formData.airlinePref,
        promo: formData.promo,
        status: formData.status,
        vendor: formData.vendor,
        note: formData.note,
        passenger: {
          fullName: formData.passenger?.fullName,
          passport: formData.passenger?.passport,
          cnic: formData.passenger?.cnic,
          phone: formData.passenger?.phone,
          email: formData.passenger?.email,
        },
      });
      toast.success("Booking updated successfully!");
      setEditingId(null);
    } catch (error) {
      console.error("Error updating document: ", error);
      toast.error("Failed to update booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="pt-20 p-6 min-h-screen bg-gray-950 text-gray-200">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              All Booked Tickets 📜
            </h1>
            <p className="text-gray-400 text-lg">
              Search or view all your flight booking records.
            </p>
          </div>

          {/* Search & Filter Section */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Find a Booking
            </h2>
            <form onSubmit={doSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <label htmlFor="filter" className="block text-sm font-medium text-gray-400 mb-2">
                  Filter by
                </label>
                <select
                  id="filter"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    if (results.length > 0) {
                      setResults([]);
                    }
                  }}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                >
                  <option value="today">Today</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="thismonth">This Month</option>
                  <option value="alltime">All Time</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label htmlFor="pnr-search" className="block text-sm font-medium text-gray-400 mb-2">
                  Search by PNR
                </label>
                <input
                  id="pnr-search"
                  type="text"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="e.g. OS-XYZ123"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                />
              </div>
              <div className="md:col-span-1">
                <label htmlFor="id-search" className="block text-sm font-medium text-gray-400 mb-2">
                  Search by ID
                </label>
                <input
                  id="id-search"
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Passport / CNIC"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                />
              </div>
              <div className="flex gap-4 md:col-span-1 mt-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  <MdSearch className="inline-block mr-2 text-xl" />
                  {loading ? "Searching..." : "Search"}
                </button>
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setResults([]);
                      setSearchRef("");
                      setSearchId("");
                    }}
                    className="p-3 bg-gray-700 text-gray-400 rounded-xl hover:bg-gray-600 transition-colors"
                    title="Clear Results"
                  >
                    <MdClear size={24} />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Total Bookings Count */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <h1 className="text-3xl font-extrabold text-white">
              {results.length > 0 ? results.length : filteredBookings.length}
              <span className="text-gray-400 text-base ml-2">Total Bookings</span>
            </h1>
          </div>

          {/* Bookings Table */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <h2 className="text-xl font-bold text-white">
                {results.length > 0 ? "Search Results" : "All Bookings"}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadPDF(results.length > 0 ? results : filteredBookings, "ticket_bookings", "Ticket Bookings")}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <MdDownload className="inline-block mr-1" />
                  PDF
                </button>
                <button
                  onClick={() => downloadCSV(results.length > 0 ? results : filteredBookings, "ticket_bookings")}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
                >
                  <MdDownload className="inline-block mr-1" />
                  CSV
                </button>
              </div>
            </div>

            {(results.length > 0 ? results : filteredBookings).length === 0 ? (
              <div className="text-gray-500 text-sm py-4 px-2">No bookings found for the selected criteria.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr className="text-left text-gray-400">
                      <th className="py-3 px-4 font-semibold">#</th>
                      <th className="py-3 px-4 font-semibold">PNR</th>
                      <th className="py-3 px-4 font-semibold">Route</th>
                      <th className="py-3 px-4 font-semibold">Dates</th>
                      <th className="py-3 px-4 font-semibold">Pax</th>
                      <th className="py-3 px-4 font-semibold">Class</th>
                      <th className="py-3 px-4 font-semibold">Passenger</th>
                      <th className="py-3 px-4 font-semibold">Price</th>
                      <th className="py-3 px-4 font-semibold">Payable</th>
                      <th className="py-3 px-4 font-semibold">Profit</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Added By</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(results.length > 0 ? results : filteredBookings).map((b, index) => (
                      <tr key={b.id} className="bg-gray-900 transition-colors hover:bg-gray-800">
                        {editingId === b.id ? (
                          <>
                            {/* Editable Row */}
                            <td className="py-2 px-4">{index + 1}</td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="pnr"
                                value={formData.pnr}
                                onChange={handleChange}
                                className="w-28 bg-gray-700 text-white rounded px-2 py-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="from"
                                value={formData.from}
                                onChange={handleChange}
                                className="w-20 bg-gray-700 text-white rounded px-2 py-1"
                              />
                              <span className="mx-1">→</span>
                              <input
                                type="text"
                                name="to"
                                value={formData.to}
                                onChange={handleChange}
                                className="w-20 bg-gray-700 text-white rounded px-2 py-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="date"
                                name="departure"
                                value={formData.departure}
                                onChange={handleChange}
                                className="w-32 bg-gray-700 text-white rounded px-2 py-1"
                              />
                              <br />
                              <input
                                type="date"
                                name="returnDate"
                                value={formData.returnDate}
                                onChange={handleChange}
                                className="w-32 bg-gray-700 text-white rounded px-2 py-1 mt-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="number"
                                name="totalPax"
                                value={formData.totalPax}
                                onChange={handleChange}
                                className="w-16 bg-gray-700 text-white rounded px-2 py-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <select
                                name="travelClass"
                                value={formData.travelClass}
                                onChange={handleChange}
                                className="w-24 bg-gray-700 text-white rounded px-2 py-1"
                              >
                                {TRAVEL_CLASSES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="passenger.fullName"
                                value={formData.passenger?.fullName || ""}
                                onChange={handleChange}
                                className="w-36 bg-gray-700 text-white rounded px-2 py-1"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="price"
                                value={b.price}
                                readOnly
                                className="w-24 bg-gray-800 text-gray-500 rounded px-2 py-1 cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="payable"
                                value={b.payable}
                                readOnly
                                className="w-24 bg-gray-800 text-gray-500 rounded px-2 py-1 cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                name="profit"
                                value={b.profit}
                                readOnly
                                className="w-24 bg-gray-800 text-green-400 rounded px-2 py-1 cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-24 bg-gray-700 text-white rounded px-2 py-1"
                              >
                                {BOOKING_STATUS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4 text-xs text-gray-500">
                              {b.createdByEmail}
                            </td>
                            <td className="py-2 px-4 text-right">
                              <button
                                onClick={handleSave}
                                disabled={loading}
                                className="text-green-500 hover:text-green-400 transition-colors"
                                title="Save Changes"
                              >
                                <MdSave size={20} />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Static Row */}
                            <td className="py-4 px-4">{index + 1}</td>
                            <td className="py-4 px-4 font-semibold">{b.pnr}</td>
                            <td className="py-4 px-4">{b.from} → {b.to}</td>
                            <td className="py-4 px-4">
                              {b.departure}
                              {b.returnDate ? ` • ${b.returnDate}` : ""}
                            </td>
                            <td className="py-4 px-4">{b.totalPax}</td>
                            <td className="py-4 px-4">{b.travelClass}</td>
                            <td className="py-4 px-4">
                              <div className="font-medium">{b.passenger?.fullName}</div>
                              <div className="text-xs text-gray-500">
                                {b.passenger?.passport} | {b.passenger?.cnic}
                              </div>
                            </td>
                            <td className="py-4 px-4">{b.price}</td>
                            <td className="py-4 px-4">{b.payable}</td>
                            <td className="py-4 px-4 text-green-400 font-semibold">{b.profit}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                  b.status === "Approved"
                                    ? "bg-green-600/20 text-green-400"
                                    : b.status === "Cancelled"
                                    ? "bg-red-600/20 text-red-400"
                                    : "bg-yellow-600/20 text-yellow-400"
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-gray-500">{b.createdByEmail}</td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleEdit(b)}
                                className="text-blue-500 hover:text-blue-400 transition-colors"
                                title="Edit Booking"
                              >
                                <MdEdit size={20} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
