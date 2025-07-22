
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ScheduleEntry, TeacherEntry, ViewType } from '@/types';
import { parseCsv, parseTeachers } from '@/lib/csv-parser';
import { AppLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MultiFileUploader from '@/components/multi-file-uploader';
import ViewControls from '@/components/view-controls';
import ScheduleTable from '@/components/schedule-table';
import ConflictDetector from '@/components/conflict-detector';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DownloadMenu from '@/components/download-menu';
import { useToast } from '@/hooks/use-toast';


export default function Home() {
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherEntry[]>([]);
  const [rawCsv, setRawCsv] = useState<string>('');
  const [rawTeachersCsv, setRawTeachersCsv] = useState<string>('');
  const [viewType, setViewType] = useState<ViewType>('class');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sortedScheduleDays, setSortedScheduleDays] = useState<string[]>([]);
  const [isUploaderVisible, setUploaderVisible] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedScheduleCsv = localStorage.getItem('jadwal-in-rawCsv');
      const savedTeachersCsv = localStorage.getItem('jadwal-in-rawTeachersCsv');
      const savedView = localStorage.getItem('jadwal-in-viewType');
      
      if (savedScheduleCsv && savedTeachersCsv) {
        handleDataProcessing(savedScheduleCsv, savedTeachersCsv, false); // Don't show uploader on initial load
      } else {
        setUploaderVisible(true); // If no data, show uploader
      }
      if (savedView) {
        setViewType(JSON.parse(savedView));
      }
    } catch (error) {
      console.error("Gagal memuat dari localStorage", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Data',
        description: 'Tidak dapat memuat data jadwal yang tersimpan.'
      });
      setUploaderVisible(true);
      clearAllData(); // Clear potentially corrupted data
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isMounted) {
      if (rawCsv && rawTeachersCsv) {
        localStorage.setItem('jadwal-in-rawCsv', rawCsv);
        localStorage.setItem('jadwal-in-rawTeachersCsv', rawTeachersCsv);
      } else {
        localStorage.removeItem('jadwal-in-rawCsv');
        localStorage.removeItem('jadwal-in-rawTeachersCsv');
      }
      localStorage.setItem('jadwal-in-viewType', JSON.stringify(viewType));
    }
  }, [rawCsv, rawTeachersCsv, viewType, isMounted]);

  const allIndividualClasses = useMemo(() => {
    const individualClasses = new Set<string>();
    scheduleData.forEach(entry => {
        const classes = entry.Kelas.split(',').map(c => c.trim());
        classes.forEach(c => {
            if (c) individualClasses.add(c);
        });
    });
    return Array.from(individualClasses).sort();
  }, [scheduleData]);


  const teacherList = useMemo(() => {
    return teacherData.map(t => t['Nama Guru']).sort();
  }, [teacherData]);

  const allTimeSlots = useMemo(() => {
    return Array.from(new Set(scheduleData.map(item => item.waktu)))
      .sort((a, b) => a.split(' - ')[0].localeCompare(b.split(' - ')[0]));
  }, [scheduleData]);
  
  useEffect(() => {
    if (viewType === 'class' && allIndividualClasses.length > 0 && !allIndividualClasses.includes(selectedClass ?? '')) {
      setSelectedClass(allIndividualClasses[0]);
    } else if (viewType === 'teacher' && teacherList.length > 0 && !teacherList.includes(selectedTeacher ?? '')) {
      setSelectedTeacher(teacherList[0]);
    }
  }, [allIndividualClasses, selectedClass, teacherList, selectedTeacher, viewType]);


  const handleDataProcessing = (scheduleCsv: string, teachersCsv: string, showUploader: boolean = true) => {
    try {
      const parsedSchedule = parseCsv(scheduleCsv);
      const parsedTeachers = parseTeachers(teachersCsv);
      setRawCsv(scheduleCsv);
      setRawTeachersCsv(teachersCsv);
      setTeacherData(parsedTeachers);
      
      const teacherMap = new Map(parsedTeachers.map(t => [t.idGuru, t['Nama Guru']]));

      const mergedData = parsedSchedule.map(entry => {
        const teacherName = teacherMap.get(entry.idGuru) || entry.Guru; // Fallback to original name if not found
        return { ...entry, Guru: teacherName };
      });

      // Grouping logic for multi-teacher classes
      const scheduleMap = new Map<string, ScheduleEntry>();
      mergedData.forEach(entry => {
        // A unique key for each class session (day, time, class, subject)
        const key = `${entry.Hari}-${entry.waktu}-${entry.Kelas}-${entry['Mata Pelajaran']}`;
        if (scheduleMap.has(key)) {
          // If exists, append the new teacher's ID and name
          const existingEntry = scheduleMap.get(key)!;
          
          const newIdGuru = `${existingEntry.idGuru},${entry.idGuru}`;
          const newGuru = `${existingEntry.Guru}, ${entry.Guru}`;

          scheduleMap.set(key, { ...existingEntry, idGuru: newIdGuru, Guru: newGuru });
        } else {
          // If new, just add it to the map
          scheduleMap.set(key, entry);
        }
      });
      
      const consolidatedData = Array.from(scheduleMap.values());
      
      setScheduleData(consolidatedData);
  
      const individualClasses = new Set<string>();
      consolidatedData.forEach(entry => {
          const classes = entry.Kelas.split(',').map(c => c.trim());
          classes.forEach(c => {
              if (c) individualClasses.add(c);
          });
      });
  
      const classes = Array.from(individualClasses).sort();
      const teachers = parsedTeachers.map(t => t['Nama Guru']).sort();
      
      if (viewType === 'class' && classes.length > 0) {
        setSelectedClass(classes[0]);
      } else if (viewType === 'teacher' && teachers.length > 0) {
        setSelectedTeacher(teachers[0]);
      } else {
         setSelectedClass(classes.length > 0 ? classes[0] : null);
         setSelectedTeacher(teachers.length > 0 ? teachers[0] : null);
      }
  
      const daysInFile = Array.from(new Set(consolidatedData.map(item => item.Hari)));
      const orderedDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];
      const sortedDays = daysInFile.sort((a, b) => orderedDays.indexOf(a) - orderedDays.indexOf(b));
      setSortedScheduleDays(sortedDays);

      setUploaderVisible(false); // Hide uploader on successful processing

    } catch(e) {
       const errorMessage = e instanceof Error ? e.message : 'Format data tidak valid.';
       toast({
        variant: 'destructive',
        title: 'Gagal Memproses Data',
        description: errorMessage,
      });
      setUploaderVisible(true); // Keep uploader visible on error
    }
  };
  
  const clearAllData = () => {
    setScheduleData([]);
    setTeacherData([]);
    setRawCsv('');
    setRawTeachersCsv('');
    setViewType('class');
    setSelectedClass(null);
    setSelectedTeacher(null);
    setSortedScheduleDays([]);
    localStorage.removeItem('jadwal-in-rawCsv');
    localStorage.removeItem('jadwal-in-rawTeachersCsv');
    localStorage.removeItem('jadwal-in-viewType');
  }

  const handleShowUploader = () => {
    setUploaderVisible(true);
  }

  const filteredData = useMemo(() => {
    if (viewType === 'class' && selectedClass) {
       return scheduleData.filter(entry => 
         entry.Kelas.split(',').map(c => c.trim()).includes(selectedClass)
       );
    }
    if (viewType === 'teacher' && selectedTeacher) {
      // Handle multi-teacher entries: check if the teacher's name is in the comma-separated string.
      return scheduleData.filter(entry => 
        entry.Guru.split(',').map(name => name.trim()).includes(selectedTeacher)
      );
    }
    return scheduleData;
  }, [scheduleData, viewType, selectedClass, selectedTeacher]);


  const currentSelectionName = useMemo(() => {
    if (viewType === 'class') return selectedClass;
    if (viewType === 'teacher') return selectedTeacher;
    if (viewType === 'all-class') return 'Semua Kelas';
    if (viewType === 'all-teacher') return 'Semua Guru';
    return '';
  }, [viewType, selectedClass, selectedTeacher]);

  if (!isMounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <AppLogo className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground font-headline">Jadwal.in</h1>
          </div>
          {scheduleData.length > 0 && !isUploaderVisible && (
            <div className="flex items-center gap-2">
              <DownloadMenu 
                  allData={scheduleData}
                  filteredData={filteredData}
                  viewType={viewType}
                  selectionName={currentSelectionName ?? ''}
                  allTimeSlots={allTimeSlots}
                  classList={allIndividualClasses}
                  teacherList={teacherList}
                  daysInFile={sortedScheduleDays}
                  teacherData={teacherData}
               />
              <Button variant="outline" onClick={handleShowUploader}>
                Input Data Baru
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        {isUploaderVisible ? (
          <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
             <MultiFileUploader 
                onProcess={handleDataProcessing} 
                hasPreviousData={scheduleData.length > 0}
                onUsePreviousData={() => setUploaderVisible(false)}
             />
          </div>
        ) : (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Tinjauan Jadwal</CardTitle>
                  <CardDescription>Lihat dan atur jadwal pelajaran Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col gap-4">
                      <ViewControls currentView={viewType} onViewChange={setViewType} />
                    
                    {viewType === 'class' && allIndividualClasses.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="class-select" className="flex-shrink-0">Pilih Kelas:</Label>
                        <Select value={selectedClass ?? ''} onValueChange={setSelectedClass}>
                          <SelectTrigger id="class-select" className="w-auto min-w-[180px]">
                            <SelectValue placeholder="Pilih kelas" />
                          </SelectTrigger>
                          <SelectContent>
                            {allIndividualClasses.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {viewType === 'teacher' && teacherList.length > 0 && (
                       <div className="flex items-center gap-2">
                        <Label htmlFor="teacher-select" className="flex-shrink-0">Pilih Guru:</Label>
                        <Select value={selectedTeacher ?? ''} onValueChange={setSelectedTeacher}>
                          <SelectTrigger id="teacher-select" className="w-auto min-w-[180px]">
                            <SelectValue placeholder="Pilih guru" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherList.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {viewType === 'all-class' ? (
                <div className="space-y-8">
                  {allIndividualClasses.map((className) => (
                    <ScheduleTable 
                      key={className}
                      data={scheduleData.filter(entry => entry.Kelas.split(',').map(c=>c.trim()).includes(className))} 
                      viewType="class" 
                      selectionName={className}
                      allTimeSlots={allTimeSlots}
                      daysInFile={sortedScheduleDays}
                    />
                  ))}
                </div>
              ) : viewType === 'all-teacher' ? (
                <div className="space-y-8">
                  {teacherList.map((teacherName) => (
                    <ScheduleTable 
                      key={teacherName}
                      data={scheduleData.filter(entry => entry.Guru.split(',').map(name => name.trim()).includes(teacherName))} 
                      viewType="teacher" 
                      selectionName={teacherName}
                      allTimeSlots={allTimeSlots}
                      daysInFile={sortedScheduleDays}
                    />
                  ))}
                </div>
              ) : (
                 <ScheduleTable 
                  data={filteredData} 
                  viewType={viewType} 
                  selectionName={currentSelectionName ?? ''}
                  allTimeSlots={allTimeSlots} 
                  daysInFile={sortedScheduleDays}
                />
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <ConflictDetector rawCsvData={rawCsv} rawTeachersCsvData={rawTeachersCsv} />
              </div>
            </div>
           
          </div>
        )}
      </main>
       <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Jadwal.in. All rights reserved.
      </footer>
    </div>
  );
}
