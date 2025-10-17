import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  FaSearch,
  FaPlane,
  FaPassport,
  FaKaaba,
  FaTimes,
  FaEye,
  FaBriefcaseMedical, // CHANGE: Added new icon for insurance
} from "react-icons/fa";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
import toast from "react-hot-toast";

// Helper function to get a consistent date string from any record
function toISODate(item) {
  if (!item) return null;
  if (item.createdAt?.toDate) return item.createdAt.toDate().toISOString().slice(0, 10);
  if (item.createdAt?.seconds) return new Date(item.createdAt.seconds * 1000).toISOString().slice(0, 10);
  if (item.departure) return String(item.departure).slice(0, 10);
  if (item.date) return String(item.date);
  return null;
}

// Helper function to calculate financial details for any record
function getFinancials(r) {
  let payable = 0, received = 0, remaining = 0, profit = 0, embassyFee = '-', vendorFee = 0;

  switch(r.__type) {
    case 'visa':
      payable = parseFloat(r.totalFee || r.payable || 0);
      received = parseFloat(r.receivedFee || 0);
      remaining = parseFloat(r.remainingFee ?? (payable - received));
      profit =typeof r.profit === 'number' && !isNaN(r.profit)? r.profit: 'Not entered';
      embassyFee = typeof r.embassyFee === 'number' && !isNaN(r.embassyFee) ? r.embassyFee : 'Not entered';
      vendorFee = typeof r.vendorFee === 'number' && !isNaN(r.vendorFee) ? r.vendorFee : '-';
      break;

    case 'ticket':
      payable = parseFloat(r.payable || 0);
      received = parseFloat(r.price || 0);
      remaining = parseFloat(r.remainingFee || 0);
      profit = parseFloat(r.profit ?? (received - payable));
      embassyFee = '-';
      break;

    case 'umrah':
      payable = parseFloat(r.payable || 0);
      received = parseFloat(r.received || 0);
      remaining= parseFloat(r.remaining || 0);
      profit = parseFloat(r.profit ?? (payable - received));
      embassyFee = '-';
      break;
    
    // CHANGE: Added case for medical insurance
    case 'insurance':
      payable = parseFloat(r.totalPayableAmount || 0);
      received = parseFloat(r.totalReceivedAmount || 0);
      remaining = parseFloat(r.totalRemainingAmount || 0);
      profit = parseFloat(r.totalProfit || 0);
      embassyFee = '-';
      break;

    default:
      payable = parseFloat(r.payable || r.totalFee || r.price || 0);
      received = parseFloat(r.receivedFee || r.received || 0);
      remaining = parseFloat(r.remainingFee ?? 0);
      profit = parseFloat(r.profit ?? (payable - received));
      embassyFee = r.embassyFee || '-';
  }

  return { payable, received, remaining, profit, embassyFee };
}

// ---------------------------
// Main Search Component
// ---------------------------
export default function GlobalSearchPage() {
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalRecord, setModalRecord] = useState(null);

  // 1. Fetch ALL data from every category once on component load
  useEffect(() => {
    const fetchAllRecords = async () => {
      setLoading(true);
      try {
        // CHANGE: Added medical_insurance to the data fetching
        const [visaSnap, ticketSnap, umrahSnap, insuranceSnap] = await Promise.all([
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "ticketBookings")),
          getDocs(collection(db, "ummrahBookings")),
          getDocs(collection(db, "medical_insurance")), 
        ]);

        const visaData = visaSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "visa" }));
        const ticketData = ticketSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "ticket" }));
        const umrahData = umrahSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "umrah" }));
        const insuranceData = insuranceSnap.docs.map((d) => ({ id: d.id, ...d.data(), __type: "insurance" }));

        // Combine all data into a single array
        setAllRecords([...visaData, ...ticketData, ...umrahData, ...insuranceData]);
        toast.success("All records loaded!");
      } catch (err) {
        console.error("Failed to fetch all records:", err);
        toast.error("Could not load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllRecords();
  }, []);

  // 2. Filter the combined data based on the search term
  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return []; // Don't show anything until user starts searching
    }

    return allRecords.filter((record) => {
      // CHANGE: Added fields from insurance to the searchable text
      const searchableText = [
        record.fullName,
        record.passenger?.fullName,
        record.NameofInsured, // from insurance
        record.passport,
        record.passportNumber,
        record.phone,
        record.contactNumber, // from insurance
        record.pnr,
        record.country,
        record.countryofTravel, // from insurance
        record.to,
        record.vendor,
      ].join(' ').toLowerCase();

      return searchableText.includes(query);
    });
  }, [searchTerm, allRecords]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <AdminNavbar />

      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        {/* Header and Search Bar */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white">Universal Search</h1>
          <p className="text-md text-gray-400 mt-2 max-w-2xl">
            Find any booking instantly. Search by passenger name, passport number, PNR, phone number, or destination across all categories.
          </p>
          <div className="relative w-full max-w-2xl mt-6">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search all bookings..."
              className="w-full pl-12 pr-4 py-4 rounded-xl shadow-inner bg-gray-800 text-white border border-gray-700 focus:border-purple-500 outline-none transition text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Results Section */}
        <section className="mt-8 animate-fade-in-up">
          {loading && (
            <div className="text-center py-12 text-gray-500">Loading all records...</div>
          )}

          {!loading && searchTerm && (
            <div className="mb-4 text-gray-400">
              Found <span className="font-bold text-white">{filteredRecords.length}</span> matching record(s).
            </div>
          )}

          <div className="space-y-4">
            {!loading && filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <RecordCard key={record.id} r={record} onViewDetails={setModalRecord} />
              ))
            ) : (
              !loading && searchTerm && (
                <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-xl">
                  No records found for "{searchTerm}".
                </div>
              )
            )}
             {!loading && !searchTerm && (
                <div className="text-center py-12 text-gray-500 bg-gray-800 rounded-xl">
                  Enter a search term above to find bookings.
                </div>
              )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Re-using the same modal component for consistency */}
      {modalRecord && (
        <RecordDetailModal
          record={modalRecord}
          onClose={() => setModalRecord(null)}
        />
      )}
    </div>
  );
}

