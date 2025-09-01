import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({ 
  className = '', 
  orientation = 'horizontal' 
}) => {
  const baseClasses = orientation === 'horizontal' 
    ? 'w-full h-px border-t border-surface' 
    : 'h-full w-px border-l border-surface';
  
  return (
    <div className={`${baseClasses} ${className}`} />
  );
};