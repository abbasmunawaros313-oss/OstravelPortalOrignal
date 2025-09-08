import { useState } from "react";
import { MdFlightTakeoff } from "react-icons/md";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

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
    vendorFee: "", // ✅ new field
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
      newErrors.totalFee = "Enter valid fee.";
    if (!form.receivedFee || isNaN(form.receivedFee)) {
      newErrors.receivedFee = "Enter valid received fee.";
    } else if (Number(form.receivedFee) < 0) {
      newErrors.receivedFee = "Received fee cannot be negative.";
    } else if (Number(form.receivedFee) > Number(form.totalFee)) {
      newErrors.receivedFee = "Cannot exceed total fee.";
    }

    if (!form.paymentStatus) newErrors.paymentStatus = "Select payment status.";
    if (!form.country) newErrors.country = "Country required.";
    if (!form.visaStatus) newErrors.visaStatus = "Visa status required.";
    if (!form.embassyFee) newErrors.embassyFee = "Enter valid embassy fee.";
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

  // Auto-calc Remaining Fee
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };

    if (name === "totalFee" || name === "receivedFee") {
      const total = Number(name === "totalFee" ? value : form.totalFee);
      const received = Number(name === "receivedFee" ? value : form.receivedFee);
      updatedForm.remainingFee = total - received;
    }

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
      setErrors({});
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error("Error saving booking!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-green-100 p-8">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-5xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <MdFlightTakeoff className="text-blue-600 text-4xl" />
          <h1 className="text-3xl font-extrabold text-gray-700">Bookings</h1>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
          <p className="text-blue-900 text-sm">
            <strong>Logged in as:</strong> {user?.email}
          </p>
          <p className="text-blue-600 text-xs mt-1">
            You can only see and manage your own bookings.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Common Fields */}
          {[
            { label: "Passport No", name: "passport", type: "text", placeholder: "AB1234567" },
            { label: "Expiry Date", name: "expiryDate", type: "date" },
            { label: "Full Name", name: "fullName", type: "text", placeholder: "John Doe" },
            {
              label: "Visa Type",
              name: "visaType",
              type: "select",
              options: ["Business", "Tourism", "Family Visit", "National Visa", "Appointment"],
            },
            { label: "Application Date", name: "date", type: "date", readonly: true },
            { label: "Country", name: "country", type: "text", placeholder: "e.g. UAE" },
            {
              label: "Visa Status",
              name: "visaStatus",
              type: "select",
              options: ["Approved", "Rejected", "Processing"],
            },
            { label: "Total Fee", name: "totalFee", type: "number", placeholder: "0" },
            { label: "Received Fee", name: "receivedFee", type: "number", placeholder: "0" },
            { label: "Remaining Fee", name: "remainingFee", type: "number", readonly: true },
            {
              label: "Payment Status",
              name: "paymentStatus",
              type: "select",
              options: ["Paid", "Unpaid", "Partially Paid"],
            },
            { label: "Reference", name: "embassyFee", type: "text", placeholder: "Wajahat Ali" },
            { label: "Email", name: "email", type: "email", placeholder: "john.doe@example.com" },
            { label: "Phone", name: "phone", type: "text", placeholder: "03XXXXXXXXX" },
          ].map((field, i) => (
            <div key={i} className="col-span-1">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none transition bg-white"
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  readOnly={field.readonly}
                  placeholder={field.placeholder}
                  className={`w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition ${
                    field.readonly ? "bg-gray-100" : "bg-white"
                  }`}
                />
              )}
              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}

          {/* Conditional Fields */}
          {form.visaType === "Appointment" ? (
            <>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Vendor</label>
                <input
                  type="text"
                  name="vendor"
                  value={form.vendor}
                  onChange={handleChange}
                  placeholder="Vendor Name"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
                />
                {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Vendor Contact</label>
                <input
                  type="text"
                  name="vendorContact"
                  value={form.vendorContact}
                  onChange={handleChange}
                  placeholder="Vendor Contact Number"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
                />
                {errors.vendorContact && <p className="text-red-500 text-xs mt-1">{errors.vendorContact}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Vendor Fee</label>
                <input
                  type="number"
                  name="vendorFee"
                  value={form.vendorFee}
                  onChange={handleChange}
                  placeholder="Enter Vendor Fee"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
                />
                {errors.vendorFee && <p className="text-red-500 text-xs mt-1">{errors.vendorFee}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Sent To Embassy</label>
                <input
                  type="text"
                  name="sentToEmbassy"
                  value={form.sentToEmbassy}
                  onChange={handleChange}
                  placeholder="20/sep/2025"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-600 mb-1">Received From Embassy</label>
                <input
                  type="text"
                  name="receivedFromEmbassy"
                  value={form.receivedFromEmbassy}
                  onChange={handleChange}
                  placeholder="25/sep/2025"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
                />
              </div>
            </>
          )}

          {/* Remarks */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Additional notes..."
              className="w-full rounded-xl px-4 py-3 border border-gray-300 shadow-sm focus:ring-2 focus:ring-green-400 outline-none transition bg-white"
              rows="3"
            />
            {errors.remarks && <p className="text-red-500 text-xs mt-1">{errors.remarks}</p>}
          </div>

          {/* Save Button */}
          <div className="md:col-span-2 pt-6">
            <button
              type="submit"
              disabled={isSubmitting || !user}
              className={`w-full py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] transition ${
                isSubmitting || !user
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-green-500 text-white"
              }`}
            >
              {!user ? "Please Login" : isSubmitting ? "⏳ Saving..." : "💾 Save Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
