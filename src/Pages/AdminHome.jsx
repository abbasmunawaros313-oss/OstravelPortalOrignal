// AdminHome.jsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  FaChartBar,
  FaBolt,
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";

// ... (COUNTRY_TO_ISO, isoToFlagEmoji, getFlag, exportToCSV, SparkBars functions remain the same)
const COUNTRY_TO_ISO = {
  Pakistan: "PK", Saudi: "SA","Saudi Arabia": "SA", UAE: "AE", "United Arab Emirates": "AE", Thailand: "TH",
  "United Kingdom": "GB",UK: "GB",England: "GB",USA: "US", "United States": "US",Canada: "CA",Turkey: "TR",Malaysia: "MY",
  India: "IN", Germany: "DE", France: "FR", Italy: "IT", Spain: "ES", Australia: "AU",China: "CN",Japan: "JP",
  Singapore: "SG",Brazil: "BR", Mexico: "MX",Russia: "RU",Egypt: "EG",Nigeria: "NG",Kenya: "KE",SouthAfrica: "ZA","South Africa": "ZA",Vietnam: "VN",
  Indonesia: "ID", Philippines: "PH", Argentina: "AR", Chile: "CL", Colombia: "CO",Peru: "PE",Netherlands: "NL",Belgium: "BE",Sweden: "SE",
  Norway: "NO",Finland: "FI", Denmark: "DK",  Switzerland: "CH",  Austria: "AT",
  Poland: "PL", Portugal: "PT",  Greece: "GR",  Ireland: "IE",  NewZealand: "NZ",  "New Zealand": "NZ",
  Hungary: "HU", Czechia: "CZ", "Czech Republic": "CZ", Romania: "RO", Bulgaria: "BG", Croatia: "HR", Serbia: "RS",  Ukraine: "UA", Belarus: "BY", Lithuania: "LT",  Latvia: "LV", Estonia: "EE",  Iceland: "IS",  Luxembourg: "LU",  Slovenia: "SI",  Slovakia: "SK",  Cyprus: "CY",  Malta: "MT",
  Thailand: "TH",Vietnam: "VN",Indonesia: "ID",Philippines: "PH",Bangladesh: "BD",SriLanka: "LK","Sri Lanka": "LK",Nepal: "NP",
  Myanmar: "MM",Cambodia: "KH",Laos: "LA",Mongolia: "MN",Iran: "IR",Iraq: "IQ",Afghanistan: "AF",
  Azerbaijan: "AZ", Armenia: "AM", Georgia: "GE",
  Kazakhstan: "KZ",Uzbekistan: "UZ",Turkmenistan: "TM",Kyrgyzstan: "KG",Tajikistan: "TJ",Turkmenistan: "TM",
  SaudiArabia: "SA",UAE: "AE",Kuwait: "KW",Qatar: "QA", Bahrain: "BH", Oman: "OM", Yemen: "YE",
  
};

/** Convert ISO code (2 letters) to flag emoji */
function isoToFlagEmoji(iso) {
  if (!iso || iso.length !== 2) return "🌐";
  const codePoints = [...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

/** Try to get a flag emoji from a country name */
function getFlag(country) {
  if (!country) return null;
  const clean = country.trim().toLowerCase();

  // exact match
  for (const [name, iso] of Object.entries(COUNTRY_TO_ISO)) {
    if (name.toLowerCase() === clean) {
      return (
        <img
          src={`https://flagcdn.com/w40/${iso.toLowerCase()}.png`}
          alt={country}
          className="w-8 h-6 object-cover rounded shadow-sm"
        />
      );
    }
  }

  // fallback: globe icon
  return <span className="text-xl">🌐</span>;
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

  // <<--- 1. ADD NEW STATE FOR TOGGLING ---
  const [showAllCountries, setShowAllCountries] = useState(false);

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
      let t = null;
      if (b.date) {
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

  // <<--- 2. PREPARE THE DATA TO RENDER ---
  const INITIAL_COUNTRY_LIMIT = 8;
  const countryKeys = Object.keys(countries);
  const countriesToShow = useMemo(() => {
    if (showAllCountries) {
      return countryKeys;
    }
    return countryKeys.slice(0, INITIAL_COUNTRY_LIMIT);
  }, [countryKeys, showAllCountries]);
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
  const onEmployeeClick = (emp) => {
    setSelectedCountry(null);
    setSelectedEmployee((prev) => (prev === emp ? null : emp));
    setCountrySearch("");
  };
  const onCountryClick = (country) => {
    setSelectedEmployee(null);
    setSelectedCountry((prev) => (prev === country ? null : country));
    setCountrySearch("");
  };
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
          <div className="rounded-xl shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 flex flex-col justify-between">
          <Link to="/employee-record">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-2xl">
                <FaUsers />
              </div>
              <div>
                <div className="text-xs uppercase opacity-80 text-center">Employees</div>
                <div className="text-2xl font-bold">{totalEmployees + 3}</div>
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
                  </Link>
          </div>       
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
            <Link to={"/employee-record"} className="flex items-start gap-4">
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
            </Link>
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
        {/* Employees grid */}
        {/* <<--- 3. UPDATE THE COUNTRIES SECTION --- */}
       {/* Countries grid */}
          {/* Countries grid */}
<section ref={countriesRef}>
  <h2 className="text-4xl pt-4 font-semibold mb-6 text-center border-b pb-2">
    Countries
  </h2>
  {loading ? (
    <div className="text-center py-12">Loading...</div>
  ) : (
    <>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ">
        {countriesToShow.map((country, index) => {
          const list = countries[country];

          // Gradient set for variety
          const gradients = [
            "from-indigo-500 to-purple-600",
            "from-emerald-500 to-green-600",
            "from-fuchsia-500 to-pink-600",
            "from-yellow-400 to-amber-500",
            "from-sky-500 to-cyan-600",
            "from-orange-500 to-red-500",
          ];
          const gradient = gradients[index % gradients.length];

          return (
            <Link
              key={country}
              to={`/countrywise-det/${encodeURIComponent(country)}`}
              className={`rounded-xl shadow-lg cursor-pointer transform transition hover:scale-105 `}
            >
              <div
                className={`w-full h-40 p-6 flex flex-col justify-between text-white rounded-lg bg-gradient-to-br ${gradient}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl bg-white/20 shadow-inner">
                    {getFlag(country)}
                  </div>
                  <div>
                    <div className="font-semibold text-xl">{country}</div>
                    <div className="text-sm opacity-90">Clients: {list.length}</div>
                  </div>
                </div>
                <div className="text-right text-2xl font-bold">{list.length}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {countryKeys.length > INITIAL_COUNTRY_LIMIT && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowAllCountries(!showAllCountries)}
            className="bg-gradient-to-r from-emerald-600 to-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:brightness-110 transition-transform transform hover:scale-105"
          >
            {showAllCountries
              ? "Show Less"
              : `View All ${countryKeys.length} Countries`}
          </button>
        </div>
      )}
    </>
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

      <Footer />
    </div>
  );
}
