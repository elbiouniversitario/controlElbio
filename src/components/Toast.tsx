import React from 'react';

interface ToastProps {
  message: string | null;
  icon?: string;
  type?: 'success' | 'warning' | 'info' | 'error';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  icon = 'check_circle',
  type = 'success',
}) => {
  if (!message) return null;

  const typeStyles = {
    success: 'bg-[#2d3133] text-[#eff1f4]',
    warning: 'bg-[#3f2900] text-[#ffdead]',
    error: 'bg-[#ba1a1a] text-white',
    info: 'bg-[#0d2d59] text-white',
  }[type];

  const iconColors = {
    success: 'text-[#fabc4d]',
    warning: 'text-[#fabc4d]',
    error: 'text-white',
    info: 'text-[#acc7fc]',
  }[type];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4 max-w-[92vw]">
      <div
        className={`${typeStyles} px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-white/10 backdrop-blur-md`}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${iconColors} shrink-0`}
        >
          {icon}
        </span>
        <span className="font-heading text-xs font-semibold tracking-wide truncate max-w-[280px]">
          {message}
        </span>
      </div>
    </div>
  );
};
