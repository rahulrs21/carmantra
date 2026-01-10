'use client';

import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

interface ActivityHistoryButtonProps {
  onClick: () => void;
}

export function ActivityHistoryButton({ onClick }: ActivityHistoryButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-8 right-8 rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40 bg-blue-600 hover:bg-blue-700 text-white"
      title="View Activity History"
    >
      <History className="w-6 h-6" />
    </Button>
  );
}
