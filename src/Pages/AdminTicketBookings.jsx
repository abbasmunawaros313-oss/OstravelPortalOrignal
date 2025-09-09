import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast"; 
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaDollarSign,
  FaCreditCard,
  FaChartLine,
  FaSearch,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../Components/AdminNavbar";

export default function AdminTicketBookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [dateFilter, setDateFilter] = useState("All"); // All, Today, Yesterday, ThisWeek, Last7Days, ThisMonth, Last30Days

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

  const navigate = useNavigate();
const handleClick = ()=>{
    navigate("/admin-dashboard");

}
  // ---------- Date helpers ----------
  const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const inSameDay = (a, b) => stripTime(a).getTime() === stripTime(b).getTime();

  const matchesDateFilter = (date) => {
    if (!date || !(date instanceof Date)) return false;

    const now = new Date();
    const today = stripTime(now);
    const d = stripTime(date);

    switch (dateFilter) {
      case "All":
        return true;
      case "Today":
        return inSameDay(d, today);
      case "Yesterday": {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        return inSameDay(d, y);
      }
      case "ThisWeek": {
        // Week starts Sunday
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return d >= start && d <= today;
      }
      case "Last7Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 6); // include today
        return d >= start && d <= today;
      }
      case "ThisMonth": {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      }
      case "Last30Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 29); // include today
        return d >= start && d <= today;
      }
      default:
        return true;
    }
  };

  // ---------- Filtered data (date + search) ----------
  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const dateOk = matchesDateFilter(new Date(b.createdAt));
      if (!dateOk) return false;

      if (!term) return true;
      const haystack = [
        b.pnr,
        b.passenger?.fullName,
        b.createdByEmail,
        b.createdByName,
        b.from,
        b.to,
        b.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [bookings, search, dateFilter]);

  // ---------- Totals (based on filtered data) ----------
  const totals = useMemo(() => {
    const sum = (key) =>
      filteredBookings.reduce((acc, b) => acc + (Number(b?.[key]) || 0), 0);
    return {
      earnings: sum("price"),
      payable: sum("payable"),
      profit: sum("profit"),
    };
  }, [filteredBookings]);

  const fmtMoney = (n) =>
    (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

  // ---------- Edit / Delete ----------
  const startEdit = (booking) => {
    setEditing(booking);
    setFormData({
      pnr: booking.pnr || "",
      price: booking.price ?? "",
      payable: booking.payable ?? "",
      profit: booking.profit ?? "",
      status: booking.status || "",
    });
  };
  const [saving, setSaving] = useState(false);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const ref = doc(db, "ticketBookings", editing.id);
      await updateDoc(ref, {
        pnr: formData.pnr,
        price: Number(formData.price) || 0,
        payable: Number(formData.payable) || 0,
        profit: Number(formData.profit) || 0,
        status: formData.status,
      });
      setEditing(null);
      setFormData({});
    } finally {
      setSaving(false);
    }
  };
  const deleteBooking = async (id) => {
  const confirm = window.confirm("Are you sure you want to delete this booking?");
  if (!confirm) return;

  try {
    await deleteDoc(doc(db, "ticketBookings", id));
    toast.success("Booking deleted successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete booking!");
  }
};
  // ---------- PDF ----------
  const exportPDF = () => {
    const docPDF = new jsPDF();
    const title = "Ticket Bookings Report";
    const sub =
      dateFilter === "All" ? "All records" : `Filtered by: ${dateFilter}`;

    docPDF.setFontSize(14);
    docPDF.text(title, 14, 15);
    docPDF.setFontSize(10);
    docPDF.text(sub, 14, 21);
    docPDF.text(
      `Totals — Earnings: $${fmtMoney(totals.earnings)} | Payable: $${fmtMoney(
        totals.payable
      )} | Profit: $${fmtMoney(totals.profit)}`,
      14,
      27
    );

    autoTable(docPDF, {
      startY: 32,
      head: [
        ["PNR", "Passenger", "Employee", "Route", "Price", "Payable", "Profit", "Status", "Date"],
      ],
      body: filteredBookings.map((b) => [
        b.pnr || "-",
        b.passenger?.fullName || "-",
        b.createdByEmail || b.createdByName || "-",
        `${b.from || "-"} → ${b.to || "-"}`,
        Number(b.price) || 0,
        Number(b.payable) || 0,
        Number(b.profit) || 0,
        b.status || "-",
        b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
    });

    docPDF.save("ticket-bookings-report.pdf");
  };

  return (
    <>
     <AdminNavbar/>
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Bar */}
     
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Ticket Bookings</h2>

       


        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            title="Date Range"
          >
            <option value="All">All</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="ThisWeek">This Week</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="ThisMonth">This Month</option>
            <option value="Last30Days">Last 30 Days</option>
          </select>

          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Totals — driven by date filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-2">
        {/* Earnings */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm uppercase tracking-wide text-blue-700/70">Total</h4>
              <h3 className="text-lg font-semibold text-blue-800">Earnings</h3>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow">
              <FaDollarSign className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-blue-700">
            ${fmtMoney(totals.earnings)}
          </p>
          <p className="mt-1 text-xs text-blue-900/60">Range: {dateFilter}</p>
        </div>

        {/* Payable */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm uppercase tracking-wide text-amber-700/70">Total</h4>
              <h3 className="text-lg font-semibold text-amber-800">Payable</h3>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow">
              <FaCreditCard className="text-amber-600" size={24} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-amber-700">
            ${fmtMoney(totals.payable)}
          </p>
          <p className="mt-1 text-xs text-amber-900/60">Range: {dateFilter}</p>
        </div>

        {/* Profit */}
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl shadow-md hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm uppercase tracking-wide text-emerald-700/70">Total</h4>
              <h3 className="text-lg font-semibold text-emerald-800">Profit</h3>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow">
              <FaChartLine className="text-emerald-600" size={24} />
            </div>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-emerald-700">
            ${fmtMoney(totals.profit)}
          </p>
          <p className="mt-1 text-xs text-emerald-900/60">Range: {dateFilter}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by PNR, passenger, employee, route, status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-2.5 p-1.5 rounded-full hover:bg-gray-100"
            title="Clear"
          >
            <FaTimesCircle className="text-gray-400" size={18} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto  border rounded-2xl shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100  top-0 z-10">
            <tr>
              {[
                "#",
                "PNR",
                "Passenger",
                "Employee",
                "Route",
                "Price",
                "Payable",
                "Profit",
                "Status",
                "Date",
                "Actions",
              ].map((head) => (
                <th key={head} className="px-4 py-3 border-b font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-gray-500">
                  No bookings found for <span className="font-medium">{dateFilter}</span>
                  {search ? (
                    <>
                      {" "}
                      and search term <span className="font-medium">“{search}”</span>.
                    </>
                  ) : (
                    "."
                  )}
                </td>
              </tr>
            ) : (
              filteredBookings.map((b,index) => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 border-b text-gray-600 font-medium"> {index + 1}  </td>
                  <td className="px-4 py-2 border-b">{b.pnr || "-"}</td>
                  <td className="px-4 py-2 border-b">{b.passenger?.fullName || "-"}</td>
                  <td className="px-4 py-2 border-b">{b.createdByEmail || b.createdByName || "-"}</td>
                  <td className="px-4 py-2 border-b">
                    {(b.from || "-") + " → " + (b.to || "-")}
                  </td>
                  <td className="px-4 py-2 border-b">{fmtMoney(b.price)}</td>
                  <td className="px-4 py-2 border-b">{fmtMoney(b.payable)}</td>
                  <td className="px-4 py-2 border-b text-emerald-700 font-semibold">
                    {fmtMoney(b.profit)}
                  </td>
                  <td className="px-4 py-2 border-b">{b.status || "-"}</td>
                  <td className="px-4 py-2 border-b">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(b)}
                        className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBooking(b.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    {/* Edit Modal */}
{editing && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
    <div className="bg-white p-6 rounded-2xl w-96 shadow-lg relative">
      <h3 className="text-lg font-semibold mb-4">Edit Booking</h3>

      <label className="text-xs font-medium text-gray-600">PNR</label>
      <input
        type="text"
        value={formData.pnr}
        onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
        placeholder="PNR"
        className="w-full mb-3 p-2 border rounded-lg"
      />

      <label className="text-xs font-medium text-gray-600">Price</label>
      <input
        type="number"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        placeholder="Price"
        className="w-full mb-3 p-2 border rounded-lg"
      />

      <label className="text-xs font-medium text-gray-600">Payable</label>
      <input
        type="number"
        value={formData.payable}
        onChange={(e) => setFormData({ ...formData, payable: e.target.value })}
        placeholder="Payable"
        className="w-full mb-3 p-2 border rounded-lg"
      />

      <label className="text-xs font-medium text-gray-600">Profit</label>
      <input
        type="number"
        value={formData.profit}
        onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
        placeholder="Profit"
        className="w-full mb-3 p-2 border rounded-lg"
      />

      <label className="text-xs font-medium text-gray-600">Status</label>
      <input
        type="text"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        placeholder="Status"
        className="w-full mb-4 p-2 border rounded-lg"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setEditing(null)}
          disabled={saving}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={saveEdit}
          disabled={saving}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Saving…
            </>
          ) : (
            "Save"
          )}
        </button> 
      </div>
    </div>
  </div>
)}

    </div>
    </>
  );
}
