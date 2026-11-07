import React, { useState, useEffect, useRef } from 'react';
import { searchPublicStudent } from '../services/public';

const StudentSearch = ({ onSelectResult, onClear }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPublicStudent(query.trim());
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setResults([]);
    if (onSelectResult) {
      onSelectResult(item);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSelectedItem(null);
    setHasSearched(false);
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Search Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedItem) setSelectedItem(null);
          }}
          placeholder="Search student name or roll number..."
          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#D9DEE7] rounded text-[#1F2937] placeholder:text-[#667085] focus:outline-none focus:border-[#0F2747]"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-xs text-[#667085] hover:text-[#1F2937]"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <span className="absolute right-12 top-2.5 text-[11px] text-[#667085]">
          Searching...
        </span>
      )}

      {/* Selected Result Box */}
      {selectedItem && (
        <div className="mt-3 p-3 bg-white border-l-4 border-[#C89B3C] border border-[#D9DEE7] rounded text-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#667085] block uppercase tracking-wide">
              Assigned Seat
            </span>
            <div className="font-semibold text-sm text-[#0F2747] mt-0.5">
              {selectedItem.section} · Seat {selectedItem.seatNumber}
            </div>
            <div className="text-[11px] text-[#1F2937]">
              Student: {selectedItem.studentName}
              {selectedItem.disambiguation && ` (${selectedItem.disambiguation})`}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-[#0F2747] hover:underline font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Dropdown Results */}
      {results.length > 0 && !selectedItem && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded border border-[#D9DEE7] shadow-sm divide-y divide-[#D9DEE7] max-h-56 overflow-y-auto z-50 text-xs">
          {results.map((item, index) => (
            <button
              key={`${item.seatId}-${index}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#F5F7FA] transition-colors cursor-pointer"
            >
              <div>
                <span className="font-medium text-[#1F2937]">
                  {item.studentName}
                </span>
                {item.disambiguation && (
                  <span className="ml-1.5 text-[11px] text-[#667085]">
                    ({item.disambiguation})
                  </span>
                )}
              </div>
              <span className="font-mono text-[#0F2747] font-semibold">
                {item.section} · {item.seatNumber}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {hasSearched && results.length === 0 && !loading && !selectedItem && (
        <div className="absolute left-0 right-0 mt-1 p-3 bg-white rounded border border-[#D9DEE7] text-xs text-[#667085] text-center z-50">
          No assigned seat found for "{query}".
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
