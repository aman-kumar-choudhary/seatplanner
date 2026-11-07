import React, { useState } from 'react';
import Section from './Section';

const SeatMap = ({
  sections = [],
  highlightedSeatId = null,
  swapSelectedSeatId = null,
  onSeatClick,
  isAdmin = false,
  showAttendance = false,
  title = null,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDetailed, setIsDetailed] = useState(isAdmin);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  const totalSeats = sections.reduce((acc, s) => acc + (s.seats?.length || 0), 0);

  return (
    <div className="flex flex-col w-full bg-white rounded border border-[#D9DEE7] overflow-hidden">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#F5F7FA] border-b border-[#D9DEE7]">
        <div>
          <span className="text-xs font-semibold text-[#0F2747] uppercase tracking-wide">
            {title || 'Seating Arrangement'}
          </span>
          <span className="text-[11px] text-[#667085] ml-2">
            ({totalSeats} seats · {sections.length} sections)
          </span>
        </div>

        {/* View Controls: Density & Zoom */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {isAdmin && (
            <div className="flex items-center bg-white border border-[#D9DEE7] rounded p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setIsDetailed(false)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  !isDetailed
                    ? 'bg-[#0F2747] text-white font-medium'
                    : 'text-[#667085] hover:text-[#1F2937]'
                }`}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setIsDetailed(true)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  isDetailed
                    ? 'bg-[#0F2747] text-white font-medium'
                    : 'text-[#667085] hover:text-[#1F2937]'
                }`}
              >
                Detailed (Names)
              </button>
            </div>
          )}

          {/* Compact Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-0.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] hover:bg-slate-50 transition-colors font-medium"
            >
              - Zoom
            </button>
            <span className="text-[11px] text-[#667085] font-mono px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-0.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] hover:bg-slate-50 transition-colors font-medium"
            >
              + Zoom
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-0.5 text-[#667085] hover:text-[#1F2937] ml-0.5 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* STAGE PODIUM MARKER */}
      <div className="flex flex-col items-center pt-6 pb-4">
        <div className="w-full max-w-sm px-4 text-center">
          <span className="text-[11px] font-semibold tracking-widest text-[#0F2747] uppercase">
            STAGE / FRONT
          </span>
          <div className="w-full h-0.5 bg-[#0F2747] mt-1 mb-1 opacity-80" />
        </div>
      </div>

      {/* SEATING VIEWPORT */}
      <div className="w-full overflow-auto p-4 sm:p-6 lg:p-8 flex justify-center min-h-[440px] bg-white">
        <div
          className="transition-transform duration-100 origin-top flex flex-wrap justify-center gap-8 items-start w-full"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {sections.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#667085]">
              No seating sections configured.
            </div>
          ) : (
            sections.map((sec) => (
              <Section
                key={sec.id}
                section={sec}
                highlightedSeatId={highlightedSeatId}
                swapSelectedSeatId={swapSelectedSeatId}
                onSeatClick={onSeatClick}
                isAdmin={isAdmin}
                showAttendance={showAttendance}
                isDetailed={isDetailed}
              />
            ))
          )}
        </div>
      </div>

      {/* RESTRAINED LEGEND BAR */}
      <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-2.5 bg-[#F5F7FA] border-t border-[#D9DEE7] text-xs text-[#667085]">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-[#E8F3ED] border border-[#B9D5C4]" />
          <span>Available</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-[#2E7D5B] border border-[#236348]" />
          <span>Assigned {showAttendance ? '(Present)' : ''}</span>
        </div>

        {showAttendance && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-[#C0392B] border border-[#9E2E22]" />
              <span>Absent</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-[#2E7D5B] border-2 border-dashed border-[#D9DEE7]" />
              <span>Not Marked</span>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-[#E8F3ED] border-2 border-[#C89B3C]" />
          <span>Search Result</span>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;
