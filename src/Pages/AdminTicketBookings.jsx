import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminTicketBookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Yesterday, ThisWeek

  useEffect(() => {
    const q = query(collection(db, "ticketBookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(0),
      }));
      setBookings(arr);
    });
    return () => unsub();
  }, []);

  // 📅 Date filter
  const filterByDate = (booking) => {
    if (dateFilter === "All") return true;
    const today = new Date();
    const bookingDate = new Date(booking.createdAt);
    const bDate = bookingDate.toDateString();

    if (dateFilter === "Today") return bDate === today.toDateString();

    if (dateFilter === "Yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return bDate === yesterday.toDateString();
    }

    if (dateFilter === "ThisWeek") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      return bookingDate >= startOfWeek;
    }

    return true;
  };

  // 🔍 Search
  const filteredBookings = bookings.filter(
    (b) =>
      filterByDate(b) &&
      [b.pnr, b.passenger?.fullName, b.createdByEmail, b.createdByName, b.from, b.to]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // 💰 Totals Calculation
  const totals = {
    daily: { earnings: 0, profit: 0 },
    weekly: { earnings: 0, profit: 0 },
    monthly: { earnings: 0, profit: 0 },
    overall: { earnings: 0, profit: 0 },
  };

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  filteredBookings.forEach((b) => {
    const profit = Number(b.profit) || 0;
    const price = Number(b.price) || 0;
    const payable = Number(b.payable) || 0;
    const earnings = price - payable;
    const bookingDate = new Date(b.createdAt);

    // Overall
    totals.overall.profit += profit;
    totals.overall.earnings += earnings;

    // Daily
    if (bookingDate.toDateString() === today.toDateString()) {
      totals.daily.profit += profit;
      totals.daily.earnings += earnings;
    }

    // Weekly
    if (bookingDate >= startOfWeek) {
      totals.weekly.profit += profit;
      totals.weekly.earnings += earnings;
    }

    // Monthly
    if (bookingDate >= startOfMonth) {
      totals.monthly.profit += profit;
      totals.monthly.earnings += earnings;
    }
  });

  // ✏️ Edit booking
  const startEdit = (booking) => {
    setEditing(booking);
    setFormData({ ...booking });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const ref = doc(db, "ticketBookings", editing.id);
    await updateDoc(ref, formData);
    setEditing(null);
    setFormData({});
  };

  const deleteBooking = async (id) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      await deleteDoc(doc(db, "ticketBookings", id));
    }
  };

  // 📄 Export PDF
  const exportPDF = () => {
    const docPDF = new jsPDF();
    docPDF.text("Ticket Bookings Report", 14, 15);
    autoTable(docPDF, {
      startY: 20,
      head: [["PNR", "Passenger", "Employee", "Route", "Price", "Payable", "Profit", "Status"]],
      body: filteredBookings.map((b) => [
        b.pnr,
        b.passenger?.fullName,
        b.createdByEmail || b.createdByName,
        `${b.from} → ${b.to}`,
        b.price,
        b.payable,
        b.profit,
        b.status,
      ]),
    });
    docPDF.save("ticket-bookings-report.pdf");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Ticket Bookings</h2>

        <div className="flex gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            <option>All</option>
            <option>Today</option>
            <option>Yesterday</option>
            <option>ThisWeek</option>
          </select>
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Totals Section */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
  {Object.entries(totals).map(([period, { earnings, profit }]) => (
    <div
      key={period}
      className="p-6 bg-gradient-to-br from-white to-gray-50 border rounded-2xl shadow-md hover:shadow-lg transition duration-300"
    >
      <h4 className="text-lg font-semibold text-gray-700 capitalize mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
        {period}
      </h4>

      <div className="space-y-3">
        {/* Earnings */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Earnings</span>
          <span className="text-xl font-bold text-blue-600">
            ${earnings.toLocaleString()}
          </span>
        </div>

        {/* Profit */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Profit</span>
          <span className="text-xl font-bold text-green-600">
            ${profit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  ))}
</div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search by PNR, passenger, employee, route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {["PNR", "Passenger", "Employee", "Route", "Price", "Payable", "Profit", "Status", "Actions"].map((head) => (
                <th key={head} className="px-4 py-2 border-b font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-6 text-gray-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 border-b">{b.pnr}</td>
                  <td className="px-4 py-2 border-b">{b.passenger?.fullName}</td>
                  <td className="px-4 py-2 border-b">{b.createdByEmail || b.createdByName}</td>
                  <td className="px-4 py-2 border-b">{b.from} → {b.to}</td>
                  <td className="px-4 py-2 border-b">${b.price}</td>
                  <td className="px-4 py-2 border-b">${b.payable}</td>
                  <td className="px-4 py-2 border-b text-green-600 font-semibold">${b.profit}</td>
                  <td className="px-4 py-2 border-b">{b.status}</td>
                  <td className="px-4 py-2 border-b flex gap-2">
                    <button onClick={() => startEdit(b)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded">
                      Edit
                    </button>
                    <button onClick={() => deleteBooking(b.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Booking</h3>
            {["pnr", "price", "payable", "profit", "status"].map((field) => (
              <input
                key={field}
                type={field === "status" ? "text" : "number"}
                value={formData[field] || ""}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                placeholder={field}
                className="w-full mb-3 p-2 border rounded"
              />
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
                Cancel
              </button>
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
