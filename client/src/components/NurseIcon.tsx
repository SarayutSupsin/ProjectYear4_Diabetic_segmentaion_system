import React from 'react';

interface NurseIconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Custom Vector Nurse Cap Icon component
 */
export function NurseIcon({ size = 20, color = 'currentColor', style, className }: NurseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {/* Nurse Cap Shape */}
      <path d="M3 18h18l-1.8-8a2 2 0 0 0-2-1.5H6.8A2 2 0 0 0 4.8 10L3 18z" />
      {/* Cap Fold Line */}
      <path d="M4.2 14.5h15.6" />
      {/* Red Cross / Medical Cross */}
      <path d="M12 9v3.5" />
      <path d="M10.25 10.75h3.5" />
    </svg>
  );
}

export default NurseIcon;
