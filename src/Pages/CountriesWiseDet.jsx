// CountriesWiseDet.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FaSearch, FaFilePdf, FaFileCsv, FaUsers } from "react-icons/fa";
import { MdAttachMoney, MdCheckCircle, MdWarning } from "react-icons/md";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";

// --- Flag Helper ---
const countryCodes = {
    Afghanistan: "af",
  Albania: "al",
  Algeria: "dz",
  Andorra: "ad",
  Angola: "ao",
  Argentina: "ar",
  Armenia: "am",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahamas: "bs",
  Bahrain: "bh",
  Bangladesh: "bd",
  Barbados: "bb",
  Belarus: "by",
  Belgium: "be",
  Belize: "bz",
  Benin: "bj",
  Bhutan: "bt",
  Bolivia: "bo",
  Bosnia: "ba",
  Botswana: "bw",
  Brazil: "br",
  Brunei: "bn",
  Bulgaria: "bg",
  BurkinaFaso: "bf",
  Burundi: "bi",
  Cambodia: "kh",
  Cameroon: "cm",
  Canada: "ca",
  Chad: "td",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  Comoros: "km",
  "Costa Rica": "cr",
  Croatia: "hr",
  Cuba: "cu",
  Cyprus: "cy",
  Czechia: "cz",
  Denmark: "dk",
  Djibouti: "dj",
  Dominica: "dm",
  "Dominican Republic": "do",
  Ecuador: "ec",
  Egypt: "eg",
  "El Salvador": "sv",
  Estonia: "ee",
  Eswatini: "sz",
  Ethiopia: "et",
  Fiji: "fj",
  Finland: "fi",
  France: "fr",
  Gabon: "ga",
  Gambia: "gm",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Greece: "gr",
  Grenada: "gd",
  Guatemala: "gt",
  Guinea: "gn",
  Guyana: "gy",
  Haiti: "ht",
  Honduras: "hn",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Indonesia: "id",
  Iran: "ir",
  Iraq: "iq",
  Ireland: "ie",
  Israel: "il",
  Italy: "it",
  Jamaica: "jm",
  Japan: "jp",
  Jordan: "jo",
  Kazakhstan: "kz",
  Kenya: "ke",
  Korea: "kr",
  Kuwait: "kw",
  Kyrgyzstan: "kg",
  Laos: "la",
  Latvia: "lv",
  Lebanon: "lb",
  Lesotho: "ls",
  Liberia: "lr",
  Libya: "ly",
  Lithuania: "lt",
  Luxembourg: "lu",
  Madagascar: "mg",
  Malawi: "mw",
  Malaysia: "my",
  Maldives: "mv",
  Mali: "ml",
  Malta: "mt",
  Mauritania: "mr",
  Mauritius: "mu",
  Mexico: "mx",
  Moldova: "md",
  Monaco: "mc",
  Mongolia: "mn",
  Montenegro: "me",
  Morocco: "ma",
  Mozambique: "mz",
  Myanmar: "mm",
  Namibia: "na",
  Nepal: "np",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nicaragua: "ni",
  Niger: "ne",
  Nigeria: "ng",
  "North Macedonia": "mk",
  Norway: "no",
  Oman: "om",
  Pakistan: "pk",
  Palestine: "ps",
  Panama: "pa",
  Paraguay: "py",
  Peru: "pe",
  Philippines: "ph",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  Romania: "ro",
  Russia: "ru",
  Rwanda: "rw",
  "Saudi Arabia": "sa",
  Senegal: "sn",
  Serbia: "rs",
  Seychelles: "sc",
  Singapore: "sg",
  Slovakia: "sk",
  Slovenia: "si",
  Somalia: "so",
  "South Africa": "za",
  Spain: "es",
  SriLanka: "lk",
  Sudan: "sd",
  Suriname: "sr",
  Sweden: "se",
  Switzerland: "ch",
  Syria: "sy",
  Taiwan: "tw",
  Tajikistan: "tj",
  Tanzania: "tz",
  Thailand: "th",
  Togo: "tg",
  Tonga: "to",
  Tunisia: "tn",
  Turkey: "tr",
  Turkmenistan: "tm",
  Uganda: "ug",
  Ukraine: "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Vanuatu: "vu",
  Venezuela: "ve",
  Vietnam: "vn",
  Yemen: "ye",
  Zambia: "zm",
  Zimbabwe: "zw",
};

const getFlagUrl = (country) => {
  const code = countryCodes[country] || "";
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
};

