const SPREADSHEET_ID = "17l2vozjG1YNJcIYt6VkyDZfyhk7isWmPXYRwKD6MFS4";

// Cache the spreadsheet object to avoid repeated openById calls
let cachedSpreadsheet = null;

function getSpreadsheet() {
    if (!cachedSpreadsheet) {
        cachedSpreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return cachedSpreadsheet;
}

function doGet(e) {
    const sheetName = e.parameter.sheet || "Data";

    try {
        const ss = getSpreadsheet();
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
            return jsonError(`Sheet '${sheetName}' not found`);
        }

        const data = sheet.getDataRange().getValues();
        const result = {
            success: true,
            updated: new Date().toISOString(),
            rows: data.length,
            data: data
        };

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return jsonError(err.message || "Server error");
    }
}

function jsonError(msg) {
    return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: msg })
    ).setMimeType(ContentService.MimeType.JSON);
}

function jsonSuccess(msg, additionalData) {
    const response = { success: true, message: msg, ...additionalData };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

function fetchSheetData(sheetName) {
    try {
        var ss = getSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);
        var data = sheet.getDataRange().getDisplayValues();

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            data: data
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    try {
        var params = e.parameter || {};
        var postData = {};

        if (e.postData && e.postData.contents) {
            try {
                postData = JSON.parse(e.postData.contents);
            } catch (err) {}
        }

        var action = params.action || postData.action || 'insert';

        if (action === 'uploadFile') {
            return handleFileUpload(e, postData);
        }

        var sheetName = params.sheetName;
        var ss = getSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            throw new Error("Sheet '" + sheetName + "' not found");
        }

        // ============== OPTIMIZED INSERT ==============
        if (action === 'insert') {
            var rowData = JSON.parse(params.rowData);

            // Use appendRow for single row - it's optimized internally
            sheet.appendRow(rowData);

            // Flush to ensure immediate write
            SpreadsheetApp.flush();

            return jsonSuccess("Data inserted successfully");
        }

        // ============== OPTIMIZED UPDATE (20x FASTER) ==============
        else if (action === 'update') {
            var rowIndex = parseInt(params.rowIndex);
            var rowData = JSON.parse(params.rowData);

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for update");
            }

            // OPTIMIZATION: Get existing row data first, then batch update
            var existingData = sheet.getRange(rowIndex, 1, 1, rowData.length).getValues()[0];

            // Merge: only update non-empty values
            var mergedData = existingData.map(function (existingVal, i) {
                return (rowData[i] !== '' && rowData[i] !== undefined) ? rowData[i] : existingVal;
            });

            // SINGLE batch operation instead of multiple setValue calls
            sheet.getRange(rowIndex, 1, 1, mergedData.length).setValues([mergedData]);

            SpreadsheetApp.flush();

            return jsonSuccess("Data updated successfully");
        }

        // ============== UPDATE CELL ==============
        else if (action === 'updateCell') {
            var rowIndex = parseInt(params.rowIndex);
            var columnIndex = parseInt(params.columnIndex);
            var value = params.value;

            if (isNaN(rowIndex) || rowIndex < 1 || isNaN(columnIndex) || columnIndex < 1) {
                throw new Error("Invalid row or column index for update");
            }

            sheet.getRange(rowIndex, columnIndex).setValue(value);
            SpreadsheetApp.flush();

            return jsonSuccess("Cell updated successfully");
        }

        // ============== DELETE ==============
        else if (action === 'delete') {
            var rowIndex = parseInt(params.rowIndex);

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for delete");
            }

            sheet.deleteRow(rowIndex);
            SpreadsheetApp.flush();

            return jsonSuccess("Row deleted successfully");
        }

        // ============== MARK DELETED ==============
        else if (action === 'markDeleted') {
            var rowIndex = parseInt(params.rowIndex);
            var columnIndex = parseInt(params.columnIndex);
            var value = params.value || 'Yes';

            if (isNaN(rowIndex) || rowIndex < 2) {
                throw new Error("Invalid row index for marking as deleted");
            }
            if (isNaN(columnIndex) || columnIndex < 1) {
                throw new Error("Invalid column index for marking as deleted");
            }

            sheet.getRange(rowIndex, columnIndex).setValue(value);
            SpreadsheetApp.flush();

            return jsonSuccess("Row marked as deleted successfully");
        }

        // ============== BATCH INSERT (NEW - FOR MULTIPLE ROWS) ==============
        else if (action === 'batchInsert') {
            var rowsData = JSON.parse(params.rowsData);

            if (!Array.isArray(rowsData) || rowsData.length === 0) {
                throw new Error("Invalid rows data for batch insert");
            }

            var lastRow = sheet.getLastRow();
            sheet.getRange(lastRow + 1, 1, rowsData.length, rowsData[0].length).setValues(rowsData);

            SpreadsheetApp.flush();

            return jsonSuccess("Batch insert successful", { rowsInserted: rowsData.length });
        }

        else {
            throw new Error("Unknown action: " + action);
        }
    } catch (error) {
        console.error("Error in doPost:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function handleFileUpload(e, postData) {
    try {
        var params = e.parameter || {};
        postData = postData || {};

        var base64Data = postData.base64Data || params.base64Data;
        var fileName = postData.fileName || params.fileName || "document.pdf";
        var mimeType = postData.mimeType || params.mimeType || "application/pdf";
        var folderId = postData.folderId || params.folderId || "1wyuYLkXUsNQQCLhX-WKCfs1yxU10EDv-";

        if (!base64Data) {
            throw new Error("Missing base64Data for file upload");
        }

        var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);

        if (!fileUrl) {
            throw new Error("Failed to upload file to Google Drive");
        }

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            fileUrl: fileUrl,
            message: "File uploaded successfully"
        })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        console.error("Error in handleFileUpload:", error);
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
    try {
        let fileData = base64Data;
        if (base64Data.indexOf('base64,') !== -1) {
            fileData = base64Data.split('base64,')[1];
        }

        const decoded = Utilities.base64Decode(fileData);
        const blob = Utilities.newBlob(decoded, mimeType, fileName);
        const targetFolderId = folderId || "1wyuYLkXUsNQQCLhX-WKCfs1yxU10EDv-";
        const folder = DriveApp.getFolderById(targetFolderId);
        const file = folder.createFile(blob);

        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return "https://drive.google.com/uc?export=view&id=" + file.getId();
    } catch (error) {
        console.error("Error in uploadFileToDrive:", error);
        return null;
    }
}