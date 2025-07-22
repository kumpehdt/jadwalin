import type { ScheduleEntry, TeacherEntry } from '@/types';

function detectDelimiter(header: string): string {
  const delimiters = [',', '\t', ';'];
  let maxCount = 0;
  let detectedDelimiter = ','; // Default to comma

  delimiters.forEach(delimiter => {
    // Create a RegExp from the delimiter to count occurrences globally
    const regex = new RegExp(delimiter, 'g');
    const count = (header.match(regex) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  });

  // If no delimiters are found, default to comma (for single-column files)
  return maxCount > 0 ? detectedDelimiter : ',';
}

export function parseCsv(csvText: string): ScheduleEntry[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  
  const requiredHeaders = ['Hari', 'Jam Ke', 'Kelas', 'Mata Pelajaran', 'waktu'];
  const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));

  if (!hasRequiredHeaders) {
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    console.error('File Jadwal tidak memiliki kolom yang dibutuhkan:', missingHeaders);
    console.error('Kolom yang terdeteksi:', headers);
    throw new Error(`Format file jadwal tidak valid. Kolom yang hilang: ${missingHeaders.join(', ')}.`);
  }
  
  const waktuRegex = /^\d{2}/; // Regex to check if the string starts with two digits.

  const data = lines.slice(1).map(line => {
    if (line.trim() === '') return null;
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const entry: { [key: string]: string } = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });
    
    // Validate the 'waktu' field
    if (!entry.waktu || !waktuRegex.test(entry.waktu)) {
      return null; // Ignore this row if 'waktu' is invalid
    }
    
     // Ensure idGuru exists, even if it's empty
    if (!('idGuru' in entry)) {
        entry['idGuru'] = '';
    }
    return entry as ScheduleEntry;
  }).filter((entry): entry is ScheduleEntry => entry !== null);

  return data;
}


export function parseTeachers(csvText: string): TeacherEntry[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Use the first line as header for delimiter detection, even if we skip it later
  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);

  // We need at least a header and one data line
  if (lines.length < 2) return [];

  // Skip the header line and process the rest
  const data = lines.slice(1).map(line => {
    if (line.trim() === '') return null;

    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    
    // Ensure we have at least two columns
    if (values.length < 2) return null;

    // Assign based on fixed column order
    const entry: TeacherEntry = {
      'idGuru': values[0],
      'Nama Guru': values[1]
    };
    
    return entry;
  }).filter((entry): entry is TeacherEntry => entry !== null && entry.idGuru !== '' && entry['Nama Guru'] !== '');

  if (data.length === 0) {
      throw new Error('Tidak ada data guru yang valid ditemukan di file. Pastikan file memiliki setidaknya dua kolom: idGuru dan Nama Guru, dan tidak kosong.');
  }

  return data;
}
