import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";
import { FaKaaba } from "react-icons/fa";
import {
  MdFlightTakeoff,
  MdCheckCircle,
  MdDeleteForever,
  MdPublic,
  MdSearch,
  MdBarChart,
  MdAttachMoney,
  MdHotel,
  MdMap,
} from "react-icons/md";

const quickLinks = [
  {
    title: "My Bookings",
    description: "View and manage your visa bookings easily.",
    to: "/bookings",
    color: "from-blue-600 to-indigo-500",
    icon: <MdFlightTakeoff />,
  },
  {
    title: "Approved Visas",
    description: "Track your approved applications hassle-free.",
    to: "/approved-visas",
    color: "from-green-600 to-emerald-500",
    icon: <MdCheckCircle />,
  },
  {
    title: "Deleted Visas",
    description: "Recover or permanently delete visa records.",
    to: "/deleted-visas",
    color: "from-red-600 to-orange-500",
    icon: <MdDeleteForever />,
  },
  {
    title: "Countries",
    description: "Browse and manage supported destinations.",
    to: "/countries",
    color: "from-yellow-500 to-amber-400",
    icon: <MdPublic />,
  },
  {
    title: "Search",
    description: "Find bookings by passport or traveler name.",
    to: "/search",
    color: "from-purple-600 to-fuchsia-500",
    icon: <MdSearch />,
  },
  {
    title: "Reports",
    description: "Download insightful visa & travel reports.",
    to: "/reports",
    color: "from-pink-600 to-rose-500",
    icon: <MdBarChart />,
  },
];

const services = [
  {
    title: "Flight Ticketing",
    description: "Book flights to destinations worldwide at the best rates.",
    to: "/tickiting",
    icon: <MdAttachMoney />,
    color: "from-sky-500 to-blue-500",
  },
  {
    title: "UMRAH BOOKINGS",
    description: "Plan your spiritual journey with our dedicated Umrah packages.",
    to: "/umrahbookings",
    icon: <FaKaaba />,
    color: "from-green-500 to-emerald-400",
  },
  {
    title: "Hotel Booking",
    description: "Find and reserve top-rated hotels and accommodations.",
    to: "#",
    icon: <MdHotel />,
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Travel Recommendations",
    description: "Get personalized tips for your trips and destinations.",
    to: "#",
    icon: <MdMap />,
    color: "from-pink-500 to-rose-500",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="bg-gray-950 text-gray-200 min-h-screen font-sans">
      {/* Hero Section */}
      
     

      {/* Quick Links */}
      <div className="py-16 px-6 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {quickLinks.map((link) => (
            <Link
              to={link.to}
              key={link.title}
              className={`group relative p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-2
                bg-white/5 border border-white/10 text-white overflow-hidden
                before:absolute before:inset-0 before:opacity-0 before:bg-gradient-to-br before:${link.color}
                before:transition-opacity before:duration-500
                hover:before:opacity-100`}
            >
              <div className="relative z-10">
                <div className={`text-5xl mb-4 group-hover:text-white transition-colors duration-300`}>
                  {link.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-2 group-hover:text-white transition-colors duration-300">{link.title}</h3>
                <p className="opacity-70 text-sm mb-4">{link.description}</p>
                <span className="mt-auto inline-block px-4 py-1.5 text-xs font-bold rounded-full border border-white/30 group-hover:bg-white/20 group-hover:border-white/50 transition-colors">
                  Go to {link.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Services Section */}
      <div className="py-16 px-6 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
          Our Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {services.map((service) => (
            <Link
              to={service.to}
              key={service.title}
              className={`group relative p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-2
                bg-white/5 border border-white/10 text-white overflow-hidden
                before:absolute before:inset-0 before:opacity-0 before:bg-gradient-to-br before:${service.color}
                before:transition-opacity before:duration-500
                hover:before:opacity-100`}
            >
              <div className="relative z-10">
                <div className={`text-5xl mb-4 group-hover:text-white transition-colors duration-300`}>
                  {service.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-2 group-hover:text-white transition-colors duration-300">{service.title}</h3>
                <p className="text-sm opacity-70">{service.description}</p>
                <span className="mt-auto inline-block px-4 py-1.5 text-xs font-bold rounded-full border border-white/30 group-hover:bg-white/20 group-hover:border-white/50 transition-colors">
                  Learn More
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-white">
            Why Choose <span className="text-blue-400">OS Travels?</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-gray-300">
            <div className="p-8 bg-white/5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform border border-white/10">
              <span className="text-5xl">🌍</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Global Reach</h3>
              <p>We cover 50+ countries to make your travel truly international.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform border border-white/10">
              <span className="text-5xl">⚡</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Fast Processing</h3>
              <p>Quick approvals and streamlined processes for stress-free journeys.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform border border-white/10">
              <span className="text-5xl">🤝</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Trusted Service</h3>
              <p>Thousands of happy clients rely on us for smooth travel experiences.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />

      {/* Custom Tailwind Animations */}
      <style jsx>{`
        .bg-travel-pattern {
          background-image: url('https://images.unsplash.com/photo-1542157053-1574cc406450?q=80&w=1974&auto=format&fit=crop');
          background-position: center;
          background-size: cover;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-slow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(255,255,255,0.4);
          }
          50% {
            text-shadow: 0 0 15px rgba(255,255,255,0.8);
          }
        }
      `}</style>
    </div>
  );
}
