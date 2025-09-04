import { useState } from "react";
import { MdFlightTakeoff } from "react-icons/md";
import { FaGlobeAmericas, FaPassport } from "react-icons/fa";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ only use login now

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        if (result.isAdmin) {
          toast.success("Welcome Admin!");
          navigate("/admin-dashboard", { replace: true });
        } else {
          toast.success("Login successful!");
          navigate("/employee-dashboard", { replace: true });
        }
      } else {
        toast.error(result.error || "Invalid email or password!");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-600 overflow-hidden">
      {/* ☁️ Background Clouds */}
      <div className="absolute top-10 left-10 w-40 h-20 bg-white/40 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 right-16 w-56 h-28 bg-white/30 rounded-full blur-3xl animate-bounce"></div>
      <div className="absolute top-1/3 left-1/3 w-72 h-36 bg-white/20 rounded-full blur-2xl animate-ping"></div>

      {/* ✈️ Airplane Circles */}
      <div className="absolute -top-10 -left-10 w-96 h-96 border-2 border-dashed border-white/20 rounded-full animate-spin-slow"></div>
      <div className="absolute top-1/2 -right-20 w-96 h-96 border border-dashed border-white/10 rounded-full animate-spin-slower"></div>

      {/* Login Card */}
      <div className="relative bg-white/10 backdrop-blur-xl shadow-2xl rounded-3xl p-8 w-full max-w-md border border-white/20 z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2 mb-6 text-center">
          <MdFlightTakeoff className="text-yellow-300 text-6xl drop-shadow-lg animate-bounce" />
          <h1 className="text-3xl font-extrabold text-white tracking-wide">
            <span className="text-yellow-200">Os</span>
            <span className="text-white">Travel</span>
            <span className="text-green-200">Portal</span>
          </h1>
          <p className="text-white/70 text-sm italic">
            🌍 Your journey starts here...
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="email"
              className="peer w-full rounded-lg bg-white/20 border border-white/30 px-4 pt-5 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent transition"
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
            <label
              htmlFor="email"
              className="absolute left-4 top-2 text-sm text-white/70 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 peer-focus:top-2 peer-focus:text-sm peer-focus:text-yellow-200"
            >
              <FaGlobeAmericas className="inline mr-1" /> Email
            </label>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="password"
              className="peer w-full rounded-lg bg-white/20 border border-white/30 px-4 pt-5 pb-2 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent transition"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
            <label
              htmlFor="password"
              className="absolute left-4 top-2 text-sm text-white/70 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 peer-focus:top-2 peer-focus:text-sm peer-focus:text-yellow-200"
            >
              <FaPassport className="inline mr-1" /> Password
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-semibold tracking-wide shadow-lg transition flex justify-center items-center gap-2 ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 hover:opacity-90 text-white"
            }`}
          >
            {isLoading && (
              <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {isLoading ? "Checking In..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
