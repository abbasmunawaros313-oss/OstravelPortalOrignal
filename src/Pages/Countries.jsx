import { useEffect, useState, useRef } from "react";
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

  const applicantsTableRef = useRef(null);

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

  useEffect(() => {
    if (selectedCountry && applicantsTableRef.current) {
      applicantsTableRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedCountry]);

  const groupedByCountry = bookings.reduce((acc, booking) => {
    if (!booking.country) return acc;
    if (!acc[booking.country]) acc[booking.country] = [];
    acc[booking.country].push(booking);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gray-950 text-gray-200">
        <div className="text-center bg-gray-800/80 p-10 rounded-2xl shadow-lg backdrop-blur-md border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">Please log in to view your country statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          My Visa Applications by Country
        </h1>
        <p className="text-gray-400 text-lg">
          An overview of your travel destinations and applications.
        </p>
        <div className="mt-4 p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <p className="text-gray-300 text-sm">
            <strong>Logged in as:</strong> {user.email}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            You can only see your own visa applications grouped by country.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-blue-400 mt-4">Loading your data...</p>
        </div>
      ) : (
        <>
          {/* Country Cards */}
          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
            {Object.keys(groupedByCountry).length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No country data found for your account.
              </div>
            ) : (
              Object.keys(groupedByCountry).map((country) => (
                <div
                  key={country}
                  onClick={() =>
                    setSelectedCountry(selectedCountry === country ? null : country)
                  }
                  className={`relative p-6 rounded-2xl shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-2
                    bg-white/5 backdrop-blur-md border border-white/10 text-white overflow-hidden
                    group cursor-pointer
                    ${
                      selectedCountry === country
                        ? "ring-2 ring-offset-2 ring-blue-500 ring-offset-gray-950"
                        : ""
                    }`}
                >
                  <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${selectedCountry === country ? 'opacity-100 bg-gradient-to-br from-blue-600/30 to-green-600/30' : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20'}`}></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <img
                      src={getFlagUrl(country)}
                      alt={country}
                      className="w-16 h-12 object-cover rounded shadow mb-3 border border-white/20"
                    />
                    <h2 className="text-xl font-bold mb-1 text-white">
                      {country}
                    </h2>
                    <p className="text-gray-400">
                      {groupedByCountry[country].length} Applicant
                      {groupedByCountry[country].length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Applicants Table */}
          {selectedCountry && (
            <div ref={applicantsTableRef} className="mt-12 p-6 rounded-2xl shadow-xl backdrop-blur-md border border-gray-700 bg-gray-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-0">
                  <img
                    src={getFlagUrl(selectedCountry)}
                    alt={selectedCountry}
                    className="w-10 h-7 object-cover rounded shadow border border-white/20"
                  />
                  <h2 className="text-2xl font-bold text-white">
                    Applicants for {selectedCountry}
                  </h2>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="flex-shrink-0 text-gray-400 hover:text-white text-sm px-3 py-2 bg-gray-700 rounded-xl shadow-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-inner">
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-700 text-gray-300">
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
                  <tbody className="divide-y divide-gray-700">
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
                          className={`transition-colors hover:bg-gray-700`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-400">{index + 1}</td>
                          <td className="px-4 py-3 font-mono text-sm">{b.passport || "-"}</td>
                          <td className="px-4 py-3 font-semibold">{b.fullName || "-"}</td>
                          <td className="px-4 py-3">{b.visaType || "-"}</td>
                          <td className="px-4 py-3">{b.date || "-"}</td>
                          <td className="px-4 py-3 text-gray-400">${b.totalFee || "-"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                b.paymentStatus === "Paid"
                                  ? "bg-green-600/20 text-green-400 border border-green-600"
                                  : "bg-red-600/20 text-red-400 border border-red-600"
                              }`}
                            >
                              {b.paymentStatus || "Unpaid"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                b.visaStatus === "Approved"
                                  ? "bg-green-600/20 text-green-400 border border-green-600"
                                  : b.visaStatus === "Rejected"
                                  ? "bg-red-600/20 text-red-400 border border-red-600"
                                  : "bg-yellow-600/20 text-yellow-400 border border-yellow-600"
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
