import { useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Importing icons for a richer UI
import { FaUser, FaBuilding, FaPassport, FaIdCard, FaGlobe, FaPhone, FaCalendarAlt, FaDollarSign } from "react-icons/fa";
import { BiChevronDown, BiCalculator } from "react-icons/bi";
import { MdOutlineAirlineSeatReclineExtra } from "react-icons/md";
import { Link } from "react-router-dom";

// Reusable Input Component to keep JSX clean
const FormInput = ({ field, formData, handleChange, errors }) => {
    const Icon = field.icon;
    const isSelect = field.type === "select";

    return (
        <div className="col-span-1 group relative">
            <label htmlFor={field.name} className="block text-sm font-semibold text-gray-300 mb-2 transition-colors duration-300 group-focus-within:text-blue-400">
                {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
                {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />}
                {isSelect ? (
                    <div className="relative">
                        <select
                            name={field.name}
                            id={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700 shadow-lg focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-800/60 text-white cursor-pointer appearance-none"
                        >
                            <option value="" className="bg-gray-900">Select {field.label}</option>
                            {field.options.map((opt, idx) => (
                                <option key={idx} value={opt} className="bg-gray-900">{opt}</option>
                            ))}
                        </select>
                        <BiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                ) : (
                    <input
                        type={field.type}
                        name={field.name}
                        id={field.name}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleChange}
                        disabled={field.disabled}
                        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 rounded-xl border border-gray-700 shadow-lg focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-300 ${
                            field.disabled ? "bg-gray-800/80 text-gray-400 cursor-not-allowed" : "bg-gray-800/60 text-white placeholder-gray-500"
                        } ${errors[field.name] ? 'border-red-500' : ''}`}
                    />
                )}
                {errors[field.name] && <span className="text-red-400 text-xs mt-2 ml-1">{errors[field.name]}</span>}
            </div>
        </div>
    );
};

export default function MedicalInsurance() {
    const { user } = useAuth();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const [formData, setFormData] = useState({
        NameofCompany: "",
        NameofInsured: "",
        age: "",
        passportNumber: "",
        Nic: "",
        countryofTravel: "",
        contactNumber: "",
        noOfdays: "",
        EffectiveDate: "",
        ExpiryDate: "",
        IssuedAt: "",
        totalReceivedAmount: "",
        totalPayableAmount: "",
        totalProfit: "",
        createdAt: today,
        createdByUid: user?.uid || "",
        userEmail: user?.email || "",
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        let newErrors = {};
        const requiredFields = [
            "NameofCompany", "NameofInsured", "age", "passportNumber", "Nic",
            "countryofTravel", "contactNumber", "noOfdays", "EffectiveDate",
            "ExpiryDate", "totalReceivedAmount", "totalPayableAmount"
        ];

        requiredFields.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required.`;
            }
        });
        
        if (formData.age && (isNaN(formData.age) || Number(formData.age) <= 0)) {
            newErrors.age = "Age must be a positive number.";
        }
        
        if (formData.contactNumber && !/^\d{10,15}$/.test(formData.contactNumber)) {
            newErrors.contactNumber = "Contact number must be 10-15 digits.";
        }
        
        if (formData.noOfdays && (isNaN(formData.noOfdays) || Number(formData.noOfdays) <= 0)) {
            newErrors.noOfdays = "Number of days must be a positive number.";
        }
        
        const payable = Number(formData.totalPayableAmount);
        const received = Number(formData.totalReceivedAmount);

        if (isNaN(payable) || payable < 0) {
            newErrors.totalPayableAmount = "Enter a valid payable amount.";
        }
        if (isNaN(received) || received < 0) {
            newErrors.totalReceivedAmount = "Enter a valid received amount.";
        }
        
        // Date validation
        if (formData.EffectiveDate && formData.ExpiryDate) {
            const effectiveDate = new Date(formData.EffectiveDate);
            const expiryDate = new Date(formData.ExpiryDate);
            if (expiryDate <= effectiveDate) {
                newErrors.ExpiryDate = "Expiry date must be after the effective date.";
            }
        }
        
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updatedForm = { ...prev, [name]: value };
            if (name === "totalPayableAmount" || name === "totalReceivedAmount") {
                const payable = Number(updatedForm.totalPayableAmount) || 0;
                const received = Number(updatedForm.totalReceivedAmount) || 0;
                updatedForm.totalProfit = received - payable;
            }
            return updatedForm;
        });

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast.error("You must be logged in to create a record.");
            return;
        }

        const validationErrors = validate();
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setSubmitting(true);
        try {
            const dataToSave = {
                ...formData,
                age: Number(formData.age),
                noOfdays: Number(formData.noOfdays),
                totalPayableAmount: Number(formData.totalPayableAmount),
                totalReceivedAmount: Number(formData.totalReceivedAmount),
                totalProfit: Number(formData.totalProfit),
                createdAt: Timestamp.now(),
            };
            
            await addDoc(collection(db, "medical_insurance"), dataToSave);
            toast.success("Medical Insurance record added successfully! 🎉");
            
            // Reset form
            setFormData({
                NameofCompany: "",
                NameofInsured: "",
                age: "",
                passportNumber: "",
                Nic: "",
                countryofTravel: "",
                contactNumber: "",
                noOfdays: "",
                EffectiveDate: "",
                ExpiryDate: "",
                IssuedAt: "",
                totalReceivedAmount: "",
                totalPayableAmount: "",
                totalProfit: "",
                createdAt: today,
                createdByUid: user.uid,
                userEmail: user.email,
            });
            setErrors({});

        } catch (error) {
            console.error("Error submitting form: ", error);
            toast.error("Failed to add medical insurance record. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const formFields = [
        { label: "Company Name", name: "NameofCompany", type: "text", placeholder: "Enter Company Name", required: true, icon: FaBuilding },
        { label: "Insured's Name", name: "NameofInsured", type: "text", placeholder: "Enter Name of Insured", required: true, icon: FaUser },
        { label: "Age", name: "age", type: "number", placeholder: "Enter Age", required: true, icon: MdOutlineAirlineSeatReclineExtra },
        { label: "Passport Number", name: "passportNumber", type: "text", placeholder: "Enter Passport Number", required: true, icon: FaPassport },
        { label: "NIC", name: "Nic", type: "text", placeholder: "Enter NIC", required: true, icon: FaIdCard },
        { label: "Country of Travel", name: "countryofTravel", type: "text", placeholder: "Enter Country of Travel", required: true, icon: FaGlobe },
        { label: "Contact Number", name: "contactNumber", type: "text", placeholder: "Enter Contact Number", required: true, icon: FaPhone },
        { label: "Number of Days", name: "noOfdays", type: "number", placeholder: "Enter No of days", required: true, icon: BiCalculator },
        { label: "Effective Date", name: "EffectiveDate", type: "date", placeholder: "Select Effective Date", required: true, icon: FaCalendarAlt },
        { label: "Expiry Date", name: "ExpiryDate", type: "date", placeholder: "Select Expiry Date", required: true, icon: FaCalendarAlt },
        { label: "Issued At", name: "IssuedAt", type: "text", placeholder: "e.g., Lahore", required: false, icon: FaGlobe },
        { label: "Total Received Amount", name: "totalReceivedAmount", type: "number", placeholder: "Enter Received Amount", required: true, icon: FaDollarSign },
        { label: "Total Payable Amount", name: "totalPayableAmount", type: "number", placeholder: "Enter Payable Amount", required: true, icon: FaDollarSign },
        { label: "Total Profit", name: "totalProfit", type: "number", placeholder: "Auto Calculated", required: false, disabled: true, icon: FaDollarSign },
    ];
    
    return (
        <div className="relative min-h-screen bg-black overflow-hidden font-sans text-gray-100 flex items-center justify-center p-8">
            {/* Background Animations */}
            <div className="absolute inset-0 z-0 bg-travel-grid">
                <div className="absolute inset-0 bg-black/90"></div>
                <div className="absolute inset-0 z-10 animate-pulse-light"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-green-900/10 animate-fade-in"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-dashed border-blue-500/30 rounded-full animate-rotate-slow"></div>
                <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-500/20 blur-3xl animate-blob-pulse-1"></div>
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-green-500/20 blur-3xl animate-blob-pulse-2"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-20 w-full max-w-6xl animate-fade-in-up">
                <div className="bg-white/5 backdrop-blur-xl border border-gray-700 shadow-2xl rounded-3xl p-10 transform transition-all duration-500 hover:scale-[1.005] hover:shadow-3xl">
                    {/* Header */}
                    <div className="flex items-center justify-center gap-4 mb-12 text-center">
                        <FaBuilding className="text-teal-400 text-5xl drop-shadow-lg animate-pulse-slow" />
                        <h1 className="text-4xl font-extrabold text-white tracking-wider drop-shadow-md">
                            Medical Insurance Form
                        </h1>
                    </div>
                    
                    {/* User Info */}
                    <div className="mb-8 p-5 bg-blue-900/40 rounded-2xl border border-blue-800 shadow-inner flex items-center gap-4 animate-fade-in-up">
                        <FaUser className="text-blue-400 text-2xl" />
                        <div>
                            <Link
                               to={"/viewAllmedBookings"}
                                 className="text-lg font-semibold text-white hover:underline hover:text-blue-300 transition"

                            >
                                View All Medical Bookings
                            </Link>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {formFields.map((field) => (
                            <FormInput
                                key={field.name}
                                field={field}
                                formData={formData}
                                handleChange={handleChange}
                                errors={errors}
                            />
                        ))}
                        
                        {/* Submit Button */}
                        <div className="md:col-span-2 pt-6">
                            <button
                                type="submit"
                                disabled={submitting || !user}
                                className={`w-full py-4 rounded-full font-bold text-lg shadow-xl transform transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-2xl flex items-center justify-center gap-3 ${
                                    submitting || !user ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600"
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <span>Save Record</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Tailwind CSS keyframes for animation (copied from your original) */}
            <style jsx>{`
                .bg-travel-grid {
                    background-image:
                        radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%),
                        linear-gradient(to right, transparent 50%, rgba(0,100,255,0.05) 50%),
                        linear-gradient(to bottom, transparent 50%, rgba(0,100,255,0.05) 50%);
                    background-size: 50px 50px, 50px 50px;
                    animation: grid-pan 60s linear infinite;
                }
                @keyframes grid-pan {
                    from { background-position: 0 0, 0 0; }
                    to { background-position: 50px 50px, 50px 50px; }
                }
                .animate-pulse-light { animation: pulse-light 10s ease-in-out infinite; }
                @keyframes pulse-light {
                    0%, 100% { box-shadow: 0 0 15px rgba(0,255,255,0.2), 0 0 30px rgba(0,255,255,0.1), 0 0 45px rgba(0,255,255,0.05); }
                    50% { box-shadow: 0 0 25px rgba(0,255,255,0.4), 0 0 50px rgba(0,255,255,0.3), 0 0 75px rgba(0,255,255,0.1); }
                }
                .animate-rotate-slow { animation: rotate-slow 120s linear infinite; }
                @keyframes rotate-slow {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .animate-blob-pulse-1 { animation: blob-pulse 20s ease-in-out infinite; }
                .animate-blob-pulse-2 { animation: blob-pulse 18s ease-in-out infinite reverse; }
                @keyframes blob-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-pulse-slow { animation: pulse-slow 3s infinite; }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
            `}</style>
        </div>
    );
}
