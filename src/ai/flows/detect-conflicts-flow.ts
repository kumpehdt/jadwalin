
'use server';

/**
 * @fileOverview This file defines a Genkit flow to detect scheduling conflicts for teachers.
 *
 * - detectConflicts - A function that analyzes schedule data to find conflicts.
 * - DetectConflictsInput - The input type for the detectConflicts function.
 * - DetectConflictsOutput - The return type for the detectConflictsOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectConflictsInputSchema = z.object({
  scheduleData: z.string().describe('The schedule data in CSV or TSV format.'),
  teacherData: z.string().describe('The teacher data in CSV or TSV format.'),
});
export type DetectConflictsInput = z.infer<typeof DetectConflictsInputSchema>;

const ConflictSchema = z.object({
    guru: z.string().describe("The name or ID of the teacher with the conflict."),
    hari: z.string().describe("The day of the conflict."),
    waktu: z.string().describe("The time slot of the conflict."),
    kelas: z.array(z.string()).describe("The classes where the teacher is scheduled at the same time."),
});

const DetectConflictsOutputSchema = z.object({
  conflicts: z.array(ConflictSchema).describe('A list of all detected scheduling conflicts.'),
});
export type DetectConflictsOutput = z.infer<typeof DetectConflictsOutputSchema>;

export async function detectConflicts(input: DetectConflictsInput): Promise<DetectConflictsOutput> {
  return detectConflictsFlow(input);
}

// Helper function to detect the delimiter in a CSV/TSV header
function detectDelimiter(header: string): string {
    const delimiters = [';', ',', '\t'];
    let bestDelimiter = ',';
    let maxCount = 0;

    delimiters.forEach(delimiter => {
        const count = (header.split(delimiter).length - 1);
        if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delimiter;
        }
    });

    return bestDelimiter;
}


// Helper function to parse schedule CSV/TSV text into structured data
function parseSchedule(scheduleData: string): any[] {
  const lines = scheduleData.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const entry: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });
    return entry;
  });
}

// Helper function to parse teacher data CSV/TSV into a map
function parseTeachersToMap(teacherData: string): Map<string, string> {
    const teacherMap = new Map<string, string>();
    const lines = teacherData.trim().split(/\r?\n/);
    if (lines.length < 2) return teacherMap; // header + at least one data row

    const headerLine = lines[0];
    const delimiter = detectDelimiter(headerLine);

    lines.slice(1).forEach(line => {
        if (line.trim() === '') return;
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length >= 2) {
            const idGuru = values[0];
            const namaGuru = values[1];
            if (idGuru && namaGuru) {
                teacherMap.set(idGuru, namaGuru);
            }
        }
    });

    return teacherMap;
}


const detectConflictsFlow = ai.defineFlow(
  {
    name: 'detectConflictsFlow',
    inputSchema: DetectConflictsInputSchema,
    outputSchema: DetectConflictsOutputSchema,
  },
  async (input) => {
    const scheduleEntries = parseSchedule(input.scheduleData);
    const teacherMap = parseTeachersToMap(input.teacherData);
    
    // A map to track each teacher's schedule: key is "idGuru-Hari-Waktu", value is a list of classes
    const scheduleMap = new Map<string, string[]>();

    scheduleEntries.forEach(entry => {
        const { idGuru, Hari, waktu, Kelas, 'Mata Pelajaran': MataPelajaran } = entry;
        
        // Skip entries that are invalid or for breaks
        if (!idGuru || !Hari || !waktu || !Kelas || MataPelajaran === 'Istirahat' || idGuru.trim() === '-' || idGuru.trim() === '') {
            return;
        }

        const key = `${idGuru.trim()}-${Hari.trim()}-${waktu.trim()}`;
        
        if (!scheduleMap.has(key)) {
            scheduleMap.set(key, []);
        }
        
        const scheduledClasses = scheduleMap.get(key)!;
        if (!scheduledClasses.includes(Kelas.trim())) {
            scheduledClasses.push(Kelas.trim());
        }
    });

    const conflicts: z.infer<typeof ConflictSchema>[] = [];
    
    scheduleMap.forEach((classes, key) => {
        if (classes.length > 1) {
            const [guruId, hari, waktu] = key.split('-');
            const guruName = teacherMap.get(guruId) || `Guru ID: ${guruId}`;
            
            conflicts.push({
                guru: guruName,
                hari,
                waktu,
                kelas: classes,
            });
        }
    });

    return { conflicts };
  }
);
