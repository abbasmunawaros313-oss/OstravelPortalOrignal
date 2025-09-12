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
    FaEye,
    FaInfo,
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
    const [viewingBooking, setViewingBooking] = useState(null); // New state for viewing details
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

    const handleView = (booking) => { // New function to handle view button click
        setViewingBooking(booking);
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
        <div>
            <AdminNavbar />
        </div>

        <div className="relative min-h-screen bg-black overflow-hidden font-sans text-gray-100">
           

            {/* Background Animations */}
            <div className="fixed inset-0 z-0 bg-travel-grid">
                <div className="absolute inset-0 bg-black/80"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-green-900/10 animate-fade-in"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-dashed border-blue-500/30 rounded-full animate-rotate-slow"></div>
                <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-500/20 blur-3xl animate-blob-pulse-1"></div>
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-green-500/20 blur-3xl animate-blob-pulse-2"></div>
            </div>

            <div className="relative z-20 max-w-7xl mx-auto w-full p-6">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center drop-shadow-md">
                    Hotel Bookings Admin Dashboard 🏨
                </h2>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-fade-in-up">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-600/20 text-green-400 rounded-full">
                                <FaArrowDown size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Received</p>
                                <p className="text-2xl font-bold text-white">
                                    PKR {totalReceived.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-fade-in-up delay-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-600/20 text-red-400 rounded-full">
                                <FaArrowUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Payable</p>
                                <p className="text-2xl font-bold text-white">
                                    PKR {totalPayable.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-fade-in-up delay-200">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full">
                                <FaDollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Profit</p>
                                <p className="text-2xl font-bold text-white">
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
                            className="w-full pl-5 pr-14 py-3 rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            className="absolute right-0 top-0 h-full px-5 bg-blue-600 text-white rounded-r-xl hover:bg-blue-700 transition-colors"
                        >
                            <FaSearch />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "all" ? "bg-blue-600 text-white shadow-md" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                            onClick={() => setFilter("all")}
                        >
                            All
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "today" ? "bg-blue-600 text-white shadow-md" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                            onClick={() => setFilter("today")}
                        >
                            <FaCalendarDay /> Today
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "yesterday" ? "bg-blue-600 text-white shadow-md" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                            onClick={() => setFilter("yesterday")}
                        >
                            <FaCalendarAlt /> Yesterday
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "week" ? "bg-blue-600 text-white shadow-md" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                            onClick={() => setFilter("week")}
                        >
                            <FaCalendarWeek /> This Week
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${filter === "month" ? "bg-blue-600 text-white shadow-md" : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                            onClick={() => setFilter("month")}
                        >
                            <FaCalendar /> This Month
                        </button>
                    </div>
                </div>

                {/* Bookings Table */}
                <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-700/50 text-gray-300">
                            <tr>
                                <th className="p-3 text-center">S. No.</th>
                                <th className="p-3">Booking Details</th>
                                <th className="p-3">Client</th>
                                <th className="p-3">Financials</th>
                                <th className="p-3 text-center">Employee</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchedAndFilteredBookings.length > 0 ? (
                                searchedAndFilteredBookings.map((b, index) => (
                                    <tr key={b.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                                        <td className="p-3 text-center font-medium text-gray-300">{index + 1}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 text-white font-medium"><FaBuilding className="text-gray-400" /> {b.property}</div>
                                            <div className="text-xs text-gray-500 mt-1">ID: {b.bookingId}</div>
                                            <div className="text-xs text-gray-500">
                                                Arrival: {b.arrivalDate}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Departure: {b.departureDate}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 font-medium text-white"><FaUser className="text-gray-400"/> {b.clientName}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                <FaBed /> Nights: {b.nightsStayed}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                <FaInfoCircle /> Rooms: {b.numberOfRooms}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-green-400 flex items-center gap-2">
                                                <FaArrowDown /> PKR {b.received}
                                            </div>
                                            <div className="text-red-400 flex items-center gap-2">
                                                <FaArrowUp /> PKR {b.payable}
                                            </div>
                                            <div className="text-blue-400 font-bold flex items-center gap-2">
                                                <FaDollarSign /> PKR {b.profit}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center text-gray-400">{b.userEmail || "N/A"}</td>
                                        <td className="p-3 flex gap-3 justify-center">
                                            {/* New "View" button */}
                                            <button
                                                onClick={() => handleView(b)}
                                                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-gray-700"
                                                title="View Details"
                                            >
                                                <FaEye />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(b)}
                                                className="text-blue-500 hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-gray-700"
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => setDeletingBookingId(b.id)}
                                                className="text-red-500 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-gray-700"
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-70 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative border border-gray-700 transform transition-all duration-300 scale-95 animate-scale-in">
                        <h3 className="text-2xl font-bold text-white mb-6">Edit Booking</h3>
                        <button
                            onClick={() => setEditingBooking(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <FaTimes size={24} />
                        </button>
                        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Client Name</label>
                                <input
                                    type="text"
                                    value={editingBooking.clientName}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, clientName: e.target.value })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Booking ID</label>
                                <input
                                    type="text"
                                    value={editingBooking.bookingId}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, bookingId: e.target.value })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Property</label>
                                <input
                                    type="text"
                                    value={editingBooking.property}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, property: e.target.value })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Arrival Date</label>
                                <input
                                    type="date"
                                    value={editingBooking.arrivalDate}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, arrivalDate: e.target.value })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Departure Date</label>
                                <input
                                    type="date"
                                    value={editingBooking.departureDate}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, departureDate: e.target.value })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Received</label>
                                <input
                                    type="number"
                                    value={editingBooking.received}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, received: parseFloat(e.target.value) || 0 })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Payable</label>
                                <input
                                    type="number"
                                    value={editingBooking.payable}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, payable: parseFloat(e.target.value) || 0 })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-400">Profit</label>
                                <input
                                    type="number"
                                    value={editingBooking.profit}
                                    onChange={(e) => setEditingBooking({ ...editingBooking, profit: parseFloat(e.target.value) || 0 })}
                                    className="p-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>
                            {/* Add other fields here if needed */}
                            <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingBooking(null)}
                                    className="px-6 py-2 rounded-lg text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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

            {/* View Details Modal - New addition */}
            {viewingBooking && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-70 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative border border-gray-700 transform transition-all duration-300 scale-95 animate-scale-in">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <FaInfoCircle /> Booking Details
                        </h3>
                        <button
                            onClick={() => setViewingBooking(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <FaTimes size={24} />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-300">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Client Name</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.clientName}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Booking ID</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.bookingId}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Property</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.property}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Arrival Date</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.arrivalDate}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Departure Date</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.departureDate}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Nights Stayed</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.nightsStayed}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Number of Rooms</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.numberOfRooms}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Number of Adults</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.numberOfAdults}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Number of Children</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.numberOfChildren}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Payment Method</label>
                                <p className="text-lg font-semibold text-white flex items-center gap-2"><FaCreditCard /> {viewingBooking.paymentMethod}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Total Received</label>
                                <p className="text-lg font-semibold text-green-400">PKR {viewingBooking.received}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Total Payable</label>
                                <p className="text-lg font-semibold text-red-400">PKR {viewingBooking.payable}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Profit</label>
                                <p className="text-lg font-semibold text-blue-400">PKR {viewingBooking.profit}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-400">Notes</label>
                                <p className="text-lg font-semibold text-white">{viewingBooking.notes || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingBookingId && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-70 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md relative text-center border border-gray-700 transform transition-all duration-300 scale-95 animate-scale-in">
                        <FaTrash className="mx-auto text-red-500 text-4xl mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete this booking? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setDeletingBookingId(null)}
                                className="px-6 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 transition-colors"
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
            <style jsx>{`
                .bg-travel-grid {
                    background-image: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%), linear-gradient(to right, transparent 50%, rgba(0,100,255,0.05) 50%), linear-gradient(to bottom, transparent 50%, rgba(0,100,255,0.05) 50%);
                    background-size: 50px 50px, 50px 50px;
                    animation: grid-pan 60s linear infinite;
                }
                @keyframes grid-pan {
                    from { background-position: 0 0, 0 0; }
                    to { background-position: 50px 50px, 50px 50px; }
                }
                .animate-rotate-slow { animation: rotate-slow 120s linear infinite; }
                @keyframes rotate-slow {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .animate-blob-pulse-1 { animation: blob-pulse 20s ease-in-out infinite; }
                .animate-blob-pulse-2 { animation: blob-pulse 18s ease-in-out infinite reverse; }
                @keyframes blob-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
            `}</style>
        </div>
        </>
    );
}

export default HoetlDetAdminSide;
