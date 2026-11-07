import React, { memo } from 'react';

const Seat = ({
  seat,
  isHighlighted = false,
  isSwapSelected = false,
  onClick,
  isAdmin = false,
  showAttendance = false,
  isDetailed = false,
}) => {
  const isAssigned = seat.status === 'assigned';
  const attendanceStatus = seat.attendance_status; // "present", "absent", "not_marked"

  // Base styling for floor-plan architectural seat tile
  let colorClasses = 'bg-[#E8F3ED] text-[#1E4D38] border-[#B9D5C4] hover:bg-[#DCEDE3]';

  if (isAssigned) {
    if (showAttendance) {
      if (attendanceStatus === 'absent') {
        colorClasses = 'bg-[#C0392B] text-white border-[#9E2E22] hover:bg-[#A93226]';
      } else if (attendanceStatus === 'present') {
        colorClasses = 'bg-[#2E7D5B] text-white border-[#236348] hover:bg-[#25664A]';
      } else {
        // Not marked yet for this session: assigned green with subtle dashed indicator
        colorClasses = 'bg-[#2E7D5B] text-white border-2 border-dashed border-[#D9DEE7] hover:bg-[#25664A]';
      }
    } else {
      // Standard assigned seat
      colorClasses = 'bg-[#2E7D5B] text-white border-[#236348] hover:bg-[#25664A]';
    }
  }

  // Active state accents: Muted Gold #C89B3C outline for search result
  let borderClasses = 'border';
  if (isHighlighted) {
    borderClasses = 'ring-2 ring-[#C89B3C] border-2 border-[#C89B3C] font-semibold z-10';
  } else if (isSwapSelected) {
    borderClasses = 'ring-2 ring-[#0F2747] border-2 border-[#0F2747] font-semibold z-10';
  }

  const tooltip = isAdmin
    ? `Seat ${seat.seat_number}${isAssigned ? ` · ${seat.student?.name || 'Assigned'} (${seat.student?.roll_number || ''})` : ' · Available'}`
    : `Seat ${seat.seat_number}`;

  if (isDetailed) {
    return (
      <button
        type="button"
        onClick={() => onClick && onClick(seat)}
        title={tooltip}
        className={`relative flex flex-col justify-between items-center w-full h-full min-w-[4.25rem] min-h-[3.25rem] p-1 rounded text-center transition-colors duration-75 select-none cursor-pointer focus:outline-none overflow-hidden ${colorClasses} ${borderClasses}`}
      >
        <span className="font-mono text-[11px] font-bold tracking-tight">
          {seat.seat_number}
        </span>
        
        {isAdmin && isAssigned && seat.student ? (
          <div className="w-full text-center overflow-hidden">
            <span className="block text-[10px] font-medium leading-tight truncate px-0.5">
              {seat.student.name}
            </span>
            <span className="block text-[9px] font-mono opacity-80 leading-none truncate px-0.5 mt-0.5">
              {seat.student.roll_number}
            </span>
          </div>
        ) : !isAssigned ? (
          <span className="text-[9px] opacity-75 font-sans">
            Free
          </span>
        ) : (
          <span className="text-[9px] opacity-75 font-sans">
            Occupied
          </span>
        )}

        {showAttendance && isAssigned && (
          <div className="w-full pt-0.5">
            <span className="text-[8px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-black/20 block truncate">
              {attendanceStatus === 'present' ? 'Present' : attendanceStatus === 'absent' ? 'Absent' : 'Unmarked'}
            </span>
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(seat)}
      title={tooltip}
      className={`relative flex items-center justify-center w-11 h-9 sm:w-12 sm:h-10 rounded text-xs font-mono transition-colors duration-75 select-none cursor-pointer focus:outline-none ${colorClasses} ${borderClasses}`}
    >
      <span>{seat.seat_number}</span>
    </button>
  );
};

export default memo(Seat);
