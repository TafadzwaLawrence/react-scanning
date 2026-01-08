import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-md',
}) => {
  return (
    <div
      className={`bg-gray-100 ${width} ${height} ${rounded} animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
