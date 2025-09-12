import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import AdminNavbar from "../Components/AdminNavbar";
import {
  FaSearch,
  FaEdit,
  FaTrash,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaCalendar,
  FaDollarSign,
  FaArrowUp,
  FaArrowDown,
  FaBuilding,
  FaUser,
  FaInfoCircle,
  FaBed,
  FaCreditCard,
  FaTimes,
  FaSave,
  FaSpinner,
} from "react-icons/fa";
import toast from "react-hot-toast";

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfWeek = (date) => {
  const d = getStartOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getStartOfMonth = (date) => {
  const d = getStartOfDay(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

function HoetlDetAdminSide() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "HotelBookings"), (snapshot) => {
      setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleEdit = (booking) => {
    setEditingBooking(booking);
  };

  const handleDelete = async (id) => {
    try {
      setSaving(true);
      await deleteDoc(doc(db, "HotelBookings", id));
      toast.success("Booking deleted!");
      setDeletingBookingId(null);
    } catch (err) {
      toast.error("Error deleting booking");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateDoc(doc(db, "HotelBookings", editingBooking.id), editingBooking);
      toast.success("Booking updated!");
      setEditingBooking(null);
    } catch (err) {
      toast.error("Error updating booking");
    } finally {
      setSaving(false);
    }
  };

  const filterAndSearchBookings = () => {
    let filteredList = bookings.filter((b) => {
      const createdAt = b.createdAt?.toDate();
      if (!createdAt) return false;

      const today = getStartOfDay(new Date());
      const yesterday = getStartOfDay(new Date(today));
      yesterday.setDate(today.getDate() - 1);

      switch (filter) {
        case "today":
          return isSameDay(createdAt, today);
        case "yesterday":
          return isSameDay(createdAt, yesterday);
        case "week":
          return createdAt >= getStartOfWeek(today);
        case "month":
          return createdAt >= getStartOfMonth(today);
        default:
          return true;
      }
    });

    if (search) {
      const lowerCaseSearch = search.toLowerCase();
      filteredList = filteredList.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(lowerCaseSearch) ||
          b.bookingId?.toLowerCase().includes(lowerCaseSearch) ||
          b.property?.toLowerCase().includes(lowerCaseSearch)
      );
    }
    return filteredList;
  };

  const searchedAndFilteredBookings = filterAndSearchBookings();
  
  const totalReceived = searchedAndFilteredBookings.reduce((a, b) => a + (b.received || 0), 0);
  const totalPayable = searchedAndFilteredBookings.reduce((a, b) => a + (b.payable || 0), 0);
  const totalProfit = searchedAndFilteredBookings.reduce((a, b) => a + (b.profit || 0), 0);

  return (
    <>
      <AdminNavbar />
      <div className="p-6 bg-gray-50 min-h-screen font-sans">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">
          Hotel Bookings Admin Dashboard 🏨
        </h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-center justify-between transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-full">
                <FaArrowDown size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-gray-900">
                  PKR {totalReceived.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-center justify-between transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <FaArrowUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Payable</p>
                <p className="text-2xl font-bold text-gray-900">
                  PKR {totalPayable.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-center justify-between transition-all duration-300 hover:scale-105">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <FaDollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Profit</p>
                <p className="text-2xl font-bold text-gray-900">
                  PKR {totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-1/2 rounded-xl shadow-md">
            <input
              type="text"
              placeholder="Search by name, ID, or hotel..."
              className="w-full pl-5 pr-14 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="absolute right-0 top-0 h-full px-5 bg-gray-800 text-white rounded-r-xl hover:bg-gray-900 transition-colors"
            >
              <FaSearch />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "all" ? "bg-gray-800 text-white shadow-md" : "bg-white border text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "today" ? "bg-gray-800 text-white shadow-md" : "bg-white border text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setFilter("today")}
            >
              <FaCalendarDay /> Today
            </button>
            <button
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "yesterday" ? "bg-gray-800 text-white shadow-md" : "bg-white border text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setFilter("yesterday")}
            >
              <FaCalendarAlt /> Yesterday
            </button>
            <button
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "week" ? "bg-gray-800 text-white shadow-md" : "bg-white border text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setFilter("week")}
            >
              <FaCalendarWeek /> This Week
            </button>
            <button
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "month" ? "bg-gray-800 text-white shadow-md" : "bg-white border text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setFilter("month")}
            >
              <FaCalendar /> This Month
            </button>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-center">S. No.</th>
                <th className="p-3">Booking Details</th>
                <th className="p-3">Client</th>
                <th className="p-3">Financials</th>
                <th className="p-3 text-center">Emplyee</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchedAndFilteredBookings.length > 0 ? (
                searchedAndFilteredBookings.map((b, index) => (
                  <tr key={b.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-center font-medium text-gray-600">{index + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-gray-900 font-medium"><FaBuilding className="text-gray-500" /> {b.property}</div>
                      <div className="text-xs text-gray-500 mt-1">ID: {b.bookingId}</div>
                      <div className="text-xs text-gray-500">
                        Arrival: {b.arrivalDate}
                      </div>
                      <div className="text-xs text-gray-500">
                        Departure: {b.departureDate}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-medium text-gray-900"><FaUser className="text-gray-500"/> {b.clientName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <FaBed /> Nights: {b.nightsStayed}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <FaInfoCircle /> Rooms: {b.numberOfRooms}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-green-600 flex items-center gap-2">
                        <FaArrowDown /> PKR {b.received}
                      </div>
                      <div className="text-red-600 flex items-center gap-2">
                        <FaArrowUp /> PKR {b.payable}
                      </div>
                      <div className="text-blue-600 font-bold flex items-center gap-2">
                        <FaDollarSign /> PKR {b.profit}
                      </div>
                    </td>
                    <td className="p-3 text-center text-gray-700">{b.userEmail || "N/A"}</td>
                    <td className="p-3 flex gap-3 justify-center">
                      <button
                        onClick={() => handleEdit(b)}
                        className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-50"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => setDeletingBookingId(b.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Edit Booking</h3>
            <button
              onClick={() => setEditingBooking(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <FaTimes size={24} />
            </button>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Client Name</label>
                <input
                  type="text"
                  value={editingBooking.clientName}
                  onChange={(e) => setEditingBooking({ ...editingBooking, clientName: e.target.value })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Booking ID</label>
                <input
                  type="text"
                  value={editingBooking.bookingId}
                  onChange={(e) => setEditingBooking({ ...editingBooking, bookingId: e.target.value })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Property</label>
                <input
                  type="text"
                  value={editingBooking.property}
                  onChange={(e) => setEditingBooking({ ...editingBooking, property: e.target.value })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Arrival Date</label>
                <input
                  type="date"
                  value={editingBooking.arrivalDate}
                  onChange={(e) => setEditingBooking({ ...editingBooking, arrivalDate: e.target.value })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Departure Date</label>
                <input
                  type="date"
                  value={editingBooking.departureDate}
                  onChange={(e) => setEditingBooking({ ...editingBooking, departureDate: e.target.value })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Received</label>
                <input
                  type="number"
                  value={editingBooking.received}
                  onChange={(e) => setEditingBooking({ ...editingBooking, received: parseFloat(e.target.value) || 0 })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Payable</label>
                <input
                  type="number"
                  value={editingBooking.payable}
                  onChange={(e) => setEditingBooking({ ...editingBooking, payable: parseFloat(e.target.value) || 0 })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Profit</label>
                <input
                  type="number"
                  value={editingBooking.profit}
                  onChange={(e) => setEditingBooking({ ...editingBooking, profit: parseFloat(e.target.value) || 0 })}
                  className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-6 py-2 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <FaSave /> Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBookingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative text-center">
            <FaTrash className="mx-auto text-red-500 text-4xl mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setDeletingBookingId(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingBookingId)}
                disabled={saving}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HoetlDetAdminSide;
