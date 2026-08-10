import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  FileText, 
  Calendar, 
  Filter,
  Eye,
  RefreshCw,
  Clock,
  User,
  Tag,
  Building,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const BAR_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'];

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [timeframe, setTimeframe] = useState('all'); // 'today' | 'month' | 'all'
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netBalance: 0,
    entryCount: 0,
    groupHeadBreakdown: [],
    firmBreakdown: [],
    hodApprovedCount: 0,
    hodPendingCount: 0,
    tallyVerifiedCount: 0,
    tallyPendingCount: 0
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const hasFullAccess = isAdmin || user?.firmName === 'All';
      const params = {
        timeframe,
        createdBy: hasFullAccess ? '' : (user?.email || ''),
        firmName: hasFullAccess ? '' : (user?.firmName || '')
      };

      const [summaryRes, entriesRes] = await Promise.all([
        api.getSummary(params),
        api.getEntries({ ...params, page: 1, limit: 10 })
      ]);

      if (summaryRes.success && summaryRes.summary) {
        setSummary(summaryRes.summary);
      }

      if (entriesRes.success && entriesRes.entries) {
        const userFirm = (user?.firmName || '').toLowerCase().trim();
        const userEmail = (user?.email || '').toLowerCase().trim();

        const filtered = hasFullAccess ? entriesRes.entries : entriesRes.entries.filter(e => {
          const eFirm = (e.firmName || '').toLowerCase().trim();
          const eUser = (e.createdBy || '').toLowerCase().trim();
          return (userFirm && eFirm === userFirm) || (userEmail && eUser === userEmail);
        });

        setRecentEntries(filtered);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, isAdmin, user?.firmName, user?.email]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExportCSV = () => {
    if (!recentEntries || recentEntries.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Firm Name', 'Debit (Out)', 'Credit (In)', 'Running Balance', 'Group Head', 'Reason', 'Person Name', 'HOD Status', 'Tally Status'];
    const rows = recentEntries.map(e => [
      e.id || '',
      e.date || '',
      `"${(e.firmName || '').replace(/"/g, '""')}"`,
      e.debitAmount || 0,
      e.creditAmount || 0,
      e.runningBalance || 0,
      `"${(e.groupHead || '').replace(/"/g, '""')}"`,
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${(e.personName || '').replace(/"/g, '""')}"`,
      (e.status === 'Approved' || e.actual1) ? 'Approved' : 'Pending',
      (e.actual2 || e.remark2 === 'Verified') ? 'Verified' : 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pete_cash_report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* TOP BAR & TIME TOGGLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dashboard & Analytics</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
              Live FMS
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Company-wide cash management summary and reports' : `Activity summary for ${user?.name || user?.email}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* TIMEFRAME TOGGLE BUTTONS */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {[
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTimeframe(btn.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === btn.id
                    ? 'bg-white text-emerald-700 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* EXPORT REPORT BUTTON */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          {/* REFRESH BUTTON */}
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUMMARY KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. TOTAL CREDIT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Credit</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-2 tracking-tight truncate">
            {loading ? '...' : formatCurrency(summary.totalCredit)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Incoming cash additions</p>
        </div>

        {/* 2. TOTAL DEBIT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Debit</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-rose-600 mt-2 tracking-tight truncate">
            {loading ? '...' : formatCurrency(summary.totalDebit)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Outgoing expenses / payouts</p>
        </div>

        {/* 3. NET BALANCE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-teal-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Net Balance</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl font-extrabold mt-2 tracking-tight truncate ${
            summary.netBalance >= 0 ? 'text-teal-600' : 'text-rose-600'
          }`}>
            {loading ? '...' : formatCurrency(summary.netBalance)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Calculated running balance</p>
        </div>

        {/* 4. TOTAL ENTRIES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Entries</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {loading ? '...' : summary.entryCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Recorded transactions count</p>
        </div>

        {/* 5. HOD APPROVAL STATUS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">HOD Status</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-xl font-extrabold text-amber-600">{loading ? '...' : summary.hodApprovedCount}</span>
            <span className="text-[11px] font-bold text-slate-400">Approved / {summary.hodPendingCount} Pending</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Stage 1 Approval Status</p>
        </div>

        {/* 6. TALLY VERIFICATION STATUS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Tally Status</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-xl font-extrabold text-emerald-600">{loading ? '...' : summary.tallyVerifiedCount}</span>
            <span className="text-[11px] font-bold text-slate-400">Verified / {summary.tallyPendingCount} Pending</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Stage 2 Tally Status</p>
        </div>
      </div>

      {/* REPORTS & CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GROUP HEAD EXPENSE BAR CHART */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expenses by Group Head</h2>
              <p className="text-xs text-slate-500">Breakdown of outgoing costs by category</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Top Categories
            </span>
          </div>

          <div className="h-64 w-full mt-2">
            {summary.groupHeadBreakdown && summary.groupHeadBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.groupHeadBreakdown.slice(0, 7)}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [formatCurrency(val), 'Expense']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {summary.groupHeadBreakdown.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No expense category data available for this timeframe
              </div>
            )}
          </div>
        </div>

        {/* FIRM-WISE CASH BREAKDOWN REPORT */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Firm-Wise Cash Report</h2>
              <p className="text-xs text-slate-500">Debit & Credit totals per registered firm</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {summary.firmBreakdown ? summary.firmBreakdown.length : 0} Firms
            </span>
          </div>

          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {summary.firmBreakdown && summary.firmBreakdown.length > 0 ? (
              summary.firmBreakdown.map((firm, idx) => {
                const totalCash = (firm.debit || 0) + (firm.credit || 0);
                const grandCash = (summary.totalDebit + summary.totalCredit) || 1;
                const pct = Math.round((totalCash / grandCash) * 100);

                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">{firm.name}</span>
                      <span className="font-bold text-slate-500">{pct}% volume</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${totalCash > 0 ? (firm.debit / totalCash) * 100 : 0}%` }} 
                        title={`Debit: ${formatCurrency(firm.debit)}`}
                      />
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${totalCash > 0 ? (firm.credit / totalCash) * 100 : 0}%` }} 
                        title={`Credit: ${formatCurrency(firm.credit)}`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-rose-600">Debit: {formatCurrency(firm.debit)}</span>
                      <span className="text-emerald-600">Credit: {formatCurrency(firm.credit)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">
                No firm-wise breakdown data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS REPORT TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Transactions Report</h2>
            <p className="text-xs text-slate-500">Latest recorded cash vouchers and status</p>
          </div>
          <button
            onClick={() => navigate('/pete-record')}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1"
          >
            <span>View Full Pete Record Sheet</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3 bg-slate-100">Date</th>
                <th className="py-3 px-3 bg-slate-100">Firm Name</th>
                <th className="py-3 px-3 bg-slate-100">Group Head</th>
                <th className="py-3 px-3 bg-slate-100">Person / Reason</th>
                <th className="py-3 px-3 text-right bg-slate-100">Debit (Out)</th>
                <th className="py-3 px-3 text-right bg-slate-100">Credit (In)</th>
                <th className="py-3 px-3 text-right bg-slate-100">Balance</th>
                <th className="py-3 px-3 text-center bg-slate-100">HOD Status</th>
                <th className="py-3 px-3 text-center bg-slate-100">Tally Status</th>
                <th className="py-3 px-3 text-center bg-slate-100">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => {
                  const isHodApproved = entry.status === 'Approved' || Boolean(entry.actual1);
                  const isTallyVerified = Boolean(entry.actual2) || entry.remark2 === 'Verified';

                  return (
                    <tr 
                      key={entry.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {entry.firmName || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold whitespace-nowrap">
                        {entry.groupHead}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        <span className="text-slate-900 font-bold">{entry.personName}</span> {entry.personName && '—'} {entry.reason}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-500 whitespace-nowrap">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-500 whitespace-nowrap">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isHodApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isHodApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isTallyVerified ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isTallyVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No recent transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg md:max-w-2xl rounded-2xl p-6 md:p-8 shadow-2xl space-y-4 relative my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Details</span>
                <h3 className="text-base font-bold text-slate-900">{selectedEntry.id}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><span className="text-slate-500 font-medium">Firm Name:</span> <p className="font-bold text-slate-900 mt-0.5">{selectedEntry.firmName || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Date:</span> <p className="font-bold text-slate-900 mt-0.5">{selectedEntry.date || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Debit (Out):</span> <p className="font-extrabold text-rose-500 mt-0.5">{selectedEntry.debitAmount > 0 ? formatCurrency(selectedEntry.debitAmount) : '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Credit (In):</span> <p className="font-extrabold text-emerald-600 mt-0.5">{selectedEntry.creditAmount > 0 ? formatCurrency(selectedEntry.creditAmount) : '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Group Head:</span> <p className="font-semibold text-slate-900 mt-0.5">{selectedEntry.groupHead || '-'}</p></div>
              <div><span className="text-slate-500 font-medium">Running Balance:</span> <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(selectedEntry.runningBalance)}</p></div>
              <div className="col-span-2"><span className="text-slate-500 font-medium">Person Name:</span> <p className="font-bold text-slate-900 mt-0.5">{selectedEntry.personName || '-'}</p></div>
              <div className="col-span-2"><span className="text-slate-500 font-medium">Reason / Description:</span> <p className="font-semibold text-slate-800 mt-0.5">{selectedEntry.reason || '-'}</p></div>
            </div>

            {selectedEntry.photoUrl && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-600 block">Attached Receipt / Documents</span>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.photoUrl.split(',').map((url, idx) => {
                    const trimmedUrl = url.trim();
                    if (!trimmedUrl) return null;
                    const isPdf = trimmedUrl.toLowerCase().includes('.pdf') || trimmedUrl.includes('application/pdf');
                    const isDriveLink = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');

                    if (isPdf) {
                      return (
                        <a
                          key={idx}
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Open PDF ({idx + 1})</span>
                        </a>
                      );
                    }

                    if (isDriveLink) {
                      return (
                        <a
                          key={idx}
                          href={trimmedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Receipt ({idx + 1})</span>
                        </a>
                      );
                    }

                    return (
                      <a
                        key={idx}
                        href={trimmedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 hover:border-emerald-500 transition-all shadow-sm"
                      >
                        <img src={trimmedUrl} alt={`Attachment ${idx + 1}`} className="w-20 h-20 object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
