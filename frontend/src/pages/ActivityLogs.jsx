import React, { useState, useEffect } from 'react';
import { getAuditLogs, getLogActions } from '../services/logs';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actionsList, setActionsList] = useState([]);

  // Expanded row
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    getLogActions().then((data) => {
      setActionsList(data.actions || []);
    });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, search, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search.trim() || undefined,
        action: actionFilter || undefined,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="pb-3 border-b border-[#D9DEE7]">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2747]">
          Activity Log
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Chronological audit trail recording administrative actions and seating changes
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded border border-[#D9DEE7] p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search log by description, user, or target ID..."
            className="w-full px-3 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] placeholder:text-[#667085] focus:outline-none focus:border-[#0F2747]"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-[#D9DEE7] rounded text-[#1F2937] focus:outline-none focus:border-[#0F2747]"
          >
            <option value="">All Action Types</option>
            {actionsList.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LOGS TABLE */}
      <div className="bg-white rounded border border-[#D9DEE7] overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Reading audit logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No audit entries found"
              description="Administrative actions are logged here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#D9DEE7] text-left text-xs">
              <thead className="bg-[#F5F7FA] text-[#667085] font-semibold text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Administrator</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Event Description</th>
                  <th className="px-4 py-2.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] bg-white text-[#1F2937]">
                {logs.map((log) => {
                  const isExpanded = expandedRowId === log.id;
                  const hasDetails = log.previous_value || log.new_value;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString([], {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap font-medium">
                          {log.admin_name || 'System'}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px] text-[#667085] uppercase">
                          {log.action.replace(/_/g, ' ')}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] capitalize">
                          {log.target_type}
                        </td>

                        <td className="px-4 py-2.5 text-[#1F2937] max-w-md">
                          {log.details || '-'}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          {hasDetails ? (
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                              className="text-xs text-[#0F2747] hover:underline font-medium"
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                            </button>
                          ) : (
                            <span className="text-[#D9DEE7]">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable State Diff */}
                      {isExpanded && (
                        <tr className="bg-[#F5F7FA]">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                              {log.previous_value && (
                                <div className="p-2.5 bg-white border border-[#D9DEE7] rounded">
                                  <span className="font-semibold text-[#C0392B] text-[10px] uppercase block mb-1">
                                    Previous State:
                                  </span>
                                  <pre className="text-[#1F2937] overflow-x-auto text-[11px]">
                                    {JSON.stringify(log.previous_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_value && (
                                <div className="p-2.5 bg-white border border-[#D9DEE7] rounded">
                                  <span className="font-semibold text-[#2E7D5B] text-[10px] uppercase block mb-1">
                                    New State:
                                  </span>
                                  <pre className="text-[#1F2937] overflow-x-auto text-[11px]">
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>
    </div>
  );
};

export default ActivityLogs;
