import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { importStudentsFile } from '../services/students';
import toast from 'react-hot-toast';

const StudentImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [totalParsedCount, setTotalParsedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setTotalParsedCount(0);
    setLoading(false);
    setImportSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportSummary(null);

    const fileName = selectedFile.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setPreviewHeaders(Object.keys(results.data[0]));
            setPreviewRows(results.data.slice(0, 5));
            setTotalParsedCount(results.data.length);
          }
        },
        error: (err) => {
          toast.error('Failed to parse CSV file: ' + err.message);
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (data && data.length > 1) {
            const headers = data[0].map(String);
            const rows = data.slice(1).map((r) => {
              const obj = {};
              headers.forEach((h, i) => {
                obj[h] = r[i] !== undefined ? String(r[i]) : '';
              });
              return obj;
            });
            setPreviewHeaders(headers);
            setPreviewRows(rows.slice(0, 5));
            setTotalParsedCount(rows.length);
          }
        } catch (err) {
          toast.error('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      toast.error('Please upload a .csv or .xlsx file.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const summary = await importStudentsFile(formData);
      setImportSummary(summary);
      toast.success(`Imported ${summary.successfully_imported} students.`);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Import failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Name,Roll Number,Department,Course,Year,Semester,Email,Phone\n' +
      'Rahul Kumar,101,Computer Science,BCA,2,3,rahul@example.com,9876543210\n' +
      'Aman Sharma,102,Computer Science,BCA,2,3,aman@example.com,9876543211\n' +
      'Priya Singh,103,Information Tech,B.Tech IT,3,5,priya@example.com,9876543212';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Students (CSV / Excel)" maxWidth="max-w-xl">
      {!importSummary ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#667085] pb-2 border-b border-[#D9DEE7]">
            <span>Supported: CSV, XLSX · Required columns: <strong>Name</strong>, <strong>Roll Number</strong></span>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="text-[#0F2747] hover:underline font-medium"
            >
              Download Template
            </button>
          </div>

          {/* Simple file selector */}
          <div className="border border-[#D9DEE7] rounded p-4 bg-[#F5F7FA] text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white border border-[#D9DEE7] hover:bg-slate-50 text-xs font-medium text-[#1F2937] rounded"
            >
              Select Spreadsheet File
            </button>
            <div className="text-xs text-[#667085] mt-2">
              {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'No file chosen'}
            </div>
          </div>

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#667085] uppercase">
                Preview (First 5 of {totalParsedCount} rows)
              </span>
              <div className="border border-[#D9DEE7] rounded overflow-x-auto max-h-44 text-xs">
                <table className="min-w-full divide-y divide-[#D9DEE7] text-left">
                  <thead className="bg-[#F5F7FA] text-[#667085] font-semibold text-[11px]">
                    <tr>
                      {previewHeaders.slice(0, 6).map((h, i) => (
                        <th key={i} className="px-3 py-1.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9DEE7] bg-white">
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {previewHeaders.slice(0, 6).map((h, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-[#1F2937]">
                            {row[h] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9DEE7]">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-[#1F2937] bg-white border border-[#D9DEE7] hover:bg-slate-50 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2747] hover:bg-[#0A1C33] rounded disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${totalParsedCount > 0 ? `(${totalParsedCount})` : ''}`}
            </button>
          </div>
        </div>
      ) : (
        /* Summary View */
        <div className="space-y-4 text-xs">
          <div className="border border-[#D9DEE7] rounded divide-y divide-[#D9DEE7] bg-white">
            <div className="px-3.5 py-2 flex justify-between bg-[#F5F7FA] font-semibold text-[#0F2747]">
              <span>Import Status</span>
              <span>Complete</span>
            </div>
            <div className="px-3.5 py-2 flex justify-between">
              <span className="text-[#667085]">Total Rows Processed</span>
              <span className="font-semibold text-[#1F2937]">{importSummary.total_rows}</span>
            </div>
            <div className="px-3.5 py-2 flex justify-between">
              <span className="text-[#667085]">Successfully Created</span>
              <span className="font-semibold text-[#2E7D5B]">{importSummary.successfully_imported}</span>
            </div>
            <div className="px-3.5 py-2 flex justify-between">
              <span className="text-[#667085]">Duplicate Roll Numbers</span>
              <span className="font-semibold text-[#B7791F]">{importSummary.duplicates}</span>
            </div>
            <div className="px-3.5 py-2 flex justify-between">
              <span className="text-[#667085]">Invalid Rows</span>
              <span className="font-semibold text-[#C0392B]">{importSummary.invalid_rows_count}</span>
            </div>
          </div>

          {importSummary.invalid_rows && importSummary.invalid_rows.length > 0 && (
            <div className="border border-[#D9DEE7] rounded max-h-36 overflow-y-auto divide-y divide-[#D9DEE7] text-[11px] bg-[#F5F7FA]">
              {importSummary.invalid_rows.map((inv, idx) => (
                <div key={idx} className="p-2 flex justify-between">
                  <span className="font-mono text-[#1F2937]">Row {inv.row}</span>
                  <span className="text-[#C0392B]">{inv.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[#D9DEE7]">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F2747] hover:bg-[#0A1C33] rounded"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StudentImportModal;
