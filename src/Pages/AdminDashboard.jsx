import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import {
  MdDashboard,MdPeople,MdSearch,MdBarChart,MdEdit,
  MdDelete,
  MdVisibility,
  MdDownload,
  MdFilterList,
  MdRefresh,
  MdLogout,
  MdBusiness,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdAttachMoney,
  MdTrendingUp,
  MdTrendingDown,
  MdWarning,
  MdCheckCircle,
  MdSchedule
} from "react-icons/md";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Link, useNavigate } from "react-router-dom";
import AdminNavbar from "../Components/AdminNavbar";
import Footer from "../Components/Footer";
export default function AdminDashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "All",
    payment: "All",
    country: "All",
    dateRange: "All"
  });
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    processing: 0,
    rejected: 0,
    paid: 0,
    unpaid: 0,
    totalRevenue: 0,
    pendingRevenue: 0
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
 const [timeFilter, setTimeFilter] = useState("all");

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
          <p className="text-red-600">You must be an admin to access this dashboard.</p>
        </div>
      </div>
    );
  }
  const navigate = useNavigate();
  const HandleClick =()=>{
      navigate("/AdminTicketBookings");
     
  }
  // Fetch all bookings
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const bookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAllBookings(bookings);
        setFilteredBookings(bookings);
        setLoading(false);
        setError(null);
        
        // Calculate statistics
     
        // Process employee data
        processEmployeeData(bookings);
      } catch (err) {
        setError("Error loading data: " + err.message);
        setLoading(false);
        toast.error("Failed to load data");
      }
    }, (error) => {
      setError("Error loading data: " + error.message);
      setLoading(false);
      toast.error("Failed to load data");
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
  calculateStats(allBookings);
}, [allBookings, timeFilter]);


  // Calculate statistics
 const calculateStats = (bookings) => {
  const filtered = bookings.filter(b => isWithinTimeRange(b.date, timeFilter));

  const stats = {
    total: filtered.length,
    approved: filtered.filter(b => b.visaStatus === "Approved").length,
    processing: filtered.filter(b => b.visaStatus === "Processing").length,
    rejected: filtered.filter(b => b.visaStatus === "Rejected").length,
    paid: filtered.filter(b => b.paymentStatus === "Paid").length,
    unpaid: filtered.filter(b => b.paymentStatus === "Unpaid").length,
    totalRevenue: filtered.reduce((sum, b) => sum + (Number(b.receivedFee) || 0), 0),
    pendingRevenue: filtered.reduce((sum, b) => sum + (Number(b.remainingFee) || 0), 0),
    profit: filtered.reduce((sum, b) => sum + (Number(b.profit) || 0), 0)
  };

  setStats(stats);
};


  // Process bookings into employee data
  const processEmployeeData = (bookings) => {
    const employeeMap = new Map();
    
    bookings.forEach(booking => {
      const userEmail = booking.userEmail || 'Unknown';
      
      if (!employeeMap.has(userEmail)) {
        employeeMap.set(userEmail, {
          email: userEmail,
          totalBookings: 0,
          approvedVisas: 0,
          pendingVisas: 0,
          rejectedVisas: 0,
          totalRevenue: 0,
          receivedRevenue: 0,
          pendingRevenue: 0,
          countries: new Set(),
          lastActivity: null,
          performance: 0
        });
      }
      
      const employee = employeeMap.get(userEmail);
      employee.totalBookings++;
      
      if (booking.visaStatus === 'Approved') {
        employee.approvedVisas++;
      } else if (booking.visaStatus === 'Processing' || booking.visaStatus === 'Pending') {
        employee.pendingVisas++;
      } else if (booking.visaStatus === 'Rejected') {
        employee.rejectedVisas++;
      }
      
      employee.totalRevenue += Number(booking.totalFee || 0);
      employee.receivedRevenue += Number(booking.receivedFee || 0);
      employee.pendingRevenue += Number(booking.remainingFee || 0);
      employee.profit+= Number(booking.profit || 0);
    
      employee.profit += Number(booking.profit || 0);
      
      if (booking.country) {
        employee.countries.add(booking.country);
      }
      
      if (booking.date) {
        const bookingDate = new Date(booking.date);
        if (!employee.lastActivity || bookingDate > employee.lastActivity) {
          employee.lastActivity = bookingDate;
        }
      }
    });
    
    // Calculate performance and convert to array
    const employeesArray = Array.from(employeeMap.values()).map(emp => ({
      ...emp,
      countries: Array.from(emp.countries),
      performance: emp.totalBookings > 0 ? Math.round((emp.approvedVisas / emp.totalBookings) * 100) : 0
    }));
    
    setEmployees(employeesArray);
  };
