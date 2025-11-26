import { Outlet, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import logo from "./assets/logo.png.png";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUsername(user.username || user.email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ✅ Navbar */}
      <nav className="flex items-center justify-between border-b border-gray-300 bg-gradient-to-br from-indigo-600 to-purple-700 px-4 sm:px-6 py-3 relative">
        
        {/* Left side - links (hidden on mobile) */}
        <div className="hidden sm:flex items-center space-x-6">
          <Link to="/app" className="text-white hover:animate-pulse transition-transform">
            Clients
          </Link>
          <span className="text-white">|</span>
          <Link to="/app/projects" className="text-white hover:animate-pulse transition-transform">
            Projects
          </Link>
        </div>

        {/* ✅ Center - logo (always visible, scales nicely) */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img
            src={logo}
            alt="Freelancer CRM Logo"
            className="w-24 h-16 sm:w-28 sm:h-20 object-contain"
          />
        </div>

        {/* Right side - logout & menu button */}
        <div className="flex items-center space-x-4">
          {/* Logout button (visible on all screens) */}
          <button
            onClick={handleLogout}
            className="text-white hover:scale-110 transition-transform"
          >
            <LogOut className="w-6 h-6" />
          </button>

          {/* Hamburger for mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden text-white hover:scale-110 transition-transform"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* ✅ Mobile dropdown menu */}
        {menuOpen && (
          <div className="absolute top-full right-4 mt-2 bg-white rounded-lg shadow-lg flex flex-col items-start text-indigo-700 p-3 sm:hidden z-50">
            <Link
              to="/app"
              className="w-full px-4 py-2 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Clients
            </Link>
            <Link
              to="/app/projects"
              className="w-full px-4 py-2 hover:bg-gray-100 rounded-md"
              onClick={() => setMenuOpen(false)}
            >
              Projects
            </Link>
          </div>
        )}
      </nav>

      {/* ✅ Main Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
