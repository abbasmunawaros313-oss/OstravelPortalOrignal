import { FaFacebookF, FaInstagram, FaWhatsapp, FaLinkedinIn } from "react-icons/fa";
import { MdFlightTakeoff } from "react-icons/md";
import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold mb-4">
            <MdFlightTakeoff className="text-blue-500 text-3xl" />
            <span>
              <span className="text-blue-500">Os</span>
              <span className="text-white">Travel</span>
              <span className="text-green-500">Portal</span>
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Managing travel bookings, visas, and customer reports with ease.  
            Your trusted partner in travel management.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link to="/search" className="hover:text-blue-400 transition">Search</Link></li>
              <li><Link to="/countries" className="hover:text-blue-400 transition">Countries</Link></li>
              <li><Link to="/approved-visas" className="hover:text-blue-400 transition">Approved Visas</Link></li>
            <li><Link to="/bookings" className="hover:text-blue-400 transition">Bookings</Link></li>
            <li><Link to="/reports" className="hover:text-blue-400 transition">Reports</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-lg">Contact Us</h3>
          <ul className="space-y-2 text-sm">
            <li>📍  Office # 3, Aaly Plaza, Fazal-e-Haq Road, Block E G 6/2 Blue Area, Islamabad, 44000</li>
            <li>📞  (051) 2120701</li>
            <li>📧 support@ostravel.com</li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-lg">Follow Us</h3>
          <div className="flex space-x-4">
            <a href="#" className="p-2 bg-gray-700 hover:bg-blue-500 rounded-full">
              <FaFacebookF />
            </a>
            <a href="#" className="p-2 bg-gray-700 hover:bg-pink-500 rounded-full">
              <FaInstagram />
            </a>
            <a href="#" className="p-2 bg-gray-700 hover:bg-green-500 rounded-full">
              <FaWhatsapp />
            </a>
            <a href="#" className="p-2 bg-gray-700 hover:bg-blue-700 rounded-full">
              <FaLinkedinIn />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-700 mt-10 pt-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} OsTravelPortal. All Rights Reserved.
      </div>
    </footer>
  );
}
