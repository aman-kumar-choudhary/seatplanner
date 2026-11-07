import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="py-2">
        <p className="text-xs text-[#1F2937] leading-relaxed">{message}</p>
      </div>

      <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-[#D9DEE7]">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-3.5 py-1.5 text-xs font-medium text-[#1F2937] bg-white border border-[#D9DEE7] hover:bg-slate-50 rounded transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-3.5 py-1.5 text-xs font-medium text-white rounded transition-colors disabled:opacity-50 ${
            confirmVariant === 'danger'
              ? 'bg-[#C0392B] hover:bg-[#A93226]'
              : 'bg-[#0F2747] hover:bg-[#0A1C33]'
          }`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
