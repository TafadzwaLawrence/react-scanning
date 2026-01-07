import React from 'react';

interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  padding = 'md',
  children,
  onClick,
  className = '',
}) => {
  const variants = {
    elevated: 'bg-surface border border-transparent hover:shadow-subtle',
    outlined: 'bg-surface border border-border',
    filled: 'bg-gray-50',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl transition-all duration-200
        ${variants[variant]}
        ${paddings[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
