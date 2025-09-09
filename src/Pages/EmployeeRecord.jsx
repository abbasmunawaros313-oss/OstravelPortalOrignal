// EmployeeRecord.jsx
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  FaUserTie,
  FaSearch,
  FaPlane,
  FaPassport,
  FaKaaba,
  FaDownload,
  FaTimes,
  FaCalendarAlt,
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import toast from "react-hot-toast";

/**
 * EmployeeRecord.jsx
 * - Single-file, production-ready Employee Records admin page.
 * - Fetches bookings, ticketBookings, ummrahBookings and groups by user email.
 * - Accordion, tabs (visa/ticket/umrah), date-range + search filtering,
 *   totals summary, grouping by date, export CSV.
 *
 * Styling note: uses Tailwind classes. Adjust to your design tokens if needed.
 */

/* ------------------------------- Helpers ------------------------------- */

// safe convert firestore timestamp to YYYY-MM-DD (handles string date too)
function toISODate(item) {
  if (!item) return null;
  if (item.date && typeof item.date === "string") {
    // already "YYYY-MM-DD"
    return item.date;
  }
  if (item.departure && typeof item.departure === "string") {
    return item.departure.slice(0, 10);
  }
  if (item.createdAt) {
    // Firestore timestamp object may have .seconds or .toDate
    if (typeof item.createdAt === "string") {
      try {
        return new Date(item.createdAt).toISOString().slice(0, 10);
      } catch {
        return null;
      }
    }
    if (item.createdAt.toDate) {
      return item.createdAt.toDate().toISOString().slice(0, 10);
    }
    if (item.createdAt.seconds) {
      return new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10);
    }
  }
  return null;
}

// CSV export utility (array of objects)
function exportToCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    toast.error("No rows to export");
    return;
  }
  try {
    const headers = Object.keys(
      rows.reduce((acc, r) => ({ ...acc, ...r }), {})
    );
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] == null ? "" : String(r[h]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(",")
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
  } catch (err) {
    console.error("CSV export failed", err);
    toast.error("Export failed");
  }
}

/* ------------------------------- Component ------------------------------- */

