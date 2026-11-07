import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SeatMap from '../components/SeatMap/SeatMap';
import SeatDetailModal from '../components/SeatDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  getSessions,
  getAttendanceList,
  markAttendance,
  bulkMarkAttendance,
} from '../services/attendance';
import { getSections, getSeats } from '../services/seating';
import toast from 'react-hot-toast';

const Attendance = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id') || '';

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [viewMode, setViewMode] = useState('list'); // Default to efficient roster list

  // Seat map data
  const [sections, setSections] = useState([]);
  const [seats, setSeats] = useState([]);

  // List view data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('');

  // Seat click modal
  const [clickedSeat, setClickedSeat] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    initPage();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      setSearchParams({ session_id: selectedSessionId });
      loadSessionData(selectedSessionId);
    }
  }, [selectedSessionId, statusFilter, sectionFilter, searchQuery]);

  const initPage = async () => {
    try {
      const sessList = await getSessions();
      setSessions(sessList);

      let activeId = selectedSessionId;
      if (!activeId && sessList.length > 0) {
        const active = sessList.find((s) => s.status === 'active') || sessList[0];
        activeId = active.id;
        setSelectedSessionId(activeId);
      } else if (activeId) {
        loadSessionData(activeId);
      }
    } catch (err) {
      console.error('Failed to init attendance page:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sessId) => {
    try {
      const [secList, seatList, attList] = await Promise.all([
        getSections(),
        getSeats({ session_id: sessId }),
        getAttendanceList({
          session_id: sessId,
          section_id: sectionFilter || undefined,
          status: statusFilter,
          search: searchQuery.trim() || undefined,
        }),
      ]);
      setSections(secList);
      setSeats(seatList);
      setAttendanceRecords(attList);
    } catch (err) {
      console.error('Failed to load session attendance:', err);
    }
  };

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const seatMapSections = sections.map((sec) => {
    const secSeats = seats.filter((s) => s.section_id === sec.id);
    return {
      ...sec,
      seats: secSeats,
    };
  });

  const handleSeatClick = (seat) => {
    setClickedSeat(seat);
    setModalOpen(true);
  };

  const handleSingleMark = async (studentId, status) => {
    try {
      await markAttendance(selectedSessionId, studentId, status);
      loadSessionData(selectedSessionId);
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  const handleBulkMark = async (status) => {
    const studentIds = attendanceRecords.map((r) => r.student_id).filter(Boolean);
    if (studentIds.length === 0) {
      toast.error('No matching students to mark.');
      return;
    }

    try {
      await bulkMarkAttendance(selectedSessionId, studentIds, status);
      toast.success(`Marked ${studentIds.length} students as ${status}.`);
      loadSessionData(selectedSessionId);
      getSessions().then(setSessions);
    } catch (err) {
      toast.error('Bulk operation failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Attendance Verification
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Record student attendance per session with real-time seat synchronization
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded border transition-colors font-medium ${
              viewMode === 'list'
                ? 'bg-[#0F2747] text-white border-[#0F2747]'
                : 'bg-white text-[#1F2937] border-[#D9DEE7] hover:bg-slate-50'
            }`}
          >
            Roster List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('seatmap')}
            className={`px-3 py-1.5 rounded border transition-colors font-medium ${
              viewMode === 'seatmap'
                ? 'bg-[#0F2747] text-white border-[#0F2747]'
                : 'bg-white text-[#1F2937] border-[#D9DEE7] hover:bg-slate-50'
            }`}
          >
            Floor Plan
          </button>
        </div>
      </div>

      {/* SESSION TOOLBAR & METRICS */}
      {currentSession && (
        <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#667085]">Session:</span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#D9DEE7] rounded font-semibold text-[#0F2747] focus:outline-none"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.date})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[#667085] border-l border-[#D9DEE7] pl-3">
              Date: <strong className="text-[#1F2937]">{currentSession.date}</strong>
            </div>

            <div className="text-[#667085] border-l border-[#D9DEE7] pl-3 space-x-2">
              <span>Present: <strong className="text-[#2E7D5B] font-mono">{currentSession.present_count}</strong></span>
              <span>·</span>
              <span>Absent: <strong className="text-[#C0392B] font-mono">{currentSession.absent_count}</strong></span>
              <span>·</span>
              <span>Not Marked: <strong className="text-[#1F2937] font-mono">{currentSession.not_marked_count}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkMark('present')}
              className="px-2.5 py-1 bg-white border border-[#B9D5C4] text-[#2E7D5B] hover:bg-[#E8F3ED] rounded font-medium"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMark('absent')}
              className="px-2.5 py-1 bg-white border border-[#E5B2AD] text-[#C0392B] hover:bg-[#FBEAE8] rounded font-medium"
            >
              Mark All Absent
            </button>
          </div>
        </div>
      )}

      {/* VIEW: ROSTER LIST */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or roll..."
              className="px-3 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] placeholder:text-[#667085] focus:outline-none focus:border-[#0F2747]"
            />

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
              <option value="not_marked">Not Marked Only</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded border border-[#D9DEE7] overflow-hidden">
            {attendanceRecords.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No student records match the filter"
                  description="Adjust parameters or select another session."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#D9DEE7] text-left text-xs">
                  <thead className="bg-[#F5F7FA] text-[#667085] font-semibold text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5">Roll No</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Course / Department</th>
                      <th className="px-4 py-2.5">Seat Location</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9DEE7] bg-white text-[#1F2937]">
                    {attendanceRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium">
                          {r.student_roll}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-[#1F2937]">
                          {r.student_name}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-[#667085]">
                          {r.course} ({r.department})
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium">
                          {r.section_name} · {r.seat_number}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                          {r.status === 'present' ? (
                            <span className="text-[#2E7D5B]">Present</span>
                          ) : r.status === 'absent' ? (
                            <span className="text-[#C0392B]">Absent</span>
                          ) : (
                            <span className="text-[#667085]">Not Marked</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right space-x-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSingleMark(r.student_id, 'present')}
                            className={`px-2 py-0.5 rounded border transition-colors ${
                              r.status === 'present'
                                ? 'bg-[#2E7D5B] text-white border-[#236348]'
                                : 'bg-white text-[#2E7D5B] border-[#B9D5C4] hover:bg-[#E8F3ED]'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSingleMark(r.student_id, 'absent')}
                            className={`px-2 py-0.5 rounded border transition-colors ${
                              r.status === 'absent'
                                ? 'bg-[#C0392B] text-white border-[#9E2E22]'
                                : 'bg-white text-[#C0392B] border-[#E5B2AD] hover:bg-[#FBEAE8]'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSingleMark(r.student_id, 'not_marked')}
                            className="px-2 py-0.5 rounded border border-[#D9DEE7] text-[#667085] hover:bg-slate-50"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW: FLOOR PLAN ATTENDANCE */
        <SeatMap
          sections={seatMapSections}
          onSeatClick={handleSeatClick}
          isAdmin={true}
          showAttendance={true}
          title={`${currentSession?.name || 'Session'} — Floor Plan Attendance`}
        />
      )}

      {/* SEAT DETAIL MODAL */}
      <SeatDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        seat={clickedSeat}
        sessionId={selectedSessionId}
        onSeatUpdated={() => {
          loadSessionData(selectedSessionId);
          getSessions().then(setSessions);
        }}
      />
    </div>
  );
};

export default Attendance;