const isWithinTimeRange = (bookingDate, filter) => {
  if (!bookingDate) return false;
  const date = new Date(bookingDate);
  const now = new Date();

  switch (filter) {
    case "today":
      return date.toDateString() === now.toDateString();

    case "yesterday":
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return date.toDateString() === yesterday.toDateString();

    case "week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
      return date >= startOfWeek && date <= now;

    case "month":
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );

    case "year":
      return date.getFullYear() === now.getFullYear();

    default:
      return true; // "all"
  }
};

  // Apply filters and search
  useEffect(() => {
    let filtered = allBookings;

    // Apply status filter
    if (filters.status !== "All") {
      filtered = filtered.filter(b => b.visaStatus === filters.status);
    }

    // Apply payment filter
    if (filters.payment !== "All") {
      filtered = filtered.filter(b => b.paymentStatus === filters.payment);
    }

    // Apply country filter
    if (filters.country !== "All") {
      filtered = filtered.filter(b => b.country === filters.country);
    }

    // Apply date range filter
    if (filters.dateRange !== "All") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filters.dateRange) {
        case "Today":
          filtered = filtered.filter(b => new Date(b.date) >= today);
          break;
        case "Yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          filtered = filtered.filter(b => new Date(b.date) >= yesterday);
          break;
        case "This Week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(b => new Date(b.date) >= weekAgo);
          break;
        case "This Month":
          const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
          filtered = filtered.filter(b => new Date(b.date) >= monthAgo);
          break;
      }
    }

    // Apply search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(b => 
        b.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        b.passport?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        b.country?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  }, [allBookings, filters, searchTerm]);

  // Get unique countries for filter
  const uniqueCountries = [...new Set(allBookings.map(b => b.country).filter(Boolean))];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle edit
  const handleEdit = (booking) => {
    setEditing(booking.id);
    setEditData({
      fullName: booking.fullName || "",
      visaType: booking.visaType || "",
      country: booking.country || "",
      totalFee: booking.totalFee || "",
      receivedFee: booking.receivedFee || "",
      remainingFee: booking.remainingFee || "",
      paymentStatus: booking.paymentStatus || "Unpaid",
      visaStatus: booking.visaStatus || "Processing",
      remarks: booking.remarks || "",
      email: booking.email || "",
     
      profit: booking.profit || (booking.totalFee - booking.embassyFee  || "0")
    });
  };

  // Save edit
  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, "bookings", id), editData);
      setEditing(null);
      setEditData({});
      toast.success("Booking updated successfully!");
    } catch (error) {
      toast.error("Error updating booking: " + error.message);
    }
  };

  // Handle delete
  const handleDelete = async (booking) => {
    if (window.confirm(`Are you sure you want to delete the booking for ${booking.fullName}?`)) {
      try {
        await deleteDoc(doc(db, "bookings", booking.id));
        toast.success("Booking deleted successfully!");
      } catch (error) {
        toast.error("Error deleting booking: " + error.message);
      }
    }
  };

  // Generate PDF report
  const generateReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("OS TRAVELS & TOURS - ADMIN REPORT", pageWidth/2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth/2, 30, { align: 'center' });

    // Statistics
    doc.setFillColor(255, 255, 255);
    doc.rect(10, 50, pageWidth - 20, 15, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("SYSTEM STATISTICS", pageWidth/2, 60, { align: 'center' });

    // Stats table
    autoTable(doc, {
      startY: 70,
      head: [["Metric", "Count", "Value"]],
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      body: [
        ["Total Bookings", stats.total.toString(), ""],
        ["Approved Visas", stats.approved.toString(), ""],
        ["Processing", stats.processing.toString(), ""],
        ["Rejected", stats.rejected.toString(), ""],
        ["Paid", stats.paid.toString(), ""],
        ["Unpaid", stats.unpaid.toString(), ""],
        ["Total Revenue", "", `${stats.totalRevenue.toFixed(2)}`],
        ["Pending Revenue", "", `${stats.pendingRevenue.toFixed(2)}`],
        ["Total Profit", "", `${stats.profit.toFixed(2)}`]
      ],
      styles: {
        fontSize: 10,
        cellPadding: 5
      }
    });

    // Recent bookings
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFillColor(248, 250, 252);
    doc.rect(10, finalY, pageWidth - 20, 8, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("RECENT BOOKINGS", 15, finalY + 6);

    const recentBookings = filteredBookings.slice(0, 10);
    autoTable(doc, {
      startY: finalY + 10,
      head: [["Name", "Passport", "Status", "Country", "Fee"]],
      headStyles: {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      body: recentBookings.map(b => [
        b.fullName || "-",
        b.passport || "-",
        b.visaStatus || "-",
        b.country || "-",
        `$${b.totalFee || "0"}`
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3
      }
    });

    doc.save(`Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export data to CSV
  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      const headers = ["Name", "Passport", "Email", "Visa Type", "Country", "Status", "Payment", "Total Fee", "Received", "Remaining", "Date", "Employee"];
      const csvContent = [
        headers.join(","),
        ...filteredBookings.map(b => [
          `"${b.fullName || ""}"`,
          `"${b.passport || ""}"`,
          `"${b.email || ""}"`,
          `"${b.visaType || ""}"`,
          `"${b.country || ""}"`,
          `"${b.visaStatus || ""}"`,
          `"${b.paymentStatus || ""}"`,
          b.totalFee || "",
          b.receivedFee || "",
          b.remainingFee || "",
          `"${b.date || ""}"`,
          `"${b.userEmail || ""}"`
        ].join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OS_Travels_Bookings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Failed to export CSV: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <>
    <AdminNavbar/>
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <MdDashboard className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Manage all employee data and system</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Logged in as: <span className="font-semibold text-purple-600">{user?.email}</span>
              </div>
             
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MdBusiness className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Visas</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MdCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
          
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Receivable</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalRevenue + stats.pendingRevenue}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MdAttachMoney className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recieved</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MdAttachMoney className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingRevenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MdWarning className="text-orange-600 text-xl" />
              </div>
            </div>
          </div>
           <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600"> Profit</p>
                <p className="text-2xl font-bold text-blue-600">{stats.profit}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MdAttachMoney className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
        {/* Time Filter aligned right */}
<div className="flex justify-end mb-6">
  <select
    value={timeFilter}
    onChange={(e) => setTimeFilter(e.target.value)}
    className="border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  >
    <option value="all">All Time</option>
    <option value="today">Today</option>
    <option value="yesterday">Yesterday</option>
    <option value="week">This Week</option>
    <option value="month">This Month</option>
    <option value="year">This Year</option>
  </select>
</div>


        {/* Quick Stats Summary */}
       
       

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Search by name, passport, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="All">All Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Processing">Processing</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={filters.payment}
                  onChange={(e) => setFilters({...filters, payment: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="All">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>

                <select
                  value={filters.country}
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="All">All Countries</option>
                  {uniqueCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>

                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
            </div>

                         {/* Action Buttons */}
             <div className="flex gap-2">
               <button
                 onClick={generateReport}
                 disabled={loading || filteredBookings.length === 0}
                 className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <MdDownload />
                 PDF Report
               </button>
               <button
                 onClick={exportToCSV}
                 disabled={loading || filteredBookings.length === 0 || isExporting}
                 className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isExporting ? (
                   <>
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     Exporting...
                   </>
                 ) : (
                   <>
                     <MdDownload />
                     Export CSV
                   </>
                 )}
               </button>
             </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBookings.length)} of {filteredBookings.length} bookings
            </p>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                ⚠️ {error}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <MdRefresh />
            Refresh
          </button>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visa Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No bookings found matching your criteria
                    </td>
                  </tr>
                                 ) : (
                   currentBookings.map((booking, index) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.fullName}</div>
                          <div className="text-sm text-gray-500">{booking.passport}</div>
                          <div className="text-sm text-gray-500">{booking.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{booking.visaType}</div>
                          <div className="text-sm text-gray-500">{booking.country}</div>
                          <div className="text-sm text-gray-500">{booking.date}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.totalFee || "0"}</div>
                          <div className="text-sm text-gray-500">Received: {booking.receivedFee || "0"}</div>
                          <div className="text-sm text-gray-500">Remaining: {booking.remainingFee || "0"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.visaStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                            booking.visaStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.visaStatus}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {booking.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.userEmail || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <MdVisibility size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(booking)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(booking)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <MdDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
                         </table>
           </div>
         </div>

         {/* Pagination */}
         {totalPages > 1 && (
           <div className="mt-6 flex items-center justify-between">
             <div className="text-sm text-gray-700">
               Page {currentPage} of {totalPages}
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage === 1}
                 className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Previous
               </button>
               
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 let pageNum;
                 if (totalPages <= 5) {
                   pageNum = i + 1;
                 } else if (currentPage <= 3) {
                   pageNum = i + 1;
                 } else if (currentPage >= totalPages - 2) {
                   pageNum = totalPages - 4 + i;
                 } else {
                   pageNum = currentPage - 2 + i;
                 }
                 
                 return (
                   <button
                     key={pageNum}
                     onClick={() => handlePageChange(pageNum)}
                     className={`px-3 py-2 text-sm font-medium rounded-md ${
                       currentPage === pageNum
                         ? 'bg-blue-600 text-white'
                         : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                     }`}
                   >
                     {pageNum}
                   </button>
                 );
               })}
               
               <button
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage === totalPages}
                 className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Next
               </button>
             </div>
           </div>
         )}
       </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Booking</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editData.fullName}
                  onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                <input
                  type="text"
                  value={editData.visaType}
                  onChange={(e) => setEditData({...editData, visaType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={editData.country}
                  onChange={(e) => setEditData({...editData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Fee</label>
                <input
                  type="number"
                  value={editData.totalFee}
                  onChange={(e) => setEditData({...editData, totalFee: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Fee</label>
                <input
                  type="number"
                  value={editData.receivedFee || "0"}
                  onChange={(e) => setEditData({...editData, receivedFee: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Fee</label>
                <input
                  type="number"
                  value={editData.remainingFee}
                  onChange={(e) => setEditData({...editData, remainingFee: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
                
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profit</label>
                <input
                  type="number"
                  value={editData.profit || "0"}
                  onChange={(e) => setEditData({...editData, profit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email </label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />      
            
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  value={editData.paymentStatus}
                  onChange={(e) => setEditData({...editData, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Status</label>
                <select
                  value={editData.visaStatus}
                  onChange={(e) => setEditData({...editData, visaStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Approved">Approved</option>
                  <option value="Processing">Processing</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={editData.remarks}
                onChange={(e) => setEditData({...editData, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows="3"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => saveEdit(editing)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Booking Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p className="text-sm text-gray-900">{selectedBooking.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passport</label>
                <p className="text-sm text-gray-900 font-mono">{selectedBooking.passport}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-sm text-gray-900">{selectedBooking.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-sm text-gray-900">{selectedBooking.phone || "Not provided"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                <p className="text-sm text-gray-900">{selectedBooking.visaType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <p className="text-sm text-gray-900">{selectedBooking.country}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
                <p className="text-sm text-gray-900">{selectedBooking.date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <p className="text-sm text-gray-900">{selectedBooking.expiryDate || "Not set"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Fee</label>
                <p className="text-sm text-gray-900 font-semibold">PKR: {selectedBooking.totalFee || "0"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Fee</label>
                <p className="text-sm text-gray-900">PKR: {selectedBooking.receivedFee || "0"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Fee</label>
                <p className="text-sm text-gray-900">PKR: {selectedBooking.remainingFee || "0"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profit</label>
                <p className="text-sm text-gray-900">PKR: {selectedBooking.profit || "0"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Embassy Fee</label>
                <p className="text-sm text-gray-900">{selectedBooking.embassyFee || "Not set"}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedBooking.visaStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                  selectedBooking.visaStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedBooking.visaStatus}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedBooking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedBooking.paymentStatus}
                </span>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <p className="text-sm text-gray-900">{selectedBooking.remarks || "No remarks"}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <p className="text-sm text-gray-900">{selectedBooking.userEmail || "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <Footer/>
    </>
  );
}
