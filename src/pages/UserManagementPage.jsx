import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
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
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function UserManagementPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirmName, setNewFirmName] = useState('');
  const [customFirmName, setCustomFirmName] = useState('');
  const [newRole, setNewRole] = useState('User');
  // Edit Modal States
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editFirmName, setEditFirmName] = useState('');
  const [editCustomFirm, setEditCustomFirm] = useState('');
  const [editRole, setEditRole] = useState('User');

  const [deleteEmail, setDeleteEmail] = useState(null);

  // Load firm names from Master data
  useEffect(() => {
    async function loadFirmNames() {
      try {
        const res = await api.getMasterData();
        if (res.success && res.data) {
          const fNames = [...new Set(res.data.map(d => d.firmName))].filter(Boolean);
          setFirmNamesOptions(fNames);
          if (fNames.length > 0) setNewFirmName(fNames[0]);
        }
      } catch (err) {
        console.error('Failed to load firm names:', err);
      }
    }
    loadFirmNames();
  }, []);

  // Non-Admin Protection Redirect
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

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
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const finalFirm = newFirmName === 'Other' ? customFirmName.trim() : newFirmName;

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim() || !finalFirm.trim() || !newRole) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    setModalLoading(true);
    try {
      const res = await api.addUser({
        name: newName.trim(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        firmName: finalFirm,
        role: newRole,
        status: 'Active'
      });

      if (res.success) {
        setToastMsg(`User "${newUsername}" created successfully!`);
        setShowAddModal(false);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewFirmName(firmNamesOptions[0] || '');
        setCustomFirmName('');
        setNewRole('User');
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
    
    if (firmNamesOptions.includes(u.firmName)) {
      setEditFirmName(u.firmName || '');
      setEditCustomFirm('');
    } else if (u.firmName) {
      setEditFirmName('Other');
      setEditCustomFirm(u.firmName);
    } else {
      setEditFirmName(firmNamesOptions[0] || '');
      setEditCustomFirm('');
    }
    setEditRole(u.role || 'User');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    const finalFirm = editFirmName === 'Other' ? editCustomFirm.trim() : editFirmName;

    if (!editName.trim() || !editUsername.trim() || !editPassword.trim() || !finalFirm.trim()) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    setModalLoading(true);
    try {
      const res = await api.updateUser({
        username: editUser.username || editUser.email,
        name: editName.trim(),
        password: editPassword.trim(),
        firmName: finalFirm,
        role: editRole
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

  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await api.updateUser({
        email: targetUser.email,
        status: newStatus
      });
      if (res.success) {
        setToastMsg(`User status updated to ${newStatus}`);
        fetchUsers();
      } else {
        alert(res.error || 'Failed to update user status');
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'Admin' ? 'User' : 'Admin';
    try {
      const res = await api.updateUser({
        email: targetUser.email,
        role: newRole
      });
      if (res.success) {
        setToastMsg(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        alert(res.error || 'Failed to update user role');
      }
    } catch (err) {
      alert('Error updating role: ' + err.message);
    }
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
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.role && u.role.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Access Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control registered accounts, assign roles, and toggle access</p>
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
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">User name</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4">Firm name</th>
                <th className="py-3.5 px-4">Assign Role</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
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
                filteredUsers.map((u, idx) => (
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
                    <td className="py-3.5 px-4 font-medium text-slate-700 text-xs whitespace-nowrap">
                      {u.firmName || '-'}
                    </td>

                    {/* 5. Assign Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                          u.role === 'Admin'
                            ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                            : (u.role === 'HOD' ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200')
                        }`}
                        title="Click to toggle Role"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{u.role}</span>
                      </button>
                    </td>

                    {/* 6. Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit User Details"
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
                ))
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleAddUserSubmit} className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New User</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. Name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* 2. User name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">User name *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* 3. Password * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* 4. Firm name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Firm name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={newFirmName}
                    onChange={(e) => setNewFirmName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  >
                    {firmNamesOptions.map((f, i) => (
                      <option key={i} value={f}>{f}</option>
                    ))}
                    <option value="Other">Other (Custom Firm Name)</option>
                  </select>
                </div>
                {newFirmName === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom firm name..."
                    value={customFirmName}
                    onChange={(e) => setCustomFirmName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none mt-2"
                  />
                )}
              </div>

              {/* 5. Assign Role * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Assign Role *</label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  >
                    <option value="User">User (Standard Access)</option>
                    <option value="HOD">HOD (Approval Access)</option>
                    <option value="Admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-200 transition-colors"
              >
                {modalLoading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleEditUserSubmit} className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
              <button type="button" onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. Name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* 2. User name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">User name *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder="Enter username"
                    value={editUsername}
                    className="w-full bg-slate-100 border border-slate-200 cursor-not-allowed rounded-xl pl-9 pr-3 py-2.5 text-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* 3. Password * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              {/* 4. Firm name * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Firm name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={editFirmName}
                    onChange={(e) => setEditFirmName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  >
                    {firmNamesOptions.map((f, i) => (
                      <option key={i} value={f}>{f}</option>
                    ))}
                    <option value="Other">Other (Custom Firm Name)</option>
                  </select>
                </div>
                {editFirmName === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom firm name..."
                    value={editCustomFirm}
                    onChange={(e) => setEditCustomFirm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none mt-2"
                  />
                )}
              </div>

              {/* 5. Assign Role * */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Assign Role *</label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 outline-none"
                  >
                    <option value="User">User (Standard Access)</option>
                    <option value="HOD">HOD (Approval Access)</option>
                    <option value="Admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
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
                {modalLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 text-center space-y-4 shadow-2xl">
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
        </div>
      )}
    </div>
  );
}
