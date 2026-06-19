import { UrgencyLevel, URGENCY_LEVELS } from '../../../types/documentTypes';
import { cn } from '../../../lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface BadgeUrgencyProps {
  level: UrgencyLevel;
  className?: string;
}

export function BadgeUrgency({ level, className }: BadgeUrgencyProps) {
  const config = URGENCY_LEVELS.find(u => u.value === level) || URGENCY_LEVELS[0];
  
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const Icon = level === 'very_urgent' ? AlertTriangle : Clock;

  return (
    <span className={cn(
      'px-2 py-0.5 text-xs font-medium rounded border inline-flex items-center gap-1',
      colorClasses[config.color],
      className
    )}>
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}
