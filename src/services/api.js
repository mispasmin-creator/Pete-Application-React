/**
 * API Service for Pete Cash Management System
 * 
 * Adapts to the generic Apps Script backend (fetch raw sheets, send rowData arrays)
 * Also includes local storage mock fallback.
 */

const APPSCRIPT_URL = (import.meta.env.VITE_APPSCRIPT_URL || "https://script.google.com/macros/s/AKfycbzfsDq0UaJ81eXDVzQ9Qn9rHiyqTovbGqsZOJQRdWbSscRH0_XiTu3A-H3L7QY3lliJBQ/exec").trim();

const MOCK_STORAGE_KEY_ENTRIES = "pete_cash_entries";
const MOCK_STORAGE_KEY_USERS = "pete_cash_users";
const MOCK_STORAGE_KEY_MASTER = "pete_cash_master";

function initMockData() {
  if (!localStorage.getItem(MOCK_STORAGE_KEY_USERS)) {
    localStorage.setItem(MOCK_STORAGE_KEY_USERS, JSON.stringify([
      { email: "admin@pete.com", name: "System Admin", role: "Admin", status: "Active", createdAt: new Date().toISOString() }
    ]));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEY_ENTRIES)) {
    localStorage.setItem(MOCK_STORAGE_KEY_ENTRIES, JSON.stringify([]));
  }

  // Clear legacy mock master data if present
  try {
    const cachedMaster = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY_MASTER) || "[]");
    if (Array.isArray(cachedMaster) && cachedMaster.some(item => item.groupHead === "Fuel" || item.groupHead === "Repair Crane")) {
      localStorage.removeItem(MOCK_STORAGE_KEY_MASTER);
    }
  } catch (e) {
    localStorage.removeItem(MOCK_STORAGE_KEY_MASTER);
  }

  if (!localStorage.getItem(MOCK_STORAGE_KEY_MASTER)) {
    localStorage.setItem(MOCK_STORAGE_KEY_MASTER, JSON.stringify([]));
  }
}
initMockData();

/* ==========================================================================
   HELPERS
   ========================================================================== */
function getLocal(key) { return JSON.parse(localStorage.getItem(key) || "[]"); }
function setLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

async function fetchSheetData(sheetName) {
  if (!APPSCRIPT_URL) {
    console.warn("APPSCRIPT_URL is not set in .env!");
    return null;
  }
  try {
    const cleanUrl = APPSCRIPT_URL.trim();
    const url = new URL(cleanUrl);
    url.searchParams.append("sheet", sheetName);
    const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error(`Apps Script returned non-JSON response for sheet '${sheetName}'. Please ensure Apps Script deployment access is set to 'Anyone'. Snippet:`, text.substring(0, 200));
      return null;
    }
    if (!json.success) {
      console.warn(`Apps Script error for sheet '${sheetName}':`, json.error);
      return null;
    }
    return json.data;
  } catch (err) {
    console.warn(`Failed to fetch sheet '${sheetName}':`, err);
    return null;
  }
}

async function postGeneric(action, sheetName, payload = {}) {
  if (!APPSCRIPT_URL) return { success: true };
  try {
    const cleanUrl = APPSCRIPT_URL.trim();
    const url = new URL(cleanUrl);
    url.searchParams.append("action", action);
    url.searchParams.append("sheetName", sheetName);
    
    if (payload.rowIndex) url.searchParams.append("rowIndex", payload.rowIndex);
    if (payload.columnIndex) url.searchParams.append("columnIndex", payload.columnIndex);
    if (payload.value) url.searchParams.append("value", payload.value);

    const formData = new URLSearchParams();
    if (payload.rowData) formData.append("rowData", payload.rowData);
    if (payload.rowsData) formData.append("rowsData", payload.rowsData);

    const res = await fetch(url.toString(), {
      method: "POST",
      body: formData
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: true, text };
    }
  } catch (err) {
    console.warn(`Apps Script POST failed for ${action}`, err);
    return { success: false, error: err.message };
  }
}

/* ==========================================================================
   MAPPERS
   ========================================================================== */
