import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { timeSlots, weekDays } from './TTBuilder/constants';

const DAYS = weekDays;
const TIME_SLOTS = timeSlots;

const createTimetableTable = (timetableInfo) => {
  const { semester, branch, batch, type, data } = timetableInfo;
  
  // Create header row
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'Time', bold: true, alignment: AlignmentType.CENTER })],
        shading: { fill: '4F46E5' }, // Indigo color
        width: { size: 15, type: WidthType.PERCENTAGE }
      }),
      ...DAYS.map(day => new TableCell({
        children: [new Paragraph({ text: day, bold: true, alignment: AlignmentType.CENTER })],
        shading: { fill: '4F46E5' },
        width: { size: 14, type: WidthType.PERCENTAGE }
      }))
    ]
  });
  
  // Create data rows
  const dataRows = TIME_SLOTS.map(timeSlot => {
    const cells = [
      new TableCell({
        children: [new Paragraph({ text: timeSlot, bold: true, alignment: AlignmentType.CENTER })],
        shading: { fill: 'F3F4F6' }
      })
    ];
    
    DAYS.forEach(day => {
      const slotData = data[day]?.[timeSlot];
      
      let content = [];
      const courseName = slotData?.name || slotData?.courseName || '';
      const teacherName = slotData?.teacherName || slotData?.teacher || '';
      const roomInfo = slotData?.roomNumber || slotData?.roomName || slotData?.room || '';
      
      if (slotData && (courseName || teacherName || roomInfo)) {
        if (courseName) {
          content.push(new TextRun({ text: courseName, bold: true }));
          content.push(new TextRun({ text: '\n', break: 1 }));
        }
        if (teacherName) {
          content.push(new TextRun({ text: teacherName }));
          content.push(new TextRun({ text: '\n', break: 1 }));
        }
        if (roomInfo) {
          content.push(new TextRun({ text: roomInfo, italics: true }));
        }
      }
      
      cells.push(new TableCell({
        children: [new Paragraph({ children: content.length > 0 ? content : [new TextRun('')], alignment: AlignmentType.CENTER })]
      }));
    });
    
    return new TableRow({ children: cells });
  });
  
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  });
};

export const exportToDOCX = async (timetableInfo) => {
  const { semester, branch, batch, type } = timetableInfo;
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `Timetable - ${semester} - ${branch} - ${batch}`,
          heading: 'Heading1',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Type: ${type} | Generated: ${new Date().toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        createTimetableTable(timetableInfo)
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Timetable_${semester}_${branch}_${batch}_${Date.now()}.docx`);
};

export const exportMultipleToDOCX = async (timetables) => {
  const sections = timetables.map((timetableInfo, index) => {
    const { semester, branch, batch, type } = timetableInfo;
    
    return {
      properties: {
        page: {
          pageNumbers: {
            start: 1,
            formatType: 'decimal'
          }
        }
      },
      children: [
        new Paragraph({
          text: `Timetable - ${semester} - ${branch} - ${batch}`,
          heading: 'Heading1',
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `Type: ${type} | Page ${index + 1} of ${timetables.length}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        createTimetableTable(timetableInfo)
      ]
    };
  });
  
  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Timetables_All_${Date.now()}.docx`);
};
