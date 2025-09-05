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
  orderBy,
  addDoc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function ApprovedVisas() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Only query by userId - avoid composite index requirement
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

        // Sort by date in memory (descending) to avoid index requirement
        const sortedData = raw.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB - dateA;
        });

        // Filter by status in memory to avoid composite index requirement
        let filteredData = sortedData;
        if (filter !== "All") {
          filteredData = sortedData.filter(booking => booking.visaStatus === filter);
        }

        // ✅ Remove duplicates by passport (keep first/latest)
              const unique = [];
                const seen = new Set();
                 for (const b of filteredData) {
                  const key = `${b.passport || ""}-${b.country || ""}`; // unique per passport+country
                   if (!seen.has(key)) {
                    unique.push(b);
                     seen.add(key);
                        }
                     }

        setBookings(unique);
      },
      (error) => {
        console.error("Error fetching bookings:", error);
        toast.error("Error loading bookings: " + error.message);
      }
    );

    return () => unsubscribe();
  }, [filter, user]);

  // ✅ FIXED: Check if document exists before updating
  const handleUpdate = async (id, field, value) => {
    if (!user) {
      toast.error("You must be logged in to update records.");
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, "bookings", id);
      
      // Check if document exists and belongs to current user
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        toast.error("Document not found. It may have been deleted.");
        return;
      }

      const docData = docSnap.data();
      if (docData.userId !== user.uid) {
        toast.error("You can only update your own records.");
        return;
      }

      await updateDoc(docRef, { [field]: value });
      toast.success(`${field} updated successfully`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const startEdit = (booking) => {
    if (!user || booking.userId !== user.uid) {
      toast.error("You can only edit your own records.");
      return;
    }

    setEditing(booking.id);
    // Make sure we have all fields
    setEditData({
      passport: booking.passport || "",
      fullName: booking.fullName || "",
      visaType: booking.visaType || "",
      country: booking.country || "",
      date: booking.date || "",
      totalFee: booking.totalFee || "",
      receivedFee: booking.receivedFee || "",
      remainingFee: booking.remainingFee || "",
      paymentStatus: booking.paymentStatus || "Unpaid",
      visaStatus: booking.visaStatus || "Processing",
    });
  };

 
 // ✅ FIXED: Check duplicate by passport + country
const checkDuplicatePassport = async (passportNumber, country, excludeId = null) => {
  if (!user || !passportNumber || passportNumber.trim() === "") {
    return false; // Empty passport is not a duplicate
  }

  try {
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      where("passport", "==", passportNumber.trim()),
      where("country", "==", (country || "").trim()) // ✅ check country too
    );
    const snapshot = await getDocs(q);

    // Check if any document with this passport+country exists (excluding current one)
    const duplicates = snapshot.docs.filter(doc => doc.id !== excludeId);

    if (duplicates.length > 0) {
      console.log("Duplicate found:", passportNumber, country);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return false;
  }
};


  // ✅ FIXED: Save edited data with better validation
  const saveEdit = async (id) => {
    if (!user) {
      toast.error("You must be logged in to update records.");
      return;
    }

    try {
      setLoading(true);

      // Validation
      if (!editData.passport || !editData.passport.trim()) {
        toast.error("Passport number is required!");
        return;
      }

      if (!editData.fullName || !editData.fullName.trim()) {
        toast.error("Full name is required!");
        return;
      }

      // Check if document exists and belongs to current user
      const docRef = doc(db, "bookings", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        toast.error("Document not found. It may have been deleted.");
        setEditing(null);
        setEditData({});
        return;
      }

      const docData = docSnap.data();
      if (docData.userId !== user.uid) {
        toast.error("You can only update your own records.");
        return;
      }

      // Check for duplicate passport (excluding current document)
      const isDuplicate = await checkDuplicatePassport(editData.passport, id);
      if (isDuplicate) {
        toast.error(`Passport number "${editData.passport}" already exists in your records!`);
        return;
      }

      // Prepare update data - only include non-empty fields
      const updateData = {};
      if (editData.passport) updateData.passport = editData.passport.trim();
      if (editData.fullName) updateData.fullName = editData.fullName.trim();
      if (editData.visaType) updateData.visaType = editData.visaType.trim();
      if (editData.country) updateData.country = editData.country.trim();
      if (editData.date) updateData.date = editData.date;
      if (editData.totalFee) updateData.totalFee = editData.totalFee;
      if (editData.receivedFee) updateData.receivedFee = editData.receivedFee;
      if (editData.remainingFee) updateData.remainingFee = editData.remainingFee;
      if (editData.paymentStatus) updateData.paymentStatus = editData.paymentStatus;
      if (editData.visaStatus) updateData.visaStatus = editData.visaStatus;

      await updateDoc(docRef, updateData);
      
    setEditing(null);
    setEditData({});
      toast.success("Booking updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error updating booking: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Proper delete with verification
  const handleDelete = async (booking) => {
    if (!user || booking.userId !== user.uid) {
      toast.error("You can only delete your own records.");
      return;
    }

    // Confirmation dialog
    const confirmMessage = `Are you sure you want to delete the booking for:\n\nName: ${booking.fullName}\nPassport: ${booking.passport}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);

      // First check if document exists and belongs to current user
      const bookingRef = doc(db, "bookings", booking.id);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        toast.error("Document not found. It may have already been deleted.");
        return;
      }

      const docData = bookingSnap.data();
      if (docData.userId !== user.uid) {
        toast.error("You can only delete your own records.");
        return;
      }

      // Save to deletedBookings collection first
      const deletedData = {
        ...bookingSnap.data(),
        originalId: booking.id,
        deletedAt: new Date().toISOString(),
        deletedBy: user.email,
      };

      // Use a new ID for deleted bookings or use the same ID
      await setDoc(doc(db, "deletedBookings", booking.id), deletedData);
      console.log("Saved to deletedBookings:", booking.id);

      // Then delete from bookings
      await deleteDoc(bookingRef);
      console.log("Deleted from bookings:", booking.id);

      toast.success(`Booking for ${booking.fullName} has been deleted successfully!`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Error deleting booking: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  // Debug function to check for records without userId
  const debugCheckRecords = async () => {
    if (!user) return;
    
    try {
      console.log("🔍 Debug: Checking all records for user:", user.uid);
      
      // Check records with userId
      const userQuery = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      console.log("📊 Records with userId:", userSnapshot.docs.length);
      
      // Check records without userId (legacy data)
      const allQuery = query(collection(db, "bookings"));
      const allSnapshot = await getDocs(allQuery);
      const recordsWithoutUserId = allSnapshot.docs.filter(doc => !doc.data().userId);
      console.log("⚠️ Records without userId:", recordsWithoutUserId.length);
      
      if (recordsWithoutUserId.length > 0) {
        console.log("📋 Sample records without userId:", recordsWithoutUserId.slice(0, 3).map(doc => ({ id: doc.id, ...doc.data() })));
      }
      
      toast.success(`Debug: ${userSnapshot.docs.length} user records, ${recordsWithoutUserId.length} without userId`);
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Debug failed");
    }
  };

  // Show message if not logged in
  if (!user) {
    return (
      <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to view your visa records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Visa Records</h1>

        <div className="flex gap-4 items-center">
          {/* User Info */}
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            Logged in as: <span className="font-semibold">{user.email}</span>
          </div>
          
          {/* Debug Button */}
          <button
            onClick={async () => {
              if (!user) return;
              try {
                console.log("🔍 Debug: Checking all records for user:", user.uid);
                const userQuery = query(collection(db, "bookings"), where("userId", "==", user.uid));
                const userSnapshot = await getDocs(userQuery);
                const allQuery = query(collection(db, "bookings"));
                const allSnapshot = await getDocs(allQuery);
                const recordsWithoutUserId = allSnapshot.docs.filter(doc => !doc.data().userId);
                console.log("📊 Records with userId:", userSnapshot.docs.length);
                console.log("⚠️ Records without userId:", recordsWithoutUserId.length);
                toast.success(`Debug: ${userSnapshot.docs.length} user records, ${recordsWithoutUserId.length} without userId`);
              } catch (error) {
                console.error("Debug error:", error);
                toast.error("Debug failed");
              }
            }}
            className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors"
            title="Debug: Check data records"
          >
            🐛 Debug
          </button>
          
          {/* Loading indicator */}
          {loading && (
            <span className="text-blue-600 animate-pulse">Processing...</span>
          )}

        {/* Status Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 shadow-sm"
        >
            <option value="All">All Status</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Processing">Processing</option>
        </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Passport</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Visa Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total Fee</th>
              <th className="px-4 py-3">Received Fee</th>
              <th className="px-4 py-3">Remaining Fee</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Visa Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                  No visa records found for your account
                </td>
              </tr>
            ) : (
              bookings.map((b, index) => (
                <tr key={b.id} className="border-b hover:bg-gray-50 transition-colors">
                {editing === b.id ? (
                    // ✅ Edit Mode
                  <>
                      <td className="px-4 py-2 font-medium text-gray-600">
                        {index + 1}
                      </td>
                    <td className="px-4 py-2">
                      <input
                          value={editData.passport}
                        onChange={(e) =>
                          setEditData({ ...editData, passport: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Passport Number *"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                          value={editData.fullName}
                        onChange={(e) =>
                          setEditData({ ...editData, fullName: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Full Name *"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                          value={editData.visaType}
                        onChange={(e) =>
                          setEditData({ ...editData, visaType: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Visa Type"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                          value={editData.country}
                        onChange={(e) =>
                          setEditData({ ...editData, country: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Country"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                          type="date"
                          value={editData.date}
                        onChange={(e) =>
                          setEditData({ ...editData, date: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                          type="number"
                          value={editData.totalFee}
                        onChange={(e) =>
                          setEditData({ ...editData, totalFee: e.target.value })
                        }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Fee"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editData.receivedFee}
                          onChange={(e) =>
                            setEditData({ ...editData, receivedFee: e.target.value })
                          }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Received Fee"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editData.remainingFee}
                          onChange={(e) =>
                            setEditData({ ...editData, remainingFee: e.target.value })
                          }
                          className="border px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Remaining Fee"
                          disabled={loading}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editData.paymentStatus}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            paymentStatus: e.target.value,
                          })
                        }
                          className="border rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                         <option value="Partially Paid">Partially Paid</option>  
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editData.visaStatus}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            visaStatus: e.target.value,
                          })
                        }
                          className="border rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Processing">Processing</option>
                      </select>
                    </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(b.id)}
                            disabled={loading}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                            {loading ? "..." : "Save"}
                      </button>
                      <button
                            onClick={cancelEdit}
                            disabled={loading}
                            className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                        </div>
                    </td>
                  </>
                ) : (
                    // ✅ View Mode
                    <>
                      <td className="px-4 py-2 font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 font-mono text-sm">
                        {b.passport || "-"}
                      </td>
                      <td className="px-4 py-2 font-medium">{b.fullName || "-"}</td>
                      <td className="px-4 py-2">{b.visaType || "-"}</td>
                      <td className="px-4 py-2">{b.country || "-"}</td>
                      <td className="px-4 py-2">{b.date || "-"}</td>
                      <td className="px-4 py-2">{b.totalFee || "-"}</td>
                      <td className="px-4 py-2">{b.receivedFee || "-"}</td>
                      <td className="px-4 py-2">{b.remainingFee || "-"}</td>
                    <td className="px-4 py-2">
                      <select
                          value={b.paymentStatus || "Unpaid"}
                        onChange={(e) =>
                          handleUpdate(b.id, "paymentStatus", e.target.value)
                        }
                          disabled={loading}
                          className="border rounded px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                         <option value="Partially Paid">Partially Paid</option>  
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                          value={b.visaStatus || "Processing"}
                        onChange={(e) =>
                          handleUpdate(b.id, "visaStatus", e.target.value)
                        }
                          disabled={loading}
                          className="border rounded px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Processing">Processing</option>
                      </select>
                    </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(b)}
                            disabled={loading}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                            disabled={loading}
                            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete
                      </button>
                        </div>
                    </td>
                  </>
                )}
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Debug Info - Remove in production */}
      <div className="mt-4 text-xs text-gray-500">
        Total Records: {bookings.length} | 
        Filtered by: {filter} | 
        {editing && ` Editing: ${editing}`}
      </div>
    </div>
  );
}
