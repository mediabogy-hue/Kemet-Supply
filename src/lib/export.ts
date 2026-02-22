'use client';
import * as XLSX from 'xlsx';

// A generic function to export data to an Excel file
export function exportToExcel(
    data: any[], // Array of data objects
    fileName: string, // Name of the file to be downloaded (without extension)
    sheetName: string, // Name of the worksheet
    // A mapping from data object keys to desired Excel header names
    headerMapping: Record<string, string> // e.g. { id: 'رقم الطلب', customerName: 'العميل' }
) {
    if (!data || data.length === 0) {
        console.warn("No data to export.");
        return;
    }

    const worksheetData = data.map(item => {
        const newRow: Record<string, any> = {};
        // Use the headerMapping to create a new object with the correct headers
        for (const key in headerMapping) {
            if (Object.prototype.hasOwnProperty.call(headerMapping, key)) {
                newRow[headerMapping[key]] = item[key];
            }
        }
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Write the workbook and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
