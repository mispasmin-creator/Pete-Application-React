import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileCheck, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  X, 
  Clock, 
  History, 
  Eye, 
  FileText, 
  ExternalLink,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function TallyEntryPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [entries, setEntries] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [tallyRemark, setTallyRemark] = useState('');
  const [search, setSearch] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEntries({ limit: 200 });
      if (res.success && res.entries) {
        // HOD Approved entries only (Must be Approved by HOD)
        const approved = res.entries.filter(e => e.status === 'Approved' || Boolean(e.actual1));
        
        // Pending Tally Verification (Actual 2 is empty and Remark 2 is not Verified)
        const pending = approved.filter(e => !e.actual2 && e.remark2 !== 'Verified');
        // Tally Verified History
        const history = approved.filter(e => Boolean(e.actual2) || e.remark2 === 'Verified');

        setEntries(pending);
        setHistoryEntries(history);
      }
    } catch (err) {
      console.error('Failed to load Tally entries:', err);
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

  const handleVerifyTally = async (entry, customRemark = '') => {
    setActionLoading(entry.id);
    try {
      const remarkToUse = customRemark || tallyRemark || 'Verified';
      const res = await api.verifyTallyEntry({
        id: entry.id,
        rowIndex: entry._rowIndex,
        remark2: remarkToUse
      });

      if (res.success) {
        showToast('Tally Entry verified successfully!');
        setHistoryEntries(prev => [
          { 
            ...entry, 
            actual2: new Date().toLocaleString(), 
            remark2: remarkToUse, 
            actionTime: new Date().toLocaleTimeString() 
          }, 
          ...prev
        ]);
        setEntries(prev => prev.filter(e => e.id !== entry.id));
      } else {
        showToast(res.error || 'Failed to verify entry in Tally', 'error');
      }
    } catch (err) {
      showToast('An error occurred while verifying.', 'error');
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

  const currentList = activeTab === 'pending' ? entries : historyEntries;
  const filteredList = currentList.filter(e => {
    const s = search.toLowerCase();
    return (
      (e.firmName && e.firmName.toLowerCase().includes(s)) ||
      (e.reason && e.reason.toLowerCase().includes(s)) ||
      (e.groupHead && e.groupHead.toLowerCase().includes(s)) ||
      (e.personName && e.personName.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-teal-600" />
            Tally Entry Verification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Verify and confirm HOD approved cash entries into Tally</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={fetchEntries}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {toast.show && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-md transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="text-xs text-slate-400 hover:text-slate-900">✕</button>
        </div>
      )}

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* TABS */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'pending'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Verification ({entries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'history'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Verification History ({historyEntries.length})</span>
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* ENTRIES TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] min-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3.5 px-4 bg-slate-100">Firm Name</th>
                <th className="py-3.5 px-4 bg-slate-100">Date</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Debit (Out)</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Credit (In)</th>
                <th className="py-3.5 px-4 bg-slate-100">Reason / Description</th>
                <th className="py-3.5 px-4 bg-slate-100">Group Head</th>
                <th className="py-3.5 px-4 text-center bg-slate-100">Receipt</th>
                <th className="py-3.5 px-4 text-right bg-slate-100">Balance</th>
                <th className="py-3.5 px-4 bg-slate-100">HOD Remark</th>
                {activeTab === 'history' && <th className="py-3.5 px-4 bg-slate-100">Tally Voucher/Remark</th>}
                <th className="py-3.5 px-4 text-center bg-slate-100">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                      <span>Loading entries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length > 0 ? (
                filteredList.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
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
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {entry.remark1 || entry.remarks || '-'}
                    </td>
                    {activeTab === 'history' && (
                      <td className="py-3.5 px-4 text-slate-700 font-semibold max-w-xs truncate">
                        {entry.remark2 || 'Verified'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {activeTab === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setTallyRemark('');
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-100 transition-all flex items-center space-x-1 mx-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify Tally</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Verified in Tally
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                    No entries found in {activeTab === 'pending' ? 'Pending Tally Verification' : 'Verification History'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFY TALLY ENTRY MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg md:max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Verify Tally Entry</h3>
              </div>
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
              <div className="col-span-2"><span className="text-slate-500 font-medium">HOD Remark:</span> <p className="text-emerald-700 font-semibold mt-0.5">{selectedEntry.remark1 || selectedEntry.remarks || 'Approved by HOD'}</p></div>
            </div>

            {/* PHOTO PREVIEW IF AVAILABLE */}
            {selectedEntry.photoUrl && (
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1.5">Attached Receipt / Document:</span>
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

            {/* TALLY REMARK / VOUCHER NO INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tally Voucher No. / Remark (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Voucher #1042 / Verified in Tally..."
                value={tallyRemark}
                onChange={(e) => setTallyRemark(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* MODAL ACTIONS */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleVerifyTally(selectedEntry, tallyRemark || 'Verified');
                  setSelectedEntry(null);
                }}
                disabled={actionLoading === selectedEntry.id}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-200 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Verify Tally Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