// ---------------------------
// Re-usable UI Components
// ---------------------------

function RecordCard({ r, onViewDetails }) {
  const { payable, received, remaining, profit } = getFinancials(r);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'visa': return <FaPassport className="text-blue-400" />;
      case 'ticket': return <FaPlane className="text-purple-400" />;
      case 'umrah': return <FaKaaba className="text-amber-400" />;
      // CHANGE: Added insurance icon
      case 'insurance': return <FaBriefcaseMedical className="text-green-400" />;
      default: return null;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-sm hover:border-purple-500 transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg">{getTypeIcon(r.__type)}</span>
            {/* CHANGE: Added NameofInsured for insurance records */}
            <div className="text-sm font-semibold text-white truncate">
              {r.fullName || r.passenger?.fullName || r.NameofInsured || "—"}
            </div>
            <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
              {r.passport || r.passportNumber || ""}
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2 pl-8">
            {/* CHANGE: Added countryofTravel for insurance */}
            {(r.country || r.countryofTravel) && <span>{r.country || r.countryofTravel} • </span>}
            {r.from && r.to && <span>{r.from} → {r.to} • </span>}
            <span>Status: <b className="font-semibold text-purple-400">{r.status || r.visaStatus || r.paymentStatus || "N/A"}</b></span>
          </div>
        </div>

        <div className="flex items-center w-full sm:w-auto">
          <div className="flex-1 flex justify-around items-center gap-6 text-center sm:mr-4">
            <div>
              <div className="text-xs text-gray-500">Payable</div>
              <div className="font-semibold text-sky-400 text-md">{payable.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Received</div>
              <div className="font-semibold text-green-400 text-md">{received.toLocaleString()}</div>
            </div>
             <div>
              <div className="text-xs text-gray-500">Profit</div>
              <div className={`font-semibold text-md ${profit >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>{profit.toLocaleString()}</div>
            </div>
          </div>

          <button 
            onClick={() => onViewDetails(r)}
            title="View Details"
            className="p-3 bg-gray-700 rounded-lg text-gray-300 hover:bg-purple-600 hover:text-white transition"
          >
            <FaEye />
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <div className="flex justify-between items-start mb-4">
          <div>
            {/* CHANGE: Added NameofInsured to modal title */}
            <h3 className="text-xl font-bold text-white">{record.fullName || record.passenger?.fullName || record.NameofInsured || "Record Details"}</h3>
            <p className="text-sm text-purple-400">{record.passport || record.passportNumber}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-white transition">
            <FaTimes />
          </button>
        </div>

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
            <div className={`font-bold text-2xl ${remaining > 0 ? 'text-red-500' : 'text-yellow-400'}`}>{remaining.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <DetailRow label="Record Type" value={record.__type?.toUpperCase()} />
          <DetailRow label="Date Added" value={toISODate(record)} />
          <DetailRow label="Status" value={record.status || record.visaStatus || record.paymentStatus} />
          {/* CHANGE: Handle different country/destination fields */}
          <DetailRow label="Country / Destination" value={record.country || record.to || record.countryofTravel} />
          <DetailRow label="Origin" value={record.from} />
          {/* CHANGE: Handle different phone fields */}
          <DetailRow label="Phone" value={record.phone || record.contactNumber} />
          <DetailRow label="Email" value={record.email || record.userEmail || record.createdByEmail} />
          <DetailRow label="Vendor / Airline" value={record.vendor || record.airlinePref} />
          <DetailRow label="PNR" value={record.pnr} />
          <DetailRow label="Visa Type" value={record.visaType} />
          
          {/* CHANGE: Added insurance-specific fields which will only show for insurance records */}
          <DetailRow label="Insurance Company" value={record.NameofCompany} />
          <DetailRow label="Effective Date" value={record.EffectiveDate} />
          <DetailRow label="Expiry Date" value={record.ExpiryDate} />
          <DetailRow label="NIC" value={record.Nic} />

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
