import { useEffect, useMemo, useState, useRef } from "react";
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
  FaChevronDown,
  FaEye, // Icon for the view details button
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import toast from "react-hot-toast";

/**
 * EmployeeRecord.jsx
 * - Single-file, production-ready Employee Records admin page.
 * - Fetches bookings, ticketBookings, ummrahBookings and groups by user email.
 * - Accordion, tabs (visa/ticket/umrah), date-range + search filtering,
 * totals summary, grouping by date, export CSV, and detailed record modal.
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
  const [modalRecord, setModalRecord] = useState(null); // <-- NEW: State for the details modal
  const detailsRef = useRef(null);

  useEffect(() => {
    if (selectedEmployee && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedEmployee]);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [visaSnap, ticketSnap, umrahSnap] = await Promise.all([
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "ticketBookings")),
          getDocs(collection(db, "ummrahBookings")),
        ]);

        const visaData = visaSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          __type: "visa",
        }));
        const ticketData = ticketSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          __type: "ticket",
        }));
        const umrahData = umrahSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          __type: "umrah",
        }));

        const all = [...visaData, ...ticketData, ...umrahData];

        const grouped = {};
        for (const item of all) {
          const email = (
            item.userEmail || item.createdByEmail || "unknown@os.com"
          ).toLowerCase();
          if (!grouped[email])
            grouped[email] = { visa: [], ticket: [], umrah: [] };
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
      return {
        email,
        data,
        counts,
        total: counts.visa + counts.ticket + counts.umrah,
      };
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <AdminNavbar />

      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              Employee Records
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Overview of handlers & their bookings — Visa / Ticket / Umrah.
            </p>
          </div>

          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3 top-3.5 text-gray-500" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search by employee email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl shadow-inner bg-gray-800 text-white border border-gray-700 focus:border-purple-500 outline-none transition"
              />
            </div>

            <button
              onClick={() => {
                setShowOnlyWithRecords((s) => !s);
              }}
              className={`px-4 py-3 rounded-xl text-sm font-medium shadow-sm transition ${
                showOnlyWithRecords
                  ? "bg-purple-600 text-white transform hover:scale-105"
                  : "bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transform hover:scale-105"
              }`}
              title="Toggle: show only employees with at least one record"
            >
              {showOnlyWithRecords ? "With records" : "All employees"}
            </button>
          </div>
        </div>

        {/* Quick totals row */}
        <TotalsRow employees={employeeEntries} />

        {/* Grid */}
        <section className="mt-8 animate-fade-in-up">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading employees…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full p-6 bg-gray-800 rounded-xl shadow text-center">
                    <div className="text-gray-400">No employees found.</div>
                  </div>
                ) : (
                  filteredEmployees.map(
                    ({ email, data, counts, total }, index) => (
                      <EmployeeCard
                        key={email}
                        email={email}
                        counts={counts}
                        total={total}
                        expanded={selectedEmployee === email}
                        onToggle={() =>
                          setSelectedEmployee((prev) =>
                            prev === email ? null : email
                          )
                        }
                      />
                    )
                  )
                )}
              </div>

              {/* Expanded details panel - render below grid */}
              {selectedEmployee && groupedByEmail[selectedEmployee] && (
                <div ref={detailsRef} className="mt-8">
                  <div className="bg-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in-up">
                    <EmployeeDetails
                      emp={groupedByEmail[selectedEmployee]}
                      email={selectedEmployee}
                      onClose={() => setSelectedEmployee(null)}
                      onRecordSelect={setModalRecord} // <-- Pass setter to details panel
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />

      {/* NEW: Render the modal conditionally */}
      {modalRecord && (
        <RecordDetailModal
          record={modalRecord}
          onClose={() => setModalRecord(null)}
        />
      )}
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
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between transform transition hover:scale-105">
        <div>
          <div className="text-xs uppercase text-gray-400">Handlers</div>
          <div className="text-3xl font-bold text-white mt-1">
            {employees.length}
          </div>
          <div className="text-sm text-gray-500">Total employees listed</div>
        </div>
        <div className="text-4xl text-purple-400">👥</div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between transform transition hover:scale-105">
        <div>
          <div className="text-xs uppercase text-gray-400">Bookings (all)</div>
          <div className="text-3xl font-bold text-white mt-1">
            {totals.visa + totals.ticket + totals.umrah}
          </div>
          <div className="text-sm text-gray-500">
            {totals.visa} visas • {totals.ticket} tickets • {totals.umrah} umrah
          </div>
        </div>
        <div className="text-4xl text-sky-400">📊</div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg flex items-center justify-between transform transition hover:scale-105">
        <div>
          <div className="text-xs uppercase text-gray-400">Active handlers</div>
          <div className="text-3xl font-bold text-white mt-1">
            {totals.handlers}
          </div>
          <div className="text-sm text-gray-500">
            Have at least 1 booking
          </div>
        </div>
        <div className="text-4xl text-pink-400">⚡</div>
      </div>
    </div>
  );
}