function mapRowsToEntries(rows) {
  if (!rows || rows.length === 0) return [];
  
  // Find which row actually contains the table headers (in case row 1 & 2 are titles)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowStr = (rows[i] || []).join(" ").toLowerCase();
    if (rowStr.includes("date") || rowStr.includes("firm") || rowStr.includes("debit") || rowStr.includes("reason")) {
      headerIdx = i;
      break;
    }
  }

  const cleanHeaders = rows[headerIdx].map(h => h ? h.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  
  let tsIdx = cleanHeaders.findIndex(h => h.includes("time"));
  let nameIdx = cleanHeaders.findIndex(h => (h === "name" || h.includes("username")) && !h.includes("person") && !h.includes("firm"));
  let dateIdx = cleanHeaders.findIndex(h => h.includes("date"));
  let deptIdx = cleanHeaders.findIndex(h => h.includes("dept"));
  let debitIdx = cleanHeaders.findIndex(h => h.includes("debit") || h.includes("outgoing"));
  let creditIdx = cleanHeaders.findIndex(h => h.includes("credit") || h.includes("incoming"));
  let ghIdx = cleanHeaders.findIndex(h => h.includes("group"));
  let firmIdx = cleanHeaders.findIndex(h => h.includes("firm"));
  let reasonIdx = cleanHeaders.findIndex(h => h.includes("reason") || h.includes("desc"));
  let personIdx = cleanHeaders.findIndex(h => h.includes("person") || h.includes("given"));
  let photoIdx = cleanHeaders.findIndex(h => h.includes("photo") || h.includes("image"));
  let balIdx = cleanHeaders.findIndex(h => h.includes("balance") || h.includes("running"));
  let remarkIdx = cleanHeaders.findIndex(h => h.includes("remark"));

  // Fallbacks if exact headers missing matching exact sheet order
  if (tsIdx === -1) tsIdx = 0;
  if (nameIdx === -1) nameIdx = 1;
  if (dateIdx === -1) dateIdx = 2;
  if (deptIdx === -1) deptIdx = 3;
  if (debitIdx === -1) debitIdx = 4;
  if (creditIdx === -1) creditIdx = 5;
  if (ghIdx === -1) ghIdx = 6;
  if (firmIdx === -1) firmIdx = 7;
  if (reasonIdx === -1) reasonIdx = 8;
  if (personIdx === -1) personIdx = 9;
  if (photoIdx === -1) photoIdx = 10;

  const entries = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(val => val !== "" && val !== null && val !== undefined)) continue;

    entries.push({
      id: "PETE-" + (i + 1000),
      timestamp: row[tsIdx] ? row[tsIdx].toString() : "",
      name: row[nameIdx] ? row[nameIdx].toString() : "",
      date: formatDisplayDate(row[dateIdx]),
      department: row[deptIdx] ? row[deptIdx].toString() : "",
      debitAmount: parseFloat(row[debitIdx]) || 0,
      creditAmount: parseFloat(row[creditIdx]) || 0,
      groupHead: row[ghIdx] ? row[ghIdx].toString() : "",
      firmName: row[firmIdx] ? row[firmIdx].toString() : "",
      reason: row[reasonIdx] ? row[reasonIdx].toString() : "",
      personName: row[personIdx] ? row[personIdx].toString() : "",
      photoUrl: row[photoIdx] ? row[photoIdx].toString() : "",
      runningBalance: parseFloat(row[balIdx]) || 0,
      remarks: row[remarkIdx] ? row[remarkIdx].toString() : "",
      actual1: row[11] ? row[11].toString() : "",
      status: row[13] ? row[13].toString() : (row[11] ? "Approved" : "Pending"),
      remark1: row[14] ? row[14].toString() : "",
      actual2: row[16] ? row[16].toString() : "",
      remark2: row[18] ? row[18].toString() : "",
      createdBy: row[nameIdx] ? row[nameIdx].toString() : "user@pete.com",
      _rowIndex: i + 1
    });
  }
  return entries;
}

