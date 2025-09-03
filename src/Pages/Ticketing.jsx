import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Viewall() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [searchRef, setSearchRef] = useState("");
  const [searchId, setSearchId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch all bookings in real time for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "ticketBookings"),
      where("createdByUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(arr);
    });
    return () => unsub();
  }, [user]);

  // 🔹 Search bookings
  const doSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    let arr = [];

    if (searchRef) {
      const q = query(
        collection(db, "ticketBookings"),
        where("pnr", "==", searchRef.trim().toUpperCase())
      );
      const snap = await getDocs(q);
      arr = arr.concat(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

    setResults(arr);
    setLoading(false);
  };

  // 📄 Download PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14).text("Search Results - Ticket Bookings", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["PNR", "Route", "Dates", "Pax", "Class", "Passenger", "Price", "Payable", "Profit", "Status"]],
      body: results.map((r) => [
        r.pnr,
        `${r.from} → ${r.to}`,
        r.returnDate ? `${r.departure} • ${r.returnDate}` : r.departure,
        r.totalPax,
        r.travelClass,
        `${r.passenger?.fullName}\n${r.passenger?.passport} | ${r.passenger?.cnic} | ${r.passenger?.phone}`,
        r.price,
        r.payable,
        r.profit,
        r.status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save("ticket_bookings.pdf");
  };

  // 📊 Download CSV
  const downloadCSV = () => {
    const headers = [
      "PNR,Route,Dates,Pax,Class,Passenger,Price,Payable,Profit,Status",
    ];
    const rows = results.map((r) =>
      [
        r.pnr,
        `${r.from} → ${r.to}`,
        r.returnDate ? `${r.departure} • ${r.returnDate}` : r.departure,
        r.totalPax,
        r.travelClass,
        `${r.passenger?.fullName} (${r.passenger?.passport} | ${r.passenger?.cnic} | ${r.passenger?.phone})`,
        r.price,
        r.payable,
        r.profit,
        r.status,
      ].join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ticket_bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  // 📄 Download ALL as PDF
const downloadAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14).text("All Ticket Bookings", 14, 16);
  
    autoTable(doc, {
      startY: 22,
      head: [["PNR", "Route", "Dates", "Pax", "Class", "Passenger", "Price", "Payable", "Profit", "Status"]],
      body: bookings.map((b) => [
        b.pnr,
        `${b.from} → ${b.to}`,
        b.returnDate ? `${b.departure} • ${b.returnDate}` : b.departure,
        b.totalPax,
        b.travelClass,
        `${b.passenger?.fullName}\n${b.passenger?.passport} | ${b.passenger?.cnic} | ${b.passenger?.phone}`,
        b.price,
        b.payable,
        b.profit,
        b.status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
    });
  
    doc.save("all_ticket_bookings.pdf");
  };
  
  // 📊 Download ALL as CSV
  const downloadAllCSV = () => {
    const headers = [
      "PNR,Route,Dates,Pax,Class,Passenger,Price,Payable,Profit,Status",
    ];
    const rows = bookings.map((b) =>
      [
        b.pnr,
        `${b.from} → ${b.to}`,
        b.returnDate ? `${b.departure} • ${b.returnDate}` : b.departure,
        b.totalPax,
        b.travelClass,
        `${b.passenger?.fullName} (${b.passenger?.passport} | ${b.passenger?.cnic} | ${b.passenger?.phone})`,
        b.price,
        b.payable,
        b.profit,
        b.status,
      ].join(",")
    );
  
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_ticket_bookings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <form onSubmit={doSearch} className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            placeholder="Search by PNR"
            className="border rounded-lg px-4 py-2 flex-1"
          />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Passport / CNIC"
            className="border rounded-lg px-4 py-2 flex-1"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Searching..." : "Search"}
          </button>
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => setResults([])}
              className="ml-2 px-4 py-2 border rounded-lg"
            >
              Close Results
            </button>
          )}
        </form>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="overflow-x-auto mb-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Search Results</h2>
            <div className="flex gap-2">
              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Download PDF
              </button>
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
              >
                Download CSV
              </button>
            </div>
          </div>

          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">PNR</th>
                <th className="p-2 border">Route</th>
                <th className="p-2 border">Dates</th>
                <th className="p-2 border">Pax</th>
                <th className="p-2 border">Class</th>
                <th className="p-2 border">Passenger</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Payable</th>
                <th className="p-2 border">Profit</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border font-semibold">{r.pnr}</td>
                  <td className="p-2 border">{r.from} → {r.to}</td>
                  <td className="p-2 border">
                    {r.departure}
                    {r.returnDate ? ` • ${r.returnDate}` : ""}
                  </td>
                  <td className="p-2 border">{r.totalPax}</td>
                  <td className="p-2 border">{r.travelClass}</td>
                  <td className="p-2 border">
                    <div>{r.passenger?.fullName}</div>
                    <div className="text-xs text-gray-500">
                      {r.passenger?.passport} | {r.passenger?.cnic} | {r.passenger?.phone} | {r.passenger?.email}
                    </div>
                  </td>
                  <td className="p-2 border">{r.price}</td>
                  <td className="p-2 border">{r.payable}</td>
                  <td className="p-2 border text-green-600 font-semibold">
                    {r.profit}
                  </td>
                  <td className="p-2 border">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Bookings */}
      {/* All Bookings */}
<div className="overflow-x-auto">
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-lg font-semibold">All Bookings</h2>
    {bookings.length > 0 && (
      <div className="flex gap-2">
        <button
          onClick={downloadAllPDF}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Download All PDF
        </button>
        <button
          onClick={downloadAllCSV}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
        >
          Download All CSV
        </button>
      </div>
    )}
  </div>
  </div>

      <div className="overflow-x-auto">
        <h2 className="text-lg font-semibold mb-2">All Bookings</h2>
        {bookings.length === 0 ? (
          <div className="text-gray-500 text-sm">No bookings found.</div>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">PNR</th>
                <th className="p-2 border">Route</th>
                <th className="p-2 border">Dates</th>
                <th className="p-2 border">Pax</th>
                <th className="p-2 border">Class</th>
                <th className="p-2 border">Passenger</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Payable</th>
                <th className="p-2 border">Profit</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-2 border font-semibold">{b.pnr}</td>
                  <td className="p-2 border">{b.from} → {b.to}</td>
                  <td className="p-2 border">
                    {b.departure}
                    {b.returnDate ? ` • ${b.returnDate}` : ""}
                  </td>
                  <td className="p-2 border">{b.totalPax}</td>
                  <td className="p-2 border">{b.travelClass}</td>
                  <td className="p-2 border">
                    <div>{b.passenger?.fullName}</div>
                    <div className="text-xs text-gray-500">
                      {b.passenger?.passport} | {b.passenger?.cnic} | {b.passenger?.phone} | {b.passenger?.email}
                    </div>
                  </td>
                  <td className="p-2 border">{b.price}</td>
                  <td className="p-2 border">{b.payable}</td>
                  <td className="p-2 border text-green-600 font-semibold">
                    {b.profit}
                  </td>
                  <td className="p-2 border">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