function CountriesWiseDet() {
  const { countryName } = useParams();
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  });

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = data.filter(
        (b) => (b.country || "").toLowerCase() === countryName.toLowerCase()
      );
      setBookings(filtered);
      setFiltered(filtered);
      calculateStats(filtered);
    };
    fetchBookings();
  }, [countryName]);

  // Handle search + date filters
  useEffect(() => {
    let results = bookings;

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((b) =>
        [b.fullName, b.passport, b.userEmail, b.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (fromDate || toDate) {
      results = results.filter((b) => {
        if (!b.date) return false;
        const d = new Date(b.date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        return (!from || d >= from) && (!to || d <= to);
      });
    }

    setFiltered(results);
    calculateStats(results);
  }, [search, fromDate, toDate, bookings]);

  // Calculate stats
  const calculateStats = (data) => {
    let totalRevenue = 0;
    let pendingRevenue = 0;
    let approved = 0;

    data.forEach((b) => {
      totalRevenue += Number(b.receivedFee || 0);
      pendingRevenue += Number(b.remainingFee || 0);
      if (b.visaStatus?.toLowerCase() === "approved") approved++;
    });

    setStats({
      total: data.length,
      approved,
      totalRevenue,
      pendingRevenue,
    });
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Full Name",
      "Passport",
      "Visa Type",
      "Date",
      "Added By",
      "Email",
      "Phone",
    ];
    const rows = filtered.map((b) => [
      b.fullName,
      b.passport,
      b.visaType,
      b.date,
      b.userEmail,
      b.email,
      b.phone,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `${countryName}_customers.csv`;
    link.click();
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFontSize(14);
    doc.text(`${countryName} – Customers Report`, 105, 15, { align: "center" });

    autoTable(doc, {
      startY: 25,
      head: [["Full Name", "Passport", "Visa Type", "Date", "Added By", "Email", "Phone"]],
      body: filtered.map((b) => [
        b.fullName || "-",
        b.passport || "-",
        b.visaType || "-",
        b.date || "-",
        b.userEmail || "-",
        b.email || "-",
        b.phone || "-",
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`${countryName}_customers.pdf`);
  };

  return (
    <>
    <AdminNavbar/>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 animate-fadeIn">
        <img
          src={getFlagUrl(countryName)}
          alt={countryName}
          className="w-12 h-12 rounded shadow-lg"
        />
        <h1 className="text-3xl font-bold tracking-wide">
          {countryName} – Customers
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between hover:scale-105 transition duration-300">
          <div>
            <p className="text-sm text-gray-400">Total Customers</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <FaUsers className="text-blue-400 text-3xl" />
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between hover:scale-105 transition duration-300">
          <div>
            <p className="text-sm text-gray-400">Approved Visas</p>
            <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <MdCheckCircle className="text-green-400 text-3xl" />
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between hover:scale-105 transition duration-300">
          <div>
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">
              PKR: {stats.totalRevenue + stats.pendingRevenue}
            </p>
          </div>
          <MdAttachMoney className="text-emerald-400 text-3xl" />
        </div>
       <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between hover:scale-105 transition duration-300">
          <div>
            <p className="text-sm text-gray-400">Received Revenue</p>
            <p className="text-2xl font-bold text-green-400">
             PKR:  {stats.totalRevenue.toFixed(2)}
            </p>
          </div>
          <MdAttachMoney className="text-emerald-400 text-3xl" />
        </div>
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between hover:scale-105 transition duration-300">
          <div>
            <p className="text-sm text-gray-400">Pending Revenue</p>
            <p className="text-2xl font-bold text-orange-400">
             PKR:  {stats.pendingRevenue.toFixed(2)}
            </p>
          </div>
          <MdWarning className="text-orange-400 text-3xl" />
        </div>
      </div>

      {/* Filters + Export */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, passport, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow transition"
          >
            <FaFileCsv /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow transition"
          >
            <FaFilePdf /> PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-slate-800 shadow rounded-lg animate-slideUp">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-gray-200">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Full Name</th>
              <th className="p-3 text-left">Passport</th>
              <th className="p-3 text-left">Visa Type</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Added By</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b,index) => (
              <tr
                key={b.id}
                className="border-b border-slate-700 hover:bg-slate-700/50 transition duration-200"
              >
                <th className="p-3">{index + 1}</th>
                <td className="p-3">{b.fullName}</td>
                <td className="p-3">{b.passport}</td>
                <td className="p-3">{b.visaType}</td>
                <td className="p-3">{b.date}</td>
                <td className="p-3">{b.userEmail}</td>
                <td className="p-3">{b.email}</td>
                <td className="p-3">{b.phone}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="7" className="text-center p-6 text-gray-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <Footer/>
    </>
  );
}

export default CountriesWiseDet;
