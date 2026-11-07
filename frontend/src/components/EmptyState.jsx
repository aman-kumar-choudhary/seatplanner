import React from 'react';

const EmptyState = ({
  title = 'No records found',
  description = 'There are no items to display.',
  action = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded border border-[#D9DEE7]">
      <h4 className="text-xs font-semibold text-[#1F2937] mb-1">{title}</h4>
      <p className="text-xs text-[#667085] max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
