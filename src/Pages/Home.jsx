import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../Components/Footer";

const quickLinks = [
  {
    title: "My Bookings",
    description: "View and manage your visa bookings easily.",
    to: "/bookings",
    color: "from-blue-600 to-indigo-500",
    icon: "✈️",
  },
  {
    title: "Approved Visas",
    description: "Track your approved applications hassle-free.",
    to: "/approved-visas",
    color: "from-green-600 to-emerald-500",
    icon: "✅",
  },
  {
    title: "Deleted Visas",
    description: "Recover or permanently delete visa records.",
    to: "/deleted-visas",
    color: "from-red-600 to-orange-500",
    icon: "🗑️",
  },
  {
    title: "Countries",
    description: "Browse and manage supported destinations.",
    to: "/countries",
    color: "from-yellow-500 to-amber-400",
    icon: "🌍",
  },
  {
    title: "Search",
    description: "Find bookings by passport or traveler name.",
    to: "/search",
    color: "from-purple-600 to-fuchsia-500",
    icon: "🔍",
  },
  {
    title: "Reports",
    description: "Download insightful visa & travel reports.",
    to: "/reports",
    color: "from-pink-600 to-rose-500",
    icon: "📊",
  },
];

const services = [
  {
    title: "Flight Ticketing",
    description: "Book flights to destinations worldwide at the best rates.",
    icon: "🎫",
    color: "from-sky-500 to-blue-500",
  },
  {
    title: "Travel Insurance",
    description: "Stay safe abroad with comprehensive travel coverage.",
    icon: "🛡️",
    color: "from-green-500 to-emerald-400",
  },
  {
    title: "Hotel Booking",
    description: "Find and reserve top-rated hotels and accommodations.",
    icon: "🏨",
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Travel Recommendations",
    description: "Get personalized tips for your trips and destinations.",
    icon: "🗺️",
    color: "from-pink-500 to-rose-500",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <>
     

      {/* Quick Links */}
      <div className="py-16 px-6 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {quickLinks.map((link) => (
            <Link
              to={link.to}
              key={link.title}
              className={`group relative bg-gradient-to-br ${link.color}
                rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 
                transition-transform duration-300 ease-out p-8 flex flex-col 
                items-start min-h-[200px] text-white overflow-hidden`}
            >
              <div className="text-4xl mb-4">{link.icon}</div>
              <h3 className="text-2xl font-semibold mb-2">{link.title}</h3>
              <p className="opacity-90 text-sm mb-4">{link.description}</p>
              <span className="mt-auto inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold group-hover:bg-white/30 transition">
                Go to {link.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Services Section */}
      <div className="bg-gradient-to-br from-pink-50 via-white to-yellow-50 py-16 px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Our Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.title}
              className={`bg-gradient-to-br ${service.color} text-white rounded-2xl shadow-lg p-8 flex flex-col items-start hover:scale-105 hover:shadow-2xl transition`}
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-sm opacity-90">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10 text-gray-900">
            Why Choose <span className="text-blue-600">OS Travels?</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-gray-700">
            <div className="p-6 bg-white rounded-2xl shadow hover:shadow-xl hover:scale-105 transition">
              🌍 <h3 className="font-semibold text-xl mt-2 mb-2">Global Reach</h3>
              <p>We cover 50+ countries to make your travel truly international.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow hover:shadow-xl hover:scale-105 transition">
              ⚡ <h3 className="font-semibold text-xl mt-2 mb-2">Fast Processing</h3>
              <p>Quick approvals and streamlined processes for stress-free journeys.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow hover:shadow-xl hover:scale-105 transition">
              🤝 <h3 className="font-semibold text-xl mt-2 mb-2">Trusted Service</h3>
              <p>Thousands of happy clients rely on us for smooth travel experiences.</p>
            </div>
          </div>
        </div>
      </div>
       {/* Hero Section */}
       <div className="relative bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-25"></div>
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 drop-shadow-lg">
            Explore the World with{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-pink-500 to-yellow-500">
              OS Travels
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-700 max-w-2xl">
            Your one-stop portal for managing visas, bookings, and reports – making travel simpler, faster, and smarter.
          </p>
          {user && (
            <p className="mt-4 px-4 py-2 bg-white/90 shadow rounded-full text-sm text-blue-700 font-medium">
              Logged in as <span className="font-semibold">{user.email}</span>
            </p>
          )}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready for Your Next Adventure?
        </h2>
        <p className="mb-6 text-lg">
          Manage your visas, bookings, and travel with OS Travels today.
        </p>
        <Link
          to="/bookings"
          className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-gray-100 transition"
        >
          Get Started →
        </Link>
      </div>

      <Footer />
    </>
  );
}
