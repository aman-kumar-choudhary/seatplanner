import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getSessions, createSession, updateSession, deleteSession } from '../services/attendance';
import toast from 'react-hot-toast';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00 AM',
    end_time: '04:00 PM',
    notes: '',
    status: 'active',
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSessionsList();
  }, []);

  const fetchSessionsList = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      toast.error('Failed to load attendance sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSession(null);
    setSessionForm({
      name: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00 AM',
      end_time: '04:00 PM',
      notes: '',
      status: 'active',
    });
    setSessionModalOpen(true);
  };

  const handleOpenEdit = (sess) => {
    setEditingSession(sess);
    setSessionForm({
      name: sess.name,
      date: sess.date,
      start_time: sess.start_time || '',
      end_time: sess.end_time || '',
      notes: sess.notes || '',
      status: sess.status || 'active',
    });
    setSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.name.trim() || !sessionForm.date) {
      toast.error('Session title and date are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSession) {
        await updateSession(editingSession.id, sessionForm);
        toast.success(`Session updated.`);
      } else {
        await createSession(sessionForm);
        toast.success(`Session created.`);
      }
      setSessionModalOpen(false);
      fetchSessionsList();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setSubmitting(true);
    try {
      await deleteSession(sessionToDelete.id);
      toast.success(`Session deleted.`);
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
      fetchSessionsList();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Attendance Sessions
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage scheduled lectures, workshops, examinations, and events
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-medium rounded transition-colors"
        >
          Create Session
        </button>
      </div>

      {/* SESSIONS TABLE */}
      <div className="bg-white rounded border border-[#D9DEE7] overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Loading sessions..." />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No attendance sessions found"
              description="Create a session to begin tracking student attendance."
              action={
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3 py-1.5 bg-[#0F2747] text-white text-xs rounded"
                >
                  Create Session
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#D9DEE7] text-left text-xs">
              <thead className="bg-[#F5F7FA] text-[#667085] font-semibold text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5">Session Name</th>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Attendance Summary</th>
                  <th className="px-4 py-2.5">Rate</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] bg-white text-[#1F2937]">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1F2937]">{sess.name}</div>
                      {sess.notes && (
                        <div className="text-[11px] text-[#667085] truncate max-w-sm mt-0.5">{sess.notes}</div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-[#667085]">
                      <span className="font-medium text-[#1F2937] block">{sess.date}</span>
                      <span className="text-[11px]">{sess.start_time} {sess.end_time ? `- ${sess.end_time}` : ''}</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded border ${
                          sess.status === 'active'
                            ? 'bg-[#E8F3ED] text-[#2E7D5B] border-[#B9D5C4]'
                            : 'bg-[#F5F7FA] text-[#667085] border-[#D9DEE7]'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[#2E7D5B] font-semibold">{sess.present_count} Present</span>
                      <span className="text-[#667085] mx-1.5">·</span>
                      <span className="text-[#C0392B] font-semibold">{sess.absent_count} Absent</span>
                      <span className="text-[#667085] mx-1.5">·</span>
                      <span className="text-[#667085]">{sess.not_marked_count} Not Marked</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-[#0F2747]">
                      {sess.attendance_percentage}%
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-3 text-xs">
                      <Link
                        to={`/admin/attendance?session_id=${sess.id}`}
                        className="text-[#0F2747] font-semibold hover:underline"
                      >
                        Mark Attendance
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(sess)}
                        className="text-[#1F2937] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSessionToDelete(sess);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-[#C0392B] hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SESSION MODAL */}
      <Modal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title={editingSession ? `Edit Session: ${editingSession.name}` : 'New Attendance Session'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSession} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Session Title *
            </label>
            <input
              type="text"
              required
              value={sessionForm.name}
              onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
              placeholder="e.g. AI Workshop — Day 1"
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={sessionForm.date}
              onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={sessionForm.start_time}
                onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                placeholder="10:00 AM"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                End Time
              </label>
              <input
                type="text"
                value={sessionForm.end_time}
                onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                placeholder="04:00 PM"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Status
            </label>
            <select
              value={sessionForm.status}
              onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Notes
            </label>
            <textarea
              rows="2"
              value={sessionForm.notes}
              onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
              placeholder="Session notes or agenda..."
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9DEE7]">
            <button
              type="button"
              onClick={() => setSessionModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#1F2937] bg-white border border-[#D9DEE7] hover:bg-slate-50 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2747] hover:bg-[#0A1C33] rounded disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSession ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        message={`Delete session '${sessionToDelete?.name}' and all associated attendance marks?`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Sessions;
