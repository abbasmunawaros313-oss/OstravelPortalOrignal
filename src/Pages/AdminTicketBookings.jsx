// AdminTicketDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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
import { db } from "../firebase"; // your firebase config
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaDollarSign,
  FaCreditCard,
  FaChartLine,
  FaSearch,
  FaTimes,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaDownload,
  FaFilter,
  FaCheck,
  FaEye,
  FaSortAmountDown,
  FaSortAmountUp,
  FaFileCsv,
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import { useNavigate } from "react-router-dom";

/**
 * AdminTicketDashboard
 * - Full admin dashboard page showing ticket bookings.
 * - Employee totals + bookings count (live with filters)
 * - Search, date filters, employee filter
 * - Export PDF & CSV
 * - View/Edit/Delete booking modals
 * - Simple SVG mini-bar in employee table
 *
 * Note: This file is designed to be drop-in. If you want to split into smaller components,
 * feel free to extract parts later.
 */

// ---------- Helper functions ----------
const moneyFmt = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

const toTwoDecimals = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const inSameDay = (a, b) => stripTime(a).getTime() === stripTime(b).getTime();

// simple CSV generator
const generateCSV = (rows, filename = "export.csv") => {
  const keys = Object.keys(rows[0] || {});
  const csv =
    [keys.join(",")]
      .concat(
        rows.map((r) =>
          keys
            .map((k) => {
              const v = r[k] ?? "";
              const s = String(v).replace(/"/g, '""');
              if (s.includes(",") || s.includes("\n")) return `"${s}"`;
              return s;
            })
            .join(",")
        )
      )
      .join("\n") + "\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ---------- Modal component ----------
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div
        className={`bg-gray-900 text-gray-100 rounded-lg shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto transform transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// ---------- Small SVG Bar (pure css/svg) ----------
const MiniBar = ({ value, max = 1 }) => {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return (
    <div className="h-2 w-28 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${w}%`,
          background:
            "linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(16,185,129,1) 100%)",
        }}
      />
    </div>
  );
};

