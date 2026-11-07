import React from 'react';

const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-[#D9DEE7] bg-[#F5F7FA] text-xs text-[#667085]">
      <div>
        Showing <span className="font-semibold text-[#1F2937]">{startItem}</span> to{' '}
        <span className="font-semibold text-[#1F2937]">{endItem}</span> of{' '}
        <span className="font-semibold text-[#1F2937]">{totalItems}</span> records
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 bg-white border border-[#D9DEE7] rounded text-[#1F2937] hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Previous
        </button>

        <span className="text-xs px-1 text-[#1F2937]">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1 bg-white border border-[#D9DEE7] rounded text-[#1F2937] hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
