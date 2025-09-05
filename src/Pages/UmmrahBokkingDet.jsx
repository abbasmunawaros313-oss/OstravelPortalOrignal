import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import {
  FaSearch,
  FaEdit,
  FaSave,
  FaTrash,
  FaUserTie,
  FaMoneyBill,
  FaChartLine,
} from "react-icons/fa";

export default function UmmrahBookingDet() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [summaryFilter, setSummaryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Fetch bookings in realtime
  useEffect(() => {
    const q = query(collection(db, "ummrahBookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Helpers
  const filterByRange = (data) => {
    if (summaryFilter === "all") return data;

    const now = new Date();
    return data.filter((b) => {
      const created = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      if (summaryFilter === "today") {
        return created.toDateString() === now.toDateString();
      } else if (summaryFilter === "weekly") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return created >= weekAgo;
      } else if (summaryFilter === "monthly") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return created >= monthAgo;
      }
      return true;
    });
  };

  // Summary stats (filtered)
  const filteredForSummary = filterByRange(bookings);
  const totalReceived = filteredForSummary.reduce((acc, b) => acc + Number(b.received || 0), 0);
  const totalPayable = filteredForSummary.reduce((acc, b) => acc + Number(b.payable || 0), 0);
  const totalProfit = totalReceived - totalPayable;

  // Vendors & Employees
  const vendors = [...new Set(bookings.map((b) => b.vendor).filter(Boolean))];
  const employees = [...new Set(bookings.map((b) => b.createdByEmail).filter(Boolean))];

  // Filter search
  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.fullName?.toLowerCase().includes(q) ||
      b.passportNumber?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q);
    const matchesVendor = filterVendor === "all" || b.vendor === filterVendor;
    const matchesEmp = filterEmployee === "all" || b.createdByEmail === filterEmployee;
    return matchesSearch && matchesVendor && matchesEmp;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // --- Edit & Save ---
  const startEdit = (b) => {
    setEditingId(b.id);
    setEditData({ ...b });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const docRef = doc(db, "ummrahBookings", id);
      const payload = {
        ...editData,
        profit: Number(editData.received || 0) - Number(editData.payable || 0),
      };
      await updateDoc(docRef, payload);
      toast.success("Booking updated!");
      setEditingId(null);
      setEditData({});
    } catch (err) {
      toast.error("Update failed");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm("Are you sure to delete?")) return;
    try {
      await deleteDoc(doc(db, "ummrahBookings", id));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Delete failed");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <AdminNavbar />

      <main className="flex-grow px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-blue-800 drop-shadow">
            📊 Umrah Bookings Dashboard
          </h1>
          <select
            value={summaryFilter}
            onChange={(e) => setSummaryFilter(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl shadow bg-gradient-to-r from-green-100 to-green-200">
            <FaMoneyBill className="text-2xl text-green-700" />
            <h3 className="text-gray-700 font-semibold">Total Received</h3>
            <p className="text-xl font-bold">PKR {totalReceived}</p>
          </div>

          <div className="p-5 rounded-xl shadow bg-gradient-to-r from-red-100 to-red-200">
            <FaMoneyBill className="text-2xl text-red-700" />
            <h3 className="text-gray-700 font-semibold">Total Payable</h3>
            <p className="text-xl font-bold">PKR {totalPayable}</p>
          </div>

          <div className="p-5 rounded-xl shadow bg-gradient-to-r from-blue-100 to-blue-200">
            <FaChartLine className="text-2xl text-blue-700" />
            <h3 className="text-gray-700 font-semibold">Profit</h3>
            <p className="text-xl font-bold">PKR {totalProfit}</p>
          </div>

          <div className="p-5 rounded-xl shadow bg-gradient-to-r from-purple-100 to-purple-200">
            <FaUserTie className="text-2xl text-purple-700" />
            <h3 className="text-gray-700 font-semibold">Bookings</h3>
            <p className="text-xl font-bold">{filteredForSummary.length}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow">
          <div className="flex items-center w-full md:w-1/2 bg-gray-100 px-3 py-2 rounded-lg">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, passport, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none flex-1"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="ml-2 text-sm text-red-500"
              >
                ✖
              </button>
            )}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="border px-3 py-2 rounded-lg"
            >
              <option value="all">All Vendors</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="border px-3 py-2 rounded-lg"
            >
              <option value="all">All Employees</option>
              {employees.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Bookings List */}
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : paginated.length === 0 ? (
          <p className="text-center text-gray-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Passport</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Payable</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Profit</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-2">
                      {(page - 1) * rowsPerPage + i + 1}
                    </td>

                    {editingId === b.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editData.fullName || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, fullName: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editData.phone || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, phone: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editData.passportNumber || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, passportNumber: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editData.vendor || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, vendor: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">{editData.createdByEmail}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editData.payable || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, payable: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editData.received || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, received: e.target.value })
                            }
                            className="border px-2 py-1 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {Number(editData.received || 0) - Number(editData.payable || 0)}
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={() => saveEdit(b.id)}
                            disabled={saving}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-400 text-white px-3 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-medium">{b.fullName}</td>
                        <td className="px-4 py-2">{b.phone}</td>
                        <td className="px-4 py-2">{b.passportNumber}</td>
                        <td className="px-4 py-2">{b.vendor || "-"}</td>
                        <td className="px-4 py-2">{b.createdByEmail || "-"}</td>
                        <td className="px-4 py-2 text-red-600">PKR {b.payable}</td>
                        <td className="px-4 py-2 text-green-600">PKR {b.received}</td>
                        <td className="px-4 py-2 text-blue-700">
                          PKR {b.profit ?? Number(b.received || 0) - Number(b.payable || 0)}
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button
                            onClick={() => startEdit(b)}
                            className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            onClick={() => deleteBooking(b.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
                          >
                            <FaTrash /> Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center p-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

