import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SeatMap from '../components/SeatMap/SeatMap';
import StudentSearch from '../components/StudentSearch';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPublicSeating } from '../services/public';
import toast from 'react-hot-toast';

const PublicSeatMap = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedSeatId, setHighlightedSeatId] = useState(null);

  useEffect(() => {
    fetchSeating();
  }, []);

  const fetchSeating = async () => {
    try {
      const data = await getPublicSeating();
      setSections(data);
    } catch (err) {
      console.error('Failed to load public seating:', err);
      toast.error('Unable to load seating layout.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setHighlightedSeatId(result.seatId);
  };

  const handleClearSearch = () => {
    setHighlightedSeatId(null);
  };

  const handleSeatClick = (seat) => {
    // IMPORTANT PRIVACY REQUIREMENT:
    // Clicking a seat from the public interface does not reveal student info.
    toast(`Seat ${seat.seat_number}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#1F2937]">
      <Navbar />

      {/* Focused Public Header & Search */}
      <section className="bg-white border-b border-[#D9DEE7] py-6 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747] tracking-tight">
            Seating Arrangement & Seat Finder
          </h1>
          <p className="text-xs text-[#667085]">
            Enter your name or roll number to locate your assigned seat.
          </p>

          <div className="pt-1">
            <StudentSearch
              onSelectResult={handleSelectSearchResult}
              onClear={handleClearSearch}
            />
          </div>
        </div>
      </section>

      {/* Main Floor Plan */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading ? (
          <LoadingSpinner text="Loading seating layout..." />
        ) : (
          <SeatMap
            sections={sections}
            highlightedSeatId={highlightedSeatId}
            onSeatClick={handleSeatClick}
            isAdmin={false}
            showAttendance={false}
            title="Auditorium Floor Plan"
          />
        )}
      </main>

      {/* Minimal Institutional Footer */}
      <footer className="border-t border-[#D9DEE7] bg-white py-4 text-center text-xs text-[#667085]">
        Seat Management & Student Attendance Planner
      </footer>
    </div>
  );
};

export default PublicSeatMap;
