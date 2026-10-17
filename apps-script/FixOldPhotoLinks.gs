// One-time migration: replace old "drive/folders/..." links in the FMS Photo column
// with the real file links (https://drive.google.com/file/d/<id>/view).
//
// How it matches: uploads are named document_<Date.now()>_<photoIndex>.<ext>.
// Files are sorted by that timestamp and grouped (index 0 starts a new entry), then
// handed out to the sheet rows in order. A row with N folder links needs a group of N files.
// If the groups do not line up with the rows, NOTHING is written and the mismatch is logged.
//
// Usage: paste into the Apps Script project, run fixOldPhotoLinks() (DRY_RUN = true) and read
// View -> Logs. If it looks right, set DRY_RUN = false and run again.

const FIX_DRY_RUN = true;
const FIX_SHEET_NAME = "FMS";
const FIX_PHOTO_COL = 11; // column K = "Photo"
const FIX_FOLDER_ID = "1wyuYLkXUsNQQCLhX-WKCfs1yxU10EDv-";

function fixOldPhotoLinks() {
    const sheet = getSpreadsheet().getSheetByName(FIX_SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const cells = sheet.getRange(1, FIX_PHOTO_COL, lastRow, 1).getValues();

    // Rows that still hold a folder link (one link per photo, comma separated).
    const rows = [];
    for (let i = 0; i < cells.length; i++) {
        const v = String(cells[i][0] || "");
        if (v.indexOf("/drive/folders/") === -1) continue;
        const parts = v.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
        rows.push({ row: i + 1, parts: parts, old: v });
    }

    // Uploaded files, oldest first, grouped per entry.
    const files = [];
    const it = DriveApp.getFolderById(FIX_FOLDER_ID).getFiles();
    while (it.hasNext()) {
        const f = it.next();
        const m = f.getName().match(/^document_(\d+)_(\d+)\./);
        if (m) files.push({ id: f.getId(), name: f.getName(), t: Number(m[1]), idx: Number(m[2]) });
    }
    files.sort(function (a, b) { return a.t - b.t; });

    const groups = [];
    files.forEach(function (f) {
        if (f.idx === 0 || groups.length === 0) groups.push([]);
        groups[groups.length - 1].push(f);
    });

    Logger.log("Rows with folder links: " + rows.length + " | file groups in folder: " + groups.length +
        " | files: " + files.length);

    if (rows.length !== groups.length) {
        Logger.log("MISMATCH: rows and file groups differ. Nothing written. " +
            "Delete extra/test files from the folder or tell me, then rerun.");
        return;
    }
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].parts.length !== groups[i].length) {
            Logger.log("MISMATCH at sheet row " + rows[i].row + ": needs " + rows[i].parts.length +
                " photo(s) but matched group has " + groups[i].length + " (" +
                groups[i].map(function (f) { return f.name; }).join(", ") + "). Nothing written.");
            return;
        }
    }

    // Show the plan.
    rows.forEach(function (r, i) {
        Logger.log("Row " + r.row + " -> " + groups[i].map(function (f) { return f.name; }).join(", "));
    });

    if (FIX_DRY_RUN) {
        Logger.log("DRY RUN: sheet not changed. Set FIX_DRY_RUN = false to apply.");
        return;
    }

    // Backup old values, then write.
    const ss = getSpreadsheet();
    const backup = ss.getSheetByName("FMS_photo_backup") || ss.insertSheet("FMS_photo_backup");
    rows.forEach(function (r) { backup.appendRow([r.row, r.old]); });

    rows.forEach(function (r, i) {
        const links = groups[i].map(function (f) {
            DriveApp.getFileById(f.id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            return "https://drive.google.com/file/d/" + f.id + "/view";
        });
        sheet.getRange(r.row, FIX_PHOTO_COL).setValue(links.join(","));
    });
    SpreadsheetApp.flush();
    Logger.log("Done. Updated " + rows.length + " rows. Old values saved in sheet 'FMS_photo_backup'.");
}
