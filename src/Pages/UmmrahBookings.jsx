import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaHotel,
  FaPhoneAlt,
  FaPassport,
  FaTimes,
  FaEdit,
  FaSave,
  FaCalendarAlt,
} from "react-icons/fa";
import Footer from "../Components/Footer";

export default function UmmrahBookings() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    passportNumber: "",
    visaNumber: "",
    makkahHotel: "",
    makkahCheckIn: "",
    makkahCheckOut: "",
    makkahNights: "",
    madinahHotel: "",
    madinahCheckIn: "",
    madinahCheckOut: "",
    madinahNights: "",
    makkahCheckInagain: "",
    makkahCheckOutagain: "",
    makkahagainhotel: "",
    makkahagainNights: "",
    vendor: "",
    payable: "",
    received: "",
  });

  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const { user } = useAuth();

  // Fetch all bookings
  useEffect(() => {
    const q = query(
      collection(db, "ummrahBookings"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        profit: Number(doc.data().received) - Number(doc.data().payable),
      }));
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Calculate nights difference
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "";
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diff = (outDate - inDate) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...formData, [name]: value };

    // auto profit
    if (name === "payable" || name === "received") {
      updated.profit =
        Number(updated.received || 0) - Number(updated.payable || 0);
    }

    // Auto calculate Makkah nights
    if (name === "makkahCheckIn" || name === "makkahCheckOut") {
      updated.makkahNights = calculateNights(
        updated.makkahCheckIn,
        updated.makkahCheckOut
      );
    }

    // Auto calculate Madinah nights
    if (name === "madinahCheckIn" || name === "madinahCheckOut") {
      updated.madinahNights = calculateNights(
        updated.madinahCheckIn,
        updated.madinahCheckOut
      );
    }

    if(name==="makkahCheckInagain" || name==="makkahCheckOutagain"){
      updated.makkahagainNights=value;
      updated.makkahagainNights = calculateNights(
        updated.makkahCheckInagain,
        updated.makkahCheckOutagain
      );
    }

    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let key in formData) {
      if (!formData[key] && key !== "profit" && key !== "makkahNights" && key !== "madinahNights") {
        return toast.error(`Please enter ${key}`);
      }
    }
    try {
      setSaving(true);
      await addDoc(collection(db, "ummrahBookings"), {
        ...formData,
        payable: Number(formData.payable),
        received: Number(formData.received),
        profit: Number(formData.received) - Number(formData.payable),
        createdAt: new Date(),
        createdByUid: user?.uid,
        createdByEmail: user?.email,
        createdByName: user?.displayName || "Unknown",
      });
      toast.success("Booking added successfully");
      setFormData({
        fullName: "",
        phone: "",
        passportNumber: "",
        visaNumber: "",
        makkahHotel: "",
        makkahCheckIn: "",
        makkahCheckOut: "",
        makkahNights: "",
        madinahHotel: "",
        madinahCheckIn: "",
        madinahCheckOut: "",
        madinahNights: "",
        makkahCheckInagain: "",
        makkahCheckOutagain: "",
        makkhagainhotel:"",
        makkhagainNights:"",
        vendor: "",
        payable: "",
        received: "",
      });
    } catch (err) {
      toast.error("Failed to add booking");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resultsRef = useRef(null);
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim())
      return toast.error("Enter a name, passport or phone");
    const filtered = bookings.filter((b) =>
      Object.values(b)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    setResults(filtered);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const closeCard = (id) => {
    setResults(results.filter((b) => b.id !== id));
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditData({ ...b });
  };

  const saveEdit = async (id) => {
    try {
      const docRef = doc(db, "ummrahBookings", id);
      const { received, ...updateFields } = editData;
      await updateDoc(docRef, updateFields);
      toast.success("Booking updated!");
      setEditingId(null);
      setEditData({});
    } catch (err) {
      toast.error("Failed to update booking");
      console.error(err);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage:
          "url('https://travocom.com/wp-content/uploads/2024/11/umrah-group-112-cover.png')",
      }}
    >
      <div className="bg-black/60 min-h-screen flex flex-col items-center px-6 py-12">
        {/* Title */}
        <h1 className="text-5xl font-bold text-white text-center mb-10 drop-shadow-lg underline decoration-yellow-400">
          Umrah Bookings Management
        </h1>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Personal Info */}
          {[
            { label: "Full Name", name: "fullName" },
            { label: "Phone Number", name: "phone" },
            { label: "Passport Number", name: "passportNumber" },
            { label: "Visa Number", name: "visaNumber" },
            { label: "Vendor", name: "vendor" },
            { label: "Received Amount", name: "received", type: "number" },
            { label: "Payable Amount", name: "payable", type: "number" },
            { label: "Profit", name: "profit", type: "number", readOnly: true },
          ].map((field) => (
            <div key={field.name} className="flex flex-col">
              <label className="mb-1 font-semibold text-gray-700">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                readOnly={field.readOnly}
                className="border px-4 py-3 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          {/* Makkah Section */}
          <div className="col-span-full mt-6">
            <h2 className="text-xl font-bold text-blue-700 mb-3">Makkah Hotel</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Hotel Name"
                name="makkahHotel"
                value={formData.makkahHotel}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="makkahCheckIn"
                value={formData.makkahCheckIn}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="makkahCheckOut"
                value={formData.makkahCheckOut}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="number"
                placeholder="Nights"
                name="makkahNights"
                value={formData.makkahNights}
                readOnly
                className="border px-4 py-3 rounded-xl bg-gray-100"
              />
            </div>
          </div>

          {/* Madinah Section */}
          <div className="col-span-full mt-6">
            <h2 className="text-xl font-bold text-green-700 mb-3">Madinah Hotel</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Hotel Name"
                name="madinahHotel"
                value={formData.madinahHotel}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="madinahCheckIn"
                value={formData.madinahCheckIn}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="madinahCheckOut"
                value={formData.madinahCheckOut}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="number"
                placeholder="Nights"
                name="madinahNights"
                value={formData.madinahNights}
                readOnly
                className="border px-4 py-3 rounded-xl bg-gray-100"
              />
            </div>
          </div>
          <div className="col-span-full mt-6">
            <h2 className="text-xl font-bold text-green-700 mb-3">Makkah Hotel</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Hotel Name"
                name="makkahagainhotel"
                value={formData.makkahagainhotel}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="makkahCheckInagain"
                value={formData.makkahCheckInagain}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
              <input
                type="date"
                name="makkahCheckOutagain"
                value={formData.makkahCheckOutagain}
                onChange={handleChange}
                className="border px-4 py-3 rounded-xl"
              />
               <input
                type="number"
                placeholder="Nights"
                name="makkahNightsagain"
                value={formData.makkahagainNights}
                readOnly
                className="border px-4 py-3 rounded-xl bg-gray-100"
              />
          
            </div>
          </div>

          


          <button
            type="submit"
            disabled={saving}
            className="col-span-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold py-3 rounded-xl shadow hover:scale-105 transition disabled:opacity-70"
          >
            {saving ? "Saving..." : "Add Booking"}
          </button>
        </form>

        {/* Search */}
        <div className="w-full max-w-4xl mt-10">
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-white rounded-full shadow-lg px-6 py-3"
          >
            <FaSearch className="text-gray-500 mr-3" />
            <input
              type="text"
              placeholder="Search by Name, Passport, or Phone..."
              className="flex-1 outline-none bg-transparent text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div ref={resultsRef} className="w-full max-w-5xl mt-8 grid gap-6">
            {results.map((b) => (
              <div
                key={b.id}
                className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6 relative"
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {editingId === b.id ? (
                    <button
                      onClick={() => saveEdit(b.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md flex items-center gap-1"
                    >
                      <FaSave /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(b)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md flex items-center gap-1"
                    >
                      <FaEdit /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => closeCard(b.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-md flex items-center gap-1"
                  >
                    <FaTimes /> Close
                  </button>
                </div>

                {editingId === b.id ? (
                  // Edit mode
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(editData).map((key) =>
                      key === "received" || key === "id" || key === "createdAt"
                        ? null
                        : (
                          <div key={key} className="flex flex-col">
                            <label className="text-sm font-medium text-gray-600">
                              {key}
                            </label>
                            <input
                              type="text"
                              value={editData[key]}
                              onChange={(e) =>
                                setEditData({ ...editData, [key]: e.target.value })
                              }
                              className="border px-3 py-2 rounded-md"
                            />
                          </div>
                        )
                    )}
                  </div>
                ) : (
                  // View mode
                  <>
                    <h2 className="text-2xl font-bold text-blue-700 mb-2">
                      {b.fullName}
                    </h2>
                    <p className="text-gray-600 mb-2 flex items-center gap-2">
                      <FaPhoneAlt className="text-blue-600" /> {b.phone}
                    </p>
                    <p className="text-gray-600 mb-2 flex items-center gap-2">
                      <FaPassport className="text-blue-600" /> Passport:{" "}
                      {b.passportNumber} | Visa: {b.visaNumber}
                    </p>

                    {/* Makkah Info */}
                    <p className="text-gray-600 mb-2 flex items-center gap-2">
                      <FaHotel className="text-green-600" /> Makkah: {b.makkahHotel} | 
                      Check-in: {b.makkahCheckIn} | Check-out: {b.makkahCheckOut} | Nights: {b.makkahNights}
                    </p>

                    {/* Madinah Info */}
                    <p className="text-gray-600 mb-2 flex items-center gap-2">
                      <FaHotel className="text-green-600" /> Madinah: {b.madinahHotel} | 
                      Check-in: {b.madinahCheckIn} | Check-out: {b.madinahCheckOut} | Nights: {b.madinahNights}
                    </p>

                    <p className="text-gray-700 font-medium">
                      Vendor: {b.vendor} | Payable:{" "}
                      <span className="text-red-600">PKR {b.payable}</span> |
                      Received:{" "}
                      <span className="text-green-600">PKR {b.received}</span> |
                      Profit:{" "}
                      <span className="text-blue-700">PKR {b.profit}</span>
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
