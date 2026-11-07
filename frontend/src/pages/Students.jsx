import React, { useState, useEffect } from 'react';
import {
  getStudents,
  getStudentFilters,
  createStudent,
  updateStudent,
  deleteStudent,
  getExportStudentsUrl,
} from '../services/students';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StudentImportModal from '../components/StudentImportModal';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [filterOptions, setFilterOptions] = useState({ departments: [], courses: [], years: [] });

  // Modals state
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    roll_number: '',
    student_id: '',
    name: '',
    department: '',
    course: '',
    year: 1,
    semester: 1,
    email: '',
    phone: '',
  });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFilterMetadata();
  }, []);

  useEffect(() => {
    fetchStudentsList();
  }, [page, search, filterDepartment, filterCourse, filterYear, filterAssigned]);

  const loadFilterMetadata = async () => {
    try {
      const data = await getStudentFilters();
      setFilterOptions(data);
    } catch (e) {
      console.error('Error fetching filter options:', e);
    }
  };

  const fetchStudentsList = async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search.trim() || undefined,
        department: filterDepartment || undefined,
        course: filterCourse || undefined,
        year: filterYear ? parseInt(filterYear) : undefined,
        assigned_status: filterAssigned,
      });
      setStudents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load students:', err);
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      roll_number: '',
      student_id: '',
      name: '',
      department: filterOptions.departments[0] || 'Computer Science',
      course: filterOptions.courses[0] || 'BCA',
      year: 1,
      semester: 1,
      email: '',
      phone: '',
    });
    setStudentModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      student_id: student.student_id || student.roll_number,
      name: student.name,
      department: student.department || '',
      course: student.course || '',
      year: student.year || 1,
      semester: student.semester || 1,
      email: student.email || '',
      phone: student.phone || '',
    });
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.roll_number.trim()) {
      toast.error('Name and Roll Number are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, formData);
        toast.success(`Student updated successfully.`);
      } else {
        await createStudent(formData);
        toast.success(`Student created successfully.`);
      }
      setStudentModalOpen(false);
      fetchStudentsList();
      loadFilterMetadata();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setSubmitting(true);
    try {
      await deleteStudent(studentToDelete.id);
      toast.success(`Student deleted.`);
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
      fetchStudentsList();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = (format) => {
    const url = getExportStudentsUrl(format);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Student Management
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Student roster, course enrollments, and seat allocations
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1F2937] border border-[#D9DEE7] text-xs font-medium rounded transition-colors"
          >
            Import CSV
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1F2937] border border-[#D9DEE7] text-xs font-medium rounded transition-colors"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-medium rounded transition-colors"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student by name, roll no, or ID..."
              className="w-full px-3 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] placeholder:text-[#667085] focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Departments</option>
              {filterOptions.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div>
            <select
              value={filterCourse}
              onChange={(e) => {
                setFilterCourse(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="">All Courses</option>
              {filterOptions.courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Status */}
          <div>
            <select
              value={filterAssigned}
              onChange={(e) => {
                setFilterAssigned(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-white rounded border border-[#D9DEE7] overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Loading student records..." />
          </div>
        ) : students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No students found"
              description="Adjust your search filters or add a new student record."
              action={
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3 py-1.5 bg-[#0F2747] text-white text-xs rounded"
                >
                  Add Student
                </button>
              }
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
                  <th className="px-4 py-2.5">Year / Sem</th>
                  <th className="px-4 py-2.5">Assigned Seat</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] bg-white text-[#1F2937]">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium">
                      {student.roll_number}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-[#1F2937]">{student.name}</div>
                      {student.email && (
                        <div className="text-[11px] text-[#667085] truncate max-w-xs">{student.email}</div>
                      )}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span>{student.course}</span>
                      <span className="text-[#667085] text-[11px] ml-1">({student.department})</span>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-[#667085]">
                      Y{student.year} · S{student.semester}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {student.assigned_seat ? (
                        <span className="font-mono text-[#2E7D5B] font-semibold">
                          {student.assigned_seat.section_name} · {student.assigned_seat.seat_number}
                        </span>
                      ) : (
                        <span className="text-[#667085]">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-right space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(student)}
                        className="text-[#0F2747] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToDelete(student);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-[#C0392B] hover:underline font-medium"
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

        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* ADD / EDIT STUDENT MODAL */}
      <Modal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.name}` : 'Add Student'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                placeholder="101"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded font-mono focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="Optional"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded font-mono focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Rahul Kumar"
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Computer Science"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Course
              </label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                placeholder="BCA"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Year
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Semester
              </label>
              <input
                type="number"
                min="1"
                max="16"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9DEE7]">
            <button
              type="button"
              onClick={() => setStudentModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#1F2937] bg-white border border-[#D9DEE7] hover:bg-slate-50 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2747] hover:bg-[#0A1C33] rounded disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingStudent ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV/EXCEL IMPORT MODAL */}
      <StudentImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={() => {
          fetchStudentsList();
          loadFilterMetadata();
        }}
      />

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Student"
        message={`Delete record for ${studentToDelete?.name} (Roll: ${studentToDelete?.roll_number})? Any assigned seat will be released.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Students;
