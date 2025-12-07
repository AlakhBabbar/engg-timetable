import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { timeSlots, weekDays } from './TTBuilder/constants';

const DAYS = weekDays;
const TIME_SLOTS = timeSlots;

export const exportToPDF = async (timetableInfo) => {
  const { semester, branch, batch, type, data } = timetableInfo;
  
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
  
  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Timetable - ${semester} - ${branch} - ${batch}`, 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Type: ${type}`, 14, 22);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
  
  // Prepare table data
  const tableData = [];
  
  TIME_SLOTS.forEach((timeSlot) => {
    const row = [timeSlot];
    
    DAYS.forEach((day) => {
      const slotData = data[day]?.[timeSlot];
      
      if (slotData && (slotData.name || slotData.courseName || slotData.teacherName || slotData.teacher || slotData.roomNumber || slotData.roomName)) {
        const cellContent = [
          slotData.name || slotData.courseName || '',
          slotData.teacherName || slotData.teacher || '',
          slotData.roomNumber || slotData.roomName || slotData.room || ''
        ].filter(Boolean).join('\n');
        row.push(cellContent);
      } else {
        row.push('');
      }
    });
    
    tableData.push(row);
  });
  
  // Generate table
  autoTable(doc, {
    startY: 32,
    head: [['Time', ...DAYS]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo color
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold', fillColor: [243, 244, 246] } // Time column
    },
    margin: { top: 32, left: 14, right: 14 }
  });
  
  // Save the PDF
  doc.save(`Timetable_${semester}_${branch}_${batch}_${Date.now()}.pdf`);
};

export const exportMultipleToPDF = async (timetables) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  timetables.forEach((timetableInfo, index) => {
    if (index > 0) {
      doc.addPage();
    }
    
    const { semester, branch, batch, type, data } = timetableInfo;
    
    // Add title for each timetable
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Timetable - ${semester} - ${branch} - ${batch}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Type: ${type}`, 14, 22);
    
    // Prepare table data
    const tableData = [];
    
    TIME_SLOTS.forEach((timeSlot) => {
      const row = [timeSlot];
      
      DAYS.forEach((day) => {
        const slotData = data[day]?.[timeSlot];
        
        if (slotData && (slotData.name || slotData.courseName || slotData.teacherName || slotData.teacher || slotData.roomNumber || slotData.roomName)) {
          const cellContent = [
            slotData.name || slotData.courseName || '',
            slotData.teacherName || slotData.teacher || '',
            slotData.roomNumber || slotData.roomName || slotData.room || ''
          ].filter(Boolean).join('\n');
          row.push(cellContent);
        } else {
          row.push('');
        }
      });
      
      tableData.push(row);
    });
    
    // Generate table
    autoTable(doc, {
      startY: 27,
      head: [['Time', ...DAYS]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', fillColor: [243, 244, 246] }
      },
      margin: { top: 27, left: 14, right: 14 }
    });
  });
  
  // Save the PDF
  doc.save(`Timetables_All_${Date.now()}.pdf`);
};
