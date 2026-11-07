import React, { useState, useEffect } from 'react';
import SeatMap from '../components/SeatMap/SeatMap';
import SeatDetailModal from '../components/SeatDetailModal';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getSeats,
  swapSeats,
} from '../services/seating';
import toast from 'react-hot-toast';

const Seating = () => {
  const [sections, setSections] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Section for quick config bar
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Selected seat for details modal
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatModalOpen, setSeatModalOpen] = useState(false);

  // Swap Mode State
  const [swapSourceSeat, setSwapSourceSeat] = useState(null);

  // Section Modal (Create / Edit)
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    rows: 4,
    columns: 5,
    orientation: 'horizontal',
    start_number: 1,
    display_order: 1,
  });

  // Section Delete Confirmation
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSeatingData();
  }, []);

  const fetchSeatingData = async () => {
    try {
      const [secList, seatList] = await Promise.all([getSections(), getSeats()]);
      setSections(secList);
      setSeats(seatList);
      if (secList.length > 0 && !selectedSectionId) {
        setSelectedSectionId(secList[0].id);
      }
    } catch (err) {
      console.error('Failed to load seating data:', err);
      toast.error('Failed to load seating data.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || sections[0];

  const handleSeatClick = (seat) => {
    if (swapSourceSeat) {
      handleCompleteSwap(seat);
      return;
    }
    setSelectedSeat(seat);
    setSeatModalOpen(true);
  };

  const handleStartSwap = (seat) => {
    setSwapSourceSeat(seat);
    toast(`Swap Mode: Click target seat to swap with Seat ${seat.seat_number}`);
  };

  const handleCancelSwap = () => {
    setSwapSourceSeat(null);
  };

  const handleCompleteSwap = async (targetSeat) => {
    if (targetSeat.id === swapSourceSeat.id) {
      toast.error('Cannot swap a seat with itself.');
      setSwapSourceSeat(null);
      return;
    }

    try {
      await swapSeats(swapSourceSeat.id, targetSeat.id);
      toast.success(`Swapped ${swapSourceSeat.seat_number} and ${targetSeat.seat_number}.`);
      setSwapSourceSeat(null);
      fetchSeatingData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Swap failed.');
      setSwapSourceSeat(null);
    }
  };

  const handleOpenAddSection = () => {
    setEditingSection(null);
    const nextLetter = String.fromCharCode(65 + sections.length);
    setSectionForm({
      name: `Section ${nextLetter}`,
      rows: 4,
      columns: 5,
      orientation: 'horizontal',
      start_number: 1,
      display_order: sections.length + 1,
    });
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec) => {
    setEditingSection(sec);
    setSectionForm({
      name: sec.name,
      rows: sec.rows,
      columns: sec.columns,
      orientation: sec.orientation || 'horizontal',
      start_number: sec.start_number || 1,
      display_order: sec.display_order || 1,
    });
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) {
      toast.error('Section name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSection) {
        await updateSection(editingSection.id, sectionForm);
        toast.success(`Section updated.`);
      } else {
        const created = await createSection(sectionForm);
        toast.success(`Section created.`);
        setSelectedSectionId(created.id);
      }
      setSectionModalOpen(false);
      fetchSeatingData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save section.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!selectedSection) return;
    setSubmitting(true);
    try {
      await deleteSection(selectedSection.id);
      toast.success(`Section deleted.`);
      setDeleteSectionOpen(false);
      setSelectedSectionId('');
      fetchSeatingData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group seats by section
  const seatMapSections = sections.map((sec) => {
    const secSeats = seats.filter((s) => s.section_id === sec.id);
    return {
      ...sec,
      seats: secSeats,
    };
  });

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
            Seating Planner
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Configure section dimensions, orientation layout, and allocate student seating
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddSection}
          className="px-3.5 py-1.5 bg-[#0F2747] hover:bg-[#0A1C33] text-white text-xs font-medium rounded transition-colors"
        >
          Add Section
        </button>
      </div>

      {/* SWAP MODE NOTICE */}
      {swapSourceSeat && (
        <div className="p-3 bg-[#0F2747] text-white rounded text-xs flex items-center justify-between">
          <div>
            <span className="font-semibold text-[#C89B3C] uppercase tracking-wider mr-2">
              Swap Mode
            </span>
            Click target seat to complete swap with Seat {swapSourceSeat.seat_number}.
          </div>
          <button
            type="button"
            onClick={handleCancelSwap}
            className="px-2.5 py-1 bg-white text-[#0F2747] rounded text-xs font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* SECTION CONFIGURATION TOOLBAR */}
      {selectedSection && (
        <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#667085]">Section:</span>
              <select
                value={selectedSection.id}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#D9DEE7] rounded font-semibold text-[#0F2747] focus:outline-none focus:border-[#0F2747]"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.total_seats} seats)
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[#667085] border-l border-[#D9DEE7] pl-3">
              Dimensions: <strong className="text-[#1F2937]">{selectedSection.rows}</strong> rows ×{' '}
              <strong className="text-[#1F2937]">{selectedSection.columns}</strong> cols
            </div>

            <div className="text-[#667085] border-l border-[#D9DEE7] pl-3">
              Orientation: <strong className="text-[#1F2937] capitalize">{selectedSection.orientation}</strong>
            </div>

            <div className="text-[#667085] border-l border-[#D9DEE7] pl-3">
              Allocated:{' '}
              <strong className="text-[#2E7D5B]">{selectedSection.assigned_seats}</strong> / {selectedSection.total_seats}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenEditSection(selectedSection)}
              className="px-2.5 py-1 bg-white border border-[#D9DEE7] text-[#1F2937] hover:bg-slate-50 rounded font-medium"
            >
              Configure
            </button>
            <button
              type="button"
              onClick={() => setDeleteSectionOpen(true)}
              className="px-2.5 py-1 text-[#C0392B] hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* FLOOR PLAN SEAT MAP */}
      {loading ? (
        <LoadingSpinner text="Rendering seating layout..." />
      ) : (
        <SeatMap
          sections={seatMapSections}
          swapSelectedSeatId={swapSourceSeat?.id}
          onSeatClick={handleSeatClick}
          isAdmin={true}
          showAttendance={false}
          title="Auditorium Floor Plan"
        />
      )}

      {/* SEAT DETAIL MODAL */}
      <SeatDetailModal
        isOpen={seatModalOpen}
        onClose={() => setSeatModalOpen(false)}
        seat={selectedSeat}
        onSeatUpdated={() => {
          fetchSeatingData();
        }}
        onStartSwap={handleStartSwap}
      />

      {/* CREATE / EDIT SECTION MODAL */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title={editingSection ? `Configure Section: ${editingSection.name}` : 'New Seating Section'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSection} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Section Name *
            </label>
            <input
              type="text"
              required
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              placeholder="Section A"
              className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Rows (Height) *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={sectionForm.rows}
                onChange={(e) => setSectionForm({ ...sectionForm, rows: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Columns (Width) *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={sectionForm.columns}
                onChange={(e) => setSectionForm({ ...sectionForm, columns: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1F2937] mb-1">
              Numbering Orientation Layout
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSectionForm({ ...sectionForm, orientation: 'horizontal' })}
                className={`p-2 rounded border text-left text-xs transition-colors ${
                  sectionForm.orientation === 'horizontal'
                    ? 'border-[#0F2747] bg-[#F5F7FA] font-semibold text-[#0F2747]'
                    : 'border-[#D9DEE7] bg-white text-[#1F2937]'
                }`}
              >
                <div>Horizontal</div>
                <div className="text-[10px] text-[#667085] font-normal">Row-by-row numbering</div>
              </button>

              <button
                type="button"
                onClick={() => setSectionForm({ ...sectionForm, orientation: 'vertical' })}
                className={`p-2 rounded border text-left text-xs transition-colors ${
                  sectionForm.orientation === 'vertical'
                    ? 'border-[#0F2747] bg-[#F5F7FA] font-semibold text-[#0F2747]'
                    : 'border-[#D9DEE7] bg-white text-[#1F2937]'
                }`}
              >
                <div>Vertical</div>
                <div className="text-[10px] text-[#667085] font-normal">Column-by-column numbering</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Start Number
              </label>
              <input
                type="number"
                min="1"
                value={sectionForm.start_number}
                onChange={(e) => setSectionForm({ ...sectionForm, start_number: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1F2937] mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={sectionForm.display_order}
                onChange={(e) => setSectionForm({ ...sectionForm, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-[#D9DEE7] rounded focus:outline-none focus:border-[#0F2747]"
              />
            </div>
          </div>

          <div className="text-[11px] text-[#667085] bg-[#F5F7FA] p-2 border border-[#D9DEE7] rounded">
            Capacity: <strong>{sectionForm.rows * sectionForm.columns} seats</strong>.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9DEE7]">
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              className="px-3 py-1.5 text-xs text-[#1F2937] bg-white border border-[#D9DEE7] hover:bg-slate-50 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2747] hover:bg-[#0A1C33] rounded disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSection ? 'Update Section' : 'Generate Seats'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE SECTION CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteSectionOpen}
        onClose={() => setDeleteSectionOpen(false)}
        onConfirm={handleDeleteSectionConfirm}
        title="Delete Seating Section"
        message={`Delete section '${selectedSection?.name}'? Student assignments in this section will be released, but student records will remain intact.`}
        confirmText="Delete Section"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default Seating;
