import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../services/dashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard metrics..." />;
  }

  const { overview, current_session, recent_activities = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Dashboard
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Operational summary of student seating capacity and session attendance
          </p>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW METRICS */}
      <div className="bg-white rounded border border-[#D9DEE7] p-5">
        <div className="text-xs font-semibold text-[#0F2747] uppercase tracking-wider mb-4 pb-2 border-b border-[#D9DEE7]">
          Seating & Student Capacity
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-[#667085] font-medium">Total Students</div>
            <div className="text-2xl font-semibold text-[#1F2937] mt-1 font-mono">
              {overview?.total_students || 0}
            </div>
            <div className="text-[11px] text-[#667085] mt-0.5">Enrolled records</div>
          </div>

          <div>
            <div className="text-xs text-[#667085] font-medium">Total Capacity</div>
            <div className="text-2xl font-semibold text-[#1F2937] mt-1 font-mono">
              {overview?.total_seats || 0}
            </div>
            <div className="text-[11px] text-[#667085] mt-0.5">Across {overview?.total_sections || 0} sections</div>
          </div>

          <div>
            <div className="text-xs text-[#667085] font-medium">Assigned Seats</div>
            <div className="text-2xl font-semibold text-[#2E7D5B] mt-1 font-mono">
              {overview?.assigned_seats || 0}
            </div>
            <div className="text-[11px] text-[#2E7D5B] mt-0.5 font-medium">
              {overview?.occupancy_rate || 0}% Occupancy
            </div>
          </div>

          <div>
            <div className="text-xs text-[#667085] font-medium">Available Seats</div>
            <div className="text-2xl font-semibold text-[#1F2937] mt-1 font-mono">
              {overview?.available_seats || 0}
            </div>
            <div className="text-[11px] text-[#667085] mt-0.5">Unallocated seats</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CURRENT SESSION & QUICK ACCESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Session Summary */}
        <div className="bg-white rounded border border-[#D9DEE7] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
              <span className="text-xs font-semibold text-[#0F2747] uppercase tracking-wider">
                Current Session
              </span>
              {current_session && (
                <span className="text-[11px] px-2 py-0.5 bg-[#E8F3ED] text-[#2E7D5B] font-medium rounded border border-[#B9D5C4] uppercase">
                  {current_session.status}
                </span>
              )}
            </div>

            {current_session ? (
              <div className="mt-3 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1F2937]">
                    {current_session.name}
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Date: <strong className="text-[#1F2937]">{current_session.date}</strong>{' '}
                    {current_session.start_time && `· ${current_session.start_time}`}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 border border-[#D9DEE7] rounded p-3 bg-[#F5F7FA] text-center text-xs">
                  <div>
                    <span className="text-[11px] text-[#667085] block">Present</span>
                    <span className="text-lg font-semibold text-[#2E7D5B] font-mono mt-0.5 block">
                      {current_session.present_count}
                    </span>
                  </div>
                  <div className="border-x border-[#D9DEE7]">
                    <span className="text-[11px] text-[#667085] block">Absent</span>
                    <span className="text-lg font-semibold text-[#C0392B] font-mono mt-0.5 block">
                      {current_session.absent_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] block">Not Marked</span>
                    <span className="text-lg font-semibold text-[#1F2937] font-mono mt-0.5 block">
                      {current_session.not_marked_count}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#667085]">
                  Attendance Rate: <strong className="text-[#0F2747] font-mono">{current_session.attendance_percentage}%</strong>{' '}
                  ({current_session.total_assigned_students} assigned students)
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#667085]">
                No active session scheduled.
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#D9DEE7] flex justify-between items-center text-xs">
            <Link
              to="/admin/sessions"
              className="text-[#0F2747] hover:underline font-medium"
            >
              All Sessions
            </Link>
            {current_session && (
              <Link
                to={`/admin/attendance?session_id=${current_session.id}`}
                className="px-3 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white rounded font-medium transition-colors"
              >
                Open Attendance Roster →
              </Link>
            )}
          </div>
        </div>

        {/* Seating Planning Shortcuts */}
        <div className="bg-white rounded border border-[#D9DEE7] p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#0F2747] uppercase tracking-wider pb-2 border-b border-[#D9DEE7]">
              Seating Operations
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="p-3 border border-[#D9DEE7] rounded bg-[#F5F7FA] flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#1F2937]">Floor Plan & Allocation</div>
                  <div className="text-[11px] text-[#667085]">Manage section geometry and student assignments</div>
                </div>
                <Link
                  to="/admin/seating"
                  className="px-2.5 py-1 bg-white border border-[#D9DEE7] text-[#0F2747] hover:bg-slate-50 rounded font-medium"
                >
                  Planner
                </Link>
              </div>

              <div className="p-3 border border-[#D9DEE7] rounded bg-[#F5F7FA] flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#1F2937]">Student Records</div>
                  <div className="text-[11px] text-[#667085]">Enroll individual students or import via spreadsheet</div>
                </div>
                <Link
                  to="/admin/students"
                  className="px-2.5 py-1 bg-white border border-[#D9DEE7] text-[#0F2747] hover:bg-slate-50 rounded font-medium"
                >
                  Students
                </Link>
              </div>

              <div className="p-3 border border-[#D9DEE7] rounded bg-[#F5F7FA] flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#1F2937]">Reports & Verification</div>
                  <div className="text-[11px] text-[#667085]">Generate official attendance sheets in CSV/Excel</div>
                </div>
                <Link
                  to="/admin/reports"
                  className="px-2.5 py-1 bg-white border border-[#D9DEE7] text-[#0F2747] hover:bg-slate-50 rounded font-medium"
                >
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT ACTIVITY AUDIT TRAIL */}
      <div className="bg-white rounded border border-[#D9DEE7] p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
          <span className="text-xs font-semibold text-[#0F2747] uppercase tracking-wider">
            Recent System Activity
          </span>
          <Link
            to="/admin/logs"
            className="text-xs text-[#0F2747] hover:underline font-medium"
          >
            View Complete Audit Log →
          </Link>
        </div>

        <div className="divide-y divide-[#D9DEE7] mt-1 text-xs">
          {recent_activities.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#667085]">No activity logged yet.</p>
          ) : (
            recent_activities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-[#1F2937]">{act.details || act.action}</span>
                  <div className="text-[11px] text-[#667085] mt-0.5">
                    User: {act.admin_name} · {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#667085] uppercase">
                  {act.action.replace(/_/g, ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
