import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "First"];



export default function TicketingPage() {
  const { user } = useAuth();
  const [tripType, setTripType] = useState("oneway");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState("Economy");
  const [airlinePref, setAirlinePref] = useState("");
  const [price, setPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [fullName, setFullName] = useState("");
  const [passport, setPassport] = useState("");
  const [cnic, setCnic] = useState(""); // ⭐ NEW CNIC field
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pnr, setPnr] = useState("");
  const [vendor, setVendor] = useState("");
  const [payable, setPayable] = useState("");
  const [profit, setProfit] = useState("");

  // Search
  const [searchRef, setSearchRef] = useState("");
  const [searchId, setSearchId] = useState(""); // for passport or CNIC
  const [results, setResults] = useState([]);

  // Latest bookings
  const [latest, setLatest] = useState([]);

  const paxTotal = useMemo(
    () => adults + children + infants,
    [adults, children, infants]
  );

  // 🔹 Fetch user’s latest bookings (auto-update with onSnapshot)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "ticketBookings"),
      where("createdByUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLatest(arr);
    });
    return () => unsub();
  }, [user]);
  useEffect(() => {
    const p = parseFloat(price || 0) - parseFloat(payable || 0);
    setProfit(isNaN(p) ? 0 : p);
  }, [price, payable]);
  // 🔹 Handle booking save
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!departure) return setMessage("Please select a departure date.");
    if (tripType === "round" && !returnDate)
      return setMessage("Please select a return date.");
    if (!fullName || !passport || !phone || !from || !to || !price)
      return setMessage("Please fill all required fields including Price.");

    setLoading(true);
    try {
      
      await addDoc(collection(db, "ticketBookings"), {
        pnr: pnr.trim().toUpperCase(),
        tripType,
        from,
        to,
        vendor,
        departure,
        price,
        payable,
        profit,
        returnDate: tripType === "round" ? returnDate : null,
        adults,
        children,
        infants,
        totalPax: paxTotal,
        travelClass,
        airlinePref: airlinePref || null,
        promo: promo || null,
       
        passenger: {
          fullName,
          passport,
          cnic: cnic || null, // ⭐ Store CNIC
          phone,
          email: email || null,
        },
        note: note || null,
        status: "Booked",
        createdAt: serverTimestamp(),
        createdByUid: user?.uid,
       createdByEmail: user?.email,
        createdByName: user?.displayName || "Unknown",
      });
      toast(`Booking saved ✓  Reference: ${pnr}`);
      setMessage(`Booking saved ✓  Reference: ${pnr}`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to save booking. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Search bookings by PNR, Passport, or CNIC
  const doSearch = async (e) => {
    e.preventDefault();
    setResults([]);
    setMessage("");
  
    let arr = [];
  
    if (searchRef) {
      const q = query(
        collection(db, "ticketBookings"),
        where("pnr", "==", searchRef.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  
    if (searchId) {
      const q1 = query(
        collection(db, "ticketBookings"),
        where("passenger.passport", "==", searchId.trim())
      );
      const snap1 = await getDocs(q1);
      arr = arr.concat(snap1.docs.map((d) => ({ id: d.id, ...d.data() })));
  
      const q2 = query(
        collection(db, "ticketBookings"),
        where("passenger.cnic", "==", searchId.trim())
      );
      const snap2 = await getDocs(q2);
      arr = arr.concat(snap2.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  
    if (arr.length === 0) {
      setMessage("No bookings found for your query.");
    } else {
      // remove duplicates by ID
      const unique = arr.reduce((acc, cur) => {
        acc[cur.id] = cur;
        return acc;
      }, {});
      setResults(Object.values(unique));
    }
  };
  

  return (
    <>
      {/* Booking Form */}
      <div className="bg-gradient-to-b from-[#0e3a67] to-[#0e3a67]/70 pb-10 pt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mx-auto bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-6xl">
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-12 gap-4 items-end"
            >
              {/* Trip Type */}
              <div className="col-span-12 flex gap-6 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tripType"
                    value="oneway"
                    checked={tripType === "oneway"}
                    onChange={(e) => setTripType(e.target.value)}
                  />
                  One Way
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tripType"
                    value="round"
                    checked={tripType === "round"}
                    onChange={(e) => setTripType(e.target.value)}
                  />
                  Return
                </label>
              </div>

              {/* From */}
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From (City / Country)
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="e.g. Karachi, Pakistan"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              {/* To */}
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To (City / Country)
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. London, UK"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              {/* Departure */}
              <div className="col-span-12 md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Departure
                </label>
                <input
                  type="date"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              {/* Return */}
              <div className="col-span-12 md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Return
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 disabled:opacity-50"
                  disabled={tripType !== "round"}
                  required={tripType === "round"}
                />
              </div>

              {/* Price */}
                      {/* Price */}
<div className="col-span-12 md:col-span-2">
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Price (PKR)
  </label>
  <input
    type="number"
    value={price}
    onChange={(e) => setPrice(e.target.value)}
    placeholder="e.g. 120000"
    className="w-full border rounded-xl px-4 py-3"
    required
  />
</div>

{/* Payable */}
<div className="col-span-12 md:col-span-2">
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Payable (PKR)
  </label>
  <input
    type="number"
    value={payable}
    onChange={(e) => setPayable(e.target.value)}
    placeholder="e.g. 110000"
    className="w-full border rounded-xl px-4 py-3"
    required
  />
</div>

{/* Profit - auto calculated, readonly */}
<div className="col-span-12 md:col-span-2">
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Profit (PKR)
  </label>
  <input
    type="number"
    value={profit}
    readOnly
    className="w-full border rounded-xl px-4 py-3 bg-gray-100"
  />
</div>


              {/* Passengers */}
              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Travellers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value || "0"))}
                    className="border rounded-xl px-3 py-2"
                    title="Adults"
                  />
                  
                  <input
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) =>
                      setChildren(parseInt(e.target.value || "0"))
                    }
                    className="border rounded-xl px-3 py-2"
                    title="Children"
                  />
                  <input
                    type="number"
                    min={0}
                    value={infants}
                    onChange={(e) =>
                      setInfants(parseInt(e.target.value || "0"))
                    }
                    className="border rounded-xl px-3 py-2"
                    title="Infants"
                  />
                </div>
              </div>

              <div className="col-span-12 md:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Class
                </label>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={travelClass}
                  onChange={(e) => setTravelClass(e.target.value)}
                >
                  {TRAVEL_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Passenger Info */}
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Passenger Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As per Passport"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Passport
                </label>
                <input
                  type="text"
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                  placeholder="e.g. LK123456"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              {/* CNIC */}
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  CNIC
                </label>
                <input
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="42101-1234567-8"
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp preferred"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PNR
                </label>
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="Enter the pnr here...."
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Enter the Vendor"
                  className="w-full border rounded-xl px-4 py-3"
                  required
                />
              </div>

              {/* Actions */}
              <div className="col-span-12 flex gap-3 justify-end mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-[#0e66ff] text-white font-semibold shadow"
                >
                  {loading ? "Saving..." : "Save Booking"}
                </button>
                <Link
                  to="/viewall"
                  className="px-6 py-3 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  View All
                </Link>
              </div>
              {message && (
                <div className="col-span-12 text-center text-sm text-gray-700 mt-2">
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Search Bookings */}
      <div className="bg-gray-50 py-12 px-6">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow p-6 md:p-8">
          <h3 className="text-xl font-semibold mb-4">Search Booked Tickets</h3>
          <form
            onSubmit={doSearch}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="PNR e.g. OS-XYZ123"
              className="border rounded-xl px-4 py-3"
            />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Passport / CNIC"
              className="border rounded-xl px-4 py-3"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#0e66ff] text-white rounded-xl font-semibold"
            >
              Search
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-3 pr-4">PNR</th>
                    <th className="py-3 pr-4">Route</th>
                    <th className="py-3 pr-4">Dates</th>
                    <th className="py-3 pr-4">Pax</th>
                    <th className="py-3 pr-4">Class</th>
                    <th className="py-3 pr-4">Passenger</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 pr-4 font-semibold">{r.pnr}</td>
                      <td className="py-3 pr-4">
                        {r.from} → {r.to}
                      </td>
                      <td className="py-3 pr-4">
                        {r.departure}
                        {r.returnDate ? ` • ${r.returnDate}` : ""}
                      </td>
                      <td className="py-3 pr-4">{r.totalPax}</td>
                      <td className="py-3 pr-4">{r.travelClass}</td>
                      <td className="py-3 pr-4">
                        {r.passenger?.fullName}
                        <br />
                        <span className="text-xs text-gray-500">
                          {r.passenger?.passport} | {r.passenger?.cnic}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{r.price}</td>
                      <td className="py-3 pr-4 capitalize">{r.tripType}</td>
                      <td className="py-3 pr-4 capitalize">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {message && (
            <div className="mt-3 text-sm text-gray-600">{message}</div>
          )}
        </div>
      </div>

      

      <Footer />
    </>
  );
}
