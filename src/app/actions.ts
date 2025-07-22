
'use server';

import { detectConflicts } from '@/ai/flows/detect-conflicts-flow';
import type { DetectConflictsOutput } from '@/ai/flows/detect-conflicts-flow';


export async function getConflictDetections(scheduleData: string, teacherData: string): Promise<DetectConflictsOutput> {
  if (!scheduleData || !teacherData) {
    throw new Error('Schedule or teacher data is empty.');
  }

  try {
    const result = await detectConflicts({ scheduleData, teacherData });
    return result;
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    throw new Error('Failed to detect conflicts with AI.');
  }
}
