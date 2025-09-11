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
import { MdSearch, MdFilterList, MdClear } from "react-icons/md";

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
  const [cnic, setCnic] = useState("");
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
  const [searchId, setSearchId] = useState("");
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
    if (!fullName || !passport || !phone || !from || !to || !price || !pnr || !vendor || !payable)
      return setMessage("Please fill all required fields.");

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
          cnic: cnic || null,
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
      <div className="pt-20 p-6 min-h-screen bg-gray-950 text-gray-200">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
              Book a New Ticket ✈️
            </h1>
            <p className="text-gray-400 text-lg">
              Fill out the form below to save a new flight booking record.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-blue-400">
                {latest.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Total Bookings</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-green-400">
                {latest.filter((b) => b.status === "Approved").length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Approved</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-yellow-400">
                {latest.filter((b) => b.status === "Booked").length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Booked</div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 text-center border border-gray-700">
              <div className="text-3xl font-bold text-red-400">
                {latest.filter((b) => b.status === "Cancelled").length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Cancelled</div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 md:p-8 w-full">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
              New Ticket Details
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              {/* Trip Type */}
              <div className="col-span-full">
                <div className="flex gap-6 items-center">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="radio"
                      name="tripType"
                      value="oneway"
                      checked={tripType === "oneway"}
                      onChange={(e) => setTripType(e.target.value)}
                      className="form-radio text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    One Way
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="radio"
                      name="tripType"
                      value="round"
                      checked={tripType === "round"}
                      onChange={(e) => setTripType(e.target.value)}
                      className="form-radio text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    Return
                  </label>
                </div>
              </div>

              {/* From */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  From (City / Country)
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="e.g. Karachi, Pakistan"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              {/* To */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  To (City / Country)
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. London, UK"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              {/* Departure */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                  required
                />
              </div>

              {/* Return */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Return Date
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                  disabled={tripType !== "round"}
                  required={tripType === "round"}
                />
              </div>

              {/* Price */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Price (PKR)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 120000"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              {/* Payable */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Payable (PKR)
                </label>
                <input
                  type="number"
                  value={payable}
                  onChange={(e) => setPayable(e.target.value)}
                  placeholder="e.g. 110000"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              {/* Profit - auto calculated, readonly */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Profit (PKR)
                </label>
                <input
                  type="number"
                  value={profit}
                  readOnly
                  className="w-full bg-gray-700 text-gray-400 rounded-lg px-4 py-3 cursor-not-allowed border border-gray-600"
                />
              </div>

              {/* Passengers */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Travellers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value || "0"))}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                    title="Adults"
                  />
                  <input
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) =>
                      setChildren(parseInt(e.target.value || "0"))
                    }
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                    title="Children"
                  />
                  <input
                    type="number"
                    min={0}
                    value={infants}
                    onChange={(e) =>
                      setInfants(parseInt(e.target.value || "0"))
                    }
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                    title="Infants"
                  />
                </div>
              </div>

              {/* Class */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Class
                </label>
                <select
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-gray-700"
                  value={travelClass}
                  onChange={(e) => setTravelClass(e.target.value)}
                >
                  {TRAVEL_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Passenger Info */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Passenger Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As per Passport"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Passport
                </label>
                <input
                  type="text"
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                  placeholder="e.g. LK123456"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>

              {/* CNIC */}
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  CNIC
                </label>
                <input
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="42101-1234567-8"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                />
              </div>

              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp preferred"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  PNR
                </label>
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value)}
                  placeholder="Enter the pnr here..."
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>
              <div className="col-span-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Enter the Vendor"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  required
                />
              </div>
              
              {/* Optional fields */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@example.com"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Airline Preference
                  </label>
                  <input
                    type="text"
                    value={airlinePref}
                    onChange={(e) => setAirlinePref(e.target.value)}
                    placeholder="e.g. PIA, Emirates"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any additional notes here..."
                    rows="3"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
                  />
                </div>
              </div>


              {/* Actions */}
              <div className="col-span-full flex flex-col sm:flex-row gap-4 justify-end mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save Booking"}
                </button>
                <Link
                  to="/viewall"
                  className="px-6 py-3 rounded-xl border border-gray-700 font-semibold text-gray-200 hover:bg-gray-800 transition-colors text-center"
                >
                  View All Bookings
                </Link>
              </div>
              {message && (
                <div className="col-span-full text-center text-sm text-gray-400 mt-4">
                  {message}
                </div>
              )}
            </form>
          </div>

          {/* Search Bookings */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 p-6 md:p-8 mt-12">
            <h3 className="text-xl font-semibold mb-4 text-white">Search Booked Tickets</h3>
            <form onSubmit={doSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                placeholder="PNR e.g. OS-XYZ123"
                className="bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
              />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Passport / CNIC"
                className="bg-gray-800 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 border border-gray-700"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <MdSearch className="inline-block mr-2 text-xl" />
                Search
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
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
                  <tbody className="divide-y divide-gray-800">
                    {results.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-gray-800">
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
                        <td className="py-3 pr-4 capitalize">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              r.status === "Approved"
                                ? "bg-green-600/20 text-green-400"
                                : r.status === "Cancelled"
                                ? "bg-red-600/20 text-red-400"
                                : "bg-yellow-600/20 text-yellow-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {message && (
              <div className="mt-3 text-sm text-gray-400">{message}</div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
