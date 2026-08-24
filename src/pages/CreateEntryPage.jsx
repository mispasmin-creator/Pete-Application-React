import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Calendar, 
  Building, 
  Tag, 
  DollarSign, 
  FileText, 
  User, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Wallet,
  Search,
  ArrowRight,
  RotateCcw,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Hardcoded options removed. Data is now fetched dynamically from the Master sheet.

export default function CreateEntryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];

  const [entryType, setEntryType] = useState('DEBIT');
  const [date, setDate] = useState(todayStr);
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [groupHead, setGroupHead] = useState('Fuel');
  const [customGroupHead, setCustomGroupHead] = useState('');
  const [groupHeadSearch, setGroupHeadSearch] = useState('');
  const [isGroupHeadDropdownOpen, setIsGroupHeadDropdownOpen] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [customFirmName, setCustomFirmName] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [personName, setPersonName] = useState('');
  const [photos, setPhotos] = useState([]); // Base64 data strings or object { file, previewUrl, base64 }

  // GPS Location State
  const [loadingGps, setLoadingGps] = useState(false);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('GPS Geolocation is not supported by your browser.');
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        const locStr = `GPS: ${lat}, ${lng}`;
        setRemarks(prev => (prev ? `${prev} | ${locStr}` : locStr));
        setLoadingGps(false);
      },
      (error) => {
        alert('Failed to detect GPS location: ' + error.message);
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  
  // Master data state
  const [masterData, setMasterData] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [userName, setUserName] = useState(user?.name || user?.username || '');
  const [userList, setUserList] = useState([]);

  // Fetch current latest balance and master data on load
  useEffect(() => {
    async function fetchData() {
      setLoadingBalance(true);
      setLoadingMaster(true);
      try {
        const [bal, masterRes, usersRes] = await Promise.all([
          api.getLatestBalance(),
          api.getMasterData(),
          api.getUsers()
        ]);
        setCurrentBalance(bal);
        if (usersRes && usersRes.success && usersRes.users) {
          const names = [...new Set(usersRes.users.map(u => u.name || u.username).filter(Boolean))];
          setUserList(names);
          if (!userName && names.length > 0) {
            setUserName(user?.name || user?.username || names[0]);
          }
        }
        if (masterRes.success && masterRes.data) {
          setMasterData(masterRes.data);
          
          const depts = [...new Set(masterRes.data.map(d => d.department))].filter(Boolean);
          const gHeads = [...new Set(masterRes.data.map(d => d.groupHead))].filter(Boolean);
          const fNames = [...new Set(masterRes.data.map(d => d.firmName))].filter(Boolean);

          if (depts.length > 0) setDepartment(depts[0]);
          if (gHeads.length > 0) setGroupHead(gHeads[0]);
          if (fNames.length > 0) setFirmName(fNames[0]);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoadingBalance(false);
        setLoadingMaster(false);
      }
    }
    fetchData();
  }, []);

  // Compute unique dropdown options from Master Data
  const safeMasterData = Array.isArray(masterData) ? masterData : [];
  const departments = [...new Set(safeMasterData.map(d => d.department))].filter(Boolean);
  const groupHeads = [...new Set(safeMasterData.map(d => d.groupHead))].filter(Boolean);
  const firmNames = [...new Set(safeMasterData.map(d => d.firmName))].filter(Boolean);
  
  // Always add 'Other' at the end of departments and group heads
  if (!departments.includes('Other')) departments.push('Other');
  if (!groupHeads.includes('Other')) groupHeads.push('Other');
  if (!firmNames.includes('Other')) firmNames.push('Other');

  // Compute Live Running Balance Preview
  const numAmount = parseFloat(amount) || 0;
  const numDebit = entryType === 'DEBIT' ? numAmount : 0;
  const numCredit = entryType === 'CREDIT' ? numAmount : 0;
  const liveBalancePreview = currentBalance + numCredit - numDebit;

  // Handle Photo Files Upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (photos.length + files.length > 3) {
      setErrorMsg('Maximum 3 photos allowed per entry.');
      return;
    }

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File ${file.name} exceeds maximum allowed size of 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, { name: file.name, base64: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalDept = department === 'Other' ? customDepartment.trim() : department;
    const finalGroupHead = groupHead === 'Other' ? customGroupHead.trim() : groupHead;
    const finalFirmName = firmName === 'Other' ? customFirmName.trim() : firmName;

    if (!date || !finalDept || !finalGroupHead || !finalFirmName || !reason.trim() || !personName.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid Amount greater than 0.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: userName || user?.name || user?.username || '',
        createdBy: user?.email || '',
        date,
        department: finalDept,
        debitAmount: numDebit,
        creditAmount: numCredit,
        groupHead: finalGroupHead,
        firmName: finalFirmName,
        reason: reason.trim(),
        remarks: remarks.trim(),
        personName: personName.trim(),
        photos: photos.map((p) => p.base64)
      };

      const res = await api.createEntry(payload);

      if (res.success) {
        setSuccessToast({
          message: 'Pete Entry created successfully!',
          balance: res.balance !== undefined ? res.balance : liveBalancePreview
        });
        setCurrentBalance(res.balance !== undefined ? res.balance : liveBalancePreview);

        // Auto reset form or redirect after delay
        setTimeout(() => {
          navigate('/pete-record');
        }, 1800);
      } else {
        setErrorMsg(res.error || 'Failed to submit entry.');
      }
    } catch (err) {
      setErrorMsg('Error submitting entry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDate(todayStr);
    setDepartment('Factory');
    setCustomDepartment('');
    setDebitAmount('');
    setCreditAmount('');
    setGroupHead('Fuel');
    setCustomGroupHead('');
    setFirmName('');
    setCustomFirmName('');
    setReason('');
    setRemarks('');
    setPersonName('');
    setPhotos([]);
    setErrorMsg(null);
    setSuccessToast(null);
  };

  const filteredGroupHeads = groupHeads.filter((gh) =>
    gh.toLowerCase().includes(groupHeadSearch.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* PAGE TITLE & LIVE BALANCE CARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-2xl border border-slate-200 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Pete Entry</h1>
          <p className="text-xs text-slate-500 mt-0.5">Record incoming credit or outgoing cash debit</p>
        </div>

        {/* LIVE RUNNING BALANCE BANNER */}
        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center space-x-3 w-full sm:w-auto justify-between">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>Live Balance Preview:</span>
          </div>
          <span className={`text-base font-extrabold ${liveBalancePreview >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {loadingBalance ? '...' : `₹${liveBalancePreview.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>

      {/* SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">{successToast.message}</p>
              <p className="text-xs text-emerald-600">
                New Running Balance: <span className="font-extrabold text-slate-900">₹{successToast.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-semibold">Redirecting...</span>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* MAIN FORM CARD */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NAME (SUBMITTER DROPDOWN) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>Name (User / Submitter) *</span>
            </label>
            <select
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all"
            >
              {userList.length > 0 ? (
                userList.map((uName) => (
                  <option key={uName} value={uName}>
                    {uName}
                  </option>
                ))
              ) : (
                <option value={user?.name || user?.username || 'User'}>
                  {user?.name || user?.username || 'User'}
                </option>
              )}
            </select>
          </div>

          {/* 1. DATE PICKER */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Date *</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all"
            />
          </div>

          {/* 2. DEPARTMENT */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-500" />
              <span>Department *</span>
            </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={loadingMaster}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all disabled:opacity-50"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            {department === 'Other' && (
              <input
                type="text"
                placeholder="Specify custom department..."
                required
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                className="mt-2.5 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            )}
          </div>

          {/* 3. TRANSACTION TYPE */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Transaction Type *</span>
            </label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className={`w-full bg-slate-50 border focus:ring-1 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${
                entryType === 'DEBIT' 
                  ? 'border-rose-300 text-rose-600 focus:border-rose-500 focus:ring-rose-500' 
                  : 'border-emerald-300 text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500'
              }`}
            >
              <option value="DEBIT">Debit</option>
            </select>
              <option value="CREDIT">Credit</option>
          </div>

          {/* 4. AMOUNT (₹) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className={entryType === 'DEBIT' ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                {entryType === 'DEBIT' ? 'Debit Amount (Expense) *' : 'Credit Amount (Deposit) *'}
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                entryType === 'DEBIT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {entryType === 'DEBIT' ? 'CASH OUT' : 'CASH IN'}
              </span>
            </label>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-sm ${
                entryType === 'DEBIT' ? 'text-rose-500' : 'text-emerald-600'
              }`}>₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-slate-50 border focus:ring-1 rounded-xl pl-9 pr-4 py-3 text-sm font-bold placeholder-slate-400 outline-none transition-all ${
                  entryType === 'DEBIT'
                    ? 'border-rose-200 text-rose-600 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-emerald-200 text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* 5. SEARCHABLE GROUP HEAD DROPDOWN */}
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-500" />
              <span>Group Head *</span>
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGroupHeadDropdownOpen(!isGroupHeadDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 flex items-center justify-between text-left shadow-sm"
              >
                <span className="font-semibold text-emerald-600">{groupHead}</span>
                <span className="text-xs text-slate-500">▼</span>
              </button>

              {isGroupHeadDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-30 overflow-hidden max-h-64 flex flex-col">
                  <div className="p-2 border-b border-slate-200 flex items-center space-x-2">
                    <Search className="w-4 h-4 text-slate-400 ml-2" />
                    <input
                      type="text"
                      placeholder="Search group head..."
                      value={groupHeadSearch}
                      onChange={(e) => setGroupHeadSearch(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none py-1.5"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-100">
                    {filteredGroupHeads.length > 0 ? (
                      filteredGroupHeads.map((gh) => (
                        <button
                          key={gh}
                          type="button"
                          onClick={() => {
                            setGroupHead(gh);
                            setIsGroupHeadDropdownOpen(false);
                            setGroupHeadSearch('');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-slate-50 ${
                            groupHead === gh ? 'text-emerald-600 font-bold bg-slate-50' : 'text-slate-600'
                          }`}
                        >
                          {gh}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">No matching group head</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {groupHead === 'Other' && (
              <input
                type="text"
                placeholder="Specify custom group head category..."
                required
                value={customGroupHead}
                onChange={(e) => setCustomGroupHead(e.target.value)}
                className="mt-2.5 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            )}
          </div>

          {/* FIRM NAME DROPDOWN */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-500" />
              <span>Firm Name *</span>
            </label>
              <select
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                disabled={loadingMaster}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all disabled:opacity-50"
              >
                <option value="" disabled>Select Firm Name</option>
                {firmNames.map((firm) => (
                  <option key={firm} value={firm}>
                    {firm}
                  </option>
                ))}
              </select>
            {firmName === 'Other' && (
              <input
                type="text"
                placeholder="Specify custom firm name..."
                required
                value={customFirmName}
                onChange={(e) => setCustomFirmName(e.target.value)}
                className="mt-2.5 w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            )}
          </div>

          {/* 6. REASON */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Reason / Description *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diesel for generator, Labour lunch payment, Cash received..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
            />
          </div>

          {/* 7. PERSON NAME */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>Name Of Person / Amount Given To *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Suresh Kumar, Rajesh Driver..."
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
            />
          </div>

          {/* 8. REMARKS (OPTIONAL) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Remarks (Optional)</span>
            </label>
            <textarea
              rows="2"
              placeholder="Additional notes or invoice details..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
            />
          </div>

          {/* 8. PHOTO UPLOADER */}
          <div className="md:col-span-2 space-y-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                <span>Upload Receipt Photo(s) (Optional)</span>
              </span>
              <span className="text-[10px] text-slate-500">Max 3 images, up to 10MB each</span>
            </label>

            <div className="flex flex-wrap gap-3 items-center">
              {photos.map((photo, idx) => {
                const isPdf = photo.base64 && photo.base64.includes('application/pdf');
                return (
                  <div key={idx} className="relative group w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm flex flex-col items-center justify-center p-2">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center text-rose-500">
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-[9px] font-bold text-slate-700 truncate max-w-[80px]">{photo.name || 'PDF Document'}</span>
                      </div>
                    ) : (
                      <img src={photo.base64} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {photos.length < 3 && (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50/50">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-semibold">Add File/PDF</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS BUTTONS */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetForm}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Entry...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                <span>Submit Pete Entry</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
