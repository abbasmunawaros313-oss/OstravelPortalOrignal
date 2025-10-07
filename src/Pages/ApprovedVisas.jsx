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
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      navigate("/login"); // Redirect if not logged in
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
        
        // Sort by date descending to ensure the latest record is processed first
        const sortedData = raw.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        
        // Keep only the most recent entry for each passport-country combination
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
  }, [user, navigate]);

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
        return bookingDate >= startDate && bookingDate <= today;
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
  
  // NEW: Handler for the edit form with auto-calculation
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...editData, [name]: value };

    // Re-calculate fees and profit whenever a relevant field changes
    const total = Number(updatedData.totalFee) || 0;
    const received = Number(updatedData.receivedFee) || 0;
    const embassy = Number(updatedData.embassyFee) || 0;
    const vendor = Number(updatedData.vendorFee) || 0;

    updatedData.remainingFee = total - received;
    updatedData.profit = total - embassy - vendor;

    setEditData(updatedData);
  };


  // MODIFIED: Populates edit form with all correct data
  const startEdit = (booking) => {
    if (!user || booking.userId !== user.uid) {
      toast.error("You can only edit your own records.");
      return;
    }
    setEditing(booking.id);
    // Set all fields from the booking object to ensure the form is fully populated
    setEditData({ ...booking });
  };

  // MODIFIED: Rewritten for correctness and completeness
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
        toast.error("You do not have permission to update this record.");
        return;
      }
      
      // Prepare data for update, ensuring types are correct
      const updateData = {
        ...editData,
        // Convert number fields to numbers, defaulting to 0
        totalFee: Number(editData.totalFee) || 0,
        receivedFee: Number(editData.receivedFee) || 0,
        remainingFee: Number(editData.remainingFee) || 0,
        profit: Number(editData.profit) || 0,
        embassyFee: Number(editData.embassyFee) || 0,
        vendorFee: Number(editData.vendorFee) || 0,
        // Trim string fields to remove whitespace
        passport: (editData.passport || "").trim(),
        fullName: (editData.fullName || "").trim(),
        country: (editData.country || "").trim(),
        email: (editData.email || "").trim(),
        phone: (editData.phone || "").trim(),
        reference: (editData.reference || "").trim(),
        vendor: (editData.vendor || "").trim(),
        vendorContact: (editData.vendorContact || "").trim(),
      };
      // remove id from data to avoid saving it back to the document
      delete updateData.id; 

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
      case "Approved": return "bg-green-600";
      case "Rejected": return "bg-red-600";
      case "Processing": return "bg-yellow-600";
      default: return "bg-gray-600";
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
// Just before return (
const inputClass = "w-full bg-gray-800 text-white rounded-lg px-4 py-3 mt-1 border border-gray-700 focus:ring-2 focus:ring-blue-500";

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

      {/* ===================== EDIT MODAL ===================== */}
{editing && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 w-full max-w-5xl relative my-8">
      <button
        onClick={cancelEdit}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <FaTimes size={24} />
      </button>
      <h2 className="text-2xl font-bold text-white mb-6">Edit Visa Record</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div>
          <label className="block text-sm font-medium text-gray-400">Full Name</label>
          <input type="text" name="fullName" value={editData.fullName || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Passport Number</label>
          <input type="text" name="passport" value={editData.passport || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Expiry Date</label>
          <input type="date" name="expiryDate" value={editData.expiryDate || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Email</label>
          <input type="email" name="email" value={editData.email || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Phone</label>
          <input type="text" name="phone" value={editData.phone || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Country</label>
          <input type="text" name="country" value={editData.country || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Visa Type</label>
          <input type="text" name="visaType" value={editData.visaType || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>

        {/* Embassy Info */}
        <div>
          <label className="block text-sm font-medium text-gray-400">Sent to Embassy</label>
          <input type="text" name="sentToEmbassy" value={editData.sentToEmbassy || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Received from Embassy</label>
          <input type="text" name="receivedFromEmbassy" value={editData.receivedFromEmbassy || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Reference</label>
          <input type="text" name="reference" value={editData.reference || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>

        {/* Financials */}
        <div>
          <label className="block text-sm font-medium text-gray-400">Total Fee</label>
          <input type="number" name="totalFee" value={editData.totalFee || ""} onChange={handleEditChange}
            className="inputbox" readOnly/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Received Fee</label>
          <input type="number" name="receivedFee" value={editData.receivedFee || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Remaining Fee</label>
          <input type="number" readOnly value={editData.remainingFee || 0}
            className="bg-gray-700 text-gray-300 rounded-lg px-4 py-3 mt-1 border border-gray-600 cursor-not-allowed w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Embassy Fee</label>
          <input type="number" name="embassyFee" value={editData.embassyFee || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Vendor Fee</label>
          <input type="number" name="vendorFee" value={editData.vendorFee || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Profit</label>
          <input type="number" readOnly value={editData.profit || 0}
            className="bg-gray-700 text-gray-300 rounded-lg px-4 py-3 mt-1 border border-gray-600 cursor-not-allowed w-full" />
        </div>

        {/* Vendor Info */}
        <div>
          <label className="block text-sm font-medium text-gray-400">Vendor Name</label>
          <input type="text" name="vendor" value={editData.vendor || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Vendor Contact</label>
          <input type="text" name="vendorContact" value={editData.vendorContact || ""} onChange={handleEditChange}
            className="inputbox" />
        </div>

        {/* Statuses */}
        <div>
          <label className="block text-sm font-medium text-gray-400">Visa Status</label>
          <select name="visaStatus" value={editData.visaStatus || "Processing"} onChange={handleEditChange}
            className="inputbox">
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Processing">Processing</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Payment Status</label>
          <select name="paymentStatus" value={editData.paymentStatus || "Unpaid"} onChange={handleEditChange}
            className="inputbox">
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partially Paid">Partially Paid</option>
          </select>
        </div>

        {/* Remarks */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-400">Remarks</label>
          <textarea name="remarks" rows={3} value={editData.remarks || ""} onChange={handleEditChange}
            className="inputbox resize-none" />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button onClick={cancelEdit}
          className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
          disabled={saving}>
          Cancel
        </button>
        <button onClick={() => saveEdit(editing)}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={saving}>
          {saving ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaSave /> Save Changes</>}
        </button>
      </div>
    </div>
  </div>
)}

      {/* ===================== VIEW MODAL ===================== */}
{viewing && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 p-8 w-full max-w-3xl relative my-8">
      <button onClick={closeView}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
        <FaTimes size={24} />
      </button>
      <h2 className="text-2xl font-bold text-white mb-6">Visa Record Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="section">
          <h3>Personal Info</h3>
          <p><b>Name:</b> {viewing.fullName}</p>
          <p><b>Passport:</b> {viewing.passport}</p>
          <p><b>Expiry:</b> {viewing.expiryDate || "-"}</p>
          <p><b>Email:</b> {viewing.email || "-"}</p>
          <p><b>Phone:</b> {viewing.phone || "-"}</p>
        </div>

        <div className="section">
          <h3>Visa Details</h3>
          <p><b>Country:</b> {viewing.country}</p>
          <p><b>Visa Type:</b> {viewing.visaType}</p>
          <p><b>Status:</b> <span className={`status ${getStatusColor(viewing.visaStatus)}`}>{viewing.visaStatus}</span></p>
          <p><b>Date:</b> {viewing.date}</p>
          <p><b>Remarks:</b> {viewing.remarks || "-"}</p>
        </div>

        <div className="section">
          <h3>Financials</h3>
          <p><b>Total Fee:</b> {viewing.totalFee}</p>
          <p><b>Received Fee:</b> {viewing.receivedFee}</p>
          <p><b>Remaining:</b> {viewing.remainingFee}</p>
          <p><b>Profit:</b> {viewing.profit}</p>
          <p><b>Payment Status:</b> {viewing.paymentStatus}</p>
        </div>

        <div className="section">
          <h3>Embassy & Vendor</h3>
          <p><b>Sent to Embassy:</b> {viewing.sentToEmbassy || "-"}</p>
          <p><b>Received from Embassy:</b> {viewing.receivedFromEmbassy || "-"}</p>
          <p><b>Reference:</b> {viewing.reference || "-"}</p>
          <p><b>Embassy Fee:</b> {viewing.embassyFee}</p>
          <p><b>Vendor:</b> {viewing.vendor || "-"}</p>
          <p><b>Vendor Contact:</b> {viewing.vendorContact || "-"}</p>
          <p><b>Vendor Fee:</b> {viewing.vendorFee}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={closeView} className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors">
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
