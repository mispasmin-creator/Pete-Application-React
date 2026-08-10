import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Building, 
  Tag, 
  User, 
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Hardcoded options removed. Data is now fetched dynamically from the Master sheet.
export default function PeteRecordPage() {
  const { user, isAdmin } = useAuth();

  // Filter States
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('All');
  const [groupHead, setGroupHead] = useState('All');
  const [personName, setPersonName] = useState('');

  // Pagination & Sorting States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Data States
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [masterData, setMasterData] = useState([]);

  // Modal States
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const hasFullAccess = isAdmin || user?.firmName === 'All';
      const params = {
        page,
        limit,
        search,
        startDate,
        endDate,
        department: department === 'All' ? '' : department,
        groupHead: groupHead === 'All' ? '' : groupHead,
        personName,
        status: 'Approved',
        createdBy: hasFullAccess ? '' : (user?.email || ''),
        firmName: hasFullAccess ? '' : (user?.firmName || '')
      };

      const res = await api.getEntries(params);
      if (res.success && res.entries) {
        const userFirm = (user?.firmName || '').toLowerCase().trim();
        const userEmail = (user?.email || '').toLowerCase().trim();

        const filtered = hasFullAccess ? res.entries : res.entries.filter(e => {
          const eFirm = (e.firmName || '').toLowerCase().trim();
          const eUser = (e.createdBy || '').toLowerCase().trim();
          return (userFirm && eFirm === userFirm) || (userEmail && eUser === userEmail);
        });

        setEntries(filtered);
        setTotalCount(filtered.length);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, startDate, endDate, department, groupHead, personName, isAdmin, user?.firmName, user?.email]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    async function fetchMaster() {
      const res = await api.getMasterData();
      if (res.success && res.data) {
        setMasterData(res.data);
      }
    }
    fetchMaster();
  }, []);

  const safeMasterData = Array.isArray(masterData) ? masterData : [];
  const departments = [...new Set(safeMasterData.map(d => d.department))].filter(Boolean);
  const groupHeads = [...new Set(safeMasterData.map(d => d.groupHead))].filter(Boolean);
  
  if (!departments.includes('Factory')) departments.unshift('Factory');
  if (!departments.includes('MDO')) departments.unshift('MDO');

  // CSV Export Function
  const handleExportCSV = () => {
    if (!entries.length) return;

    const headers = ['ID', 'Timestamp', 'Created By', 'Date', 'Department', 'Debit Amount', 'Credit Amount', 'Group Head', 'Reason', 'Person Name', 'Running Balance'];
    const rows = entries.map(e => [
      `"${e.id}"`,
      `"${e.timestamp}"`,
      `"${e.createdBy}"`,
      `"${e.date}"`,
      `"${e.department}"`,
      e.debitAmount || 0,
      e.creditAmount || 0,
      `"${e.groupHead}"`,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${(e.personName || '').replace(/"/g, '""')}"`,
      e.runningBalance || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pete_Cash_Records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Delete Entry (Admin Only)
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      const res = await api.deleteEntry({ id: deleteId });
      if (res.success) {
        setToastMsg('Entry deleted successfully');
        setDeleteId(null);
        fetchEntries();
      } else {
        alert(res.error || 'Failed to delete entry');
      }
    } catch (err) {
      alert('Error deleting entry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Save (Admin Only)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editEntry) return;
    setActionLoading(true);
    try {
      const res = await api.updateEntry(editEntry);
      if (res.success) {
        setToastMsg('Entry updated successfully');
        setEditEntry(null);
        fetchEntries();
      } else {
        alert(res.error || 'Failed to update entry');
      }
    } catch (err) {
      alert('Error updating entry: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amt || 0);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pete Transaction Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Complete transaction audit log & balance sheet' : `Showing entries logged by ${user?.email}`}
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={fetchEntries}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!entries.length}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-emerald-600 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 disabled:opacity-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-semibold">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-xs text-slate-500 hover:text-slate-900">✕</button>
        </div>
      )}

      {/* FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Filter Transactions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* SEARCH INPUT */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reason, person, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          {/* DATE FROM */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-900 outline-none"
            />
          </div>

          {/* DATE TO */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-900 outline-none"
            />
          </div>

          {/* DEPARTMENT */}
          <div>
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-900 outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* GROUP HEAD */}
          <div>
            <select
              value={groupHead}
              onChange={(e) => { setGroupHead(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-900 outline-none"
            >
              <option value="All">All Group Heads</option>
              {groupHeads.map(gh => (
                <option key={gh} value={gh}>{gh}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3.5 px-4 bg-slate-100">Firm Name</th>
                <th className="py-3.5 px-4 bg-slate-100">Date</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Debit (Out)</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Credit (In)</th>
                <th className="py-3.5 px-4 bg-slate-100">Reason</th>
                <th className="py-3.5 px-4 bg-slate-100">Group Head</th>
                <th className="py-3.5 px-4 text-center bg-slate-100">Photo</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Running Balance</th>
                <th className="py-3.5 px-4 bg-slate-100">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span>Loading records from Google Sheets...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length > 0 ? (
                entries.map((entry) => {
                  const isCredit = entry.creditAmount > 0;
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isCredit ? 'hover:bg-emerald-50/40' : 'hover:bg-rose-50/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {entry.firmName || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {entry.date || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-500 whitespace-nowrap">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-500 whitespace-nowrap">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                        {entry.reason || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {entry.groupHead || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          if (!entry.photoUrl) return <span className="text-slate-400">-</span>;
                          const firstUrl = entry.photoUrl.split(',')[0].trim();
                          if (!firstUrl) return <span className="text-slate-400">-</span>;

                          const isPdf = firstUrl.toLowerCase().includes('.pdf') || firstUrl.includes('application/pdf');
                          const isDriveLink = firstUrl.startsWith('http://') || firstUrl.startsWith('https://');

                          if (isPdf) {
                            return (
                              <a
                                href={firstUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                                title="Open PDF Document"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </a>
                            );
                          }

                          if (isDriveLink) {
                            return (
                              <a
                                href={firstUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                                title="Open Google Drive File"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View</span>
                              </a>
                            );
                          }

                          return (
                            <a href={firstUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                              <img
                                src={firstUrl}
                                alt="Receipt"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm hover:scale-110 transition-transform"
                              />
                            </a>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {entry.remarks || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <span>
            Showing <span className="font-semibold text-slate-900">{entries.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalCount}</span> entries
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page <span className="font-semibold text-slate-900">{page}</span> of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL VIEW MODAL */}
      {viewEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg md:max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Entry Details ({viewEntry.id})</h3>
              <button onClick={() => setViewEntry(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Date:</span> <p className="font-semibold text-slate-900">{viewEntry.date}</p></div>
              <div><span className="text-slate-500">Department:</span> <p className="font-semibold text-slate-900">{viewEntry.department}</p></div>
              <div><span className="text-slate-500">Group Head:</span> <p className="font-semibold text-slate-900">{viewEntry.groupHead}</p></div>
              <div><span className="text-slate-500">Person Name:</span> <p className="font-semibold text-slate-900">{viewEntry.personName}</p></div>
              <div><span className="text-slate-500">Debit Amount:</span> <p className="font-bold text-rose-500">{formatCurrency(viewEntry.debitAmount)}</p></div>
              <div><span className="text-slate-500">Credit Amount:</span> <p className="font-bold text-emerald-500">{formatCurrency(viewEntry.creditAmount)}</p></div>
            </div>

            <div className="text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-500">Reason:</span>
              <p className="text-slate-700 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">{viewEntry.reason}</p>
            </div>

            {viewEntry.photoUrl && (
              <div className="text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-semibold block mb-2">Attached Receipt / Documents:</span>
                <div className="flex flex-wrap gap-2">
                  {viewEntry.photoUrl.split(',').map((url, i) => {
                    const trimmedUrl = url.trim();
                    if (!trimmedUrl) return null;
                    const isPdf = trimmedUrl.toLowerCase().includes('.pdf') || trimmedUrl.includes('application/pdf');
                    const isDriveLink = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');

                    if (isPdf) {
                      return (
                        <a
                          key={i}
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Open PDF ({i + 1})</span>
                        </a>
                      );
                    }

                    if (isDriveLink) {
                      return (
                        <a
                          key={i}
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Receipt ({i + 1})</span>
                        </a>
                      );
                    }

                    return (
                      <a key={i} href={trimmedUrl} target="_blank" rel="noopener noreferrer">
                        <img src={trimmedUrl} alt={`Receipt ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200 hover:border-emerald-500 shadow-sm" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL (ADMIN ONLY) */}
      {editEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-fade-in">
          <form onSubmit={handleEditSubmit} className="bg-white border border-slate-200 w-full max-w-lg md:max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Entry ({editEntry.id})</h3>
              <button type="button" onClick={() => setEditEntry(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={editEntry.date}
                  onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Department</label>
                <select
                  value={editEntry.department}
                  onChange={(e) => setEditEntry({ ...editEntry, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
                >
                  <option value="Factory">Factory</option>
                  <option value="MDO">MDO</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Debit Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editEntry.debitAmount}
                  onChange={(e) => setEditEntry({ ...editEntry, debitAmount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Credit Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editEntry.creditAmount}
                  onChange={(e) => setEditEntry({ ...editEntry, creditAmount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-500 mb-1">Group Head</label>
              <input
                type="text"
                value={editEntry.groupHead}
                onChange={(e) => setEditEntry({ ...editEntry, groupHead: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
              />
            </div>

            <div className="text-xs">
              <label className="block text-slate-500 mb-1">Reason</label>
              <input
                type="text"
                value={editEntry.reason}
                onChange={(e) => setEditEntry({ ...editEntry, reason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
              />
            </div>

            <div className="text-xs">
              <label className="block text-slate-500 mb-1">Person Name</label>
              <input
                type="text"
                value={editEntry.personName}
                onChange={(e) => setEditEntry({ ...editEntry, personName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditEntry(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Delete Transaction?</h3>
            <p className="text-xs text-slate-500">Are you sure you want to delete {deleteId}? Running balance will be recalculated.</p>
            <div className="flex justify-center space-x-3 pt-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={actionLoading} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm">
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
