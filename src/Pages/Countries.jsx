import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

// helper to generate flag URL from country name
const getFlagUrl = (country) => {
  try {
    // convert country name -> ISO code if possible
    const mapping = {
      Afghanistan: "af",
  Armenia: "am",
  Azerbaijan: "az",
  Bahrain: "bh",
  Bangladesh: "bd",
  Bhutan: "bt",
  Brunei: "bn",
  Cambodia: "kh",
  China: "cn",
  Cyprus: "cy",
  Georgia: "ge",
  India: "in",
  Indonesia: "id",
  Iran: "ir",
  Iraq: "iq",
  Israel: "il",
  Japan: "jp",
  Jordan: "jo",
  Kazakhstan: "kz",
  Kuwait: "kw",
  Kyrgyzstan: "kg",
  Laos: "la",
  Lebanon: "lb",
  Malaysia: "my",
  Maldives: "mv",
  Mongolia: "mn",
  Myanmar: "mm",
  Nepal: "np",
  NorthKorea: "kp",
  Oman: "om",
  Pakistan: "pk",
  Palestine: "ps",
  Philippines: "ph",
  Qatar: "qa",
  SaudiArabia: "sa",
  Singapore: "sg",
  SouthKorea: "kr",
  SriLanka: "lk",
  Syria: "sy",
  Taiwan: "tw",
  Tajikistan: "tj",
  Thailand: "th",
  TimorLeste: "tl",
  Turkey: "tr",
  Turkmenistan: "tm",
  UAE: "ae",
  Uzbekistan: "uz",
  Vietnam: "vn",
  Yemen: "ye",

  // --- Europe ---
  Albania: "al",
  Andorra: "ad",
  Austria: "at",
  Belarus: "by",
  Belgium: "be",
  BosniaAndHerzegovina: "ba",
  Bulgaria: "bg",
  Croatia: "hr",
  CzechRepublic: "cz",
  Denmark: "dk",
  Estonia: "ee",
  Finland: "fi",
  France: "fr",
  Germany: "de",
  Greece: "gr",
  Hungary: "hu",
  Iceland: "is",
  Ireland: "ie",
  Italy: "it",
  Kosovo: "xk",
  Latvia: "lv",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Malta: "mt",
  Moldova: "md",
  Monaco: "mc",
  Montenegro: "me",
  Netherlands: "nl",
  NorthMacedonia: "mk",
  Norway: "no",
  Poland: "pl",
  Portugal: "pt",
  Romania: "ro",
  Russia: "ru",
  SanMarino: "sm",
  Serbia: "rs",
  Slovakia: "sk",
  Slovenia: "si",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Ukraine: "ua",
  UK: "gb",
  VaticanCity: "va",
  USA: "us",
  Canada: "ca",
   Australia: "au",
     
    };
    const code =
      mapping[country.replace(/\s/g, "")] || country.slice(0, 2).toLowerCase();
    return `https://flagcdn.com/w40/${code}.png`;
  } catch {
    return "";
  }
};

export default function Countries() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const sortedData = data.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
          });

          setBookings(sortedData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching data:", error);
          toast.error("Failed to fetch data ❌");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch data ❌");
      setLoading(false);
    }
  }, [user]);

  const groupedByCountry = bookings.reduce((acc, booking) => {
    if (!booking.country) return acc;
    if (!acc[booking.country]) acc[booking.country] = [];
    acc[booking.country].push(booking);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-center bg-white/80 p-10 rounded-2xl shadow-lg backdrop-blur-md">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to view your country statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">My Visa Applications by Country</h1>
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-100 to-green-100 rounded-xl shadow-inner border border-blue-200">
          <p className="text-blue-900 text-sm">
            <strong>Logged in as:</strong> {user.email}
          </p>
          <p className="text-blue-700 text-xs mt-1">
            You can only see your own visa applications grouped by country.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-blue-600 mt-4">Loading your data...</p>
        </div>
      ) : (
        <>
          {/* Country Cards */}
          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
            {Object.keys(groupedByCountry).length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No country data found for your account
              </div>
            ) : (
              Object.keys(groupedByCountry).map((country) => (
                <div
                  key={country}
                  onClick={() =>
                    setSelectedCountry(selectedCountry === country ? null : country)
                  }
                  className={`cursor-pointer rounded-2xl shadow-lg p-6 flex flex-col items-center transition-all backdrop-blur-md border 
                    ${
                      selectedCountry === country
                        ? "bg-green-200/90 scale-105 border-green-400"
                        : "bg-white/70 hover:bg-blue-50 border-gray-200"
                    }`}
                >
                  <img
                    src={getFlagUrl(country)}
                    alt={country}
                    className="w-12 h-8 object-cover rounded shadow mb-3"
                  />
                  <h2 className="text-lg font-bold mb-1 text-gray-800">{country}</h2>
                  <p className="text-gray-600">
                    {groupedByCountry[country].length} Applicant
                    {groupedByCountry[country].length !== 1 ? "s" : ""}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Applicants Table */}
          {selectedCountry && (
            <div className="mt-12 bg-white/80 rounded-2xl shadow-xl p-6 backdrop-blur-md border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src={getFlagUrl(selectedCountry)}
                    alt={selectedCountry}
                    className="w-10 h-7 object-cover rounded shadow"
                  />
                  <h2 className="text-2xl font-bold text-gray-800">
                    Applicants for {selectedCountry}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-500 hover:text-gray-800 text-sm px-3 py-1 bg-gray-100 rounded-lg shadow-sm"
                >
                  ✕ Close
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by passport, name, or visa type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-3 border rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-inner">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gradient-to-r from-blue-600 to-green-500 text-white">
                    <tr>
                      {[
                        "#",
                        "Passport",
                        "Name",
                        "Visa Type",
                        "Date",
                        "Fee",
                        "Payment",
                        "Visa Status",
                      ].map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCountry[selectedCountry]
                      .filter((b) =>
                        [b.passport, b.fullName, b.visaType]
                          .join(" ")
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                      .map((b, index) => (
                        <tr
                          key={b.id}
                          className={`transition-colors ${
                            index % 2 === 0 ? "bg-gray-50/70" : "bg-white"
                          } hover:bg-blue-50`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3 font-mono text-sm">{b.passport || "-"}</td>
                          <td className="px-4 py-3 font-semibold">{b.fullName || "-"}</td>
                          <td className="px-4 py-3">{b.visaType || "-"}</td>
                          <td className="px-4 py-3">{b.date || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">${b.totalFee || "-"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                b.paymentStatus === "Paid"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {b.paymentStatus || "Unpaid"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                b.visaStatus === "Approved"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : b.visaStatus === "Rejected"
                                  ? "bg-red-100 text-red-800 border border-red-300"
                                  : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                              }`}
                            >
                              {b.visaStatus || "Processing"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