/* ------------------------------- Employee Card ------------------------------- */

function EmployeeCard({ email, counts = {}, total = 0, expanded = false, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl p-6 cursor-pointer transform transition-all duration-300 ease-in-out ${
        expanded
          ? "ring-4 ring-purple-500 bg-gray-700"
          : "bg-gray-800 shadow-md hover:shadow-xl hover:scale-105"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-purple-900 flex items-center justify-center text-2xl text-purple-400">
          <FaUserTie />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-md font-semibold truncate text-white">
              {email}
            </div>
            <div className="text-xs text-gray-400">{total} records</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 bg-blue-900 px-2 py-1 rounded-full">
              <FaPassport className="text-blue-400" />
              <div className="font-medium text-blue-300">{counts.visa}</div>
              <div className="text-gray-400">Visas</div>
            </div>

            <div className="flex items-center gap-2 bg-purple-900 px-2 py-1 rounded-full">
              <FaPlane className="text-purple-400" />
              <div className="font-medium text-purple-300">{counts.ticket}</div>
              <div className="text-gray-400">Tickets</div>
            </div>

            <div className="flex items-center gap-2 bg-amber-900 px-2 py-1 rounded-full">
              <FaKaaba className="text-amber-400" />
              <div className="font-medium text-amber-300">{counts.umrah}</div>
              <div className="text-gray-400">Umrah</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">Click to expand</div>
            <div
              className={`text-sm transform transition-transform duration-300 ${
                expanded ? "rotate-180 text-purple-400" : "text-gray-500"
              }`}
            >
              <FaChevronDown />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Employee Details (big) ------------------------------- */

function EmployeeDetails({ emp = { visa: [], ticket: [], umrah: [] }, email, onClose, onRecordSelect }) {
  const [tab, setTab] = useState("visa");
  const [localSearch, setLocalSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupByDateView, setGroupByDateView] = useState(true);

  const lists = {
    visa: emp.visa || [],
    ticket: emp.ticket || [],
    umrah: emp.umrah || [],
  };

  const filteredRecords = useMemo(() => {
    const list = lists[tab] || [];
    const q = localSearch.trim().toLowerCase();

    return list
      .filter((item) => {
        const text = (
          (item.fullName || "") +
          " " +
          (item.passenger?.fullName || "") +
          " " +
          (item.passport || item.passportNumber || "") +
          " " +
          (item.country || "") + " " + (item.to || "") + " " + (item.from || "") +
          " " + (item.vendor || "") + " " + (item.pnr || "") + " " + (item.phone || "")
        ).toLowerCase();
        if (q && !text.includes(q)) return false;
        const dateStr = toISODate(item);
        if (!dateStr) {
          return !startDate && !endDate;
        }
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
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
  }, [lists, tab, localSearch, startDate, endDate]);

  const totals = useMemo(() => {
    const totalFiltered = filteredRecords.length;
    const totalAll = (lists[tab] || []).length;
    return { totalFiltered, totalAll };
  }, [filteredRecords, lists, tab]);

  const handleExportFiltered = () => {
    const rows = filteredRecords.map((r) => ({
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
      received: r.receivedFee || "",
      status: r.status || r.paymentStatus || r.visaStatus || "",
      vendor: r.vendor || r.airlinePref || "",
      extra: JSON.stringify(r),
    }));
    exportToCSV(
      `${email}_${tab}_export_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div>
      {/* header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Records for</h2>
            <div className="text-purple-400 font-semibold truncate text-lg">
              {email}
            </div>
            <button onClick={onClose} title="Close panel" className="ml-3 text-lg text-gray-500 hover:text-white transition">
              <FaTimes />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Tab: {tab.toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="text-sm text-gray-400 mr-2">
            <div>
              Showing <span className="font-semibold text-white">{totals.totalFiltered}</span> of <span className="text-gray-500">{totals.totalAll}</span> {tab} records
            </div>
            <div className="text-xs text-gray-500">
              Use search/date filters to narrow results
            </div>
          </div>
          <button onClick={handleExportFiltered} className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm shadow hover:brightness-95 transition transform hover:scale-105" title="Export filtered records to CSV">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {["visa", "ticket", "umrah"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              tab === t
                ? "bg-purple-600 text-white shadow-md transform scale-105"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t.toUpperCase()} <span className="ml-2 text-xs text-gray-500">({(lists[t] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <FaSearch className="absolute left-3 top-3.5 text-gray-500" />
          <input value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} placeholder="Search inside this employee..." className="w-full pl-10 pr-3 py-3 rounded-xl border text-sm shadow-inner outline-none bg-gray-900 text-white border-gray-700 focus:ring-2 focus:ring-purple-500"/>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400"><FaCalendarAlt /><span className="text-xs">From</span></label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm shadow-sm bg-gray-900 text-gray-300 border-gray-700"/>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400"><FaCalendarAlt /><span className="text-xs">To</span></label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm shadow-sm bg-gray-900 text-gray-300 border-gray-700"/>
        </div>
        <div className="flex items-center gap-2">
          {startDate || endDate ? (
            <button onClick={handleClearDates} className="px-3 py-2 rounded-lg bg-gray-700 text-gray-300 border border-gray-600 text-sm shadow-sm hover:bg-gray-600 transition" title="Clear date filters">
              Clear
            </button>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-400 mr-2">View:</label>
          <button onClick={() => setGroupByDateView((s) => !s)} className="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 text-sm shadow-sm hover:bg-gray-600 transition" title="Toggle grouped / flat">
            {groupByDateView ? "Grouped by date" : "Flat list"}
          </button>
        </div>
      </div>

      {/* Records area */}
      <div className="space-y-4">
        {groupByDateView ? (
          groupedFilteredView(lists[tab] || [], localSearch, startDate, endDate, onRecordSelect)
        ) : (
          <FlatList records={filteredRecords} tab={tab} onViewDetails={onRecordSelect} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Grouped view helper ------------------------------- */

function groupedFilteredView(list, localSearch, startDate, endDate, onViewDetails) {
  const map = {};
  for (const item of list) {
    const date = toISODate(item) || "No date";
    if (!map[date]) map[date] = [];
    map[date].push(item);
  }

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
            const q = localSearch.trim().toLowerCase();
            const text = (
              (item.fullName || "") + " " + (item.passenger?.fullName || "") + " " +
              (item.passport || item.passportNumber || "") + " " +
              (item.country || "") + " " + (item.to || "") + " " + (item.from || "") + " " +
              (item.vendor || "") + " " + (item.pnr || "") + " " + (item.phone || "")
            ).toLowerCase();
            if (q && !text.includes(q)) return false;
            const ds = toISODate(item);
            if (!ds) {
              return !startDate && !endDate;
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
          <div key={dateKey} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-md font-semibold text-white">
                {dateKey === "No date" ? "No date available" : dateKey}
              </div>
              <div className="text-xs text-gray-500">
                {items.length} record{items.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="space-y-3">
              {items.map((r) => (
                <RecordCard key={r.id || JSON.stringify(r)} r={r} onViewDetails={onViewDetails} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------- Flat List ------------------------------- */

function FlatList({ records, tab, onViewDetails }) {
  if (!records || records.length === 0) {
    return <div className="text-center py-8 text-gray-500">No records found</div>;
  }
  return (
    <div className="space-y-3">
      {records.map((r,index) => (
        <RecordCard key={r.id || JSON.stringify(r)} r={r} onViewDetails={onViewDetails} />
      ))}
    </div>
  );
}

/* ------------------------------- Single Record Card (UPDATED) ------------------------------- */
function getFinancials(r) {
  let payable = 0, received = 0, remaining = 0, profit = 0, embassyFee = '-', vendorFee = 0;

  switch(r.__type) {
    case 'visa':
      payable = parseFloat(r.totalFee || r.payable || 0);
      received = parseFloat(r.receivedFee || 0);
      remaining = parseFloat(r.remainingFee ?? (payable - received));
      profit =typeof r.profit === 'number' && !isNaN(r.profit)? r.profit: 'Not entered';
      embassyFee = typeof r.embassyFee === 'number' && !isNaN(r.embassyFee)
  ? r.embassyFee
  : 'Not entered';
      vendorFee = typeof r.vendorFee === 'number' && !isNaN(r.vendorFee)
  ? r.vendorFee
  : '-';
      break;

    case 'ticket':
      payable = parseFloat(r.payable );
      received = parseFloat(r.price || 0);
  
      profit = parseFloat(r.profit ?? (received - payable));
      embassyFee = '-';
      break;

    case 'umrah':
      payable = parseFloat(r.payable || 0);
      received = parseFloat(r.received || 0);
      remaining= "-"
      profit = parseFloat(r.profit ?? (payable - received));
      embassyFee = '-';
      break;

    default:
      payable = parseFloat(r.payable || r.totalFee || r.price || 0);
      received = parseFloat(r.receivedFee || r.received || 0);
      remaining = parseFloat(r.remainingFee ?? (payable - received));
      profit = parseFloat(r.profit ?? (payable - received));
      embassyFee = r.embassyFee || '-';
  }

  return { payable, received, remaining, profit, embassyFee };
}
function RecordCard({ r, onViewDetails }) {
  const { payable, received, remaining, profit, embassyFee } = getFinancials(r);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:border-purple-500 transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left side: Passenger Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm font-semibold text-white truncate">
              {r.fullName || r.passenger?.fullName || "—"}
            </div>
            <div className="text-xs text-gray-400">
              {r.passport || r.passportNumber || ""}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {r.country ? <span>{r.country} • </span> : null}
            {r.from && r.to ? <span>{r.from} → {r.to} • </span> : null}
            <span>Status: <b className="font-semibold text-purple-400">{r.status || r.visaStatus || r.paymentStatus || "N/A"}</b></span>
          </div>
        </div>

        {/* Right side: Financials & Actions */}
        <div className="flex">
          <div className="flex justify-center items-center gap-6 text-center mr-4">
            <div>
              <div className="text-xs text-gray-500">Payable</div>
              <div className="font-semibold text-sky-400 text-lg">{payable.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Received</div>
              <div className="font-semibold text-green-400 text-lg">{received.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Remaining</div>
              <div className={`font-semibold text-lg ${remaining >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>{remaining.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Embassy fee</div>
              <div className={`font-semibold text-lg ${typeof embassyFee === 'number' ? 'text-yellow-400' : 'text-gray-400'}`}>
                {typeof embassyFee === 'number' ? embassyFee.toLocaleString() : embassyFee}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500">Profit</div>
              <div className={`font-semibold text-lg ${profit >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>{profit.toLocaleString()}</div>
            </div>
          </div>

          <button 
            onClick={() => onViewDetails(r)}
            title="View Details"
            className="p-3 flex-end bg-gray-700 rounded-lg text-gray-300 hover:bg-purple-600 hover:text-white transition"
          >
            <FaEye />
          </button>
        </div>
      </div>
    </div>
  );
}


/* ------------------------------- NEW: Record Detail Modal ------------------------------- */

function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  const { payable, received, remaining, profit, embassyFee } = getFinancials(record);

  const DetailRow = ({ label, value }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="py-2">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-md text-white">{String(value)}</div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{record.fullName || record.passenger?.fullName || "Record Details"}</h3>
            <p className="text-sm text-purple-400">{record.passport || record.passportNumber}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-white transition">
            <FaTimes />
          </button>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 bg-gray-900 p-4 rounded-lg mb-6 text-center">
          <div>
            <div className="text-sm text-gray-400">Payable</div>
            <div className="font-bold text-2xl text-sky-400">{payable.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Received</div>
            <div className="font-bold text-2xl text-green-400">{received.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Remaining</div>
            <div className={`font-bold text-2xl ${remaining >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>{remaining.toLocaleString()}</div>
          </div>
        </div>

        {/* All Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <DetailRow label="Record Type" value={record.__type?.toUpperCase()} />
          <DetailRow label="Date" value={toISODate(record)} />
          <DetailRow label="Status" value={record.status || record.visaStatus || record.paymentStatus} />
          <DetailRow label="Country / Destination" value={record.country || record.to} />
          <DetailRow label="Origin" value={record.from} />
          <DetailRow label="Phone" value={record.phone} />
          <DetailRow label="Email" value={record.email || record.userEmail || record.createdByEmail} />
          <DetailRow label="Vendor / Airline" value={record.vendor || record.airlinePref} />
          <DetailRow label="PNR" value={record.pnr} />
          <DetailRow label="Visa Type" value={record.visaType} />
          <DetailRow label="Embassy Fee" value={embassyFee} />
          <DetailRow label="Profit" value={profit} />
        </div>
        
        <div className="mt-6 text-right">
          <button onClick={onClose} className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

