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
    FaTrash,
    FaUserTie,
    FaMoneyBillWave,
    FaChartLine,
    FaCheck,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaSpinner,
    FaDollarSign,
    FaFilter,
    FaCalendarAlt,
    FaEye
} from "react-icons/fa";

// A reusable modal component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
                <div className="flex justify-between items-center p-5 border-b border-gray-700 sticky top-0 bg-gray-800">
                    <h3 className="text-xl font-bold text-gray-50">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function UmmrahBookingDet() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [filterVendor, setFilterVendor] = useState("all");
    const [filterEmployee, setFilterEmployee] = useState("all");
    const [editingBooking, setEditingBooking] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null);
    const [editData, setEditData] = useState({});
    const [summaryFilter, setSummaryFilter] = useState("all");
    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        const q = query(collection(db, "ummrahBookings"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setBookings(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filterByDateRange = (data) => {
        const now = new Date();
        const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return data.filter((b) => {
            if (!b.createdAt) return false;
            const created = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            const createdStartOfDay = startOfDay(created);

            switch (summaryFilter) {
                case "today":
                    return createdStartOfDay.getTime() === startOfDay(now).getTime();
                case "yesterday":
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    return createdStartOfDay.getTime() === startOfDay(yesterday).getTime();
                case "last7days":
                    const sevenDaysAgo = new Date(now);
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    return created >= sevenDaysAgo;
                case "last30days":
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    return created >= thirtyDaysAgo;
                case "all":
                default:
                    return true;
            }
        });
    };

    const vendors = [...new Set(bookings.map((b) => b.vendor).filter(Boolean))];
    const employees = [...new Set(bookings.map((b) => b.createdByEmail).filter(Boolean))];

    const filtered = bookings
        .filter((b) => {
            const q = search.toLowerCase();
            const matchesSearch =
                b.fullName?.toLowerCase().includes(q) ||
                b.passportNumber?.toLowerCase().includes(q) ||
                b.phone?.toLowerCase().includes(q);
            const matchesVendor = filterVendor === "all" || b.vendor === filterVendor;
            const matchesEmp = filterEmployee === "all" || b.createdByEmail === filterEmployee;
            return matchesSearch && matchesVendor && matchesEmp;
        });

    const paginated = filterByDateRange(filtered).slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const totalPages = Math.ceil(filterByDateRange(filtered).length / rowsPerPage);

    const filteredForSummary = filterByDateRange(bookings);
    const totalReceived = filteredForSummary.reduce((acc, b) => acc + Number(b.received || 0), 0);
    const totalPayable = filteredForSummary.reduce((acc, b) => acc + Number(b.payable || 0), 0);
    const totalProfit = totalReceived - totalPayable;

    const startEdit = (b) => {
        setEditingBooking(b);
        setEditData({ ...b });
    };

    const startView = (b) => {
        setViewingBooking(b);
    };

    const saveEdit = async () => {
        if (!editingBooking) return;
        setSaving(true);
        try {
            const docRef = doc(db, "ummrahBookings", editingBooking.id);
            const payload = {
                ...editData,
                profit: Number(editData.received || 0) - Number(editData.payable || 0),
            };
            await updateDoc(docRef, payload);
            toast.success("Booking updated!");
            setEditingBooking(null);
            setEditData({});
        } catch (err) {
            toast.error("Update failed");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const deleteBooking = async (id) => {
        if (!window.confirm("Are you sure you want to delete this booking?")) return;
        try {
            await deleteDoc(doc(db, "ummrahBookings", id));
            toast.success("Booking deleted successfully!");
        } catch (err) {
            toast.error("Delete failed");
            console.error(err);
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
            <AdminNavbar />
            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h1 className="text-3xl font-extrabold text-blue-400 drop-shadow">
                        📊 Umrah Bookings Dashboard
                    </h1>
                    <div className="relative w-full sm:w-auto">
                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        <select
                            value={summaryFilter}
                            onChange={(e) => setSummaryFilter(e.target.value)}
                            className="py-2 pl-9 pr-4 rounded-lg border border-gray-700 bg-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-full text-gray-300"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last7days">Last 7 Days</option>
                            <option value="last30days">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-2xl shadow-lg bg-green-900 border border-gray-700 transition-transform duration-200 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Total Received</h3>
                            <div className="p-2 rounded-full bg-gray-900 text-green-400">
                                <FaMoneyBillWave size={20} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-50">
                            PKR {totalReceived.toLocaleString()}
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl shadow-lg bg-gray-800 border border-gray-700 transition-transform duration-200 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Total Payable</h3>
                            <div className="p-2 rounded-full bg-red-900 text-red-400">
                                <FaDollarSign size={20} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-50">
                            PKR {totalPayable.toLocaleString()}
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl shadow-lg bg-yellow-700 border border-gray-700 transition-transform duration-200 hover:scale-[1.02]">
                        <div className="flex items-center justify-between ">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Profit</h3>
                            <div className="p-2 rounded-full bg-blue-900 text-blue-400">
                                <FaChartLine size={20} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-50">
                            PKR {totalProfit.toLocaleString()}
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl shadow-lg bg-gray-800 border border-gray-700 transition-transform duration-200 hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Bookings</h3>
                            <div className="p-2 rounded-full bg-purple-900 text-purple-400">
                                <FaUserTie size={20} />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-50">{filteredForSummary.length}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700">
                    <div className="relative flex-1 w-full">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, passport, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            <select
                                value={filterVendor}
                                onChange={(e) => setFilterVendor(e.target.value)}
                                className="pl-9 pr-4 py-3 rounded-lg border border-gray-700 bg-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-full text-gray-300"
                            >
                                <option value="all">All Vendors</option>
                                {vendors.map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <FaUserTie className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            <select
                                value={filterEmployee}
                                onChange={(e) => setFilterEmployee(e.target.value)}
                                className="pl-9 pr-4 py-3 rounded-lg border border-gray-700 bg-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-full text-gray-300"
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
                </div>

                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    {loading ? (
                        <p className="text-center py-10 text-gray-400">Loading...</p>
                    ) : paginated.length === 0 ? (
                        <p className="text-center py-10 text-gray-500">No bookings found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">#</th>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">Phone</th>
                                        <th className="px-4 py-3 font-semibold">Passport</th>
                                        <th className="px-4 py-3 font-semibold">Vendor</th>
                                        <th className="px-4 py-3 font-semibold">Employee</th>
                                        <th className="px-4 py-3 font-semibold">Payable</th>
                                        <th className="px-4 py-3 font-semibold">Received</th>
                                        <th className="px-4 py-3 font-semibold">Profit</th>
                                        <th className="px-4 py-3 font-semibold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((b, i) => (
                                        <tr key={b.id} className="border-t border-gray-700 hover:bg-gray-700 transition-colors">
                                            <td className="px-4 py-3 text-gray-300">{i + 1 + (page - 1) * rowsPerPage}</td>
                                            <td className="px-4 py-3 font-medium text-gray-50">{b.fullName}</td>
                                            <td className="px-4 py-3 text-gray-300">{b.phone}</td>
                                            <td className="px-4 py-3 text-gray-300">{b.passportNumber}</td>
                                            <td className="px-4 py-3 text-gray-300">{b.vendor || "-"}</td>
                                            <td className="px-4 py-3 text-gray-300">{b.createdByEmail || "-"}</td>
                                            <td className="px-4 py-3 text-red-400 font-medium">PKR {Number(b.payable || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-green-400 font-medium">PKR {Number(b.received || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-blue-400 font-bold">
                                                PKR {(b.profit ?? Number(b.received || 0) - Number(b.payable || 0)).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 flex gap-2 justify-center">
                                                <button onClick={() => startView(b)} className="p-2 text-gray-400 hover:text-gray-200 transition-colors" title="View Details">
                                                    <FaEye />
                                                </button>
                                                <button onClick={() => startEdit(b)} className="p-2 text-blue-400 hover:text-blue-200 transition-colors" title="Edit Booking">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => deleteBooking(b.id)} className="p-2 text-red-400 hover:text-red-200 transition-colors" title="Delete Booking">
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {paginated.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-2 px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            <FaChevronLeft /> Previous
                        </button>
                        <span className="text-gray-400">
                            Page <span className="font-semibold text-gray-200">{page}</span> of <span className="font-semibold text-gray-200">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex items-center gap-2 px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Next <FaChevronRight />
                        </button>
                    </div>
                )}
            </main>
            <Footer />

            {/* View Modal */}
            <Modal isOpen={!!viewingBooking} onClose={() => setViewingBooking(null)} title="Booking Details">
                {viewingBooking && (
                    <div className="space-y-4 text-gray-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Full Name:</p>
                                <p>{viewingBooking.fullName}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Phone:</p>
                                <p>{viewingBooking.phone}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Passport Number:</p>
                                <p>{viewingBooking.passportNumber}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Visa Number:</p>
                                <p>{viewingBooking.visaNumber || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Vendor:</p>
                                <p>{viewingBooking.vendor || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Created By:</p>
                                <p>{viewingBooking.createdByEmail || 'N/A'}</p>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-200 mt-6">Financials</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Payable:</p>
                                <p className="text-red-400">PKR {Number(viewingBooking.payable || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Received:</p>
                                <p className="text-green-400">PKR {Number(viewingBooking.received || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Profit:</p>
                                <p className="text-blue-400">PKR {(Number(viewingBooking.received || 0) - Number(viewingBooking.payable || 0)).toLocaleString()}</p>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-200 mt-6">Hotel Details</h4>
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Makkah Hotel:</p>
                                <p>{viewingBooking.makkahHotel || 'N/A'}</p>
                                <p>Check-in: {viewingBooking.makkahCheckIn || 'N/A'} | Check-out: {viewingBooking.makkahCheckOut || 'N/A'} | Nights: {viewingBooking.makkahNights || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Madinah Hotel:</p>
                                <p>{viewingBooking.madinahHotel || 'N/A'}</p>
                                <p>Check-in: {viewingBooking.madinahCheckIn || 'N/A'} | Check-out: {viewingBooking.madinahCheckOut || 'N/A'} | Nights: {viewingBooking.madinahNights || 'N/A'}</p>
                            </div>
                            {viewingBooking.makkahagainhotel && (
                                <div className="p-3 bg-gray-900 rounded-md">
                                    <p className="font-bold text-gray-400">Makkah Hotel (Again):</p>
                                    <p>{viewingBooking.makkahagainhotel}</p>
                                    <p>Check-in: {viewingBooking.makkahCheckInagain || 'N/A'} | Check-out: {viewingBooking.makkahCheckOutagain || 'N/A'} | Nights: {viewingBooking.makkahagainNights || 'N/A'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={!!editingBooking} onClose={() => setEditingBooking(null)} title="Edit Booking">
                {editingBooking && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="fullName">Full Name</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="fullName" type="text" name="fullName" value={editData.fullName || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="phone">Phone</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="phone" type="text" name="phone" value={editData.phone || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="passportNumber">Passport Number</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="passportNumber" type="text" name="passportNumber" value={editData.passportNumber || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="visaNumber">Visa Number</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="visaNumber" type="text" name="visaNumber" value={editData.visaNumber || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="vendor">Vendor</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="vendor" type="text" name="vendor" value={editData.vendor || ""} onChange={handleEditChange} />
                            </div>
                            <div className="p-3 bg-gray-900 rounded-md">
                                <p className="font-bold text-gray-400">Created By:</p>
                                <p>{editingBooking.createdByEmail || 'N/A'}</p>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-200 mt-6">Financials</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="payable">Payable</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="payable" type="number" name="payable" value={editData.payable || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="received">Received</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="received" type="number" name="received" value={editData.received || ""} onChange={handleEditChange} />
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-200 mt-6">Hotel Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahHotel">Makkah Hotel</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahHotel" type="text" name="makkahHotel" value={editData.makkahHotel || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahNights">Makkah Nights</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahNights" type="number" name="makkahNights" value={editData.makkahNights || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahCheckIn">Makkah Check-in</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahCheckIn" type="date" name="makkahCheckIn" value={editData.makkahCheckIn || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahCheckOut">Makkah Check-out</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahCheckOut" type="date" name="makkahCheckOut" value={editData.makkahCheckOut || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="madinahHotel">Madinah Hotel</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="madinahHotel" type="text" name="madinahHotel" value={editData.madinahHotel || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="madinahNights">Madinah Nights</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="madinahNights" type="number" name="madinahNights" value={editData.madinahNights || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="madinahCheckIn">Madinah Check-in</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="madinahCheckIn" type="date" name="madinahCheckIn" value={editData.madinahCheckIn || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="madinahCheckOut">Madinah Check-out</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="madinahCheckOut" type="date" name="madinahCheckOut" value={editData.madinahCheckOut || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahagainhotel">Makkah Hotel (Again)</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahagainhotel" type="text" name="makkahagainhotel" value={editData.makkahagainhotel || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahagainNights">Makkah Nights (Again)</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahagainNights" type="number" name="makkahagainNights" value={editData.makkahagainNights || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahCheckInagain">Makkah Check-in (Again)</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahCheckInagain" type="date" name="makkahCheckInagain" value={editData.makkahCheckInagain || ""} onChange={handleEditChange} />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="makkahCheckOutagain">Makkah Check-out (Again)</label>
                                <input className="shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 bg-gray-900 text-gray-200 leading-tight focus:outline-none focus:ring-blue-500 focus:ring-2" id="makkahCheckOutagain" type="date" name="makkahCheckOutagain" value={editData.makkahCheckOutagain || ""} onChange={handleEditChange} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                onClick={() => setEditingBooking(null)}
                                className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>\
        </div>
    );
}
