import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Trash2, 
  Edit2, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Mail,
  User as UserIcon,
  Shield,
  Lock,
  Building,
  Eye,
  EyeOff,
  Check,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  FileCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/', icon: LayoutDashboard, desc: 'Overview & analytics' },
  { id: 'create-entry', name: 'Create Entry', path: '/create-entry', icon: PlusCircle, desc: 'Create debit/credit cash entries' },
  { id: 'pete-record', name: 'Pete Record', path: '/pete-record', icon: Receipt, desc: 'View transactions & balance sheet' },
  { id: 'hod-approval', name: 'HOD Approval', path: '/hod-approval', icon: ShieldCheck, desc: 'Review & approve pending entries' },
  { id: 'tally-entry', name: 'Tally Entry', path: '/tally-entry', icon: FileCheck, desc: 'Verify entries into Tally' },
  { id: 'user-management', name: 'User Management', path: '/user-management', icon: Users, desc: 'Manage accounts & permissions' },
];

const ROLE_PRESETS = [
  {
    name: 'Admin',
    label: 'Admin (All Access)',
    pages: ['Dashboard', 'Create Entry', 'Pete Record', 'HOD Approval', 'Tally Entry', 'User Management'],
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    name: 'HOD',
    label: 'HOD (Approval Access)',
    pages: ['Dashboard', 'Create Entry', 'Pete Record', 'HOD Approval'],
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    name: 'User',
    label: 'User (Standard Access)',
    pages: ['Dashboard', 'Create Entry', 'Pete Record'],
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    name: 'Tally Operator',
    label: 'Tally Operator',
    pages: ['Dashboard', 'Pete Record', 'Tally Entry'],
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200'
  }
];

function parseRoleToPages(roleStr) {
  if (!roleStr) return ['Dashboard', 'Create Entry', 'Pete Record'];
  const lower = String(roleStr).trim().toLowerCase();
  if (lower === 'admin' || lower.includes('admin')) {
    return ['Dashboard', 'Create Entry', 'Pete Record', 'HOD Approval', 'Tally Entry', 'User Management'];
  }
  if (lower === 'hod') {
    return ['Dashboard', 'Create Entry', 'Pete Record', 'HOD Approval'];
  }
  if (lower === 'user') {
    return ['Dashboard', 'Create Entry', 'Pete Record'];
  }
  
  const pages = [];
  if (lower.includes('dashboard')) pages.push('Dashboard');
  if (lower.includes('create') || lower.includes('entry')) pages.push('Create Entry');
  if (lower.includes('record') || lower.includes('pete')) pages.push('Pete Record');
  if (lower.includes('hod') || lower.includes('approval')) pages.push('HOD Approval');
  if (lower.includes('tally')) pages.push('Tally Entry');
  if (lower.includes('user management') || lower.includes('users') || lower.includes('manage')) pages.push('User Management');
  
  return pages.length > 0 ? pages : ['Dashboard', 'Create Entry', 'Pete Record'];
}

function serializePagesToRole(selectedPages) {
  if (selectedPages.length === AVAILABLE_PAGES.length) {
    return 'Admin';
  }
  if (
    selectedPages.length === 4 &&
    selectedPages.includes('Dashboard') &&
    selectedPages.includes('Create Entry') &&
    selectedPages.includes('Pete Record') &&
    selectedPages.includes('HOD Approval')
  ) {
    return 'HOD';
  }
  if (
    selectedPages.length === 3 &&
    selectedPages.includes('Dashboard') &&
    selectedPages.includes('Create Entry') &&
    selectedPages.includes('Pete Record')
  ) {
    return 'User';
  }
  return selectedPages.join(', ');
}

function parseUserFirms(firmStr) {
  if (!firmStr || firmStr === 'All') {
    return { isAll: true, firms: [], custom: '' };
  }
  const parts = firmStr.split(',').map(f => f.trim()).filter(Boolean);
  if (parts.includes('All')) {
    return { isAll: true, firms: [], custom: '' };
  }
  return { isAll: false, firms: parts, custom: '' };
}

function serializeFirms(isAll, firms, customFirm) {
  if (isAll) return 'All';
  let resultFirms = [...firms];
  if (customFirm && customFirm.trim()) {
    const customSplits = customFirm.split(',').map(f => f.trim()).filter(Boolean);
    customSplits.forEach(c => {
      if (!resultFirms.includes(c)) resultFirms.push(c);
    });
  }
  if (resultFirms.length === 0) return 'All';
  return resultFirms.join(', ');
}

