import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const mainNavItems = [
  { name: 'Dashboard', path: '/admin/dashboard' },
  { name: 'Students', path: '/admin/students' },
  { name: 'Seating', path: '/admin/seating' },
  { name: 'Attendance', path: '/admin/attendance' },
  { name: 'Reports', path: '/admin/reports' },
  { name: 'Activity Log', path: '/admin/logs' },
];

const systemNavItems = [
  { name: 'Settings', path: '/admin/settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-56 bg-white border-r border-[#D9DEE7] transition-transform duration-150 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="py-4">
          {/* Mobile close button */}
          <div className="lg:hidden flex items-center justify-between px-4 pb-2 mb-2 border-b border-[#D9DEE7]">
            <span className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase">
              Menu
            </span>
            <button
              onClick={onClose}
              className="text-xs text-[#667085] hover:text-[#1F2937]"
            >
              Close
            </button>
          </div>

          {/* Group 1: Seat Management */}
          <div className="px-4 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase">
              Seat Management
            </span>
          </div>
          <nav className="mb-6 space-y-0.5">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `block px-4 py-2 text-xs font-medium border-l-2 transition-colors ${
                    isActive
                      ? 'border-[#0F2747] text-[#0F2747] bg-[#F5F7FA] font-semibold'
                      : 'border-transparent text-[#1F2937] hover:bg-[#F5F7FA] hover:text-[#0F2747]'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Group 2: System */}
          <div className="px-4 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase">
              System
            </span>
          </div>
          <nav className="space-y-0.5">
            {systemNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `block px-4 py-2 text-xs font-medium border-l-2 transition-colors ${
                    isActive
                      ? 'border-[#0F2747] text-[#0F2747] bg-[#F5F7FA] font-semibold'
                      : 'border-transparent text-[#1F2937] hover:bg-[#F5F7FA] hover:text-[#0F2747]'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-xs font-medium border-l-2 border-transparent text-[#667085] hover:bg-[#F5F7FA] hover:text-[#C0392B] transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>

        {/* Minimal institutional footer note */}
        <div className="p-3 border-t border-[#D9DEE7] text-[11px] text-[#667085]">
          Status: <span className="text-[#2E7D5B] font-medium">Operational</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
