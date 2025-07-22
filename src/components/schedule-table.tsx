
'use client';

import { useMemo } from 'react';
import type { ScheduleEntry, ViewType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileWarning } from 'lucide-react';

interface ScheduleTableProps {
  data: ScheduleEntry[];
  viewType: ViewType;
  selectionName: string;
  allTimeSlots: string[];
  daysInFile: string[];
}

interface GridCell {
  entry: ScheduleEntry | null;
  rowSpan: number;
}

export default function ScheduleTable({ data, viewType, selectionName, allTimeSlots, daysInFile }: ScheduleTableProps) {
  
  const { timeSlots, days, grid } = useMemo(() => {
    const daysToRender = daysInFile;
    const uniqueTimeSlots = allTimeSlots;

    const grid: (GridCell | null)[][] = uniqueTimeSlots.map(() => 
      Array(daysToRender.length).fill(null)
    );
    const processed = new Set<string>();

    const currentViewType = viewType.startsWith('all-') ? (viewType === 'all-class' ? 'class' : 'teacher') : viewType;

    daysToRender.forEach((day, dayIndex) => {
      const dayEntries = data.filter(e => e.Hari === day);

      dayEntries.forEach(entry => {
        const timeIndex = uniqueTimeSlots.indexOf(entry.waktu);
        if (timeIndex === -1) return;

        if (grid[timeIndex][dayIndex] !== null) return;
        
        const entryIdentifier = currentViewType === 'teacher' ? entry['Kelas'] : entry['Mata Pelajaran'];
        const subIdentifier = currentViewType === 'teacher' ? entry['Mata Pelajaran'] : entry['Guru'];

        const entryKey = `${day}-${entry.waktu}-${entryIdentifier}-${subIdentifier}`;

        if (!processed.has(entryKey)) {
          const sameEntries = dayEntries.filter(e => 
            (currentViewType === 'teacher' ? e['Kelas'] : e['Mata Pelajaran']) === entryIdentifier &&
            (currentViewType === 'teacher' ? e['Mata Pelajaran'] : e['Guru']) === subIdentifier &&
            e.Hari === day
          ).sort((a,b) => a.waktu.localeCompare(b.waktu));
          
          if (sameEntries.length > 0) {
            const rowSpan = sameEntries.length;
            const firstTimeIndex = uniqueTimeSlots.indexOf(sameEntries[0].waktu);
            
            if (firstTimeIndex !== -1 && grid[firstTimeIndex][dayIndex] === null) {
              grid[firstTimeIndex][dayIndex] = { entry: sameEntries[0], rowSpan };
              
              for (let i = 0; i < rowSpan; i++) {
                 const subsequentTimeIndex = uniqueTimeSlots.indexOf(sameEntries[i].waktu);
                 if (subsequentTimeIndex !== -1) {
                    const keyToMark = `${day}-${sameEntries[i].waktu}-${entryIdentifier}-${subIdentifier}`;
                    processed.add(keyToMark);
                    if (i > 0) {
                       grid[subsequentTimeIndex][dayIndex] = { entry: sameEntries[i], rowSpan: 0 };
                    }
                 }
              }
            }
          }
        }
      });
    });

    return { timeSlots: uniqueTimeSlots, days: daysToRender, grid };
  }, [data, viewType, allTimeSlots, daysInFile]);

  const renderGridView = () => {
    const currentViewType = viewType.startsWith('all-') ? (viewType === 'all-class' ? 'class' : 'teacher') : viewType;
    const title = currentViewType === 'class' ? `Jadwal Pelajaran Kelas ${selectionName}` : `Jadwal Mengajar Guru ${selectionName}`;
    
    return (
      <Card>
          <CardHeader>
              <CardTitle className="font-headline text-center text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                  <Table className="border-collapse w-full">
                      <TableHeader>
                          <TableRow>
                              <TableHead className="border p-2 w-[120px] text-center font-bold bg-muted">Waktu</TableHead>
                              {days.map(day => (
                                  <TableHead key={day} className="border p-2 text-center font-bold bg-muted">{day}</TableHead>
                              ))}
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {timeSlots.map((time, timeIndex) => (
                              <TableRow key={time}>
                                  <TableCell className="border p-2 font-mono text-center align-middle whitespace-pre-wrap">{time.replace(' - ', '\n-\n')}</TableCell>
                                  {days.map((day, dayIndex) => {
                                      const cell = grid[timeIndex][dayIndex];
                                      if (cell === null) {
                                          return <TableCell key={`${time}-${day}`} className="border p-2 text-center align-middle">-</TableCell>;
                                      }
                                      if (cell.rowSpan === 0) {
                                          return null;
                                      }
                                      const mainText = currentViewType === 'teacher' ? cell.entry.Kelas : cell.entry['Mata Pelajaran'];
                                      const subText = currentViewType === 'teacher' ? cell.entry['Mata Pelajaran'] : cell.entry.Guru;

                                      return (
                                          <TableCell key={`${time}-${day}`} rowSpan={cell.rowSpan} className="border p-2 text-center align-middle bg-primary/10">
                                              <div className="font-semibold">{mainText}</div>
                                              <div className="text-xs text-muted-foreground whitespace-pre-line">{subText.replace(/, /g, '\n')}</div>
                                          </TableCell>
                                      );
                                  })}
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    );
  }

  if (data.length === 0 && selectionName) {
     const title = viewType === 'class' ? `Jadwal Pelajaran Kelas ${selectionName}` : `Jadwal Mengajar Guru ${selectionName}`;
     return (
         <Card>
            <CardHeader>
               <CardTitle className="font-headline text-center text-2xl">{title}</CardTitle>
               <CardDescription className="text-center">Tidak ada jadwal untuk {selectionName}.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="text-center p-10 border-dashed border-2 rounded-lg">
                  <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium font-headline">Jadwal Kosong</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Tidak ada data jadwal yang ditemukan untuk pilihan ini.</p>
               </div>
            </CardContent>
         </Card>
      )
  }
  
  if (data.length === 0) {
    return (
        <Card className="text-center p-10">
            <FileWarning className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium font-headline">No Schedule Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload a file or select an item to see the schedule.</p>
        </Card>
    )
  }

  return renderGridView();
}
