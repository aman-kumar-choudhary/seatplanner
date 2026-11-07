import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { assignSeat, releaseSeat } from '../services/seating';
import { markAttendance } from '../services/attendance';
import { getStudents } from '../services/students';
import toast from 'react-hot-toast';

const SeatDetailModal = ({
  isOpen,
  onClose,
  seat,
  sessionId = null,
  onSeatUpdated,
  onStartSwap,
}) => {
  const [assigning, setAssigning] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (assigning) {
      loadUnassignedStudents();
    }
  }, [assigning, searchStudentQuery]);

  const loadUnassignedStudents = async () => {
    setLoadingStudents(true);
    try {
      const data = await getStudents({
        assigned_status: 'unassigned',
        search: searchStudentQuery.trim() || undefined,
        limit: 10,
      });
      setStudentOptions(data.items || []);
    } catch (err) {
      console.error('Error fetching unassigned students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (!seat) return null;

  const isAssigned = seat.status === 'assigned' && seat.student;

  const handleAssign = async (studentId) => {
    setSubmitting(true);
    try {
      await assignSeat(seat.id, studentId);
      toast.success(`Assigned to seat ${seat.seat_number}`);
      setAssigning(false);
      onSeatUpdated && onSeatUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    setSubmitting(true);
    try {
      await releaseSeat(seat.id);
      toast.success(`Seat ${seat.seat_number} released.`);
      onSeatUpdated && onSeatUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Release failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAttendance = async (status) => {
    if (!sessionId || !seat.student?.id) return;
    setSubmitting(true);
    try {
      await markAttendance(sessionId, seat.student.id, status);
      toast.success(`Marked as ${status}`);
      onSeatUpdated && onSeatUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setAssigning(false);
        onClose();
      }}
      title={`Seat Details — ${seat.section_name || 'Section'} · ${seat.seat_number}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Specification Data Grid */}
        <div className="border border-[#D9DEE7] rounded divide-y divide-[#D9DEE7] bg-white text-xs">
          <div className="px-3.5 py-2 flex justify-between bg-[#F5F7FA]">
            <span className="text-[#667085]">Status</span>
            <span className={`font-semibold ${isAssigned ? 'text-[#2E7D5B]' : 'text-[#667085]'}`}>
              {isAssigned ? 'Assigned' : 'Available'}
            </span>
          </div>

          <div className="px-3.5 py-2 flex justify-between">
            <span className="text-[#667085]">Location</span>
            <span className="font-mono text-[#1F2937]">
              Row {seat.row + 1}, Column {seat.column + 1}
            </span>
          </div>

          {isAssigned && (
            <>
              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-[#667085]">Student</span>
                <span className="font-semibold text-[#1F2937]">{seat.student.name}</span>
              </div>

              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-[#667085]">Roll Number</span>
                <span className="font-mono text-[#1F2937]">{seat.student.roll_number}</span>
              </div>

              <div className="px-3.5 py-2 flex justify-between">
                <span className="text-[#667085]">Course & Dept</span>
                <span className="text-[#1F2937]">{seat.student.course || '-'} ({seat.student.department || '-'})</span>
              </div>

              {sessionId && (
                <div className="px-3.5 py-2 flex justify-between items-center bg-[#F5F7FA]">
                  <span className="text-[#667085]">Attendance</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance('present')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        seat.attendance_status === 'present'
                          ? 'bg-[#2E7D5B] text-white border-[#236348]'
                          : 'bg-white text-[#2E7D5B] border-[#B9D5C4] hover:bg-[#E8F3ED]'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance('absent')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        seat.attendance_status === 'absent'
                          ? 'bg-[#C0392B] text-white border-[#9E2E22]'
                          : 'bg-white text-[#C0392B] border-[#E5B2AD] hover:bg-[#FBEAE8]'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAttendance('not_marked')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-[#D9DEE7] text-[#667085] hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Unassigned Student Selection */}
        {assigning ? (
          <div className="border border-[#D9DEE7] rounded p-3 bg-[#F5F7FA] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0F2747]">
              <span>Select Student to Assign</span>
              <button
                type="button"
                onClick={() => setAssigning(false)}
                className="text-[11px] text-[#667085] hover:text-[#1F2937]"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              placeholder="Search unassigned by name or roll..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />

            <div className="max-h-40 overflow-y-auto divide-y divide-[#D9DEE7] border border-[#D9DEE7] rounded bg-white">
              {loadingStudents ? (
                <div className="p-3 text-center text-xs text-[#667085]">Searching...</div>
              ) : studentOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#667085]">
                  No unassigned students found.
                </div>
              ) : (
                studentOptions.map((stud) => (
                  <div
                    key={stud.id}
                    className="p-2 flex items-center justify-between hover:bg-[#F5F7FA] text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#1F2937]">{stud.name}</div>
                      <div className="text-[11px] text-[#667085]">Roll: {stud.roll_number} · {stud.course}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssign(stud.id)}
                      disabled={submitting}
                      className="px-2.5 py-1 bg-[#0F2747] hover:bg-[#0A1C33] text-white rounded text-xs font-medium"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          !isAssigned && (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={() => setAssigning(true)}
                className="px-3 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-medium rounded transition-colors"
              >
                Assign Student to Seat
              </button>
            </div>
          )
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D9DEE7]">
          <div className="flex gap-2">
            {isAssigned && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartSwap && onStartSwap(seat);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-[#D9DEE7] text-[#1F2937] hover:bg-slate-50 text-xs rounded transition-colors"
                >
                  Swap Seat
                </button>
                <button
                  type="button"
                  onClick={() => setAssigning(!assigning)}
                  className="px-2.5 py-1.5 bg-white border border-[#D9DEE7] text-[#1F2937] hover:bg-slate-50 text-xs rounded transition-colors"
                >
                  Change Student
                </button>
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={submitting}
                  className="px-2.5 py-1.5 bg-white border border-[#C0392B] text-[#C0392B] hover:bg-red-50 text-xs rounded transition-colors"
                >
                  Release
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#667085] hover:text-[#1F2937]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SeatDetailModal;
