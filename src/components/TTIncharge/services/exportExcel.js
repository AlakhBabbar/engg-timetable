import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { timeSlots, weekDays } from './TTBuilder/constants';

const DAYS = weekDays;
const TIME_SLOTS = timeSlots;

const createTimetableSheet = (timetableInfo) => {
  const { semester, branch, batch, type, data } = timetableInfo;
  
  // Create header rows
  const worksheetData = [
    [`Timetable - ${semester} - ${branch} - ${batch}`],
    [`Type: ${type} | Generated: ${new Date().toLocaleDateString()}`],
    [], // Empty row for spacing
    ['Time', ...DAYS]
  ];
  
  // Add data rows
  TIME_SLOTS.forEach(timeSlot => {
    const row = [timeSlot];
    
    DAYS.forEach(day => {
      const slotData = data[day]?.[timeSlot];
      
      let cellContent = '';
      const courseName = slotData?.name || slotData?.courseName || '';
      const teacherName = slotData?.teacherName || slotData?.teacher || '';
      const roomInfo = slotData?.roomNumber || slotData?.roomName || slotData?.room || '';
      
      if (slotData && (courseName || teacherName || roomInfo)) {
        const parts = [];
        if (courseName) parts.push(courseName);
        if (teacherName) parts.push(teacherName);
        if (roomInfo) parts.push(roomInfo);
        cellContent = parts.join('\n');
      }
      
      row.push(cellContent);
    });
    
    worksheetData.push(row);
  });
  
  return worksheetData;
};

export const exportToExcel = async (timetableInfo) => {
  const { semester, branch, batch } = timetableInfo;
  
  const worksheetData = createTimetableSheet(timetableInfo);
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Time column
    ...DAYS.map(() => ({ wch: 20 })) // Day columns
  ];
  
  // Merge cells for title
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title row
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }  // Subtitle row
  ];
  
  // Apply styles to header row (row index 3)
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '4'; // Row 4 (0-indexed row 3)
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${semester} - ${branch}`);
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Timetable_${semester}_${branch}_${batch}_${Date.now()}.xlsx`);
};

export const exportMultipleToExcel = async (timetables) => {
  const workbook = XLSX.utils.book_new();
  
  timetables.forEach((timetableInfo, index) => {
    const { semester, branch, batch } = timetableInfo;
    const worksheetData = createTimetableSheet(timetableInfo);
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Time column
      ...DAYS.map(() => ({ wch: 20 })) // Day columns
    ];
    
    // Merge cells for title
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title row
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }  // Subtitle row
    ];
    
    // Apply styles to header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '4';
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    
    // Create sheet name (max 31 chars for Excel)
    let sheetName = `${semester}-${branch}-${batch}`;
    if (sheetName.length > 31) {
      sheetName = `${semester}-${branch}`.substring(0, 28) + '...';
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Timetables_All_${Date.now()}.xlsx`);
};