export default function EmployeeRecord() {
  const [groupedByEmail, setGroupedByEmail] = useState({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null); // email string
  const [showOnlyWithRecords, setShowOnlyWithRecords] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        // fetch collections
        const [visaSnap, ticketSnap, umrahSnap] = await Promise.all([
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "ticketBookings")),
          getDocs(collection(db, "ummrahBookings")),
        ]);

        const visaData = visaSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "visa" }));
        const ticketData = ticketSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "ticket" }));
        const umrahData = umrahSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "umrah" }));

        const all = [...visaData, ...ticketData, ...umrahData];

        // group by email (userEmail or createdByEmail)
        const grouped = {};
        for (const item of all) {
          const email = (item.userEmail || item.createdByEmail || "unknown@os.com").toLowerCase();
          if (!grouped[email]) grouped[email] = { visa: [], ticket: [], umrah: [] };
          if (item.__type === "visa") grouped[email].visa.push(item);
          else if (item.__type === "ticket") grouped[email].ticket.push(item);
          else grouped[email].umrah.push(item);
        }

        if (mounted) {
          setGroupedByEmail(grouped);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  // derived employees list (sorted by total records desc)
  const employeeEntries = useMemo(() => {
    const arr = Object.entries(groupedByEmail).map(([email, data]) => {
      const counts = {
        visa: (data.visa || []).length,
        ticket: (data.ticket || []).length,
        umrah: (data.umrah || []).length,
      };
      return { email, data, counts, total: counts.visa + counts.ticket + counts.umrah };
    });
    arr.sort((a, b) => b.total - a.total || a.email.localeCompare(b.email));
    return arr;
  }, [groupedByEmail]);

  const filteredEmployees = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return employeeEntries.filter((e) => {
      if (showOnlyWithRecords && e.total === 0) return false;
      if (!q) return true;
      return e.email.includes(q);
    });
  }, [employeeEntries, globalSearch, showOnlyWithRecords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex flex-col">
      <AdminNavbar />

      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Employee Records</h1>
            <p className="text-sm text-slate-600 mt-1">Overview of handlers & their bookings — Visa / Ticket / Umrah.</p>
          </div>

          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search by employee email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl shadow-sm border border-slate-200 focus:border-emerald-300 outline-none"
              />
            </div>

            <button
              onClick={() => {
                setShowOnlyWithRecords((s) => !s);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition ${showOnlyWithRecords ? "bg-emerald-600 text-white" : "bg-white border"}`}
              title="Toggle: show only employees with at least one record"
            >
              {showOnlyWithRecords ? "With records" : "All employees"}
            </button>
          </div>
        </div>

        {/* Quick totals row */}
        <TotalsRow employees={employeeEntries} />

        {/* Grid */}
        <section className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading employees…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full p-6 bg-white rounded-xl shadow text-center">
                    <div className="text-slate-600">No employees found.</div>
                  </div>
                ) : (
                  filteredEmployees.map(({ email, data, counts, total }) => (
                    <EmployeeCard
                      key={email}
                      email={email}
                      counts={counts}
                      total={total}
                      expanded={selectedEmployee === email}
                      onToggle={() => setSelectedEmployee((prev) => (prev === email ? null : email))}
                    />
                  ))
                )}
              </div>

              {/* Expanded details panel - render below grid */}
              {selectedEmployee && groupedByEmail[selectedEmployee] && (
                <div className="mt-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <EmployeeDetails
                      emp={groupedByEmail[selectedEmployee]}
                      email={selectedEmployee}
                      onClose={() => setSelectedEmployee(null)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------- Totals Row ------------------------------- */

function TotalsRow({ employees = [] }) {
  const totals = employees.reduce(
    (acc, e) => {
      acc.visa += e.counts.visa;
      acc.ticket += e.counts.ticket;
      acc.umrah += e.counts.umrah;
      acc.handlers += e.total > 0 ? 1 : 0;
      return acc;
    },
    { visa: 0, ticket: 0, umrah: 0, handlers: 0 }
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">Handlers</div>
          <div className="text-2xl font-bold text-slate-800">{employees.length}</div>
          <div className="text-sm text-slate-500">Total employees listed</div>
        </div>
        <div className="text-4xl text-emerald-600">👥</div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">Bookings (all)</div>
          <div className="text-2xl font-bold text-slate-800">{totals.visa + totals.ticket + totals.umrah}</div>
          <div className="text-sm text-slate-500">{totals.visa} visas • {totals.ticket} tickets • {totals.umrah} umrah</div>
        </div>
        <div className="text-4xl text-blue-500">📊</div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">Active handlers</div>
          <div className="text-2xl font-bold text-slate-800">{totals.handlers}</div>
          <div className="text-sm text-slate-500">Have at least 1 booking</div>
        </div>
        <div className="text-4xl text-purple-500">⚡</div>
      </div>
    </div>
  );
}

/* ------------------------------- Employee Card ------------------------------- */

function EmployeeCard({ email, counts = {}, total = 0, expanded = false, onToggle }) {
  // color bullets
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl p-5 cursor-pointer transform transition hover:scale-105 ${expanded ? "ring-4 ring-emerald-300 bg-gradient-to-br from-white to-emerald-50" : "bg-white shadow"} `}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center text-2xl text-emerald-700">
          <FaUserTie />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold truncate">{email}</div>
            <div className="text-xs text-slate-500">{total} records</div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-full">
              <FaPassport className="text-blue-600" />
              <div className="font-medium text-blue-700">{counts.visa}</div>
              <div className="text-slate-400">Visas</div>
            </div>

            <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-full">
              <FaPlane className="text-purple-600" />
              <div className="font-medium text-purple-700">{counts.ticket}</div>
              <div className="text-slate-400">Tickets</div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 px-2 py-1 rounded-full">
              <FaKaaba className="text-amber-600" />
              <div className="font-medium text-amber-700">{counts.umrah}</div>
              <div className="text-slate-400">Umrah</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">Click to expand</div>
            <div className="text-xs text-slate-400">{expanded ? "Open" : "Open"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Employee Details (big) ------------------------------- */

function EmployeeDetails({ emp = { visa: [], ticket: [], umrah: [] }, email, onClose }) {
  const [tab, setTab] = useState("visa");
  const [localSearch, setLocalSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupByDateView, setGroupByDateView] = useState(true); // grouped by date vs flat list

  // normalize: ensure arrays exist
  const lists = {
    visa: emp.visa || [],
    ticket: emp.ticket || [],
    umrah: emp.umrah || [],
  };

  // filtered records according to tab, local search and date range
  const filteredRecords = useMemo(() => {
    const list = lists[tab] || [];
    const q = localSearch.trim().toLowerCase();

    return list
      .filter((item) => {
        // text search across many fields
        const text = (
          (item.fullName || "") +
          " " +
          (item.passenger?.fullName || "") +
          " " +
          (item.passport || item.passportNumber || "") +
          " " +
          (item.country || "") +
          " " +
          (item.to || "") +
          " " +
          (item.from || "") +
          " " +
          (item.vendor || "") +
          " " +
          (item.pnr || "") +
          " " +
          (item.phone || "")
        ).toLowerCase();

        if (q && !text.includes(q)) return false;

        // date range
        const dateStr = toISODate(item);
        if (!dateStr) {
          // if no date we keep it unless a strict date filter is present
          return !startDate && !endDate;
        }
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        // show newest first by available date fallback to createdAt
        const da = toISODate(a) || "";
        const db = toISODate(b) || "";
        if (da === db) {
          // fallback timestamp compare if present
          const ta = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tb = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tb - ta;
        }
        return db.localeCompare(da);
      });
  }, [lists, tab, localSearch, startDate, endDate]);

  // grouped by date: { "2025-09-08": [..], ... }
  const groupedByDate = useMemo(() => {
    const map = {};
    for (const item of lists[tab] || []) {
      const dateStr = toISODate(item) || "No date";
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(item);
    }
    // convert to sorted array descending
    const arr = Object.entries(map)
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => {
        // "No date" should come last
        if (a.date === "No date") return 1;
        if (b.date === "No date") return -1;
        return b.date.localeCompare(a.date);
      });
    return arr;
  }, [lists, tab]);

  // totals for summary header (post-filter counts)
  const totals = useMemo(() => {
    const totalFiltered = filteredRecords.length;
    const totalAll = (lists[tab] || []).length;
    return { totalFiltered, totalAll };
  }, [filteredRecords, lists, tab]);

  // Export currently filtered records
  const handleExportFiltered = () => {
    // convert objects to plain export-ready rows
    const rows = filteredRecords.map((r) => {
      // flatten main fields
      const base = {
        id: r.id || "",
        fullName: r.fullName || r.passenger?.fullName || "",
        passport: r.passport || r.passportNumber || "",
        phone: r.phone || "",
        email: r.email || r.userEmail || r.createdByEmail || "",
        type: tab,
        date: toISODate(r) || "",
        country: r.country || r.to || "",
        from: r.from || "",
        to: r.to || "",
        payable: r.payable || r.totalFee || r.price || "",
        status: r.status || r.paymentStatus || r.visaStatus || "",
        vendor: r.vendor || r.airlinePref || "",
        extra: JSON.stringify(r),
      };
      return base;
    });
    exportToCSV(`${email}_${tab}_export_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div>
      {/* header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Records for</h2>
            <div className="text-emerald-600 font-semibold truncate">{email}</div>
            <button
              onClick={onClose}
              title="Close panel"
              className="ml-3 text-xs text-slate-500 hover:text-slate-700"
            >
              <FaTimes />
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-1">Tab: {tab.toUpperCase()}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-600 mr-2">
            <div>Showing <span className="font-semibold text-slate-800">{totals.totalFiltered}</span> of <span className="text-slate-500">{totals.totalAll}</span> {tab} records</div>
            <div className="text-xs text-slate-400">Use search/date filters to narrow results</div>
          </div>

          <button
            onClick={handleExportFiltered}
            className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm shadow hover:brightness-95 transition"
            title="Export filtered records to CSV"
          >
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {["visa", "ticket", "umrah"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tab === t ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {t.toUpperCase()} <span className="ml-2 text-xs text-slate-400">({(lists[t] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-3 top-3 text-slate-400" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search inside this employee (name / passport / vendor / pnr / country)..."
            className="w-full pl-10 pr-3 py-3 rounded-xl border text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <FaCalendarAlt />
            <span className="text-xs">From</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <FaCalendarAlt />
            <span className="text-xs">To</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-slate-600 mr-2">View:</label>
          <button
            onClick={() => setGroupByDateView((s) => !s)}
            className="px-3 py-2 rounded-lg bg-white border text-sm shadow-sm"
            title="Toggle grouped / flat"
          >
            {groupByDateView ? "Grouped by date" : "Flat list"}
          </button>
        </div>
      </div>

      {/* Records area */}
      <div className="space-y-4">
        {/* when grouped view is on, show groupedByDate (but each group is filtered by date/search as well) */}
        {groupByDateView ? (
          // iterate groupedByDate, but present only items that pass the filters
          groupedFilteredView(lists[tab] || [], localSearch, startDate, endDate)
        ) : (
          // flat list: show filteredRecords
          <FlatList records={filteredRecords} tab={tab} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Grouped view helper ------------------------------- */

// This component builds groups by date and then applies same filters as above
function groupedFilteredView(list, localSearch, startDate, endDate) {
  // build map date -> items
  const map = {};
  for (const item of list) {
    const date = toISODate(item) || "No date";
    if (!map[date]) map[date] = [];
    // local filter applied later
    map[date].push(item);
  }

  // prepare sorted date keys (desc) with "No date" last
  const keys = Object.keys(map).sort((a, b) => {
    if (a === "No date") return 1;
    if (b === "No date") return -1;
    return b.localeCompare(a);
  });

  return (
    <>
      {keys.map((dateKey) => {
        const items = map[dateKey]
          .filter((item) => {
            // apply same search+date filter
            const q = localSearch.trim().toLowerCase();
            const text = (
              (item.fullName || "") +
              " " +
              (item.passenger?.fullName || "") +
              " " +
              (item.passport || item.passportNumber || "") +
              " " +
              (item.country || "") +
              " " +
              (item.to || "") +
              " " +
              (item.from || "") +
              " " +
              (item.vendor || "") +
              " " +
              (item.pnr || "") +
              " " +
              (item.phone || "")
            ).toLowerCase();

            if (q && !text.includes(q)) return false;
            const ds = toISODate(item);
            if (!ds) {
              return !startDate && !endDate; // include only if no date filters set
            }
            if (startDate && ds < startDate) return false;
            if (endDate && ds > endDate) return false;
            return true;
          })
          .sort((a, b) => {
            const da = toISODate(a) || "";
            const db = toISODate(b) || "";
            if (da === db) {
              const ta = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
              const tb = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
              return tb - ta;
            }
            return db.localeCompare(da);
          });

        if (items.length === 0) return null;

        return (
          <div key={dateKey} className="bg-slate-50 rounded-lg p-3 border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-700">{dateKey === "No date" ? "No date available" : dateKey}</div>
              <div className="text-xs text-slate-500">{items.length} record{items.length !== 1 ? "s" : ""}</div>
            </div>

            <div className="space-y-2">
              {items.map((r) => (
                <RecordCard key={r.id || JSON.stringify(r)} r={r} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------- Flat List ------------------------------- */

function FlatList({ records, tab }) {
  if (!records || records.length === 0) {
    return <div className="text-center py-8 text-slate-400">No records found</div>;
  }
  return (
    <div className="space-y-2">
      {records.map((r) => (
        <RecordCard key={r.id || JSON.stringify(r)} r={r} />
      ))}
    </div>
  );
}

/* ------------------------------- Single Record Card ------------------------------- */

function RecordCard({ r }) {
  // choose small label based on fields
  const label =
    r.country || r.to || r.vendor || r.airlinePref || r.from || "Record";

  return (
    <div className="bg-white rounded-lg p-3 border shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {r.fullName || r.passenger?.fullName || "—"}
            </div>
            <div className="text-xs text-slate-400">{r.passport || r.passportNumber || ""}</div>
          </div>

          <div className="text-xs text-slate-600 mt-2">
            {r.country ? <span>{r.country} • </span> : null}
            {r.from && r.to ? <span>{r.from} → {r.to} • </span> : null}
            {r.departure ? <span>Departure: {r.departure} • </span> : null}
            {r.date ? <span>Date: {r.date} • </span> : null}
            <span>Status: <b className="text-slate-700">{r.status || r.visaStatus || r.paymentStatus || "N/A"}</b></span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-xs text-slate-500">Payable</div>
          <div className="font-semibold text-emerald-600">{r.payable || r.totalFee || r.price || "0"}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
