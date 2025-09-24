import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";

export default function EmployeeBookingsLeaderboard() {
  const [employeeStats, setEmployeeStats] = useState([]);
  const [sortKey, setSortKey] = useState("bookings");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookings"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // group by employee (userId or userEmail)
      const stats = {};
      data.forEach((b) => {
        const key = b.userId || b.userEmail;
        if (!stats[key]) {
          stats[key] = {
            userId: b.userId,
            userEmail: b.userEmail,
            bookings: 0,
            approved: 0,
            total:0,
            received: 0,
            pending: 0,
            profit: 0,
          };
        }

        stats[key].bookings += 1;
        stats[key].total += Number(b.totalFee || 0);
        stats[key].received += Number(b.receivedFee || 0);
        stats[key].pending += Number(b.remainingFee || 0);
        stats[key].profit += Number(b.profit || 0);
        if (b.visaStatus?.toLowerCase() === "approved") {
          stats[key].approved += 1;
        }
      });

      setEmployeeStats(Object.values(stats));
    });
    return () => unsub();
  }, []);

  // sorting
  const sorted = [...employeeStats].sort((a, b) => {
    let x = a[sortKey] || 0;
    let y = b[sortKey] || 0;
    if (sortDir === "asc") return x > y ? 1 : x < y ? -1 : 0;
    return x < y ? 1 : x > y ? -1 : 0;
  });

  // simple number formatter (no trillions nonsense)
  const numFmt = (val) => (val ? val.toLocaleString("en-PK") : "0");

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      {/* Header + Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-extrabold text-blue-300">
          Employee Bookings Leaderboard
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">Sort by:</div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="py-1 px-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
          >
            <option value="bookings">Bookings</option>
            <option value="approved">Approved</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="profit">Profit</option>
          </select>
          <button
            onClick={() => setSortDir((s) => (s === "desc" ? "asc" : "desc"))}
            title="Toggle direction"
            className="p-2 bg-gray-900 rounded border border-gray-700 text-gray-200"
          >
            {sortDir === "desc" ? <FaSortAmountDown /> : <FaSortAmountUp />}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length ? (
              sorted.map((emp, idx) => (
                <tr
                  key={emp.userId || emp.userEmail}
                  className="border-t border-gray-700 hover:bg-gray-700 transition-all duration-200"
                >
                  <td className="px-4 py-3 text-gray-400 font-bold">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-3 text-gray-200 font-medium">
                    {emp.userEmail || emp.userId}
                  </td>
                  <td className="px-4 py-3 text-purple-300 font-semibold">
                    {numFmt(emp.bookings)}
                  </td>
                  <td className="px-4 py-3 text-indigo-300 font-semibold">
                    {numFmt(emp.approved)}
                  </td>
                   <td className="px-4 py-3 text-blue-300 font-semibold">
                    ₨{numFmt(emp.total)}
                  </td>
                  <td className="px-4 py-3 text-blue-300 font-semibold">
                    ₨ {numFmt(emp.received)}
                  </td>
                  <td className="px-4 py-3 text-amber-300 font-semibold">
                    ₨ {numFmt(emp.pending)}
                  </td>
                  <td className="px-4 py-3 text-green-300 font-bold">
                    ₨ {numFmt(emp.profit)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No employee booking data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
