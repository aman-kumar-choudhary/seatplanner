import React, { useState, useEffect } from 'react';
import { getAttendanceReport, getExportReportUrl } from '../services/reports';
import { getSessions } from '../services/attendance';
import { getSections } from '../services/seating';
import { getStudentFilters } from '../services/students';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const Reports = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter sources
  const [sessions, setSessions] = useState([]);
  const [sections, setSections] = useState([]);
  const [filterMeta, setFilterMeta] = useState({ departments: [], courses: [] });

  // Selected filters
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    initFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedSession, selectedSection, selectedDepartment, selectedCourse, selectedStatus]);

  const initFilters = async () => {
    try {
      const [sessList, secList, meta] = await Promise.all([
        getSessions(),
        getSections(),
        getStudentFilters(),
      ]);
      setSessions(sessList);
      setSections(secList);
      setFilterMeta(meta);

      if (sessList.length > 0) {
        setSelectedSession(sessList[0].id);
      }
    } catch (err) {
      console.error('Failed to init report filters:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getAttendanceReport({
        session_id: selectedSession || undefined,
        section_id: selectedSection || undefined,
        department: selectedDepartment || undefined,
        course: selectedCourse || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch attendance report:', err);
      toast.error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    const url = getExportReportUrl(format, {
      session_id: selectedSession || undefined,
      section_id: selectedSection || undefined,
      department: selectedDepartment || undefined,
      course: selectedCourse || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    });
    window.open(url, '_blank');
  };

  const presentCount = reportData.filter((r) => r.status === 'present').length;
  const absentCount = reportData.filter((r) => r.status === 'absent').length;
  const notMarkedCount = reportData.filter((r) => r.status === 'not_marked').length;
  const totalCount = reportData.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const currentSessionObj = sessions.find((s) => s.id === selectedSession);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Attendance Reports & Data Export
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Filter institutional attendance datasets and export verified spreadsheets
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={reportData.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1F2937] border border-[#D9DEE7] text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            disabled={reportData.length === 0}
            className="px-3 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Session */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1">
              Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.date})
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Departments</option>
              {filterMeta.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Courses</option>
              {filterMeta.courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
              <option value="not_marked">Not Marked Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="bg-white rounded border border-[#D9DEE7] px-4 py-2.5 text-xs text-[#1F2937] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {currentSessionObj && (
            <span className="font-semibold text-[#0F2747]">
              {currentSessionObj.name} ({currentSessionObj.date})
            </span>
          )}
          <span className="text-[#667085]">
            Records: <strong className="text-[#1F2937] font-mono">{totalCount}</strong>
          </span>
          <span className="text-[#667085]">·</span>
          <span className="text-[#2E7D5B]">
            Present: <strong className="font-mono">{presentCount}</strong>
          </span>
          <span className="text-[#667085]">·</span>
          <span className="text-[#C0392B]">
            Absent: <strong className="font-mono">{absentCount}</strong>
          </span>
          <span className="text-[#667085]">·</span>
          <span className="text-[#667085]">
            Not Marked: <strong className="text-[#1F2937] font-mono">{notMarkedCount}</strong>
          </span>
          <span className="text-[#667085]">·</span>
          <span className="font-semibold text-[#0F2747]">
            Rate: {percentage}%
          </span>
        </div>
      </div>

      {/* REPORT DATA TABLE */}
      <div className="bg-white rounded border border-[#D9DEE7] overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Querying report records..." />
          </div>
        ) : reportData.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No report records found"
              description="Adjust the filter parameters above to view attendance records."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#D9DEE7] text-left text-xs">
              <thead className="bg-[#F5F7FA] text-[#667085] font-semibold text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5">Session / Date</th>
                  <th className="px-4 py-2.5">Roll No</th>
                  <th className="px-4 py-2.5">Student Name</th>
                  <th className="px-4 py-2.5">Course / Dept</th>
                  <th className="px-4 py-2.5">Seat Location</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] bg-white text-[#1F2937]">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-medium text-[#1F2937] block">{row.session_name}</span>
                      <span className="text-[11px] text-[#667085]">{row.session_date}</span>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium">
                      {row.roll_number}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap font-semibold">
                      {row.student_name}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-[#667085]">
                      {row.course} ({row.department})
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium">
                      {row.section_name} · {row.seat_number}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                      {row.status === 'present' ? (
                        <span className="text-[#2E7D5B]">Present</span>
                      ) : row.status === 'absent' ? (
                        <span className="text-[#C0392B]">Absent</span>
                      ) : (
                        <span className="text-[#667085]">Not Marked</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] font-mono text-[11px]">
                      {row.marked_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
