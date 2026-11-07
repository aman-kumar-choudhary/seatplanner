import React from 'react';
import Seat from './Seat';

const Section = ({
  section,
  highlightedSeatId = null,
  swapSelectedSeatId = null,
  onSeatClick,
  isAdmin = false,
  showAttendance = false,
  isDetailed = false,
}) => {
  const { name, rows, columns, orientation, seats = [] } = section;

  return (
    <div className="bg-white rounded border border-[#D9DEE7] p-4 flex flex-col items-center">
      {/* Section Header */}
      <div className="w-full flex items-baseline justify-between pb-2 mb-3 border-b border-[#D9DEE7]">
        <h4 className="font-semibold text-xs tracking-wider text-[#0F2747] uppercase">
          {name}
        </h4>
        <span className="text-[11px] text-[#667085]">
          {rows} × {columns} ({seats.length} seats) · <span className="capitalize">{orientation}</span>
        </span>
      </div>

      {/* Grid Container */}
      <div
        className="grid gap-2 p-2.5 bg-[#F5F7FA] rounded border border-[#D9DEE7] overflow-x-auto max-w-full"
        style={{
          gridTemplateColumns: isDetailed
            ? `repeat(${columns}, minmax(4.25rem, 5.25rem))`
            : `repeat(${columns}, minmax(2.75rem, 3.25rem))`,
          gridTemplateRows: isDetailed
            ? `repeat(${rows}, minmax(3.25rem, 3.75rem))`
            : `repeat(${rows}, minmax(2.4rem, 2.75rem))`,
        }}
      >
        {seats.map((seat) => (
          <div
            key={seat.id}
            style={{
              gridRow: seat.row + 1,
              gridColumn: seat.column + 1,
            }}
          >
            <Seat
              seat={seat}
              isHighlighted={highlightedSeatId === seat.id}
              isSwapSelected={swapSelectedSeatId === seat.id}
              onClick={onSeatClick}
              isAdmin={isAdmin}
              showAttendance={showAttendance}
              isDetailed={isDetailed}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Section;
