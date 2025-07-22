
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getConflictDetections } from '@/app/actions';
import type { DetectConflictsOutput } from '@/ai/flows/detect-conflicts-flow';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ConflictDetectorProps {
  rawCsvData: string;
  rawTeachersCsvData: string;
}

export default function ConflictDetector({ rawCsvData, rawTeachersCsvData }: ConflictDetectorProps) {
  const [conflicts, setConflicts] = useState<DetectConflictsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDetectConflicts = useCallback(async () => {
    if (!rawCsvData || !rawTeachersCsvData) {
      setConflicts(null);
      setError(null);
      return;
    };
    
    setIsLoading(true);
    setError(null);
    setConflicts(null);

    try {
      const result = await getConflictDetections(rawCsvData, rawTeachersCsvData);
      setConflicts(result);
      if (result.conflicts.length === 0) {
        toast({
            title: 'Tidak Ada Konflik',
            description: 'Analisis jadwal selesai, tidak ditemukan konflik.',
            variant: 'default'
        });
      } else {
        toast({
            variant: 'destructive',
            title: 'Konflik Ditemukan!',
            description: `Terdeteksi ${result.conflicts.length} potensi konflik jadwal.`,
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Terjadi kesalahan tidak diketahui.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Gagal Deteksi Konflik',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [rawCsvData, rawTeachersCsvData, toast]);

  useEffect(() => {
    // Debounce the call to avoid rapid firing on manual input
    const timer = setTimeout(() => {
        handleDetectConflicts();
    }, 500);

    return () => clearTimeout(timer);
  }, [rawCsvData, rawTeachersCsvData, handleDetectConflicts]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-48">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Mendeteksi konflik...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center text-destructive">
          <XCircle className="h-12 w-12" />
          <p className="mt-4 font-semibold">Terjadi Kesalahan</p>
          <p className="text-sm px-4">{error}</p>
          <Button onClick={handleDetectConflicts} variant="outline" className="mt-4">
            Coba Lagi
          </Button>
        </div>
      );
    }
    if (!conflicts && (!rawCsvData || !rawTeachersCsvData)) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Hasil deteksi konflik akan muncul di sini setelah data jadwal & guru dimasukkan.
          </p>
        </div>
      );
    }
     if (!conflicts && rawCsvData && rawTeachersCsvData) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="mt-4 text-muted-foreground">Mempersiapkan deteksi...</p>
        </div>
      );
    }
    if (conflicts) {
       return (
        <ScrollArea className="h-96">
          <div className="space-y-4 animate-in fade-in-50 pr-4">
            {conflicts.conflicts.length === 0 ? (
              <Card className="text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-lg font-headline text-green-800 dark:text-green-300 flex items-center justify-center gap-2">
                    <CheckCircle className="h-6 w-6" /> Tidak Ditemukan Konflik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Bagus! Tidak ditemukan konflik jadwal untuk para guru.
                  </p>
                </CardContent>
              </Card>
            ) : (
              conflicts.conflicts.map((conflict, index) => (
                <Card key={index} className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline text-destructive flex items-center gap-2">
                      <ShieldAlert /> {conflict.guru}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">Waktu:</span> {conflict.hari}, {conflict.waktu}
                    </p>
                    <div className="text-sm">
                      <span className="font-semibold">Kelas Berkonflik:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {conflict.kelas.map((k, i) => (
                          <Badge key={`${k}-${i}`} variant="destructive">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Deteksi Konflik Otomatis
        </CardTitle>
        <CardDescription>
          AI menganalisis potensi konflik jadwal antar guru secara otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
