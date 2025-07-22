
'use client';

import { useState, useCallback } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, Download, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';


interface MultiFileUploaderProps {
  onProcess: (scheduleCsv: string, teachersCsv: string) => void;
  hasPreviousData: boolean;
  onUsePreviousData: () => void;
}

const Uploader = ({ onFileUpload, title, description, acceptedFileTypes, file, fileName }: {
    onFileUpload: (file: File) => void,
    title: string,
    description: string,
    acceptedFileTypes: { [key: string]: string[] },
    file: File | null,
    fileName: string | null
}) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileUpload(acceptedFiles[0]);
        }
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
        maxFiles: 1,
    });

    return (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
          ${file ? 'border-green-500 bg-green-50' : ''}`}
        >
            <input {...getInputProps()} />
            {file ? (
                <>
                    <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                    <p className="mt-4 text-sm font-semibold text-green-800">{fileName}</p>
                    <p className="text-xs text-green-700">Klik atau jatuhkan file lain untuk mengganti.</p>
                </>
            ) : isDragActive ? (
                <>
                    <UploadCloud className="w-10 h-10 mx-auto text-primary animate-bounce" />
                    <p className="mt-2 text-base font-semibold text-primary">Jatuhkan file di sini...</p>
                </>
            ) : (
                <>
                    <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-base font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </>
            )}
        </div>
    );
}


export default function MultiFileUploader({ onProcess, hasPreviousData, onUsePreviousData }: MultiFileUploaderProps) {
  const { toast } = useToast();
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [teachersFile, setTeachersFile] = useState<File | null>(null);

  const convertExcelToCsv = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          resolve(csv);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const getFileContent = (file: File): Promise<string> => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      return convertExcelToCsv(file);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsText(file);
    });
  }

  const handleProcessFiles = async () => {
    if (!scheduleFile || !teachersFile) {
        toast({
            variant: 'destructive',
            title: 'File Tidak Lengkap',
            description: 'Silakan unggah file jadwal dan file data guru.',
        });
        return;
    }

    try {
        const scheduleCsv = await getFileContent(scheduleFile);
        const teachersCsv = await getFileContent(teachersFile);
        onProcess(scheduleCsv, teachersCsv);
    } catch(e) {
        const errorMessage = e instanceof Error ? e.message : 'Gagal memproses file.';
        toast({
            variant: 'destructive',
            title: 'Gagal Memproses File',
            description: errorMessage
        });
    }
  };
  
  const downloadSampleFile = (type: 'schedule' | 'teacher') => {
    let data, fileName, headers;
    
    if (type === 'schedule') {
        fileName = 'contoh_jadwal.xlsx';
        headers = ['Hari', 'Jam Ke', 'Kelas', 'Mata Pelajaran', 'Guru', 'IDHari', 'idGuru', 'waktu'];
        data = [
            { 'Hari': 'Senin', 'Jam Ke': '1', 'Kelas': '10-A', 'Mata Pelajaran': 'Matematika', 'Guru': '(kosongkan)', 'IDHari': '1', 'idGuru': 'G001', 'waktu': '07:00 - 07:45' }
        ];
    } else {
        fileName = 'contoh_data_guru.xlsx';
        headers = ['idGuru', 'Nama Guru'];
        data = [
            { 'idGuru': 'G001', 'Nama Guru': 'Budi Santoso, M.Pd.' },
            { 'idGuru': 'G002', 'Nama Guru': 'Siti Aminah, S.Kom.' }
        ];
    }

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const colWidths = headers.map(header => ({
        wch: Math.max(header.length, ...data.map(row => (row as any)[header]?.toString().length ?? 0)) + 2
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, fileName);
  }
  
  const acceptedFileTypes = { 
      'text/csv': ['.csv'], 
      'text/plain': ['.txt'], 
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
  };

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-headline">Selamat Datang di Jadwal.in</CardTitle>
        <CardDescription className="text-center">
          Impor data jadwal dan data guru Anda untuk memulai.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Uploader 
                    onFileUpload={setScheduleFile}
                    title="Unggah File Jadwal"
                    description="Format: .xlsx, .xls, .csv, .tsv"
                    acceptedFileTypes={acceptedFileTypes}
                    file={scheduleFile}
                    fileName={scheduleFile?.name ?? null}
                />
                 <Button variant="link" size="sm" onClick={() => downloadSampleFile('schedule')} className="w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Unduh Contoh File Jadwal
                </Button>
            </div>
             <div className="space-y-2">
                <Uploader 
                    onFileUpload={setTeachersFile}
                    title="Unggah File Data Guru"
                    description="Format: .xlsx, .xls, .csv, .tsv"
                    acceptedFileTypes={acceptedFileTypes}
                    file={teachersFile}
                    fileName={teachersFile?.name ?? null}
                />
                 <Button variant="link" size="sm" onClick={() => downloadSampleFile('teacher')} className="w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Unduh Contoh File Data Guru
                </Button>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {hasPreviousData && (
            <Button onClick={onUsePreviousData} className="w-full sm:w-auto" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Gunakan Data Sebelumnya
            </Button>
          )}
          <Button onClick={handleProcessFiles} className="w-full" size="lg" disabled={!scheduleFile || !teachersFile}>
            Proses Jadwal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
