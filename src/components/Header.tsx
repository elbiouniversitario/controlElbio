import React from 'react';
import { CLUB_CREST_URL } from '../data/initialData';
import { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  title: string;
  subtitle?: string;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle = 'Club Elbio Fernández',
  onSearchClick,
  onNotificationsClick,
  onBackClick,
  showBack = false,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#f7f9fc]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-[env(safe-area-inset-top,0px)]">
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={onBackClick}
              aria-label="Regresar"
              className="w-10 h-10 -ml-1 flex items-center justify-center text-[#00183a] active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-[10px] tracking-wider text-[#b51a1b] uppercase">
                {subtitle}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#b51a1b]"></span>
            </div>
            <h1 className="font-heading font-semibold text-[18px] text-[#00183a] tracking-tight truncate leading-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              aria-label="Buscar"
              className="w-10 h-10 flex items-center justify-center text-[#44474f] hover:text-[#00183a] transition-colors rounded-full active:bg-[#eceef1]"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>
          )}

          {onNotificationsClick && (
            <button
              onClick={onNotificationsClick}
              aria-label="Notificaciones"
              className="w-10 h-10 flex items-center justify-center text-[#44474f] hover:text-[#00183a] transition-colors rounded-full active:bg-[#eceef1] relative"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#b51a1b] animate-pulse"></span>
            </button>
          )}

          <div className="flex items-center justify-center pl-1">
            <img
              src={CLUB_CREST_URL}
              alt="Escudo Club Elbio Fernández"
              className="w-8 h-10 object-contain drop-shadow-sm shrink-0"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
