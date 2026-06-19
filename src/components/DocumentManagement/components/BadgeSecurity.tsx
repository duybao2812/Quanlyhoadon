import { SecurityLevel, SECURITY_LEVELS } from '../../../types/documentTypes';
import { cn } from '../../../lib/utils';

interface BadgeSecurityProps {
  level: SecurityLevel;
  className?: string;
}

export function BadgeSecurity({ level, className }: BadgeSecurityProps) {
  const config = SECURITY_LEVELS.find(s => s.value === level) || SECURITY_LEVELS[0];
  
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <span className={cn(
      'px-2 py-0.5 text-xs font-medium rounded border',
      colorClasses[config.color],
      className
    )}>
      {config.label}
    </span>
  );
}
