import { useEffect, useState } from "react";
import { db } from "../firebase";
import toast from "react-hot-toast";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  FaEdit,
  FaSave,
  FaTimes,
  FaSpinner,
  FaSearch,
  FaPassport,
  FaUser,
  FaGlobeAmericas,
  FaPlane,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaIdCard,
  FaEye,
} from "react-icons/fa";
import Footer from "../Components/Footer";
import { useNavigate } from "react-router-dom";

export default function ApprovedVisas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [viewing, setViewing] = useState(null); // New state for viewing details
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const raw = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedData = raw.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

        const unique = [];
        const seen = new Set();
        for (const b of sortedData) {
          const key = `${b.passport || ""}-${b.country || ""}`;
          if (!seen.has(key)) {
            unique.push(b);
            seen.add(key);
          }
        }
        setBookings(unique);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching bookings:", error);
        toast.error("Error loading bookings: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let data = [...bookings];

    if (filter !== "All") {
      data = data.filter((booking) => booking.visaStatus === filter);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate;

    switch (dateFilter) {
      case "Today":
        startDate = today;
        break;
      case "Yesterday":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        break;
      case "Last 7 Days":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "Last 30 Days":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case "All Time":
      default:
        startDate = null;
    }

    if (startDate) {
      data = data.filter((booking) => {
        if (!booking.date) return false;
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= startDate;
      });
    }

    if (searchTerm.trim() !== "") {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      data = data.filter(
        (b) =>
          b.passport?.toLowerCase().includes(lowerCaseSearchTerm) ||
          b.fullName?.toLowerCase().includes(lowerCaseSearchTerm) ||
          b.country?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    setFilteredBookings(data);
  }, [filter, dateFilter, searchTerm, bookings]);

  const startEdit = (booking) => {
    if (!user || booking.userId !== user.uid) {
      toast.error("You can only edit your own records.");
      return;
    }

    setEditing(booking.id);
    setEditData({
      ...booking,
      reference: booking.embassyFee,
      sentToEmbessy: booking.sentToEmbassy,
      reciveFromEmbessy: booking.receiveFromEmbassy,
      email: booking.email || "",
    });
  };

  const saveEdit = async (id) => {
    if (!user) {
      toast.error("You must be logged in to update records.");
      return;
    }

    try {
      setSaving(true);
      const docRef = doc(db, "bookings", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
        toast.error("You can only update your own records.");
        return;
      }

      const updateData = {
        passport:
          typeof editData.passport === "string"
            ? editData.passport.trim()
            : editData.passport || "",
        fullName:
          typeof editData.fullName === "string"
            ? editData.fullName.trim()
            : editData.fullName || "",
        visaType:
          typeof editData.visaType === "string"
            ? editData.visaType.trim()
            : editData.visaType || "",
        country:
          typeof editData.country === "string"
            ? editData.country.trim()
            : editData.country || "",
        date: editData.date || "",
        totalFee: editData.totalFee || "",
        receivedFee: editData.receivedFee || "",
        remainingFee: editData.remainingFee || "",
        paymentStatus: editData.paymentStatus || "",
        visaStatus: editData.visaStatus || "",
        embassyFee:
          typeof editData.reference === "string"
            ? editData.reference.trim()
            : editData.reference || "",
        sentToEmbassy:
          typeof editData.sentToEmbessy === "string"
            ? editData.sentToEmbessy.trim()
            : editData.sentToEmbessy || "",
        receiveFromEmbassy:
          typeof editData.reciveFromEmbessy === "string"
            ? editData.reciveFromEmbessy.trim()
            : editData.reciveFromEmbessy || "",
        email: typeof editData.email === "string"
          ? editData.email.trim()
          : editData.email || ""
      };

      if (editData.visaType === "Appointment") {
        updateData.vendorContact =
          typeof editData.vendorContact === "string"
            ? editData.vendorContact.trim()
            : editData.vendorContact || "";
        updateData.vendorFee = editData.vendorFee || "";
      } else {
        delete updateData.vendorContact;
        delete updateData.vendorFee;
      }

      await updateDoc(docRef, updateData);

      setEditing(null);
      setEditData({});
      toast.success("Booking updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error updating booking: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const viewDetails = (booking) => {
    setViewing(booking);
  };

  const closeView = () => {
    setViewing(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-600";
      case "Rejected":
        return "bg-red-600";
      case "Processing":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  if (!user) {
    return (
      <div className="p-6 min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            Access Denied
          </h2>
          <p className="text-gray-400">Please log in to view your visa records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            My Visa Records 🛂
          </h1>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, passport, country..."
                className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 placeholder-gray-400 border border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-4 py-3 shadow-sm border border-gray-700 focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="All">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Processing">Processing</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-4 py-3 shadow-sm border border-gray-700 focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center p-10 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-lg text-gray-400">No visa records found for your account based on the selected filters.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-x-auto">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-gray-400">#</th>
                  <th className="px-4 py-3 text-gray-400">Passport / Name</th>
                  <th className="px-4 py-3 text-gray-400">Country / Visa Type</th>
                  <th className="px-4 py-3 text-gray-400">Status</th>
                  <th className="px-4 py-3 text-gray-400">Financials</th>
                  <th className="px-4 py-3 text-gray-400">Embassy Info</th>
                  <th className="px-4 py-3 text-gray-400">Vendor Info</th>
                  <th className="px-4 py-3 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, index) => (
                  <tr key={b.id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-4 align-top">{index + 1}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-white">{b.fullName}</div>
                      <div className="text-gray-400 text-xs">{b.passport}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-white">{b.country}</div>
                      <div className="text-gray-400 text-xs">{b.visaType}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(b.visaStatus)}`}>
                        {b.visaStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-green-400">Total: {b.totalFee}</div>
                      <div className="text-blue-400">Received: {b.receivedFee}</div>
                      <div className="text-red-400">Remaining: {b.remainingFee}</div>
                      <div className="text-green-400">Profit: {b.profit}</div>
                      <div className="text-gray-400 text-xs">{b.paymentStatus}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-gray-300">Sent: {b.sentToEmbassy || "-"}</div>
                      <div className="text-gray-300">Received: {b.receiveFromEmbassy || "-"}</div>
                      <div className="text-gray-300">Ref: {b.reference || "-"}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-gray-300">Vendor Contact: {b.vendorContact || "-"}</div>
                      <div className="text-gray-300">Vendor Fee: {b.vendorFee || "-"}</div>
                      <div className="text-gray-300">Embassy Fee: {b.embassyFee || "-"}</div>
                    </td>
                    <td className="px-4 py-4 align-top flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => viewDetails(b)}
                        className="bg-purple-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                      >
                        <FaEye /> View
                      </button>
                      <button
                        onClick={() => startEdit(b)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        <FaEdit /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 w-full max-w-2xl relative my-8">
            <button
              onClick={cancelEdit}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Visa Record</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400">Passport Number</label>
                <div className="relative mt-1">
                  <FaPassport className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="passport"
                    value={editData.passport || ""}
                    onChange={(e) => setEditData({ ...editData, passport: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Full Name</label>
                <div className="relative mt-1">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={editData.fullName || ""}
                    onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Visa Type</label>
                <div className="relative mt-1">
                  <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="visaType"
                    value={editData.visaType || ""}
                    onChange={(e) => setEditData({ ...editData, visaType: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Country</label>
                <div className="relative mt-1">
                  <FaGlobeAmericas className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="country"
                    value={editData.country || ""}
                    onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Date</label>
                <div className="relative mt-1">
                  <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={editData.date || ""}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Total Fee</label>
                <div className="relative mt-1">
                  <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="totalFee"
                    value={editData.totalFee || ""}
                    onChange={(e) => setEditData({ ...editData, totalFee: e.target.value })}
                    disabled
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Received Fee</label>
                <div className="relative mt-1">
                  <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="receivedFee"
                    value={editData.receivedFee || ""}
                    onChange={(e) => setEditData({ ...editData, receivedFee: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Remaining Fee</label>
                <div className="relative mt-1">
                  <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="remainingFee"
                    value={editData.remainingFee || ""}
                    onChange={(e) => setEditData({ ...editData, remainingFee: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400">Payment Status</label>
                <div className="relative mt-1">
                  <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    name="paymentStatus"
                    value={editData.paymentStatus || "Unpaid"}
                    onChange={(e) => setEditData({ ...editData, paymentStatus: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Visa Status</label>
                <div className="relative mt-1">
                  <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    name="visaStatus"
                    value={editData.visaStatus || "Processing"}
                    onChange={(e) => setEditData({ ...editData, visaStatus: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Processing">Processing</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Embassy Fee</label>
                <div className="relative mt-1">
                  <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="reference"
                    value={editData.reference || ""}
                    onChange={(e) => setEditData({ ...editData, reference: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Sent to Embassy</label>
                <div className="relative mt-1">
                  <FaPlane className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="sentToEmbessy"
                    value={editData.sentToEmbessy || ""}
                    onChange={(e) => setEditData({ ...editData, sentToEmbessy: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Received from Embassy</label>
                <div className="relative mt-1">
                  <FaPlane className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="reciveFromEmbessy"
                    value={editData.reciveFromEmbessy || ""}
                    onChange={(e) => setEditData({ ...editData, reciveFromEmbessy: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Email</label>
                <div className="relative mt-1">
                  <FaPlane className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="Email"
                    value={editData.email || ""}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {editData.visaType === "Appointment" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Vendor Contact</label>
                    <div className="relative mt-1">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="vendorContact"
                        value={editData.vendorContact || ""}
                        onChange={(e) => setEditData({ ...editData, vendorContact: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Vendor Fee</label>
                    <div className="relative mt-1">
                      <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        name="vendorFee"
                        value={editData.vendorFee || ""}
                        onChange={(e) => setEditData({ ...editData, vendorFee: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg pl-12 pr-4 py-3 border border-gray-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={cancelEdit}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={() => saveEdit(editing)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={saving}
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

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 w-full max-w-2xl relative my-8">
            <button
              onClick={closeView}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <FaTimes size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Visa Record Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Personal Details</h3>
                <p className="text-sm">
                  <b className="text-gray-400">Full Name:</b>{" "}
                  <span className="text-white">{viewing.fullName}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Passport Number:</b>{" "}
                  <span className="text-white">{viewing.passport}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Expiry Date:</b>{" "}
                  <span className="text-white">{viewing.expiryDate || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Email:</b>{" "}
                  <span className="text-white">{viewing.email || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Phone:</b>{" "}
                  <span className="text-white">{viewing.phone || "-"}</span>
                </p>
              </div>

              {/* Visa & Travel Details */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Visa & Travel</h3>
                <p className="text-sm">
                  <b className="text-gray-400">Country:</b>{" "}
                  <span className="text-white">{viewing.country}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Visa Type:</b>{" "}
                  <span className="text-white">{viewing.visaType}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Visa Status:</b>{" "}
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusColor(viewing.visaStatus)}`}>
                    {viewing.visaStatus}
                  </span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Application Date:</b>{" "}
                  <span className="text-white">{viewing.date}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Remarks:</b>{" "}
                  <span className="text-white">{viewing.remarks || "-"}</span>
                </p>
              </div>

              {/* Financials */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Financials</h3>
                <p className="text-sm">
                  <b className="text-gray-400">Total Fee:</b>{" "}
                  <span className="text-green-400">{viewing.totalFee}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Received Fee:</b>{" "}
                  <span className="text-blue-400">{viewing.receivedFee}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Remaining Fee:</b>{" "}
                  <span className="text-red-400">{viewing.remainingFee}</span>
                </p>
                  <p className="text-sm">
                  <b className="text-gray-400">Profit:</b>{" "}
                  <span className="text-red-400">{viewing.profit}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Payment Status:</b>{" "}
                  <span className="text-white">{viewing.paymentStatus}</span>
                </p>
              </div>

              {/* Embassy & Vendor Info */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Embassy & Vendor</h3>
                <p className="text-sm">
                  <b className="text-gray-400">Embassy Fee:</b>{" "}
                  <span className="text-white">{viewing.embassyFee || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Reference:</b>{" "}
                  <span className="text-white">{viewing.reference || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Sent to Embassy:</b>{" "}
                  <span className="text-white">{viewing.sentToEmbassy || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Received from Embassy:</b>{" "}
                  <span className="text-white">{viewing.receiveFromEmbassy || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Vendor:</b>{" "}
                  <span className="text-white">{viewing.vendor || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Vendor Contact:</b>{" "}
                  <span className="text-white">{viewing.vendorContact || "-"}</span>
                </p>
                <p className="text-sm">
                  <b className="text-gray-400">Vendor Fee:</b>{" "}
                  <span className="text-white">{viewing.vendorFee || "-"}</span>
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={closeView}
                className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
