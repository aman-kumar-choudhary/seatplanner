import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full ${maxWidth} bg-white rounded border border-[#D9DEE7] shadow-sm overflow-hidden z-10`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#D9DEE7] bg-[#F5F7FA]">
            <h3 className="text-sm font-semibold text-[#0F2747]">{title}</h3>
            <button
              onClick={onClose}
              className="text-xs text-[#667085] hover:text-[#1F2937] p-1 font-mono"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[80vh] overflow-y-auto text-xs text-[#1F2937]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
