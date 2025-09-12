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
  MdRocketLaunch,
} from "react-icons/md";

// Note: Ensure your icons are properly installed, like FaKaaba from react-icons/fa.

const quickLinks = [
  {
    title: "My Bookings",
    description: "View and manage your visa bookings easily.",
    to: "/bookings",
    color: "from-blue-600 to-indigo-500",
    icon: <MdFlightTakeoff className="text-blue-500" />,
  },
  {
    title: "Approved Visas",
    description: "Track your approved applications hassle-free.",
    to: "/approved-visas",
    color: "from-green-600 to-emerald-500",
    icon: <MdCheckCircle className="text-green-500" />,
  },
  {
    title: "Deleted Visas",
    description: "Recover or permanently delete visa records.",
    to: "/deleted-visas",
    color: "from-red-600 to-orange-500",
    icon: <MdDeleteForever className="text-red-500" />,
  },
  {
    title: "Countries",
    description: "Browse and manage supported destinations.",
    to: "/countries",
    color: "from-yellow-500 to-amber-400",
    icon: <MdPublic className="text-yellow-500" />,
  },
  {
    title: "Search",
    description: "Find bookings by passport or traveler name.",
    to: "/search",
    color: "from-purple-600 to-fuchsia-500",
    icon: <MdSearch className="text-purple-500" />,
  },
  {
    title: "Reports",
    description: "Download insightful visa & travel reports.",
    to: "/reports",
    color: "from-pink-600 to-rose-500",
    icon: <MdBarChart className="text-pink-500" />,
  },
];

const services = [
  {
    title: "Flight Ticketing",
    description: "Book flights to destinations worldwide at the best rates.",
    to: "/tickiting",
    icon: <MdFlightTakeoff className="text-blue-500" />,
    color: "from-sky-500 to-blue-500",
  },
  {
    title: "UMRAH BOOKINGS",
    description: "Plan your spiritual journey with our dedicated Umrah packages.",
    to: "/umrahbookings",
    icon: <FaKaaba className="text-green-500" />,
    color: "from-green-500 to-emerald-400",
  },
  {
    title: "Hotel Booking",
    description: "Find and reserve top-rated hotels and accommodations.",
    to: "/hotelbookings",
    icon: <MdHotel className="text-purple-500" />,
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Medical Insurance",
    description: "Get personalized tips for your trips and destinations.",
    to: "/medical-insurance",
    icon: <MdMap className="text-pink-500" />,
    color: "from-pink-500 to-rose-500",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="bg-gray-950 text-gray-200 min-h-screen font-sans relative overflow-hidden">
      
      {/* Animated Background - Stays behind everything */}
      <div className="absolute inset-0 z-0 bg-travel-grid">
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="absolute inset-0 z-10 animate-pulse-light"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-green-900/10 animate-fade-in"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-dashed border-blue-500/30 rounded-full animate-rotate-slow"></div>
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-500/20 blur-3xl animate-blob-pulse-1"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-green-500/20 blur-3xl animate-blob-pulse-2"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-20 py-24 px-6 text-center animate-fade-in-up">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
          <span className="animate-text-reveal">
            Travel <span className="text-blue-400">Simplified</span>,
          </span>
          <br />
          <span className="animate-text-reveal" style={{ animationDelay: '0.5s' }}>
            Bookings <span className="text-green-400">Managed</span>.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-8 animate-fade-in-up" style={{ animationDelay: '1s' }}>
          Your all-in-one platform for visas, flights, and travel services.
        </p>
        <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '1.5s' }}>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-8 py-4 text-white font-bold rounded-full text-lg bg-gradient-to-r from-blue-600 to-teal-500 shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl"
          >
            Get Started
            <MdRocketLaunch className="text-xl" />
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-16 px-6 relative z-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12 animate-fade-in-up">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {quickLinks.map((link, index) => (
            <Link
              to={link.to}
              key={link.title}
              className={`group relative p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-2
                bg-white/5 border border-green-400 text-white overflow-hidden
                before:absolute before:inset-0 before:opacity-0 before:bg-gradient-to-br before:${link.color}
                before:transition-opacity before:duration-500
                hover:before:opacity-100 border animate-staggered-fade-in`}
              style={{ animationDelay: `${index * 0.15 + 1.8}s` }}
            >
              <div className="relative z-10 ">
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
      <div className="py-16 px-6 relative z-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12 animate-fade-in-up">
          Our Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Link
              to={service.to}
              key={service.title}
              className={`group relative p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-2
                bg-white/5 border border-pink-500 text-white overflow-hidden
                before:absolute before:inset-0 before:opacity-0 before:bg-gradient-to-br before:${service.color}
                before:transition-opacity before:duration-500
                hover:before:opacity-100 animate-staggered-fade-in`}
              style={{ animationDelay: `${index * 0.15 + 2.5}s` }}
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
      <div className="py-16 px-6 relative z-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-white animate-fade-in-up">
            Why Choose <span className="text-blue-400">OS Travels?</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-gray-300">
            <div className="p-8 bg-white/5 border border-red-400 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform animate-staggered-fade-in" style={{ animationDelay: '3s' }}>
              <span className="text-5xl">🌍</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Global Reach</h3>
              <p>We cover 50+ countries to make your travel truly international.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform border border-red-400 animate-staggered-fade-in" style={{ animationDelay: '3.15s' }}>
              <span className="text-5xl">⚡</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Fast Processing</h3>
              <p>Quick approvals and streamlined processes for stress-free journeys.</p>
            </div>
            <div className="p-8 bg-white/5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform border border-red-400 animate-staggered-fade-in" style={{ animationDelay: '3.3s' }}>
              <span className="text-5xl">🤝</span>
              <h3 className="font-semibold text-xl text-white mt-4 mb-2">Trusted Service</h3>
              <p>Thousands of happy clients rely on us for smooth travel experiences.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Container - Added z-20 to ensure visibility */}
      <div className="relative z-20">
        <Footer />
      </div>

      {/* Custom Tailwind Animations */}
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
        .animate-fade-in-up { 
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-staggered-fade-in {
            animation: staggered-fade-in 0.8s ease-out forwards;
            opacity: 0;
        }
        @keyframes staggered-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-text-reveal {
          animation: text-reveal 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
          display: inline-block;
          overflow: hidden;
        }
        @keyframes text-reveal {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
