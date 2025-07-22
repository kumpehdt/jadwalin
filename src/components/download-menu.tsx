
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileType, FileText, School, Users } from 'lucide-react';
import type { ScheduleEntry, ViewType } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Packer, Document, Table, TableRow, TableCell, Paragraph, VerticalAlign, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';


interface DownloadMenuProps {
  allData: ScheduleEntry[];
  filteredData: ScheduleEntry[];
  viewType: ViewType;
  selectionName: string;
  allTimeSlots: string[];
  classList: string[];
  teacherList: string[];
  daysInFile: string[];
  teacherData: any[];
}

export default function DownloadMenu({
  allData,
  filteredData,
  viewType,
  selectionName,
  allTimeSlots,
  classList,
  teacherList,
  daysInFile,
}: DownloadMenuProps) {
  const getTitle = (localViewType: 'class' | 'teacher', name: string) => {
    if (localViewType === 'class' && name === 'Semua Kelas')
      return 'Jadwal Pelajaran Semua Kelas';
    if (localViewType === 'teacher' && name === 'Semua Guru')
      return 'Jadwal Mengajar Semua Guru';
    return localViewType === 'class'
      ? `Jadwal Pelajaran Kelas ${name}`
      : `Jadwal Mengajar Guru ${name}`;
  };

  const generateXLSXData = (
    data: ScheduleEntry[],
    localViewType: 'class' | 'teacher'
  ) => {
    const header = ['Waktu', ...daysInFile];
    const body = allTimeSlots.map((time) => {
      const rowData: (string | null)[] = [time];
      daysInFile.forEach((day) => {
        const entry = data.find(
          (e) => e.Hari === day && e.waktu === time
        );
        if (entry) {
          const mainText =
            localViewType === 'class'
              ? entry['Mata Pelajaran']
              : entry.Kelas;
          const subText =
            localViewType === 'class'
              ? entry.Guru.replace(/, /g, '\n') // Handle multi-teacher for XLSX
              : entry['Mata Pelajaran'];
          rowData.push(`${mainText}\n${subText}`);
        } else {
          rowData.push('-');
        }
      });
      return rowData;
    });

    return [header, ...body];
  };

  const downloadXLSX = (
    data: ScheduleEntry[],
    localViewType: 'class' | 'teacher',
    fileName: string
  ) => {
    const worksheetData = generateXLSXData(
      data,
      localViewType
    );
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set styles for wrapping text in all cells
    const sheetWithStyles = worksheetData.map(row => row.map(cell => ({ v: cell, t: 's', s: { alignment: { wrapText: true } } })));
    const finalWorksheet = XLSX.utils.aoa_to_sheet(sheetWithStyles);

    const colWidths = finalWorksheet['!cols'] = worksheetData[0].map((_, colIndex) => {
      let maxWidth = 0;
      worksheetData.forEach(row => {
        const cellContent = row[colIndex];
        if (cellContent) {
          const lines = cellContent.toString().split('\n');
          lines.forEach(line => {
            if (line.length > maxWidth) {
              maxWidth = line.length;
            }
          });
        }
      });
      return { wch: maxWidth + 2 };
    });
    finalWorksheet['!cols'] = colWidths;

    const rowHeights = allTimeSlots.map(() => ({ hpt: 30 })); // Set default row height
    finalWorksheet['!rows'] = rowHeights;


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, finalWorksheet, 'Jadwal');
    XLSX.writeFile(
      workbook,
      `jadwal-${fileName.replace(/ /g, '_')}.xlsx`
    );
  };
  
  const downloadAllPagesXLSX = (
    list: string[],
    dataType: 'class' | 'teacher'
  ) => {
    const workbook = XLSX.utils.book_new();

    list.forEach((itemName) => {
      const itemData =
        dataType === 'class'
          ? allData.filter((entry) =>
              entry.Kelas.split(',').map((c) => c.trim()).includes(itemName)
            )
          : allData.filter((entry) => entry.Guru.split(', ').includes(itemName));
      
      const sheetName = itemName.replace(/[/\\?*:[\]]/g, '').substring(0, 31);
      const worksheetData = generateXLSXData(itemData, dataType);
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      const sheetWithStyles = worksheetData.map(row => row.map(cell => ({ v: cell, t: 's', s: { alignment: { wrapText: true } } })));
      const finalWorksheet = XLSX.utils.aoa_to_sheet(sheetWithStyles);

      const colWidths = finalWorksheet['!cols'] = worksheetData[0].map((_, colIndex) => {
        let maxWidth = 0;
        worksheetData.forEach(row => {
          const cellContent = row[colIndex];
          if (cellContent) {
            const lines = cellContent.toString().split('\n');
            lines.forEach(line => {
              if (line.length > maxWidth) {
                maxWidth = line.length;
              }
            });
          }
        });
        return { wch: maxWidth + 2 };
      });
      finalWorksheet['!cols'] = colWidths;

      const rowHeights = allTimeSlots.map(() => ({ hpt: 30 }));
      finalWorksheet['!rows'] = rowHeights;
      
      XLSX.utils.book_append_sheet(workbook, finalWorksheet, sheetName);
    });

    const fileName =
      dataType === 'class'
        ? 'jadwal_semua_kelas.xlsx'
        : 'jadwal_semua_guru.xlsx';
    XLSX.writeFile(workbook, fileName);
  };

  const getRepeatedData = (data: ScheduleEntry[]) => {
    const processed = new Set<string>();
    const repeatedData: ScheduleEntry[] = [];

    data.forEach((originalEntry) => {
      const entryIdentifier = `${originalEntry.Hari}-${originalEntry.Kelas}-${originalEntry['Mata Pelajaran']}-${originalEntry.Guru}`;
      if (processed.has(entryIdentifier)) return;

      const sameEntries = data
        .filter(
          (e) =>
            e.Hari === originalEntry.Hari &&
            e.Kelas === originalEntry.Kelas &&
            e['Mata Pelajaran'] === originalEntry['Mata Pelajaran'] &&
            e.Guru === originalEntry.Guru
        )
        .sort((a, b) => a.waktu.localeCompare(b.waktu));

      if (sameEntries.length > 1) {
        processed.add(entryIdentifier);
        const firstTimeIndex = allTimeSlots.indexOf(
          sameEntries[0].waktu
        );

        for (let i = 0; i < sameEntries.length; i++) {
          const currentTimeIndex = allTimeSlots.indexOf(
            sameEntries[i].waktu
          );
          if (currentTimeIndex === firstTimeIndex + i) {
            repeatedData.push(sameEntries[i]);
          }
        }
      } else {
        repeatedData.push(originalEntry);
      }
    });

    return repeatedData;
  };

  const generatePdfBody = (
    data: ScheduleEntry[],
    localViewType: 'class' | 'teacher'
  ) => {
    const fullData = getRepeatedData(data);
    return allTimeSlots.map((time) => {
      const row = [time.replace(' - ', '\n-\n')];
      daysInFile.forEach((day) => {
        const entry = fullData.find(
          (e) => e.Hari === day && e.waktu === time
        );
        if (entry) {
          const mainText =
            localViewType === 'class'
              ? entry['Mata Pelajaran']
              : entry.Kelas;
          const subText =
            localViewType === 'class'
              ? entry.Guru.replace(/, /g, '\n') // Handle multi-teacher for PDF
              : entry['Mata Pelajaran'];
          row.push(`${mainText}\n${subText}`);
        } else {
          row.push('-');
        }
      });
      return row;
    });
  };

 const drawCellHandler = (data: any, localViewType: 'class' | 'teacher') => {
    const doc = data.doc;
    const cell = data.cell;
    const raw = typeof cell.raw === 'string'
      ? cell.raw
      : (cell.text || []).join('\n');
  
    if (data.column.index > 0 && raw.includes('\n') && raw !== '-') {
        const lines = raw.split('\n');
        const mainText = lines[0];
        const subText = lines.slice(1).join('\n');
        
        doc.saveGraphicsState();
        doc.setFillColor(cell.styles.fillColor);
        doc.setDrawColor(0, 0, 0); 
        doc.setLineWidth(0.1); 
        doc.rect(cell.x, cell.y, cell.width, cell.height, 'FD'); 
        doc.restoreGraphicsState();
  
        const textX = cell.x + cell.width / 2;
        
        const isClassView = localViewType === 'class';
  
        // Calculate total text height to center it
        const mainTextHeight = doc.getTextDimensions(mainText, { fontStyle: isClassView ? 'bold' : 'normal' }).h;
        const subTextHeight = subText ? doc.getTextDimensions(subText, { fontStyle: isClassView ? 'normal' : 'bold' }).h : 0;
        const totalTextHeight = mainTextHeight + subTextHeight;
        
        // Adjust Y to center the whole block
        let textY = cell.y + (cell.height - totalTextHeight) / 2 + mainTextHeight / 2 - 1;
        
        doc.setFont('helvetica', isClassView ? 'bold' : 'normal');
        doc.text(mainText, textX, textY, { align: 'center', baseline: 'middle' });

        if (subText) {
          doc.setFont('helvetica', isClassView ? 'normal' : 'bold');
          doc.text(subText, textX, textY + mainTextHeight / 2, { align: 'center', baseline: 'top' });
        }
    }
  };
  
  

  const downloadPDF = (
    dataToUse: ScheduleEntry[],
    localViewType: 'class' | 'teacher',
    name: string
  ) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = getTitle(localViewType, name);

    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, {
      align: 'center',
    });

    const head = [['Waktu', ...daysInFile]];
    const body = generatePdfBody(dataToUse, localViewType);

    autoTable(doc, {
      head,
      body,
      startY: 18,
      theme: 'grid',
      styles: {
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
        fontSize: 7.5,
        lineWidth: 0.1,      
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 20,
        fontStyle: 'bold',
        lineWidth: 0.1,      
        lineColor: [0, 0, 0],
      },
      didDrawCell: (data) => drawCellHandler(data, localViewType),
    });
    

    doc.save(`jadwal-${name.replace(/ /g, '_')}.pdf`);
  };

  const downloadAllPagesPDF = (
    list: string[],
    dataType: 'class' | 'teacher'
  ) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    list.forEach((itemName, index) => {
      if (index > 0) doc.addPage();

      const itemData =
        dataType === 'class'
          ? allData.filter((entry) =>
              entry.Kelas.split(',').map((c) => c.trim()).includes(itemName)
            )
          : allData.filter((entry) => entry.Guru.split(', ').includes(itemName));

      const title = getTitle(dataType, itemName);
      doc.setFontSize(18);
      doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, {
        align: 'center',
      });

      const head = [['Waktu', ...daysInFile]];
      const body = generatePdfBody(itemData, dataType);

      autoTable(doc, {
        head,
        body,
        startY: 18,
        theme: 'grid',
        styles: {
          halign: 'center',
          valign: 'middle',
          cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
          fontSize: 7.5,
          lineWidth: 0.1,      
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 20,
          fontStyle: 'bold',
          lineWidth: 0.1,      
          lineColor: [0, 0, 0],
        },
        didDrawCell: (data) => drawCellHandler(data, dataType),
      });
    });
    

    const fileName =
      dataType === 'class'
        ? 'jadwal_semua_kelas.pdf'
        : 'jadwal_semua_guru.pdf';
    doc.save(fileName);
  };
  
    const generateDocxTableRows = (data: ScheduleEntry[], localViewType: 'class' | 'teacher') => {
    const header = new TableRow({
      children: ['Waktu', ...daysInFile].map(text => new TableCell({ children: [new Paragraph({ text, bold: true, alignment: 'center' })], verticalAlign: VerticalAlign.CENTER })),
      tableHeader: true,
    });

    const bodyRows = allTimeSlots.map(time => {
      const cells = [new TableCell({ children: [new Paragraph({ text: time.replace(' - ', '\n'), alignment: 'center'})], verticalAlign: VerticalAlign.CENTER })];
      
      daysInFile.forEach(day => {
        const entry = data.find(e => e.Hari === day && e.waktu === time);
        if (entry) {
          const mainText = localViewType === 'class' ? entry['Mata Pelajaran'] : entry.Kelas;
          const subText = localViewType === 'class' ? entry.Guru.replace(/, /g, '\n') : entry['Mata Pelajaran'];

          const paragraphChildren = [
              new TextRun({ text: mainText, bold: localViewType === 'class' }),
              new TextRun({ text: `\n${subText}`, bold: localViewType === 'teacher' }),
          ];

          cells.push(new TableCell({ children: [new Paragraph({ children: paragraphChildren, alignment: 'center' })], verticalAlign: VerticalAlign.CENTER }));
        } else {
          cells.push(new TableCell({ children: [new Paragraph({text: '-', alignment: 'center'})], verticalAlign: VerticalAlign.CENTER }));
        }
      });
      return new TableRow({ children: cells });
    });

    return [header, ...bodyRows];
  };

  const downloadDOCX = (dataToUse: ScheduleEntry[], localViewType: 'class' | 'teacher', name: string) => {
    const title = getTitle(localViewType, name);

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: 'center' }),
          new Table({
            rows: generateDocxTableRows(dataToUse, localViewType),
            width: { size: 100, type: 'pct' },
          }),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `jadwal-${name.replace(/ /g, '_')}.docx`);
    });
  };

  const downloadAllPagesDOCX = (list: string[], dataType: 'class' | 'teacher') => {
    const sections: any[] = [];
  
    list.forEach((itemName) => {
      const itemData =
        dataType === 'class'
          ? allData.filter((entry) => entry.Kelas.split(',').map((c) => c.trim()).includes(itemName))
          : allData.filter((entry) => entry.Guru.split(', ').includes(itemName));
      
      const title = getTitle(dataType, itemName);
      
      const tableRows = generateDocxTableRows(itemData, dataType);
      
      sections.push(
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: 'center', spacing: { after: 200 } }),
        new Table({
          rows: tableRows,
          width: { size: 100, type: 'pct' },
        }),
        new Paragraph({ text: '', pageBreakBefore: true }) // Add page break after each table except the last one.
      );
    });

    sections.pop(); // Remove the last page break
  
    const doc = new Document({
      sections: [{
        children: sections,
      }],
    });
  
    const fileName = dataType === 'class' ? 'jadwal_semua_kelas.docx' : 'jadwal_semua_guru.docx';
    
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, fileName);
    });
  };

  const isDownloadSingleDisabled = viewType.startsWith('all-');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() =>
            downloadXLSX(
              filteredData,
              viewType.startsWith('all-')
                ? viewType === 'all-class'
                  ? 'class'
                  : 'teacher'
                : (viewType as 'class' | 'teacher'),
              selectionName
            )
          }
          disabled={isDownloadSingleDisabled}
        >
          <FileType className="mr-2 h-4 w-4" />
          <span>Download sebagai XLSX</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadPDF(
              filteredData,
              viewType.startsWith('all-')
                ? viewType === 'all-class'
                  ? 'class'
                  : 'teacher'
                : (viewType as 'class' | 'teacher'),
              selectionName
            )
          }
          disabled={isDownloadSingleDisabled}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Download sebagai PDF</span>
        </DropdownMenuItem>
         <DropdownMenuItem
          onClick={() => downloadDOCX(
             filteredData,
              viewType.startsWith('all-')
                ? viewType === 'all-class'
                  ? 'class'
                  : 'teacher'
                : (viewType as 'class' | 'teacher'),
              selectionName
          )}
          disabled={isDownloadSingleDisabled}
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Download sebagai DOCX</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => downloadAllPagesXLSX(classList, 'class')}
        >
          <School className="mr-2 h-4 w-4" />
          <span>Download Semua Kelas (XLSX)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadAllPagesXLSX(teacherList, 'teacher')
          }
        >
          <Users className="mr-2 h-4 w-4" />
          <span>Download Semua Guru (XLSX)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => downloadAllPagesPDF(classList, 'class')}
        >
          <School className="mr-2 h-4 w-4" />
          <span>Download Semua Kelas (PDF)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadAllPagesPDF(teacherList, 'teacher')
          }
        >
          <Users className="mr-2 h-4 w-4" />
          <span>Download Semua Guru (PDF)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => downloadAllPagesDOCX(classList, 'class')}>
          <School className="mr-2 h-4 w-4" />
          <span>Download Semua Kelas (DOCX)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadAllPagesDOCX(teacherList, 'teacher')}>
          <Users className="mr-2 h-4 w-4" />
          <span>Download Semua Guru (DOCX)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
