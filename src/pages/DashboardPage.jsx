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
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PIE_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'];

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
    departmentBreakdown: []
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        timeframe,
        createdBy: isAdmin ? '' : user?.email
      };

      const [summaryRes, entriesRes] = await Promise.all([
        api.getSummary(params),
        api.getEntries({ ...params, page: 1, limit: 7 })
      ]);

      if (summaryRes.success && summaryRes.summary) {
        setSummary(summaryRes.summary);
      }

      if (entriesRes.success && entriesRes.entries) {
        setRecentEntries(entriesRes.entries);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, isAdmin, user?.email]);

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

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* TOP BAR & TIME TOGGLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-4 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Showing company-wide cash statistics' : `Showing activity for ${user?.email}`}
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* TIMEFRAME TOGGLE BUTTONS */}
          <div className="inline-flex bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
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
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL CREDIT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-md hover:shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Credit</span>
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-500 mt-3 tracking-tight">
            {loading ? '...' : formatCurrency(summary.totalCredit)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Incoming cash additions</p>
        </div>

        {/* TOTAL DEBIT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-md hover:shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Debit</span>
            <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-500 mt-3 tracking-tight">
            {loading ? '...' : formatCurrency(summary.totalDebit)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Total expenses / payouts</p>
        </div>

        {/* NET BALANCE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-teal-500/40 transition-all shadow-md hover:shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Net Balance</span>
            <div className="p-2 bg-teal-50 text-teal-500 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-extrabold mt-3 tracking-tight ${
            summary.netBalance >= 0 ? 'text-teal-500' : 'text-rose-500'
          }`}>
            {loading ? '...' : formatCurrency(summary.netBalance)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Calculated running balance</p>
        </div>

        {/* TOTAL ENTRIES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-md hover:shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Entries</span>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {loading ? '...' : summary.entryCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Recorded transactions count</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GROUP HEAD EXPENSE BAR CHART */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expenses by Group Head</h2>
              <p className="text-xs text-slate-500">Breakdown of outgoing costs by category</p>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Top Heads
            </span>
          </div>

          <div className="h-64 w-full mt-2">
            {summary.groupHeadBreakdown && summary.groupHeadBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.groupHeadBreakdown.slice(0, 6)}
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
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No expense data available for this timeframe
              </div>
            )}
          </div>
        </div>

        {/* DEPARTMENT EXPENSE PIE CHART */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expenses by Department</h2>
              <p className="text-xs text-slate-500">Factory vs MDO distribution</p>
            </div>
          </div>

          <div className="h-64 w-full mt-2">
            {summary.departmentBreakdown && summary.departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {summary.departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [formatCurrency(val), 'Expense']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No department breakdown available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500">Latest recorded cash movements</p>
          </div>
          <button
            onClick={() => navigate('/pete-record')}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1"
          >
            <span>View All Records</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Dept</th>
                <th className="py-3 px-3">Group Head</th>
                <th className="py-3 px-3">Person / Reason</th>
                <th className="py-3 px-3 text-right">Debit</th>
                <th className="py-3 px-3 text-right">Credit</th>
                <th className="py-3 px-3 text-right">Balance</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentEntries.length > 0 ? (
                recentEntries.map((entry) => {
                  const isCredit = entry.creditAmount > 0;
                  return (
                    <tr 
                      key={entry.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          entry.department === 'Factory' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}>
                          {entry.department}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {entry.groupHead}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        <span className="text-slate-900 font-semibold">{entry.personName}</span> — {entry.reason}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-rose-500 whitespace-nowrap">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-500 whitespace-nowrap">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No recent transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Detail</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedEntry.id}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date</span>
                <p className="font-semibold text-slate-900">{selectedEntry.date}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Department</span>
                <p className="font-semibold text-slate-900">{selectedEntry.department}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Group Head</span>
                <p className="font-semibold text-slate-900">{selectedEntry.groupHead}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Person Name</span>
                <p className="font-semibold text-slate-900">{selectedEntry.personName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500">Debit (Outgoing)</span>
                <p className="font-bold text-rose-500 text-sm">
                  {selectedEntry.debitAmount > 0 ? formatCurrency(selectedEntry.debitAmount) : '₹0.00'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500">Credit (Incoming)</span>
                <p className="font-bold text-emerald-500 text-sm">
                  {selectedEntry.creditAmount > 0 ? formatCurrency(selectedEntry.creditAmount) : '₹0.00'}
                </p>
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-200 pt-3 text-xs">
              <span className="text-slate-500">Reason / Description</span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedEntry.reason}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Created By: {selectedEntry.createdBy}</span>
              <span className="font-semibold text-emerald-600">
                Running Balance: {formatCurrency(selectedEntry.runningBalance)}
              </span>
            </div>

            {selectedEntry.photoUrl && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <span className="text-xs font-semibold text-slate-600">Attached Receipt / Documents</span>
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
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
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
