import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
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
} from "react-icons/fa";
import Footer from "../Components/Footer";

export default function UmmrahBookings() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    passportNumber: "",
    visaNumber: "",
    makkahHotel: "",
    makkahDays: "",
    madinahHotel: "",
    madinahDays: "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    // auto calculate profit
    if (name === "payable" || name === "received") {
      updated.profit = Number(updated.received || 0) - Number(updated.payable || 0);
    }

    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (let key in formData) {
      if (!formData[key]) return toast.error(`Please enter ${key}`);
    }
    try {
      setSaving(true);
      await addDoc(collection(db, "ummrahBookings"), {
        ...formData,
        payable: Number(formData.payable),
        received: Number(formData.received),
        profit: Number(formData.received) - Number(formData.payable),
        createdAt: new Date(),
      });
      toast.success("Booking added successfully");
      setFormData({
        fullName: "",
        phone: "",
        passportNumber: "",
        visaNumber: "",
        makkahHotel: "",
        makkahDays: "",
        madinahHotel: "",
        madinahDays: "",
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
     const resultsRef = useRef(null)
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
      const { received, ...updateFields } = editData; // exclude received
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
          {[
            { label: "Full Name", name: "fullName" },
            { label: "Phone Number", name: "phone" },
            { label: "Passport Number", name: "passportNumber" },
            { label: "Visa Number", name: "visaNumber" },
            { label: "Makkah Hotel", name: "makkahHotel" },
            { label: "Days in Makkah", name: "makkahDays", type: "number" },
            { label: "Madinah Hotel", name: "madinahHotel" },
            { label: "Days in Madinah", name: "madinahDays", type: "number" },
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
                      key === "received" || key === "id" || key === "createdAt" ? null : (
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
                    <p className="text-gray-600 mb-2 flex items-center gap-2">
                      <FaHotel className="text-green-600" /> Makkah: {b.makkahHotel} (
                      {b.makkahDays} days) | Madinah: {b.madinahHotel} (
                      {b.madinahDays} days)
                    </p>
                    <p className="text-gray-700 font-medium">
                      Vendor: {b.vendor} | Payable:{" "}
                      <span className="text-red-600">PKR {b.payable}</span> |
                      Received:{" "}
                      <span className="text-green-600">PKR {b.received}</span> |
                      Profit: <span className="text-blue-700">PKR {b.profit}</span>
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </div>
    
  );
}
