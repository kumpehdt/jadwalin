
'use client';

import { Button } from '@/components/ui/button';
import type { ViewType } from '@/types';
import { Users, School, Library } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ViewControlsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function ViewControls({ currentView, onViewChange }: ViewControlsProps) {
  const classViews: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'class', label: 'Per Kelas', icon: School },
    { id: 'all-class', label: 'Semua Kelas', icon: Library },
  ];

  const teacherViews: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: 'teacher', label: 'Per Guru', icon: Users },
    { id: 'all-teacher', label: 'Semua Guru', icon: Library },
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-sm font-medium">Tampilan:</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {classViews.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={currentView === id ? 'default' : 'outline'}
              onClick={() => onViewChange(id)}
              className="transition-all"
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-6 mx-2" />
        <div className="flex flex-wrap items-center gap-2">
          {teacherViews.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={currentView === id ? 'default' : 'outline'}
              onClick={() => onViewChange(id)}
              className="transition-all"
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