export default function UserManagementPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});

  // Options from Master
  const [firmNamesOptions, setFirmNamesOptions] = useState([]);

  // Modal States - Add User
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAllFirms, setNewIsAllFirms] = useState(false);
  const [newSelectedFirms, setNewSelectedFirms] = useState([]);
  const [newCustomFirm, setNewCustomFirm] = useState('');
  const [newSelectedPages, setNewSelectedPages] = useState(['Dashboard', 'Create Entry', 'Pete Record']);

  // Modal States - Edit User
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAllFirms, setEditIsAllFirms] = useState(false);
  const [editSelectedFirms, setEditSelectedFirms] = useState([]);
  const [editCustomFirm, setEditCustomFirm] = useState('');
  const [editSelectedPages, setEditSelectedPages] = useState([]);

  const [modalLoading, setModalLoading] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState(null);

  // Load firm names from Master data
  useEffect(() => {
    async function loadFirmNames() {
      try {
        const res = await api.getMasterData();
        if (res.success && res.data) {
          const fNames = [...new Set(res.data.map(d => d.firmName))].filter(Boolean);
          setFirmNamesOptions(fNames);
          if (fNames.length > 0) {
            setNewSelectedFirms([fNames[0]]);
          }
        }
      } catch (err) {
        console.error('Failed to load firm names:', err);
      }
    }
    loadFirmNames();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const finalFirm = serializeFirms(newIsAllFirms, newSelectedFirms, newCustomFirm);
    const finalRole = serializePagesToRole(newSelectedPages);

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      alert('Please fill in Name, Username and Password');
      return;
    }

    if (newSelectedPages.length === 0) {
      alert('Please assign at least one page permission to the user');
      return;
    }

    setModalLoading(true);
    try {
      const res = await api.addUser({
        name: newName.trim(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        firmName: finalFirm,
        role: finalRole,
        status: 'Active'
      });

      if (res.success) {
        setToastMsg(`User "${newUsername}" created successfully!`);
        setShowAddModal(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewIsAllFirms(false);
        setNewSelectedFirms(firmNamesOptions.length > 0 ? [firmNamesOptions[0]] : []);
        setNewCustomFirm('');
        setNewSelectedPages(['Dashboard', 'Create Entry', 'Pete Record']);
        fetchUsers();
      } else {
        alert(res.error || 'Failed to add user');
      }
    } catch (err) {
      alert('Error adding user: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEditModal = (u) => {
    setEditUser(u);
    setEditName(u.name || '');
    setEditUsername(u.username || u.email || '');
    setEditPassword(u.password || '');
    
    // Parse firms
    const parsedFirms = parseUserFirms(u.firmName);
    setEditIsAllFirms(parsedFirms.isAll);
    if (!parsedFirms.isAll) {
      const standardFirms = parsedFirms.firms.filter(f => firmNamesOptions.includes(f));
      const customFirms = parsedFirms.firms.filter(f => !firmNamesOptions.includes(f));
      setEditSelectedFirms(standardFirms.length > 0 ? standardFirms : (firmNamesOptions.length > 0 ? [firmNamesOptions[0]] : []));
      setEditCustomFirm(customFirms.join(', '));
    } else {
      setEditSelectedFirms(firmNamesOptions.length > 0 ? [firmNamesOptions[0]] : []);
      setEditCustomFirm('');
    }

    // Parse role/pages
    const parsedPages = parseRoleToPages(u.role);
    setEditSelectedPages(parsedPages);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    const finalFirm = serializeFirms(editIsAllFirms, editSelectedFirms, editCustomFirm);
    const finalRole = serializePagesToRole(editSelectedPages);

    if (!editName.trim() || !editUsername.trim() || !editPassword.trim()) {
      alert('Please fill in Name and Password');
      return;
    }

    if (editSelectedPages.length === 0) {
      alert('Please assign at least one page permission to the user');
      return;
    }

    setModalLoading(true);
    try {
      const res = await api.updateUser({
        username: editUser.username || editUser.email,
        name: editName.trim(),
        password: editPassword.trim(),
        firmName: finalFirm,
        role: finalRole
      });

      if (res.success) {
        setToastMsg(`User "${editUsername}" updated successfully!`);
        setEditUser(null);
        fetchUsers();
      } else {
        alert(res.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Error updating user: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleFirm = (firm, selectedFirms, setSelectedFirms) => {
    if (selectedFirms.includes(firm)) {
      if (selectedFirms.length === 1) {
        // Keep at least one or uncheck
        setSelectedFirms([]);
      } else {
        setSelectedFirms(selectedFirms.filter(f => f !== firm));
      }
    } else {
      setSelectedFirms([...selectedFirms, firm]);
    }
  };

  const handleTogglePage = (pageName, selectedPages, setSelectedPages) => {
    if (selectedPages.includes(pageName)) {
      setSelectedPages(selectedPages.filter(p => p !== pageName));
    } else {
      setSelectedPages([...selectedPages, pageName]);
    }
  };

  const applyRolePreset = (preset, setSelectedPages) => {
    setSelectedPages([...preset.pages]);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteEmail) return;
    setModalLoading(true);
    try {
      const res = await api.deleteUser({ email: deleteEmail });
      if (res.success) {
        setToastMsg('User removed successfully');
        setDeleteEmail(null);
        fetchUsers();
      } else {
        alert(res.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(s)) ||
      (u.username && u.username.toLowerCase().includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.firmName && u.firmName.toLowerCase().includes(s)) ||
      (u.role && u.role.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Access Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control registered accounts, assign multi-firm access, and customize page permissions (including Tally Entry)</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-200 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
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

      {/* SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, username, firm, or permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] min-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3.5 px-4 bg-slate-100">Name</th>
                <th className="py-3.5 px-4 bg-slate-100">User name</th>
                <th className="py-3.5 px-4 bg-slate-100">Password</th>
                <th className="py-3.5 px-4 bg-slate-100">Firm name(s)</th>
                <th className="py-3.5 px-4 bg-slate-100">Assigned Page Permissions</th>
                <th className="py-3.5 px-4 text-center bg-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span>Fetching users list...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u, idx) => {
                  const firmParts = (u.firmName || '').split(',').map(f => f.trim()).filter(Boolean);
                  const isAll = !u.firmName || u.firmName === 'All' || firmParts.includes('All');
                  const rolePages = parseRoleToPages(u.role);
                  const isFullAdmin = u.role === 'Admin' || rolePages.length === AVAILABLE_PAGES.length;

                  return (
                    <tr key={u.username || u.email || idx} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                        {u.name || '-'}
                      </td>

                      {/* 2. User name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs whitespace-nowrap">
                        {u.username || u.email || '-'}
                      </td>

                      {/* 3. Password */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <span>{showPasswords[u.username || u.email || idx] ? (u.password || '-') : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [u.username || u.email || idx]: !prev[u.username || u.email || idx] }))}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                            title={showPasswords[u.username || u.email || idx] ? "Hide Password" : "Show Password"}
                          >
                            {showPasswords[u.username || u.email || idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* 4. Firm name */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {isAll ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              All Firms
                            </span>
                          ) : (
                            firmParts.map((f, fi) => (
                              <span key={fi} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {f}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* 5. Assigned Page Permissions */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {isFullAdmin ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Admin (All Pages Access)</span>
                            </span>
                          ) : u.role === 'HOD' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              <ShieldCheck className="w-3 h-3" />
                              <span>HOD (4 Pages Access)</span>
                            </span>
                          ) : (
                            rolePages.map((page, pi) => {
                              const isTally = page === 'Tally Entry';
                              const isApproval = page === 'HOD Approval';
                              return (
                                <span 
                                  key={pi} 
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    isTally 
                                      ? 'bg-teal-50 text-teal-700 border-teal-200 font-bold' 
                                      : isApproval 
                                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {page}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit User Permissions & Firms"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {(u.username || u.email) !== (user?.username || user?.email) ? (
                            <button
                              onClick={() => setDeleteEmail(u.username || u.email)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Self</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No users match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fade-in">
          <form onSubmit={handleAddUserSubmit} className="bg-white border border-slate-200 w-full max-w-xl md:max-w-2xl rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New User</h3>
                <p className="text-[11px] text-slate-500">Configure credentials, multiple firm access, and page permissions</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 text-sm p-1">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* BASIC DETAILS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Full Name *</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">User name *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ramesh / ramesh@pete.com"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* FIRM NAME SELECTION (MULTI-SELECT) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-xs">Firm Selection (Multiple allowed) *</span>
                  </div>
                  
                  {/* Toggle All Firms */}
                  <label className="flex items-center space-x-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 shadow-xs">
                    <input
                      type="checkbox"
                      checked={newIsAllFirms}
                      onChange={(e) => setNewIsAllFirms(e.target.checked)}
                      className="accent-emerald-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-emerald-700">All Firms (Full Access)</span>
                  </label>
                </div>

                {!newIsAllFirms ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Select specific firm(s) this user can access:</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setNewSelectedFirms([...firmNamesOptions])}
                          className="text-emerald-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setNewSelectedFirms([])}
                          className="text-rose-500 hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {firmNamesOptions.map((f, i) => {
                        const isSelected = newSelectedFirms.includes(f);
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => handleToggleFirm(f, newSelectedFirms, setNewSelectedFirms)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{f}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom / Other Firm Name Input */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Add other custom firm name (Optional, e.g. Branch XYZ)"
                        value={newCustomFirm}
                        onChange={(e) => setNewCustomFirm(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    ✓ User will have access to transactions across all registered and future firms.
                  </p>
                )}
              </div>

              {/* ASSIGN ROLE & PAGE ACCESS (MULTI-SELECT WITH TALLY ENTRY) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-xs">Assign Role & Page Access *</span>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Presets:</span>
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => applyRolePreset(preset, setNewSelectedPages)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Access Checkboxes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PAGES.map((pg) => {
                    const isChecked = newSelectedPages.includes(pg.name);
                    const Icon = pg.icon;
                    const isTally = pg.id === 'tally-entry';

                    return (
                      <div
                        key={pg.id}
                        onClick={() => handleTogglePage(pg.name, newSelectedPages, setNewSelectedPages)}
                        className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? isTally 
                              ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-300/40' 
                              : 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/40'
                            : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className={`w-4 h-4 ${isTally ? 'text-teal-600' : 'text-emerald-600'}`} />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? (isTally ? 'text-teal-600' : 'text-emerald-600') : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                              {pg.name}
                            </span>
                            {isTally && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                                Tally
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{pg.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Selected Access: <strong>{newSelectedPages.length} of {AVAILABLE_PAGES.length} Pages</strong></span>
                  <span className="font-semibold text-emerald-700">Role: {serializePagesToRole(newSelectedPages)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-200 transition-colors"
              >
                {modalLoading ? 'Adding User...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* EDIT USER MODAL */}
      {editUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fade-in">
          <form onSubmit={handleEditUserSubmit} className="bg-white border border-slate-200 w-full max-w-xl md:max-w-2xl rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
                <p className="text-[11px] text-slate-500">Update multiple firm access and page permissions</p>
              </div>
              <button type="button" onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-900 text-sm p-1">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* BASIC DETAILS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Full Name *</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">User name *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      readOnly
                      placeholder="Enter username"
                      value={editUsername}
                      className="w-full bg-slate-100 border border-slate-200 cursor-not-allowed rounded-xl pl-9 pr-3 py-2 text-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* FIRM NAME SELECTION (MULTI-SELECT) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-xs">Firm Selection (Multiple allowed) *</span>
                  </div>
                  
                  {/* Toggle All Firms */}
                  <label className="flex items-center space-x-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 shadow-xs">
                    <input
                      type="checkbox"
                      checked={editIsAllFirms}
                      onChange={(e) => setEditIsAllFirms(e.target.checked)}
                      className="accent-emerald-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-emerald-700">All Firms (Full Access)</span>
                  </label>
                </div>

                {!editIsAllFirms ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Select specific firm(s) this user can access:</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditSelectedFirms([...firmNamesOptions])}
                          className="text-emerald-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setEditSelectedFirms([])}
                          className="text-rose-500 hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {firmNamesOptions.map((f, i) => {
                        const isSelected = editSelectedFirms.includes(f);
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => handleToggleFirm(f, editSelectedFirms, setEditSelectedFirms)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-200'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{f}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom / Other Firm Name Input */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Add other custom firm name (Optional, e.g. Branch XYZ)"
                        value={editCustomFirm}
                        onChange={(e) => setEditCustomFirm(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    ✓ User will have access to transactions across all registered and future firms.
                  </p>
                )}
              </div>

              {/* ASSIGN ROLE & PAGE ACCESS (MULTI-SELECT WITH TALLY ENTRY) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-xs">Assign Role & Page Access *</span>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Presets:</span>
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => applyRolePreset(preset, setEditSelectedPages)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Access Checkboxes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PAGES.map((pg) => {
                    const isChecked = editSelectedPages.includes(pg.name);
                    const Icon = pg.icon;
                    const isTally = pg.id === 'tally-entry';

                    return (
                      <div
                        key={pg.id}
                        onClick={() => handleTogglePage(pg.name, editSelectedPages, setEditSelectedPages)}
                        className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? isTally 
                              ? 'bg-teal-50/80 border-teal-300 ring-1 ring-teal-300/40' 
                              : 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/40'
                            : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className={`w-4 h-4 ${isTally ? 'text-teal-600' : 'text-emerald-600'}`} />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isChecked ? (isTally ? 'text-teal-600' : 'text-emerald-600') : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                              {pg.name}
                            </span>
                            {isTally && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                                Tally
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{pg.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Selected Access: <strong>{editSelectedPages.length} of {AVAILABLE_PAGES.length} Pages</strong></span>
                  <span className="font-semibold text-emerald-700">Role: {serializePagesToRole(editSelectedPages)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-200 transition-colors"
              >
                {modalLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteEmail && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center space-y-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
            <p className="text-xs text-slate-500">Are you sure you want to remove user <strong>{deleteEmail}</strong>?</p>
            <div className="flex justify-center space-x-3 pt-2">
              <button onClick={() => setDeleteEmail(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteUserConfirm} disabled={modalLoading} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm">
                {modalLoading ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
