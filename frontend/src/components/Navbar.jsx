import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { admin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0F2747] text-white border-b border-[#0A1C33] w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand & Mobile toggle */}
          <div className="flex items-center gap-3">
            {isAuthenticated && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden text-xs text-slate-300 hover:text-white px-2 py-1 border border-slate-600 rounded"
              >
                Menu
              </button>
            )}

            <Link to="/" className="flex items-baseline gap-2">
              <span className="font-semibold text-base tracking-tight text-white uppercase">
                SeatPlanner
              </span>
              <span className="hidden sm:inline text-xs text-slate-300 font-normal">
                | Institutional Seating & Attendance
              </span>
            </Link>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              to="/"
              className="text-slate-200 hover:text-white transition-colors"
            >
              Public Seat Map
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4 border-l border-slate-700 pl-4">
                <span className="text-slate-300 hidden sm:inline">
                  {admin?.name || admin?.username || 'Administrator'}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-slate-300 hover:text-white hover:underline transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="px-3 py-1.5 bg-white text-[#0F2747] font-semibold rounded hover:bg-slate-100 transition-colors"
              >
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
