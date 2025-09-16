import { useState } from "react";
import { MdFlightTakeoff } from "react-icons/md";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  FaPassport,
  FaUser,
  FaGlobeEurope,
  FaDollarSign,
  FaCreditCard,
  FaCalendarAlt,
  FaAt,
  FaPhone,
  FaLink,
  FaCommentDots,
  FaStore,
} from "react-icons/fa";
import { RiVisaLine, RiPlaneLine, RiHandCoinLine } from "react-icons/ri";
import { BiChevronDown, BiCheckCircle } from "react-icons/bi";

export default function Bookings() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    passport: "",
    fullName: "",
    visaType: "",
    date: today,
    sentToEmbassy: "",
    receivedFromEmbassy: "",
    totalFee: "",
    receivedFee: "",
    remainingFee: "",
    profit: "", // 👈 NEW
    reference: "",
    paymentStatus: "",
    country: "",
    visaStatus: "",
    embassyFee: "",
    email: "",
    phone: "",
    expiryDate: "",
    reference: "",
    remarks: "",
    vendor: "",
    vendorContact: "",
    vendorFee: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const validate = async () => {
    let newErrors = {};

    if (!form.passport) newErrors.passport = "Passport number is required.";
    if (!/^[A-Za-z ]+$/.test(form.fullName.trim()))
      newErrors.fullName = "Name must contain only letters.";
    if (!form.visaType) newErrors.visaType = "Visa type is required.";
    if (!form.totalFee || isNaN(form.totalFee))
      newErrors.totalFee = "Enter valid total fee.";
    if (form.receivedFee === "" || isNaN(form.receivedFee)) {
      newErrors.receivedFee = "Enter valid received fee.";
    } else if (Number(form.receivedFee) < 0) {
      newErrors.receivedFee = "Received fee cannot be negative.";
    } else if (Number(form.receivedFee) > Number(form.totalFee)) {
      newErrors.receivedFee = "Cannot exceed total fee.";
    }

    if (!form.paymentStatus) newErrors.paymentStatus = "Select payment status.";
    if (!form.country) newErrors.country = "Country required.";
    if (!form.visaStatus) newErrors.visaStatus = "Visa status required.";
    if (!form.embassyFee || isNaN(form.embassyFee))
      newErrors.embassyFee = "Enter valid embassy fee.";
    if (!form.email) newErrors.email = "Email is required.";
    if (!/^\d{10,15}$/.test(form.phone))
      newErrors.phone = "Phone must be 10–15 digits.";
    if (!form.expiryDate) {
      newErrors.expiryDate = "Expiry date required.";
    } else {
      const applyDate = new Date(form.date);
      const expiry = new Date(form.expiryDate);
      const minExpiry = new Date(applyDate);
      minExpiry.setMonth(minExpiry.getMonth() + 7);
      if (expiry < minExpiry) {
        newErrors.expiryDate =
          "Expiry must be at least 7 months after application date.";
      }
    }

    // Vendor-specific validation
    if (form.visaType === "Appointment") {
      if (!form.vendor) newErrors.vendor = "Vendor name is required.";
      if (!form.vendorContact)
        newErrors.vendorContact = "Vendor contact is required.";
      if (!form.vendorFee || isNaN(form.vendorFee))
        newErrors.vendorFee = "Vendor fee must be a number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Auto-calc Remaining Fee + Profit
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };

    const total = Number(name === "totalFee" ? value : form.totalFee) || 0;
    const received = Number(name === "receivedFee" ? value : form.receivedFee) || 0;
    const embassy = Number(name === "embassyFee" ? value : form.embassyFee) || 0;
    const vendor = Number(name === "vendorFee" ? value : form.vendorFee) || 0;

    updatedForm.remainingFee = total - received;
    updatedForm.profit = total - embassy - vendor;

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    setForm(updatedForm);
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create bookings.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!(await validate())) {
        setIsSubmitting(false);
        return;
      }

      const bookingData = {
        ...form,
        totalFee: Number(form.totalFee),
        receivedFee: Number(form.receivedFee),
        remainingFee: Number(form.remainingFee),
        profit: Number(form.profit), // 👈 Save profit
        embassyFee: Number(form.embassyFee),
        reference: form.reference,
        vendorFee: form.visaType === "Appointment" ? Number(form.vendorFee) : 0,
        userId: user.uid,
        userEmail: user.email,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "bookings"), bookingData);

      toast.success("Booking saved successfully!");
      setForm({
        passport: "",
        fullName: "",
        visaType: "",
        date: today,
        sentToEmbassy: "",
        receivedFromEmbassy: "",
        totalFee: "",
        receivedFee: "",
        remainingFee: "",
        profit: "",
        paymentStatus: "",
        country: "",
        visaStatus: "",
        embassyFee: "",
        email: "",
        phone: "",
        expiryDate: "",
        reference: "",
        remarks: "",
        vendor: "",
        vendorContact: "",
        reference: "",
        vendorFee: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error("Error saving booking!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = [
    { label: "Passport No", name: "passport", type: "text", placeholder: "AB1234567", icon: FaPassport },
    { label: "Expiry Date", name: "expiryDate", type: "date", icon: FaCalendarAlt },
    { label: "Full Name", name: "fullName", type: "text", placeholder: "John Doe", icon: FaUser },
    {
      label: "Visa Type",
      name: "visaType",
      type: "select",
      options: ["Business", "Tourism", "Family Visit", "National Visa", "Appointment"],
      icon: RiVisaLine,
    },
    { label: "Application Date", name: "date", type: "date", readonly: true, icon: FaCalendarAlt },
    { label: "Country", name: "country", type: "text", placeholder: "e.g. UAE", icon: FaGlobeEurope },
    {
      label: "Visa Status",
      name: "visaStatus",
      type: "select",
      options: ["Approved", "Rejected", "Processing"],
      icon: BiCheckCircle,
    },
    { label: "Total Fee", name: "totalFee", type: "number", placeholder: "0", icon: FaDollarSign },
    { label: "Received Fee", name: "receivedFee", type: "number", placeholder: "0", icon: RiHandCoinLine },
    { label: "Remaining Fee", name: "remainingFee", type: "number", readonly: true, icon: FaCreditCard },
    { label: "Profit", name: "profit", type: "number", readonly: true, icon: RiHandCoinLine }, // 👈 NEW
    {
      label: "Payment Status",
      name: "paymentStatus",
      type: "select",
      options: ["Paid", "Unpaid", "Partially Paid"],
      icon: FaCreditCard,
    },
    { label: "Embassy Fee", name: "embassyFee", type: "number", placeholder: "0", icon: FaDollarSign },
    { label: "Reference", name: "reference", type: "text", placeholder: "Wajahat Ali", icon: FaLink },
    { label: "Email", name: "email", type: "email", placeholder: "john.doe@example.com", icon: FaAt },
    { label: "Phone", name: "phone", type: "text", placeholder: "03XXXXXXXXX", icon: FaPhone },
    
  ];

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-gray-100 flex items-center justify-center p-8">
      {/* ... keep the same UI / animations ... */}
        
<div className="absolute inset-0 z-0 bg-travel-grid">
        <div className="absolute inset-0 bg-black/90"></div>
        <div className="absolute inset-0 z-10 animate-pulse-light"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-green-900/10 animate-fade-in"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-dashed border-blue-500/30 rounded-full animate-rotate-slow"></div>
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-500/20 blur-3xl animate-blob-pulse-1"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-green-500/20 blur-3xl animate-blob-pulse-2"></div>
      </div>

      <div className="relative z-20 w-full max-w-6xl animate-fade-in-up">
        <div className="bg-white/5 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-3xl p-10">
          {/* Header */}
          <div className="flex items-center justify-center gap-4 mb-12 text-center">
            <MdFlightTakeoff className="text-blue-400 text-5xl" />
            <h1 className="text-4xl font-extrabold text-white tracking-wider">
             Visa Bookings
            </h1>
          </div>

          {/* User Info */}
        
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* Common Fields */}
            {formFields.map((field, i) => (
              <div key={i} className="col-span-1 group relative">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {field.label}
                </label>
                <div className="relative">
                  {field.type === "select" ? (
                    <div className="relative">
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <select
                        name={field.name}
                        value={form[field.name]}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map((opt, idx) => (
                          <option key={idx} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <BiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    </div>
                  ) : (
                    <>
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={field.type}
                        name={field.name}
                        value={form[field.name]}
                        onChange={handleChange}
                        readOnly={field.readonly}
                        placeholder={field.placeholder}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 ${
                          field.readonly
                            ? "bg-gray-800/80 text-gray-400"
                            : "bg-gray-800/60 text-white"
                        }`}
                      />
                    </>
                  )}
                  {errors[field.name] && (
                    <p className="text-red-400 text-xs mt-2 ml-1">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Conditional Fields */}
            {form.visaType === "Appointment" ? (
              <>
                {/* Vendor Fields */}
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Vendor Name
                  </label>
                  <div className="relative">
                    <FaStore className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="vendor"
                      value={form.vendor}
                      onChange={handleChange}
                      placeholder="Vendor Name"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                    />
                  </div>
                  {errors.vendor && <p className="text-red-400 text-xs">{errors.vendor}</p>}
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Vendor Contact
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="vendorContact"
                      value={form.vendorContact}
                      onChange={handleChange}
                      placeholder="Vendor Contact Number"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                    />
                  </div>
                  {errors.vendorContact && <p className="text-red-400 text-xs">{errors.vendorContact}</p>}
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Vendor Fee
                  </label>
                  <div className="relative">
                    <FaDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="number"
                      name="vendorFee"
                      value={form.vendorFee}
                      onChange={handleChange}
                      placeholder="Enter Vendor Fee"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                    />
                  </div>
                  {errors.vendorFee && <p className="text-red-400 text-xs">{errors.vendorFee}</p>}
                </div>
              </>
            ) : (
              <>
                {/* Embassy Dates */}
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Sent To Embassy
                  </label>
                  <div className="relative">
                    <RiPlaneLine className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="sentToEmbassy"
                      value={form.sentToEmbassy}
                      onChange={handleChange}
                      placeholder="e.g., 20/sep/2025"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Received From Embassy
                  </label>
                  <div className="relative">
                    <RiPlaneLine className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      name="receivedFromEmbassy"
                      value={form.receivedFromEmbassy}
                      onChange={handleChange}
                      placeholder="e.g., 25/sep/2025"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Remarks */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Remarks
              </label>
              <div className="relative">
                <FaCommentDots className="absolute left-4 top-4 text-gray-500" />
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 bg-gray-800/60 text-white"
                  rows="3"
                />
              </div>
              {errors.remarks && <p className="text-red-400 text-xs">{errors.remarks}</p>}
            </div>

            {/* Save Button */}
            <div className="md:col-span-2 lg:col-span-3 pt-6">
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className={`w-full py-4 rounded-full font-bold text-lg flex items-center justify-center gap-3 ${
                  isSubmitting || !user
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-teal-500 text-white"
                }`}
              >
                {!user ? (
                  "Please Login to Continue"
                ) : isSubmitting ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Saving...
                  </>
                ) : (
                  "Save Booking"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>


      {/* Tailwind CSS keyframes for animation */}
      <style>{`
        .bg-travel-grid {
          background-image:
            radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%),
            linear-gradient(to right, transparent 50%, rgba(0,100,255,0.05) 50%),
            linear-gradient(to bottom, transparent 50%, rgba(0,100,255,0.05) 50%);
          background-size: 50px 50px, 50px 50px;
          animation: grid-pan 60s linear infinite;
        }

        @keyframes grid-pan {
          from {
            background-position: 0 0, 0 0;
          }
          to {
            background-position: 50px 50px, 50px 50px;
          }
        }

        .animate-pulse-light {
          animation: pulse-light 10s ease-in-out infinite;
        }

        @keyframes pulse-light {
          0%, 100% {
            box-shadow: 0 0 15px rgba(0,255,255,0.2), 0 0 30px rgba(0,255,255,0.1), 0 0 45px rgba(0,255,255,0.05);
          }
          50% {
            box-shadow: 0 0 25px rgba(0,255,255,0.4), 0 0 50px rgba(0,255,255,0.3), 0 0 75px rgba(0,255,255,0.1);
          }
        }

        .animate-rotate-slow {
          animation: rotate-slow 120s linear infinite;
        }
        @keyframes rotate-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .animate-blob-pulse-1 {
          animation: blob-pulse 20s ease-in-out infinite;
        }
        .animate-blob-pulse-2 {
          animation: blob-pulse 18s ease-in-out infinite reverse;
        }
        @keyframes blob-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-in-left-delay {
            animation: slide-in-left 0.8s ease-out forwards;
        }
        @keyframes slide-in-left {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .animate-slide-in-right-delay {
            animation: slide-in-right 0.8s ease-out forwards;
        }
        @keyframes slide-in-right {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-slide-in-up-delay {
            animation: slide-in-up 0.8s ease-out forwards;
        }
        @keyframes slide-in-up {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-pulse-slow {
            animation: pulse-slow 3s infinite;
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
