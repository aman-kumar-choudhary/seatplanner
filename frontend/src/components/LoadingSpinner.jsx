import React from 'react';

const LoadingSpinner = ({ text = 'Loading data...' }) => {
  return (
    <div className="flex items-center justify-center p-6 text-xs text-[#667085]">
      <span className="inline-block w-3.5 h-3.5 border-2 border-[#D9DEE7] border-t-[#0F2747] rounded-full animate-spin mr-2" />
      <span>{text}</span>
    </div>
  );
};

export default LoadingSpinner;