function mapRowsToUsers(rows) {
  if (!rows || rows.length <= 1) return [];
  
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    const rowStr = (rows[i] || []).join(" ").toLowerCase();
    if (rowStr.includes("name") || rowStr.includes("user") || rowStr.includes("role") || rowStr.includes("password")) {
      headerIdx = i;
      break;
    }
  }

  const cleanHeaders = rows[headerIdx].map(h => h ? h.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  
  let nameIdx = cleanHeaders.findIndex(h => h === "name");
  let usernameIdx = cleanHeaders.findIndex(h => h.includes("user") && !h.includes("role"));
  let passIdx = cleanHeaders.findIndex(h => h.includes("pass"));
  let firmIdx = cleanHeaders.findIndex(h => h.includes("firm"));
  let roleIdx = cleanHeaders.findIndex(h => h.includes("role") || h.includes("assign"));

  if (nameIdx === -1) nameIdx = 0;
  if (usernameIdx === -1) usernameIdx = 1;
  if (passIdx === -1) passIdx = 2;
  if (firmIdx === -1) firmIdx = 3;
  if (roleIdx === -1) roleIdx = 4;

  const users = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(val => val !== "" && val !== null && val !== undefined)) continue;

    const uName = row[usernameIdx] ? row[usernameIdx].toString().trim() : (row[nameIdx] ? row[nameIdx].toString().trim() : "");
    if (!uName && !row[nameIdx]) continue;

    users.push({
      name: row[nameIdx] ? row[nameIdx].toString().trim() : "",
      username: uName,
      email: uName,
      password: row[passIdx] ? row[passIdx].toString().trim() : "",
      firmName: row[firmIdx] ? row[firmIdx].toString().trim() : "",
      role: row[roleIdx] ? row[roleIdx].toString().trim() : "User",
      status: "Active",
      createdAt: "",
      _rowIndex: i + 1
    });
  }
  return users;
}

function mapRowsToMaster(rows) {
  if (!rows || rows.length <= 1) return [];
  
  const rawHeaders = rows[0].map(h => h ? h.toString().toLowerCase().trim() : "");
  const cleanHeaders = rows[0].map(h => h ? h.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  
  let deptIdx = cleanHeaders.findIndex(h => h.includes("department") || h.includes("dept"));
  let groupHeadIdx = cleanHeaders.findIndex(h => h.includes("grouphead") || (h.includes("group") && h.includes("head")));
  let firmNameIdx = cleanHeaders.findIndex(h => h.includes("firm") || h.includes("company"));

  // Fallbacks if clean matching didn't catch 0, 1, 2
  if (deptIdx === -1 && rows[0][0]) deptIdx = 0;
  if (groupHeadIdx === -1 && rows[0][1]) groupHeadIdx = 1;
  if (firmNameIdx === -1 && rows[0][2]) firmNameIdx = 2;

  const masterData = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip entirely empty rows
    if (!row.some(val => val)) continue;
    
    masterData.push({
      department: deptIdx >= 0 && row[deptIdx] ? row[deptIdx].toString().trim() : "",
      groupHead: groupHeadIdx >= 0 && row[groupHeadIdx] ? row[groupHeadIdx].toString().trim() : "",
      firmName: firmNameIdx >= 0 && row[firmNameIdx] ? row[firmNameIdx].toString().trim() : "",
      _rowIndex: i + 1
    });
  }
  return masterData;
}

function recalculateBalances(entries) {
  entries.sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));
  let balance = 0;
  entries.forEach(e => {
    if (e.status === "Approved" || !e.status) {
      balance = balance + (parseFloat(e.creditAmount) || 0) - (parseFloat(e.debitAmount) || 0);
      e.runningBalance = balance;
    } else {
      e.runningBalance = balance;
    }
  });
  return entries;
}

function formatDateForSubmit(dateInput) {
  const now = new Date();
  let dateObj = now;

  if (dateInput) {
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      const parts = dateInput.split("-");
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds());
      }
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    }
  }

  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  const hh = String(dateObj.getHours()).padStart(2, "0");
  const min = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");

  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

