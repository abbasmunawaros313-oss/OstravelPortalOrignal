import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaEnvelope,
  FaUsers,
  FaFileCsv,
  FaFilePdf,
  FaChevronDown,
  FaChevronUp,
  FaArrowLeft,
  FaPhone,
  FaGlobe,
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/*
  CustomerCountryAndEmail.jsx
  - Contains two main pages in one file for convenience:
    1) CustomerCountryPage (default export)  -> lists customers grouped by country
    2) SendEmailPage (named export)          -> compose email for a country and preview recipients

  Styling: Tailwind CSS + react-icons
  No framer-motion used (per request)

  NOTE: The "send email" action is mocked (console.log). Replace the sendEmails() call
  with your backend/SendGrid/Firebase Function when you are ready.
*/

/* -------------------------------------------------------------------------- */
/* ----------------------------- FLAG HELPERS -------------------------------- */
/* -------------------------------------------------------------------------- */
const COUNTRY_TO_CODE = {
  Pakistan: "pk",
  India: "in",
  "United States": "us",
  "United Kingdom": "gb",
  Saudi: "sa",
  "Saudi Arabia": "sa",
  UAE: "ae",
  "United Arab Emirates": "ae",
  Canada: "ca",
  Thailand: "th",
  Turkey: "tr",
  Malaysia: "my",
  Germany: "de",
  France: "fr",
  Italy: "it",
  Spain: "es",
  Australia: "au",
  China: "cn",
  Japan: "jp",
  Singapore: "sg",
  Brazil: "br",
  Mexico: "mx",
  Egypt: "eg",
  Nigeria: "ng",
  Kenya: "ke",
  "South Africa": "za",
  Vietnam: "vn",
  Indonesia: "id",
  Philippines: "ph",
  Argentina: "ar",
  Netherlands: "nl",
  Belgium: "be",
  Sweden: "se",
  Norway: "no",
  Finland: "fi",
  Denmark: "dk",
  Switzerland: "ch",
  Austria: "at",
  Poland: "pl",
  Portugal: "pt",
  Greece: "gr",
  Ireland: "ie",
  "New Zealand": "nz",
  Bangladesh: "bd",
  SriLanka: "lk",
  "Sri Lanka": "lk",
  Nepal: "np",
  Myanmar: "mm",
  Cambodia: "kh",
  Laos: "la",
  Mongolia: "mn",
  Iran: "ir",
  Iraq: "iq",
  Afghanistan: "af",
  Kazakhstan: "kz",
  Uzbekistan: "uz",
  Qatar: "qa",
  Kuwait: "kw",
  Bahrain: "bh",
  Oman: "om",
  Yemen: "ye",
};

function getFlagUrl(country) {
  if (!country) return "";
  const code = COUNTRY_TO_CODE[country] || COUNTRY_TO_CODE[prettyCountry(country)];
  return code ? `https://flagcdn.com/w40/${code}.png` : "";
}

// try to normalize some common variants to map keys
function prettyCountry(c) {
  if (!c) return "";
  return c
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(usa|us|u\.s\.|united states of america)\b/i, "United States")
    .replace(/\b(uk|u\.k\.|england)\b/i, "United Kingdom");
}

/* -------------------------------------------------------------------------- */
/* ------------------------- UTILITIES (CSV, PDF) ---------------------------- */
/* -------------------------------------------------------------------------- */
function exportToCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    toast.error("No rows to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => {
    const val = r[h] == null ? "" : String(r[h]);
    return `"${val.replace(/"/g, '""')}"`;
  }).join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success("CSV exported");
}

function exportPDF(filename, title, rows, cols) {
  try {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [cols],
      body: rows.map((r) => cols.map((c) => r[c] ?? "")),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9 },
    });
    doc.save(filename);
    toast.success("PDF exported");
  } catch (err) {
    console.error("PDF export failed", err);
    toast.error("PDF export failed");
  }
}

