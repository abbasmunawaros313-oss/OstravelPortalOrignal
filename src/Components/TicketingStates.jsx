// EmployeeLeaderboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  FaSearch,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaCheck,
} from "react-icons/fa";

const stripTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const inSameDay = (a, b) => stripTime(a).getTime() === stripTime(b).getTime();

const moneyFmt = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 });

export default function EmployeeLeaderboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState("bookings"); // bookings | earnings | profit
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "ticketBookings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data?.createdAt?.toDate?.() || new Date(0),
          };
        });
        setBookings(arr);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to load bookings");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const matchesDateFilter = (date) => {
    if (!date || !(date instanceof Date)) return false;
    const now = new Date();
    const today = stripTime(now);
    const d = stripTime(date);

    switch (dateFilter) {
      case "All":
        return true;
      case "Today":
        return inSameDay(d, today);
      case "Yesterday": {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        return inSameDay(d, y);
      }
      case "Last7Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        return d >= start && d <= today;
      }
      case "ThisWeek": {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return d >= start && d <= today;
      }
      case "ThisMonth":
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      case "Last30Days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        return d >= start && d <= today;
      }
      default:
        return true;
    }
  };

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (!matchesDateFilter(new Date(b.createdAt))) return false;
      if (!term) return true;

      const haystack = (b.createdByEmail || b.createdByName || "").toLowerCase();
      return haystack.includes(term);
    });
  }, [bookings, dateFilter, search]);

  // Employee totals
  const employeeTotals = useMemo(() => {
    const map = {};
    filteredBookings.forEach((b) => {
      const key = b.createdByEmail || b.createdByName || "Unknown";
      if (!map[key]) map[key] = { bookings: 0, earnings: 0, payable: 0, profit: 0, name: key };
      map[key].bookings += 1;
      map[key].earnings += Number(b.price) || 0;
      map[key].payable += Number(b.payable) || 0;
      map[key].profit += Number(b.profit) || 0;
    });
    return Object.values(map);
  }, [filteredBookings]);

  // Sorted employee list
  const sortedEmployees = useMemo(() => {
    const arr = [...employeeTotals];
    arr.sort((a, b) => {
      const av = a[sortKey] || 0;
      const bv = b[sortKey] || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [employeeTotals, sortKey, sortDir]);

  return (
    <div className="mt-5 p-6 bg-gray-900 text-gray-100 rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">Ticketing</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-3 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last7Days">Last 7 Days</option>
            <option value="ThisWeek">This Week</option>
            <option value="ThisMonth">This Month</option>
            <option value="Last30Days">Last 30 Days</option>
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="py-1 px-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
          >
            <option value="bookings">Bookings</option>
            <option value="earnings">Earnings</option>
            <option value="payable">Payable</option>
            <option value="profit">Profit</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            className="p-2 bg-gray-800 rounded border border-gray-700 text-gray-200"
          >
            {sortDir === "desc" ? <FaSortAmountDown /> : <FaSortAmountUp />}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div>Loading...</div>
      ) : sortedEmployees.length === 0 ? (
        <div>No employees found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-700 text-left">
            <thead className="bg-gray-800 text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Bookings</th>
                <th className="px-4 py-2">Earnings</th>
                <th className="px-4 py-2">Payable</th>
                <th className="px-4 py-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp) => (
                <tr
                  key={emp.name}
                  className="border-t border-gray-700 hover:bg-gray-700 transition-all duration-150"
                >
                  <td className="px-4 py-2 font-medium">{emp.name}</td>
                  <td className="px-4 py-2 text-purple-300 font-semibold">{emp.bookings}</td>
                  <td className="px-4 py-2 text-blue-300 font-semibold">{moneyFmt(emp.earnings)}</td>
                  <td className="px-4 py-2 text-amber-300 font-semibold">{moneyFmt(emp.payable)}</td>
                  <td className="px-4 py-2 text-green-300 font-bold">{moneyFmt(emp.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
