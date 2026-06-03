import React, { useState } from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const ReportModal = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-[340px] sm:max-w-md p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <FaTimes size={20} />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <FaExclamationTriangle className="text-red-600 text-xl" />
          <h2 className="text-xl font-bold text-slate-800">Report this content</h2>
        </div>

        <p className="text-slate-600 text-sm mb-5 leading-relaxed">
          Please only submit actionable offences. Abuse or false reporting may lead to action taken against your own account. Select the reason to report this content.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Reason
          </label>
          <div className="relative">
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer"
            >
              <option value="" disabled>Select reason</option>
              <option value="Abusive language">Abusive language</option>
              <option value="Inappropriate content">Inappropriate content</option>
              <option value="Fraud attempt">Fraud attempt</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleSubmit}
            disabled={!reason}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${!reason ? 'bg-cyan-300 cursor-not-allowed' : 'bg-[#00a8cc] hover:bg-[#008ba8]'}`}
          >
            Report
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-[#e91e63] hover:bg-[#c2185b] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
