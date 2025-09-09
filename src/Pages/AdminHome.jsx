// AdminHome.jsx
import { useEffect, useMemo, useState ,useRef} from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import {
  FaUserTie,
  FaGlobe,
  FaSearch,
  FaFileCsv,
  FaDownload,
  FaUsers,
  FaCalendarAlt,
  FaChartBar,
  FaBolt,
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";

/**
 * Helper: small map of common country names -> ISO codes for flag emoji.
 * Expand as needed. For unknown countries we show a globe emoji.
 */
const COUNTRY_TO_ISO = {
  Pakistan: "PK",
  Saudi: "SA",
  "Saudi Arabia": "SA",
  UAE: "AE",
  "United Arab Emirates": "AE",
  Thailand: "TH",
  "United Kingdom": "GB",
  UK: "GB",
  England: "GB",
  USA: "US",
  "United States": "US",
  Canada: "CA",
  Turkey: "TR",
  Malaysia: "MY",
  India: "IN",
  Germany: "DE",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  Australia: "AU",
  China: "CN",
  Japan: "JP",
  Singapore: "SG",
};

/** Convert ISO code (2 letters) to flag emoji */
function isoToFlagEmoji(iso) {
  if (!iso || iso.length !== 2) return "🌐";
  const codePoints = [...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

/** Try to get a flag emoji from a country name */
function getFlag(country) {
  if (!country) return "🌐";
  const iso = COUNTRY_TO_ISO[country.trim()];
  if (iso) return isoToFlagEmoji(iso);
  // try last word (e.g., "Kingdom" won't help, but "United States" etc)
  const words = country.split(" ").slice(-1)[0];
  const iso2 = COUNTRY_TO_ISO[words];
  if (iso2) return isoToFlagEmoji(iso2);
  // fallback: globe
  return "🌐";
}

/** Export list of items to CSV and trigger download */
function exportToCSV(filename, rows) {
  if (!rows || !rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h] ?? "";
        // escape quotes
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast.success("Export started");
}

/** Small inline sparkline (bars) - takes array of numbers */
function SparkBars({ data = [] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-sm"
          style={{
            height: `${(v / max) * 100}%`,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.5))",
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

export default function AdminHome() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [modalBooking, setModalBooking] = useState(null);

  // fetch bookings once (could be onSnapshot if you want live)
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "bookings"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (mounted) setBookings(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => (mounted = false);
  }, []);

  // Derived groups
  const employees = useMemo(() => {
    return bookings.reduce((acc, b) => {
      const key = b.userEmail || "unknown@os.com";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});
  }, [bookings]);
  const countriesRef = useRef(null);

  const countries = useMemo(() => {
    return bookings.reduce((acc, b) => {
      const c = b.country || "Unknown";
      if (!acc[c]) acc[c] = [];
      acc[c].push(b);
      return acc;
    }, {});
  }, [bookings]);

  const totalBookings = bookings.length;
  const totalEmployees = Object.keys(employees).length;
  const totalCountries = Object.keys(countries).length;

  // quick stats for small sparkline: bookings per recent 7 days (approx)
  const bookingsByDay = useMemo(() => {
    const days = 7;
    const counts = Array(days).fill(0);
    const now = Date.now();
    for (const b of bookings) {
      // try date field as string "YYYY-MM-DD" or timestamp
      let t = null;
      if (b.date) {
        // date string
        t = new Date(b.date).getTime();
      } else if (b.createdAt && b.createdAt.seconds) {
        t = b.createdAt.seconds * 1000;
      } else if (b.createdAt && typeof b.createdAt === "string") {
        t = new Date(b.createdAt).getTime();
      }
      if (!t || isNaN(t)) continue;
      const diffDays = Math.floor((now - t) / (1000 * 60 * 60 * 24));
      if (diffDays < days) counts[days - 1 - diffDays] += 1;
    }
    return counts;
  }, [bookings]);

  // Small helpers to ensure clicking inside detail area doesn't close the card
  const stop = (e) => e.stopPropagation();

  // Global filtered list (for maybe search page)
  const globalFiltered = useMemo(() => {
    if (!globalSearch.trim()) return bookings;
    const q = globalSearch.trim().toLowerCase();
    return bookings.filter((b) =>
      [
        b.fullName,
        b.passport,
        b.userEmail,
        b.country,
        b.visaType,
        b.phone,
        b.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [bookings, globalSearch]);

  // When clicking an employee card we want to collapse country card selection
  const onEmployeeClick = (emp) => {
    setSelectedCountry(null);
    setSelectedEmployee((prev) => (prev === emp ? null : emp));
    // reset searches
    setCountrySearch("");
  };

  // When clicking a country card we want to collapse employee selection
  const onCountryClick = (country) => {
    setSelectedEmployee(null);
    setSelectedCountry((prev) => (prev === country ? null : country));
    setCountrySearch("");

    //for scrool 
     if (countriesRef.current) {
    countriesRef.current.scrollIntoView({ behavior: "smooth" });
  }
  };

  // Make square cards: using aspect-square utility (Tailwind >= 3.2). If not available, fallback with padding hack.
  // We'll implement grid of square cards for quick access + employees/countries grid.

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex flex-col">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto w-full p-6">
        {/* Top header / search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-1">
              Admin Home
            </h1>
            <p className="text-sm text-slate-600">
              Quick overview of employees, clients and countries.
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-96">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search bookings, passport, employee email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl shadow-sm border border-slate-200 focus:border-blue-300 outline-none"
              />
            </div>

            <button
              onClick={() =>
                exportToCSV(
                  `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`,
                  bookings.map((b) => ({
                    id: b.id,
                    fullName: b.fullName,
                    passport: b.passport,
                    country: b.country,
                    visaType: b.visaType,
                    userEmail: b.userEmail,
                    totalFee: b.totalFee,
                    receivedFee: b.receivedFee,
                    date: b.date,
                  }))
                )
              }
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow hover:brightness-95 flex items-center gap-2"
            >
              <FaFileCsv /> Export
            </button>
          </div>
        </div>

        {/* Summary Quick Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
         <Link to="/employee-record">
          <div className="rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                <FaUsers />
              </div>
              <div>
                <div className="text-xs uppercase opacity-80 text-center">Employees</div>
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <div className="text-sm opacity-80">Distinct handlers</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <SparkBars data={bookingsByDay} />
              <div className="text-xs opacity-80 text-right">
                <div>Last 7 days</div>
                <div className="font-semibold">{bookingsByDay.reduce((a,b)=>a+b,0)} bookings</div>
              </div>
            </div>
          </div>
          </Link>

          <div
          onClick={() => {
    if (countriesRef.current) {
      countriesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }}
          className="rounded-xl shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4 cursor-pointer">
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                <FaGlobe />
              </div>
              <div>
                <div className="text-xs uppercase opacity-80">Countries</div>
                <div className="text-2xl font-bold">{totalCountries}</div>
                <div className="text-sm opacity-80">Supported destinations</div>
              </div>
            </div>
            <div className="mt-4 text-sm opacity-80">
              Top:{" "}
              {Object.entries(countries)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 3)
                .map((x) => `${x[0]} (${x[1].length})`)
                .join(" • ")}
            </div>
          </div>

          <div className="rounded-xl shadow-lg bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                <FaChartBar />
              </div>
              <div>
                <div className="text-xs uppercase opacity-80">Bookings</div>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <div className="text-sm opacity-80">Total records</div>
              </div>
            </div>
            <div className="mt-4 text-sm opacity-90">
              <div>Recent activity</div>
            </div>
          </div>

          <div className="rounded-xl shadow-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-white p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                <FaBolt />
              </div>
              <div>
                <div className="text-xs uppercase opacity-80">Quick Actions</div>
                <div className="text-2xl font-bold">Actions</div>
                <div className="text-sm opacity-80">Export / Search / Details</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  exportToCSV(
                    `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`,
                    bookings
                  )
                }
                className="bg-white/20 px-3 py-2 rounded-lg text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => toast("Try the search box at top")}
                className="bg-white/20 px-3 py-2 rounded-lg text-sm"
              >
                Help
              </button>
            </div>
          </div>
        </div>

        {/* Employees grid as square cards */}
        <section>
          <h2 className="text-4xl font-semibold mb-6 text-center border-b pb-2">Employees</h2>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Object.keys(employees).map((emp) => {
                const list = employees[emp];
                // small numeric series for sparkbars (clients per recent days)
                const values = list.slice(-7).map(() => 1);
                return (
                  <div
                    key={emp}
                    className={`aspect-square rounded-xl overflow-hidden shadow-lg cursor-pointer transform transition hover:scale-105
                      ${selectedEmployee === emp ? "ring-4 ring-blue-300" : ""}
                    `}
                    onClick={() => onEmployeeClick(emp)}
                  >
                    <div
                      className={`w-full h-full p-4 flex flex-col justify-between
                        ${selectedEmployee === emp ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white" : "bg-white"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${selectedEmployee === emp ? "bg-white/20" : "bg-blue-50"}`}>
                          <FaUserTie className={selectedEmployee === emp ? "text-white" : "text-blue-600"} />
                        </div>
                        <div>
                          <div className={`font-semibold ${selectedEmployee === emp ? "text-white" : "text-slate-800"}`}>{emp}</div>
                          <div className={`text-xs opacity-80 ${selectedEmployee === emp ? "text-white/90" : "text-slate-500"}`}>
                            Clients: {list.length}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div style={{ width: 80 }}>
                          <SparkBars data={values} />
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${selectedEmployee === emp ? "text-white" : "text-slate-700"}`}>
                            {list.length}
                          </div>
                          <div className={`text-xs ${selectedEmployee === emp ? "text-white/80" : "text-slate-500"}`}>clients</div>
                        </div>
                      </div>

                      {/* expanded panel - stopPropagation for inner interactions */}
                      {selectedEmployee === emp && (
                        <div
                          onClick={stop}
                          className="mt-3 bg-white/5 p-3 rounded-md max-h-40 overflow-y-auto text-sm"
                        >
                          {list.map((c) => (
                            <div key={c.id} className="mb-2">
                              <div className="font-medium">{c.fullName}</div>
                              <div className="text-xs opacity-80">
                                {c.passport} • {c.country}
                                <button
                                  onClick={() => setModalBooking(c)}
                                  className="ml-3 text-xs px-2 py-1 rounded bg-white/20"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Countries grid as square cards */}
        <section  ref={countriesRef}>
          <h2  className="text-4xl  pt-4 font-semibold mb-6 text-center border-b pb-2">Countries</h2>

          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Object.keys(countries).map((country) => {
                const list = countries[country];
                return (
                  <div
                    key={country}
                    className={`aspect-square rounded-xl overflow-hidden shadow-lg cursor-pointer transform transition hover:scale-105
                      ${selectedCountry === country ? "ring-4 ring-emerald-300" : ""}
                    `}
                    onClick={() => onCountryClick(country)}
                  >
                    <div className={`w-full h-full p-4 flex flex-col justify-between ${selectedCountry === country ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white" : "bg-white"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-white/10">
                          <div className="text-xl">{getFlag(country)}</div>
                        </div>
                        <div>
                          <div className={`font-semibold ${selectedCountry === country ? "text-white" : "text-slate-800"}`}>{country}</div>
                          <div className={`text-xs opacity-80 ${selectedCountry === country ? "text-white/90" : "text-slate-500"}`}>
                            Clients: {list.length}
                          </div>
                        </div>
                      </div>

                      {selectedCountry === country && (
                        <div onClick={stop} className="mt-3 bg-white/5 p-3 rounded-md max-h-44 overflow-y-auto text-sm">
                          <div className="relative mb-3">
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                            <input
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search clients in country..."
                              className="w-full pl-10 pr-3 py-2 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-green-300 outline-none"
                            />
                          </div>

                          <div className="space-y-2">
                            {list
                              .filter((c) => {
                                const q = countrySearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  (c.fullName || "").toLowerCase().includes(q) ||
                                  (c.passport || "").toLowerCase().includes(q) ||
                                  (c.userEmail || "").toLowerCase().includes(q)
                                );
                              })
                              .map((c) => (
                                <div key={c.id} className="p-2 rounded bg-white/80 text-gray-800">
                                  <div className="font-semibold">{c.fullName}</div>
                                  <div className="text-xs opacity-80">
                                    {c.passport} • {c.userEmail}
                                    <button
                                      onClick={() => setModalBooking(c)}
                                      className="ml-3 text-xs px-2 py-1 rounded bg-slate-100"
                                    >
                                      Details
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <div className={`text-xs ${selectedCountry === country ? "text-white/90" : "text-slate-500"}`}>View clients</div>
                        <div className={`text-sm font-semibold ${selectedCountry === country ? "text-white" : "text-slate-700"}`}>{list.length}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal for booking details */}
      {modalBooking && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setModalBooking(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-bold">{modalBooking.fullName}</h3>
                <p className="text-sm text-slate-600">{modalBooking.country} • {modalBooking.visaType}</p>
              </div>
              <div className="text-sm text-slate-400">{modalBooking.date}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-slate-500">Passport</div>
                <div className="font-medium">{modalBooking.passport}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Phone / Email</div>
                <div className="font-medium">{modalBooking.phone} • {modalBooking.email || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fees</div>
                <div className="font-medium">Total: {modalBooking.totalFee || "0"} • Received: {modalBooking.receivedFee || "0"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="font-medium">{modalBooking.visaStatus} • {modalBooking.paymentStatus}</div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setModalBooking(null)} className="px-4 py-2 rounded-lg border">Close</button>
              <button
                onClick={() => {
                  exportToCSV(`booking_${modalBooking.passport}.csv`, [modalBooking]);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                <FaDownload className="inline mr-2" /> Export
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer/>
    </div>
  );
}