function formatDisplayDate(val) {
  if (!val && val !== 0) return "-";
  let str = val.toString().replace(/^'/, "").trim();

  // Handle concatenated numeric format like 8102026113506 or 08102026113506
  if (/^\d{13,14}$/.test(str)) {
    if (str.length === 13) str = "0" + str;
    const mm = str.substring(0, 2);
    const dd = str.substring(2, 4);
    const yyyy = str.substring(4, 8);
    const hh = str.substring(8, 10);
    const min = str.substring(10, 12);
    const ss = str.substring(12, 14);
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  }

  // Handle ISO date format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split("T")[0].split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return str;
}

/* ==========================================================================
   API EXPORT
   ========================================================================== */
export const api = {

  getMasterData: async () => {
    let data = [];
    if (APPSCRIPT_URL) {
      const rows = await fetchSheetData("Master");
      if (rows) {
        data = mapRowsToMaster(rows);
        setLocal(MOCK_STORAGE_KEY_MASTER, data);
      } else {
        data = getLocal(MOCK_STORAGE_KEY_MASTER);
      }
    } else {
      data = getLocal(MOCK_STORAGE_KEY_MASTER);
    }
    return { success: true, data };
  },

  checkUser: async (identifier, inputPassword = '') => {
    const res = await api.getUsers();
    if (!res.success || !res.users) {
      return { success: false, error: "Failed to fetch users" };
    }
    const cleanId = (identifier || "").trim().toLowerCase();
    
    // Match by username, email, or name
    const user = res.users.find(u => 
      (u.username && u.username.trim().toLowerCase() === cleanId) ||
      (u.email && u.email.trim().toLowerCase() === cleanId) ||
      (u.name && u.name.trim().toLowerCase() === cleanId)
    );

    if (!user) {
      return { success: true, exists: false, message: "User not found" };
    }

    // Check password if set on user record
    if (user.password && inputPassword) {
      if (user.password.toString().trim() !== inputPassword.toString().trim()) {
        return { success: true, exists: true, invalidPassword: true, message: "Incorrect password" };
      }
    }

    return { success: true, exists: true, user };
  },

  getUsers: async () => {
    let users = [];
    if (APPSCRIPT_URL) {
      const rows = await fetchSheetData("Login");
      if (rows) {
        users = mapRowsToUsers(rows);
        setLocal(MOCK_STORAGE_KEY_USERS, users);
      } else {
        users = getLocal(MOCK_STORAGE_KEY_USERS);
      }
    } else {
      users = getLocal(MOCK_STORAGE_KEY_USERS);
    }
    return { success: true, users };
  },

  addUser: async (payload) => {
    const { name, username, password, firmName, role } = payload;
    const rowData = [
      (name || "").trim(),
      (username || "").trim(),
      (password || "").trim(),
      (firmName || "").trim(),
      role || "User"
    ];
    await postGeneric("insert", "Login", { rowData: JSON.stringify(rowData) });
    const users = getLocal(MOCK_STORAGE_KEY_USERS);
    users.push({
      name: rowData[0],
      username: rowData[1],
      email: rowData[1],
      password: rowData[2],
      firmName: rowData[3],
      role: rowData[4],
      status: "Active",
      createdAt: new Date().toISOString()
    });
    setLocal(MOCK_STORAGE_KEY_USERS, users);
    return { success: true, message: "User added" };
  },

  updateUser: async (payload) => {
    const users = getLocal(MOCK_STORAGE_KEY_USERS);
    const user = users.find(u => u.username === payload.username || u.email === payload.email);
    if (!user) return { success: false, error: "User not found in local sync" };
    
    if (payload.name !== undefined) user.name = payload.name;
    if (payload.password !== undefined) user.password = payload.password;
    if (payload.firmName !== undefined) user.firmName = payload.firmName;
    if (payload.role !== undefined) user.role = payload.role;
    if (payload.status !== undefined) user.status = payload.status;
    
    if (user._rowIndex) {
      const rowData = [user.name, user.username, user.password, user.firmName, user.role];
      await postGeneric("update", "Login", { rowIndex: user._rowIndex, rowData: JSON.stringify(rowData) });
    }
    setLocal(MOCK_STORAGE_KEY_USERS, users);
    return { success: true, message: "User updated" };
  },

  deleteUser: async (payload) => {
    const users = getLocal(MOCK_STORAGE_KEY_USERS);
    const targetKey = payload.username || payload.email;
    const user = users.find(u => u.username === targetKey || u.email === targetKey);
    if (user && user._rowIndex) {
      await postGeneric("delete", "Login", { rowIndex: user._rowIndex });
    }
    setLocal(MOCK_STORAGE_KEY_USERS, users.filter(u => u.username !== targetKey && u.email !== targetKey));
    return { success: true, message: "User deleted" };
  },

  getEntries: async (params = {}) => {
    let entries = [];
    if (APPSCRIPT_URL) {
      const rows = await fetchSheetData("FMS");
      if (rows) {
        entries = mapRowsToEntries(rows);
        setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);
      } else {
        entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
      }
    } else {
      entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    }

    // Apply filtering
    if (params.status) {
      entries = entries.filter(e => e.status === params.status || (!e.status && params.status === "Approved"));
    }
    if (params.createdBy) {
      const cBy = params.createdBy.toLowerCase();
      entries = entries.filter(e => e.createdBy.toLowerCase() === cBy);
    }
    if (params.startDate) entries = entries.filter(e => e.date >= params.startDate);
    if (params.endDate) entries = entries.filter(e => e.date <= params.endDate);
    if (params.department) entries = entries.filter(e => e.department.toLowerCase() === params.department.toLowerCase());
    if (params.groupHead) entries = entries.filter(e => e.groupHead.toLowerCase() === params.groupHead.toLowerCase());
    if (params.personName) entries = entries.filter(e => e.personName.toLowerCase().includes(params.personName.toLowerCase()));
    
    if (params.search) {
      const s = params.search.toLowerCase();
      entries = entries.filter(e =>
        (e.reason && e.reason.toLowerCase().includes(s)) ||
        (e.personName && e.personName.toLowerCase().includes(s)) ||
        (e.groupHead && e.groupHead.toLowerCase().includes(s)) ||
        (e.department && e.department.toLowerCase().includes(s)) ||
        (e.id && e.id.toLowerCase().includes(s))
      );
    }

    entries.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const startIndex = (page - 1) * limit;

    return {
      success: true,
      entries: entries.slice(startIndex, startIndex + limit),
      totalCount: entries.length,
      page,
      limit
    };
  },

  getSummary: async (params = {}) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES).filter(e => e.status === "Approved" || !e.status);
    
    if (params.createdBy) {
      const cBy = params.createdBy.toLowerCase();
      entries = entries.filter(e => e.createdBy.toLowerCase() === cBy);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const monthStr = todayStr.substring(0, 7);

    if (params.timeframe === "today") {
      entries = entries.filter(e => e.date === todayStr);
    } else if (params.timeframe === "month") {
      entries = entries.filter(e => e.date && e.date.startsWith(monthStr));
    } else if (params.startDate || params.endDate) {
      if (params.startDate) entries = entries.filter(e => e.date >= params.startDate);
      if (params.endDate) entries = entries.filter(e => e.date <= params.endDate);
    }

    let totalCredit = 0;
    let totalDebit = 0;
    const ghMap = {};
    const firmMap = {};
    let hodApprovedCount = 0;
    let hodPendingCount = 0;
    let tallyVerifiedCount = 0;
    let tallyPendingCount = 0;

    entries.forEach(e => {
      const credit = parseFloat(e.creditAmount) || 0;
      const debit = parseFloat(e.debitAmount) || 0;
      totalCredit += credit;
      totalDebit += debit;

      const gh = e.groupHead || "Other";
      ghMap[gh] = (ghMap[gh] || 0) + debit;

      const firm = e.firmName || "Standard";
      if (!firmMap[firm]) firmMap[firm] = { name: firm, debit: 0, credit: 0 };
      firmMap[firm].debit += debit;
      firmMap[firm].credit += credit;

      const isHodApproved = e.status === 'Approved' || Boolean(e.actual1);
      if (isHodApproved) hodApprovedCount++;
      else hodPendingCount++;

      const isTallyVerified = Boolean(e.actual2) || e.remark2 === 'Verified';
      if (isTallyVerified) tallyVerifiedCount++;
      else if (isHodApproved) tallyPendingCount++;
    });

    const groupHeadBreakdown = Object.keys(ghMap).map(k => ({ name: k, value: ghMap[k] })).sort((a, b) => b.value - a.value);
    const firmBreakdown = Object.values(firmMap).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit));

    return {
      success: true,
      summary: {
        totalCredit,
        totalDebit,
        netBalance: totalCredit - totalDebit,
        entryCount: entries.length,
        groupHeadBreakdown,
        firmBreakdown,
        hodApprovedCount,
        hodPendingCount,
        tallyVerifiedCount,
        tallyPendingCount
      }
    };
  },

  uploadFile: async (base64Data, fileName = "receipt.jpg", mimeType = "image/jpeg", folderId = "") => {
    try {
      const cleanUrl = APPSCRIPT_URL.trim();
      const url = new URL(cleanUrl);
      url.searchParams.append("action", "uploadFile");
      url.searchParams.append("fileName", fileName);
      url.searchParams.append("mimeType", mimeType);
      url.searchParams.append("folderId", folderId || "1wyuYLkXUsNQQCLhX-WKCfs1yxU10EDv-");

      const formData = new URLSearchParams();
      formData.append("base64Data", base64Data);

      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData
      });

      const text = await response.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from uploadFile:", text);
      }
      if (res && res.success && res.fileUrl) {
        return res.fileUrl;
      } else {
        console.error("Drive upload returned error:", res);
      }
    } catch (err) {
      console.error("Drive upload error:", err);
    }
    return base64Data;
  },

  createEntry: async (payload) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    entries = recalculateBalances(entries);
    
    const numDebit = parseFloat(payload.debitAmount) || 0;
    const numCredit = parseFloat(payload.creditAmount) || 0;

    let lastBalance = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].status === "Approved" || !entries[i].status) {
        lastBalance = parseFloat(entries[i].runningBalance) || 0;
        break;
      }
    }
    
    const newRunningBalance = lastBalance + numCredit - numDebit;
    const id = "PETE-" + Date.now();
    
    // Format submitted date as DD-MM-YYYY HH:mm:ss
    const formattedDate = formatDateForSubmit(payload.date);
    
    // Upload photos/PDFs to Google Drive if base64 provided
    let photoUrls = [];
    if (Array.isArray(payload.photos) && payload.photos.length > 0) {
      for (let i = 0; i < payload.photos.length; i++) {
        const photoItem = payload.photos[i];
        if (typeof photoItem === 'string' && photoItem.startsWith('data:')) {
          const mimeMatch = photoItem.match(/^data:(.*?);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const ext = mimeType.includes('pdf') ? 'pdf' : (mimeType.includes('png') ? 'png' : 'jpg');
          const driveLink = await api.uploadFile(photoItem, `document_${Date.now()}_${i}.${ext}`, mimeType);
          photoUrls.push(driveLink);
        } else if (typeof photoItem === 'string') {
          photoUrls.push(photoItem);
        }
      }
    } else if (payload.photoUrl) {
      photoUrls.push(payload.photoUrl);
    }
    
    let photoUrlStr = photoUrls.join(",");

    // Exact Header Order for FMS sheet specified by user:
    // 0: Timestamp | 1: Name | 2: Date | 3: Department | 4: Debit Amount (Outgoing) | 5: Credit Amount (Incoming) | 6: Group Head | 7: Firm Name | 8: Reason | 9: Name Of The Person Amount Given | 10: Photo
    const rowData = [
      new Date().toLocaleString('en-IN'),                    // 0: Timestamp
      payload.name || "",                                    // 1: Name
      formattedDate,                                         // 2: Date (DD-MM-YYYY HH:mm:ss)
      payload.department || "",                              // 3: Department
      numDebit,                                              // 4: Debit Amount (Outgoing)
      numCredit,                                             // 5: Credit Amount (Incoming)
      payload.groupHead || "",                               // 6: Group Head
      payload.firmName || "",                                // 7: Firm Name
      payload.reason || "",                                  // 8: Reason
      payload.personName || "",                              // 9: Name Of The Person Amount Given
      photoUrlStr                                            // 10: Photo (Google Drive Link)
    ];

    await postGeneric("insert", "FMS", { rowData: JSON.stringify(rowData) });

    const entry = {
      id,
      timestamp: rowData[0],
      firmName: rowData[1],
      date: rowData[2],
      debitAmount: rowData[3],
      creditAmount: rowData[4],
      reason: rowData[5],
      groupHead: rowData[6],
      photoUrl: rowData[7],
      runningBalance: rowData[8],
      remarks: rowData[9],
      status: "Approved",
      createdBy: payload.createdBy || "user@pete.com",
      department: payload.department || "Factory",
      personName: payload.personName || ""
    };

    entries.push(entry);
    setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);
    return { success: true, id, balance: newRunningBalance, entry };
  },

  updateEntry: async (payload) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    const entry = entries.find(e => e.id.toString() === payload.id.toString());
    if (!entry) return { success: false, error: "Entry not found" };

    if (payload.date !== undefined) entry.date = payload.date;
    if (payload.department !== undefined) entry.department = payload.department;
    if (payload.debitAmount !== undefined) entry.debitAmount = parseFloat(payload.debitAmount) || 0;
    if (payload.creditAmount !== undefined) entry.creditAmount = parseFloat(payload.creditAmount) || 0;
    if (payload.groupHead !== undefined) entry.groupHead = payload.groupHead;
    if (payload.reason !== undefined) entry.reason = payload.reason;
    if (payload.personName !== undefined) entry.personName = payload.personName;
    if (payload.photos !== undefined) entry.photoUrl = Array.isArray(payload.photos) ? payload.photos.join(",") : payload.photos;

    entries = recalculateBalances(entries);
    setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);

    if (entry._rowIndex) {
      const rowData = [
        entry.id, entry.timestamp, entry.createdBy, entry.date, entry.department,
        entry.debitAmount, entry.creditAmount, entry.groupHead, entry.reason,
        entry.personName, entry.photoUrl, entry.runningBalance, entry.status
      ];
      await postGeneric("update", "Responses", { rowIndex: entry._rowIndex, rowData: JSON.stringify(rowData) });
    }
    
    return { success: true, message: "Entry updated" };
  },

  approveEntry: async (payload) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    const entry = entries.find(e => e.id === payload.id || e._rowIndex === payload.rowIndex);
    const status = payload.status || "Approved";
    const remark1 = payload.remark || payload.remark1 || "";
    const actual1 = formatDateForSubmit(new Date());

    if (entry) {
      entry.status = status;
      entry.actual1 = actual1;
      entry.remark1 = remark1;
      entries = recalculateBalances(entries);
      setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);
    }

    const targetRowIndex = payload.rowIndex || entry?._rowIndex;
    if (targetRowIndex) {
      // Index 11 (Col L): Actual 1
      // Index 13 (Col N): Status ("Approved" / "Rejected")
      // Index 14 (Col O): Remark 1
      const rowData = new Array(15).fill('');
      rowData[11] = actual1;
      rowData[13] = status;
      rowData[14] = remark1;

      await postGeneric("update", "FMS", { rowIndex: targetRowIndex, rowData: JSON.stringify(rowData) });
    }
    return { success: true, message: `Entry ${status}` };
  },

  rejectEntry: async (payload) => {
    return api.approveEntry({ ...payload, status: "Rejected" });
  },

  verifyTallyEntry: async (payload) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    const entry = entries.find(e => e.id === payload.id || e._rowIndex === payload.rowIndex);
    const remark2 = payload.remark2 || payload.remark || "Verified";
    const actual2 = formatDateForSubmit(new Date());

    if (entry) {
      entry.actual2 = actual2;
      entry.remark2 = remark2;
      setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);
    }

    const targetRowIndex = payload.rowIndex || entry?._rowIndex;
    if (targetRowIndex) {
      // Index 16 (Col Q): Actual 2
      // Index 18 (Col S): Remark 2
      const rowData = new Array(19).fill('');
      rowData[16] = actual2;
      rowData[18] = remark2;

      await postGeneric("update", "FMS", { rowIndex: targetRowIndex, rowData: JSON.stringify(rowData) });
    }
    return { success: true, message: "Tally Entry verified successfully" };
  },

  deleteEntry: async (payload) => {
    let entries = getLocal(MOCK_STORAGE_KEY_ENTRIES);
    const entry = entries.find(e => e.id === payload.id);
    entries = entries.filter(e => e.id.toString() !== payload.id.toString());
    entries = recalculateBalances(entries);
    setLocal(MOCK_STORAGE_KEY_ENTRIES, entries);

    if (entry && entry._rowIndex) {
      await postGeneric("delete", "Responses", { rowIndex: entry._rowIndex });
    }
    return { success: true, message: "Entry deleted" };
  },

  getLatestBalance: async () => {
    const entries = getLocal(MOCK_STORAGE_KEY_ENTRIES).filter(e => e.status === "Approved" || !e.status);
    if (entries.length > 0) {
      return entries[entries.length - 1].runningBalance || 0;
    }
    return 0;
  }
};
