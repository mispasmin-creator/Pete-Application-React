import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, CheckCircle, AlertCircle, RefreshCw, Check, X, Clock, History, Eye, FileText, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function HODApprovalPage() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [entries, setEntries] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [hodRemark, setHodRemark] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEntries({ limit: 200 });
      if (res.success && res.entries) {
        const pending = res.entries.filter(e => e.status !== 'Approved' && e.status !== 'Rejected' && !e.actual1);
        const history = res.entries.filter(e => e.status === 'Approved' || e.status === 'Rejected' || Boolean(e.actual1));

        setEntries(pending);
        setHistoryEntries(history);
      }
    } catch (err) {
      console.error('Failed to load HOD approval entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleApprove = async (entry, customRemark = '') => {
    setActionLoading(entry.id);
    try {
      const remarkToUse = customRemark || hodRemark || '';
      const res = await api.approveEntry({ 
        id: entry.id, 
        rowIndex: entry._rowIndex,
        status: 'Approved',
        remark: remarkToUse
      });
      if (res.success) {
        showToast('Entry approved successfully!');
        setHistoryEntries(prev => [{ ...entry, status: 'Approved', remarks: remarkToUse || entry.remarks, actionTime: new Date().toLocaleTimeString() }, ...prev]);
        setEntries(prev => prev.filter(e => e.id !== entry.id));
      } else {
        showToast(res.error || 'Failed to approve entry', 'error');
      }
    } catch (err) {
      showToast('An error occurred while approving.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (entry, customRemark = '') => {
    setActionLoading(entry.id);
    try {
      const remarkToUse = customRemark || hodRemark || '';
      const res = await api.rejectEntry({ 
        id: entry.id, 
        rowIndex: entry._rowIndex,
        status: 'Rejected',
        remark: remarkToUse
      });
      if (res.success) {
        showToast('Entry rejected successfully!', 'error');
        setHistoryEntries(prev => [{ ...entry, status: 'Rejected', remarks: remarkToUse || entry.remarks, actionTime: new Date().toLocaleTimeString() }, ...prev]);
        setEntries(prev => prev.filter(e => e.id !== entry.id));
      } else {
        showToast(res.error || 'Failed to reject entry', 'error');
      }
    } catch (err) {
      showToast('An error occurred while rejecting.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            HOD Approval
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve or reject newly created petty cash entries.
          </p>
        </div>
        <button 
          onClick={fetchEntries}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-200 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'pending'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 font-extrabold">
            {entries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Approval History</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-extrabold">
            {historyEntries.length}
          </span>
        </button>
      </div>

      {/* TOAST */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 md:bottom-10 md:right-10 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl z-50 animate-slide-up border ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      {/* PENDING APPROVALS TABLE */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] min-h-[380px] overflow-y-auto">
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
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="inline-flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                        <span>Loading HOD approval entries...</span>
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
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setHodRemark('');
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all mx-auto"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Action</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                      No pending entries found for HOD approval.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVAL HISTORY TABLE */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)] min-h-[380px] overflow-y-auto">
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
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {historyEntries.length > 0 ? (
                  historyEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
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
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          entry.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                      No approval history records available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW & APPROVAL MODAL */}
      {selectedEntry && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg md:max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-5 relative my-auto max-h-[85vh] overflow-y-auto">
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>Review Entry Details</span>
              </h3>
              <button onClick={() => setSelectedEntry(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            {/* ENTRY DETAILS GRID */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><span className="text-slate-500 font-medium">Firm Name:</span> <p className="font-bold text-slate-900 mt-0.5">{selectedEntry.firmName || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Date:</span> <p className="font-bold text-slate-900 mt-0.5">{selectedEntry.date || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Debit Amount (Out):</span> <p className="font-extrabold text-rose-500 mt-0.5">{selectedEntry.debitAmount > 0 ? formatCurrency(selectedEntry.debitAmount) : '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Credit Amount (In):</span> <p className="font-extrabold text-emerald-600 mt-0.5">{selectedEntry.creditAmount > 0 ? formatCurrency(selectedEntry.creditAmount) : '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Group Head:</span> <p className="font-semibold text-slate-900 mt-0.5">{selectedEntry.groupHead || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Running Balance:</span> <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(selectedEntry.runningBalance)}</p></div>
              <div className="col-span-2"><span className="text-slate-500 font-medium">Reason / Description:</span> <p className="font-semibold text-slate-800 mt-0.5">{selectedEntry.reason || '-'}</p></div>
            </div>

            {/* PHOTO PREVIEW IF AVAILABLE */}
            {selectedEntry.photoUrl && (
              <div>
                {(() => {
                  const firstUrl = selectedEntry.photoUrl.split(',')[0].trim();
                  const isPdf = firstUrl.toLowerCase().includes('.pdf') || firstUrl.includes('application/pdf');
                  const isDriveLink = firstUrl.startsWith('http://') || firstUrl.startsWith('https://');

                  if (isPdf) {
                    return (
                      <a
                        href={firstUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Open PDF Document in New Tab</span>
                      </a>
                    );
                  }

                  if (isDriveLink) {
                    return (
                      <a
                        href={firstUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Google Drive File</span>
                      </a>
                    );
                  }

                  return (
                    <a href={firstUrl} target="_blank" rel="noopener noreferrer">
                      <img src={firstUrl} alt="Receipt" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                    </a>
                  );
                })()}
              </div>
            )}

            {/* REMARK INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                HOD Remark / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved for payment..."
                value={hodRemark}
                onChange={(e) => setHodRemark(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* MODAL ACTIONS */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  handleReject(selectedEntry, hodRemark);
                  setSelectedEntry(null);
                }}
                disabled={actionLoading === selectedEntry.id}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                onClick={() => {
                  handleApprove(selectedEntry, hodRemark);
                  setSelectedEntry(null);
                }}
                disabled={actionLoading === selectedEntry.id}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
