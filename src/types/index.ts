
export interface ScheduleEntry {
  'Hari': string;
  'Jam Ke': string;
  'Kelas': string;
  'Mata Pelajaran': string;
  'Guru': string;
  'IDHari': string;
  'idGuru': string;
  'waktu': string;
  [key: string]: string; // For dynamic access
}

export interface TeacherEntry {
  'idGuru': string;
  'Nama Guru': string;
}

export type ViewType = 'teacher' | 'class' | 'all-class' | 'all-teacher';

export interface LayoutConfig {
  columnsToDisplay: string[];
  groupBy: string | null;
}

    