/* -------------------------------------------------------------------------- */
/* ------------------------ SMALL REUSABLE UI PARTS -------------------------- */
/* -------------------------------------------------------------------------- */
function Card({ className = "", children }) {
  return (
    <div className={`bg-slate-800 p-4 rounded-xl shadow-md ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="text-3xl text-blue-400">{icon}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* -------------------------- CUSTOMER COUNTRY PAGE -------------------------- */
/* -------------------------------------------------------------------------- */

export default function CustomerCountryPage() {
  const [allBookings, setAllBookings] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [searchGlobal, setSearchGlobal] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true);
      try {
        // fetch from multiple collections to be safe
        const collections = ["bookings"];
        const snaps = await Promise.all(
          collections.map((name) => getDocs(collection(db, name)))
        );
        const all = snaps.flatMap((snap, idx) => snap.docs.map((d) => ({ id: d.id, __source: collections[idx], ...d.data() })));

        if (!mounted) return;
        setAllBookings(all);

        // group by country (normalize field names)
        const groups = all.reduce((acc, b) => {
          // try multiple possible country fields
          const rawCountry = b.country || b.to || b.destination || b.nationality || b.countryName || "Unknown";
          const key = (rawCountry || "Unknown").toString().trim();
          if (!acc[key]) acc[key] = [];
          acc[key].push(b);
          return acc;
        }, {});

        setGrouped(groups);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load customers");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    return () => (mounted = false);
  }, []);

  // derived list of countries filtered by global search
  const countryList = useMemo(() => {
    const q = searchGlobal.trim().toLowerCase();
    const entries = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    if (!q) return entries;
    return entries.filter(([country]) => country.toLowerCase().includes(q));
  }, [grouped, searchGlobal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <AdminNavbar />
        <div className="p-10 text-center">Loading customers…</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Customers by Country</h1>
            <p className="text-sm text-gray-300">View customers grouped by country, filter, export, or email them.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                value={searchGlobal}
                onChange={(e) => setSearchGlobal(e.target.value)}
                placeholder="Search countries..."
                className="pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <button
              onClick={() => {
                // quick export of summary
                const rows = Object.entries(grouped).map(([country, list]) => ({ country, count: list.length }));
                exportToCSV(`countries_summary_${new Date().toISOString().slice(0, 10)}.csv`, rows);
              }}
              className="bg-blue-600 px-4 py-2 rounded-xl text-white"
            >
              <FaFileCsv />&nbsp;Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {countryList.map(([country, list]) => (
            <div key={country} className="bg-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
  {getFlagUrl(country) ? (
    <img
      src={getFlagUrl(country)}
      alt={`${country} flag`}
      className="w-8 h-8 object-cover rounded"
    />
  ) : (
    <FaGlobe className="text-xl text-sky-300" />
  )}
</div>

                  <div>
                    <div className="font-semibold text-lg capitalize">{country}</div>
                    <div className="text-sm text-gray-400">{list.length} customers</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/send-email/${encodeURIComponent(country)}`)}
                    className="bg-indigo-600 px-3 py-2 rounded-lg text-white hover:brightness-105"
                    title={`Compose email to all ${country}`}
                  >
                    <FaEnvelope />&nbsp;Send Email
                  </button>

                  <button
                    onClick={() => setExpanded(expanded === country ? null : country)}
                    className="bg-white/5 px-3 py-2 rounded-lg text-white"
                    aria-expanded={expanded === country}
                  >
                    {expanded === country ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
              </div>

              {expanded === country && (
                <div className="mt-4 border-t border-slate-700 pt-4">
                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
                    {list.map((c) => (
                      <div key={c.id} className="p-3 bg-white/5 rounded-md flex items-center justify-between">
                        <div>
                          <div className="font-medium">{c.fullName || c.passenger?.fullName || "Unnamed"}</div>
                          <div className="text-xs text-gray-300 mt-1">{c.passport || c.passportNumber || "-"} • {c.email || c.email || "-"}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-300">{c.date || c.departure || "-"}</div>
                          <div className="flex items-center gap-2">
                            <a href={`tel:${c.phone || ''}`} className="text-xs text-sky-300 flex items-center gap-1"><FaPhone /> {c.phone ? c.phone : 'N/A'}</a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => {
                        const rows = list.map((b) => ({ fullName: b.fullName, passport: b.passport, email: b.userEmail || b.email, phone: b.phone }));
                        exportToCSV(`${country}_customers_${new Date().toISOString().slice(0,10)}.csv`, rows);
                      }}
                      className="bg-green-600 px-3 py-2 rounded-lg text-white"
                    >
                      <FaFileCsv />&nbsp;CSV
                    </button>

                    <button
                      onClick={() => {
                        const cols = ["Full Name", "Passport", "Email", "Phone"];
                        const rows = list.map((b) => ({ "Full Name": b.fullName || '-', Passport: b.passport || '-', Email: b.email || b.email || '-', Phone: b.phone || '-' }));
                        exportPDF(`${country}_customers.pdf`, `${country} Customers`, rows, cols);
                      }}
                      className="bg-red-600 px-3 py-2 rounded-lg text-white"
                    >
                      <FaFilePdf />&nbsp;PDF
                    </button>

                    <button
                      onClick={() => navigate(`/countrywise-det/${encodeURIComponent(country)}`)}
                      className="ml-auto bg-white/5 px-3 py-2 rounded-lg text-white"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ----------------------------- SEND EMAIL PAGE ----------------------------- */
/* -------------------------------------------------------------------------- */