// ---------- Main Component ----------
export default function AdminTicketDashboard() {
  const navigate = useNavigate();

  // Data
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Sorting for employee list
  const [employeeSortKey, setEmployeeSortKey] = useState("bookings"); // bookings | earnings | profit
  const [employeeSortDir, setEmployeeSortDir] = useState("desc"); // asc | desc

  // Fetch bookings live from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "ticketBookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data?.createdAt?.toDate?.() || new Date(0),
          };
        });
        setBookings(arr);
        setLoading(false);
      },
      (err) => {
        console.error("firestore snapshot err:", err);
        toast.error("Failed to load bookings.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Date filter matcher
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
      case "Last7Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        return d >= start && d <= today;
      }
      case "ThisWeek": {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return d >= start && d <= today;
      }
      case "ThisMonth": {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      }
      case "Last30Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        return d >= start && d <= today;
      }
      default:
        return true;
    }
  };

  // Filtered bookings based on search + date + employee
  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((b) => {
      // date check
      if (!matchesDateFilter(new Date(b.createdAt))) return false;

      // employee filter
      const empKey = b.createdByEmail || b.createdByName || "Unknown";
      if (employeeFilter !== "All" && empKey !== employeeFilter) return false;

      if (!term) return true;

      const haystack = [
        b.pnr,
        b.passenger?.fullName,
        b.createdByEmail,
        b.createdByName,
        b.from,
        b.to,
        b.status,
        b.vendor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [bookings, search, dateFilter, employeeFilter]);

  // Totals (based on filtered bookings)
  const totals = useMemo(() => {
    const sum = (key) => filteredBookings.reduce((acc, b) => acc + (Number(b?.[key]) || 0), 0);
    return {
      earnings: sum("price"),
      payable: sum("payable"),
      profit: sum("profit"),
      bookings: filteredBookings.length,
    };
  }, [filteredBookings]);

  // Employee totals including bookings count
  const employeeTotals = useMemo(() => {
    const totalsMap = {};
    filteredBookings.forEach((b) => {
      const key = b.createdByEmail || b.createdByName || "Unknown";
      if (!totalsMap[key]) totalsMap[key] = { bookings: 0, earnings: 0, payable: 0, profit: 0, name: key };
      totalsMap[key].bookings += 1;
      totalsMap[key].earnings += Number(b.price) || 0;
      totalsMap[key].payable += Number(b.payable) || 0;
      totalsMap[key].profit += Number(b.profit) || 0;
    });
    return totalsMap;
  }, [filteredBookings]);

  // Employee list sorted
  const employeeListSorted = useMemo(() => {
    const arr = Object.values(employeeTotals);
    if (!arr.length) return [];
    const maxEarnings = Math.max(...arr.map((a) => a.earnings));
    // default sort
    arr.sort((a, b) => {
      const k = employeeSortKey;
      const av = a[k] ?? 0;
      const bv = b[k] ?? 0;
      if (employeeSortDir === "asc") return av - bv;
      return bv - av;
    });
    return { arr, maxEarnings };
  }, [employeeTotals, employeeSortKey, employeeSortDir]);

  // unique employee options for filter dropdown
  const employeeOptions = useMemo(() => {
    const set = new Set(bookings.map((b) => b.createdByEmail || b.createdByName || "Unknown"));
    return Array.from(set).filter(Boolean);
  }, [bookings]);

  // ---------- Edit / View / Save / Delete ----------
  const startEdit = (booking) => {
    setEditing(booking);
    setFormData({
      ...booking,
      price: booking.price ?? "",
      payable: booking.payable ?? "",
      profit: booking.profit ?? "",
      pnr: booking.pnr || "",
      status: booking.status || "",
    });
  };

  const startView = (booking) => {
    setViewing(booking);
  };

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
      toast.success("Booking updated");
      setEditing(null);
      setFormData({});
    } catch (err) {
      console.error(err);
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm("Delete booking? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "ticketBookings", id));
      toast.success("Booking deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  // ---------- Export ----------
  const exportPDF = () => {
    const docPDF = new jsPDF();
    const title = "Ticket Bookings Report";
    const sub = dateFilter === "All" ? "All records" : `Filtered by: ${dateFilter}`;
    docPDF.setFontSize(14);
    docPDF.text(title, 14, 15);
    docPDF.setFontSize(10);
    docPDF.text(sub, 14, 21);
    docPDF.text(
      `Totals — Bookings: ${totals.bookings} | Earnings: ${moneyFmt(totals.earnings)} | Payable: ${moneyFmt(
        totals.payable
      )} | Profit: ${moneyFmt(totals.profit)}`,
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
      headStyles: { fillColor: [37, 99, 235] },
    });

    docPDF.save("ticket-bookings-report.pdf");
  };

  const exportCSV = () => {
    if (!filteredBookings.length) {
      toast("No rows to export");
      return;
    }
    const rows = filteredBookings.map((b) => ({
      id: b.id,
      pnr: b.pnr || "",
      passenger: b.passenger?.fullName || "",
      employee: b.createdByEmail || b.createdByName || "",
      from: b.from || "",
      to: b.to || "",
      price: b.price || 0,
      payable: b.payable || 0,
      profit: b.profit || 0,
      status: b.status || "",
      createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString() : "",
    }));
    generateCSV(rows, "ticket-bookings.csv");
  };

  // ---------- UI Render ----------
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <AdminNavbar />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* header */}
        <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-400 drop-shadow-md">
              ✈️ Ticket Bookings Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Live bookings, employee leaderboard, and exports.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch">
            {/* date filter */}
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Last7Days">Last 7 Days</option>
                <option value="ThisWeek">This Week</option>
                <option value="ThisMonth">This Month</option>
                <option value="Last30Days">Last 30 Days</option>
              </select>
            </div>

            {/* employee filter */}
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="py-2 px-4 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Employees</option>
              {employeeOptions.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>

            {/* export buttons */}
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                title="Export CSV"
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white transition-transform hover:scale-[1.03]"
              >
                <FaFileCsv />
                CSV
              </button>
              <button
                onClick={exportPDF}
                title="Export PDF"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-transform hover:scale-[1.03]"
              >
                <FaDownload />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Totals cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl shadow-lg bg-gradient-to-r from-purple-800 to-purple-600 border border-purple-700 transform transition duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-200 font-semibold uppercase">Bookings</div>
                <div className="mt-2 text-2xl font-extrabold">{totals.bookings}</div>
              </div>
              <div className="p-3 rounded-full bg-white/5 text-purple-200">
                <FaCheck />
              </div>
            </div>
            <div className="mt-3 text-xs text-purple-200/80">Updated live</div>
          </div>

          <div className="p-5 rounded-2xl shadow-lg bg-gradient-to-r from-blue-800 to-blue-600 border border-blue-700 transform transition duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-200 font-semibold uppercase">Earnings</div>
                <div className="mt-2 text-2xl font-extrabold">{moneyFmt(totals.earnings)}</div>
              </div>
              <div className="p-3 rounded-full bg-white/5 text-blue-200">
                <FaDollarSign />
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-200/80">Sum of Price</div>
          </div>

          <div className="p-5 rounded-2xl shadow-lg bg-gradient-to-r from-amber-700 to-amber-500 border border-amber-600 transform transition duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-amber-100 font-semibold uppercase">Payable</div>
                <div className="mt-2 text-2xl font-extrabold">{moneyFmt(totals.payable)}</div>
              </div>
              <div className="p-3 rounded-full bg-white/5 text-amber-200">
                <FaCreditCard />
              </div>
            </div>
            <div className="mt-3 text-xs text-amber-200/80">Sum of Payable</div>
          </div>

          <div className="p-5 rounded-2xl shadow-lg bg-gradient-to-r from-green-700 to-green-500 border border-green-600 transform transition duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-200 font-semibold uppercase">Profit</div>
                <div className="mt-2 text-2xl font-extrabold">{moneyFmt(totals.profit)}</div>
              </div>
              <div className="p-3 rounded-full bg-white/5 text-green-200">
                <FaChartLine />
              </div>
            </div>
            <div className="mt-3 text-xs text-green-200/80">Sum of Profit</div>
          </div>
        </div>

        {/* search */}
        <div className="relative w-full">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by PNR, passenger, employee, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Employee leaderboard + controls */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-extrabold text-blue-300">Employee Leaderboard</h2>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">Sort by:</div>
              <select
                value={employeeSortKey}
                onChange={(e) => setEmployeeSortKey(e.target.value)}
                className="py-1 px-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
              >
                <option value="bookings">Bookings</option>
                <option value="earnings">Earnings</option>
                <option value="profit">Profit</option>
              </select>

              <button
                onClick={() => setEmployeeSortDir((s) => (s === "desc" ? "asc" : "desc"))}
                title="Toggle direction"
                className="p-2 bg-gray-900 rounded border border-gray-700 text-gray-200"
              >
                {employeeSortDir === "desc" ? <FaSortAmountDown /> : <FaSortAmountUp />}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Earnings</th>
                  <th className="px-4 py-3">Payable</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Spark</th>
                </tr>
              </thead>
              <tbody>
                {employeeListSorted.arr && employeeListSorted.arr.length ? (
                  employeeListSorted.arr.map((emp) => (
                    <tr
                      key={emp.name}
                      className="border-t border-gray-700 hover:bg-gray-700 transition-all duration-200"
                    >
                      <td className="px-4 py-3 text-gray-200 font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-purple-300 font-semibold">{emp.bookings}</td>
                      <td className="px-4 py-3 text-blue-300 font-semibold">{moneyFmt(emp.earnings)}</td>
                      <td className="px-4 py-3 text-amber-300 font-semibold">{moneyFmt(emp.payable)}</td>
                      <td className="px-4 py-3 text-green-300 font-bold">{moneyFmt(emp.profit)}</td>
                      <td className="px-4 py-3">
                        <MiniBar value={emp.earnings} max={employeeListSorted.maxEarnings || emp.earnings || 1} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
                      No employee data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bookings table */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-blue-300">Bookings ({filteredBookings.length})</h2>
            <div className="text-sm text-gray-400">Click view to see details</div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No bookings found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
                  <tr>
                    {["#", "PNR", "Passenger", "Employee", "Route", "Price", "Payable", "Profit", "Status", "Date", "Actions"].map(
                      (head) => (
                        <th key={head} className="px-4 py-3 font-semibold whitespace-nowrap">
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b, i) => (
                    <tr key={b.id} className="border-t border-gray-700 hover:bg-gray-700 transition-all duration-150">
                      <td className="px-4 py-3 text-gray-300">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-300">{b.pnr || "-"}</td>
                      <td className="px-4 py-3 font-medium text-gray-50">{b.passenger?.fullName || "-"}</td>
                      <td className="px-4 py-3 text-gray-300">{b.createdByEmail || b.createdByName || "-"}</td>
                      <td className="px-4 py-3 text-gray-300">{(b.from || "-") + " → " + (b.to || "-")}</td>
                      <td className="px-4 py-3 text-blue-400 font-medium">{moneyFmt(b.price)}</td>
                      <td className="px-4 py-3 text-amber-400 font-medium">{moneyFmt(b.payable)}</td>
                      <td className="px-4 py-3 text-green-400 font-bold">{moneyFmt(b.profit)}</td>
                      <td className="px-4 py-3 text-gray-300">{b.status || "-"}</td>
                      <td className="px-4 py-3 text-gray-300">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => startView(b)} className="p-2 text-cyan-400 hover:text-cyan-200 transition-colors" title="View Details">
                            <FaEye />
                          </button>
                          <button onClick={() => startEdit(b)} className="p-2 text-blue-400 hover:text-blue-200 transition-colors" title="Edit Booking">
                            <FaEdit />
                          </button>
                          <button onClick={() => deleteBooking(b.id)} className="p-2 text-red-400 hover:text-red-200 transition-colors" title="Delete Booking">
                            <FaTrash />
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

        {/* View Modal */}
        <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Booking Details">
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">PNR</div>
                  <div className="font-medium mt-1">{viewing.pnr || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Trip Type</div>
                  <div className="font-medium mt-1">{viewing.tripType || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Route</div>
                  <div className="font-medium mt-1">{`${viewing.from || "-"} → ${viewing.to || "-"}`}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Vendor</div>
                  <div className="font-medium mt-1">{viewing.vendor || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Departure</div>
                  <div className="font-medium mt-1">{viewing.departure || "-"}</div>
                </div>
                {viewing.returnDate && (
                  <div className="bg-gray-700 p-3 rounded-md">
                    <div className="text-xs text-gray-400">Return Date</div>
                    <div className="font-medium mt-1">{viewing.returnDate}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Price (Earnings)</div>
                  <div className="font-medium mt-1 text-blue-300">{moneyFmt(viewing.price)}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Payable</div>
                  <div className="font-medium mt-1 text-amber-300">{moneyFmt(viewing.payable)}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Profit</div>
                  <div className="font-medium mt-1 text-green-300">{moneyFmt(viewing.profit)}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Passengers</div>
                  <div className="font-medium mt-1">{`Adults: ${viewing.adults || 0}, Children: ${viewing.children || 0}, Infants: ${viewing.infants || 0}`}</div>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <div className="text-xs text-gray-400">Passenger Name</div>
                <div className="font-medium mt-1">{viewing.passenger?.fullName || "-"}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Passport</div>
                  <div className="font-medium mt-1">{viewing.passenger?.passport || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">CNIC</div>
                  <div className="font-medium mt-1">{viewing.passenger?.cnic || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Phone</div>
                  <div className="font-medium mt-1">{viewing.passenger?.phone || "-"}</div>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <div className="text-xs text-gray-400">Note</div>
                <div className="font-medium mt-1">{viewing.note || "-"}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="font-medium mt-1">{viewing.status || "-"}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded-md">
                  <div className="text-xs text-gray-400">Created By</div>
                  <div className="font-medium mt-1">{viewing.createdByName || viewing.createdByEmail || "-"}</div>
                </div>
              </div>

              <div className="bg-gray-700 p-3 rounded-md">
                <div className="text-xs text-gray-400">Created On</div>
                <div className="font-medium mt-1">{viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : "-"}</div>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Booking" maxWidth="max-w-3xl">
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm text-gray-300 font-semibold">Read-only</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-gray-800 p-3 rounded-md">
                    <div className="text-xs text-gray-400">Passenger</div>
                    <div className="font-medium mt-1">{editing.passenger?.fullName || "-"}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-md">
                    <div className="text-xs text-gray-400">Route</div>
                    <div className="font-medium mt-1">{`${editing.from || "-"} → ${editing.to || "-"}`}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">PNR</label>
                  <input
                    value={formData.pnr || ""}
                    onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">Status</label>
                  <input
                    value={formData.status || ""}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                  <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">Vendor</label>
                  <input
                    value={formData.vendor || ""}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">Price (Earnings)</label>
                  <input
                    type="number"
                    value={formData.price ?? ""}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">Payable</label>
                  <input
                    type="number"
                    value={formData.payable ?? ""}
                    onChange={(e) => setFormData({ ...formData, payable: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-semibold mb-1">Profit</label>
                  <input
                    type="number"
                    value={formData.profit ?? ""}
                    onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </main>
      <Footer />
    </div>
  );
}
