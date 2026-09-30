import React, { useState } from 'react';
import { CLUB_CREST_URL } from '../data/initialData';
import { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  title: string;
  subtitle?: string;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  /** Cantidad de notificaciones pendientes (el punto rojo solo aparece si hay). */
  notificaciones?: number;
  onBackClick?: () => void;
  showBack?: boolean;
  /** Email y rol de quien ingresó (sin definir en modo demo). */
  usuario?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle = 'Club Elbio Fernández',
  onSearchClick,
  onNotificationsClick,
  notificaciones = 0,
  onBackClick,
  showBack = false,
  usuario,
  onLogout,
}) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
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
              {notificaciones > 0 && (
                <span className="absolute top-1.5 right-1 min-w-4 h-4 px-1 rounded-full bg-[#b51a1b] text-white text-[9px] font-bold flex items-center justify-center">
                  {notificaciones > 9 ? '9+' : notificaciones}
                </span>
              )}
            </button>
          )}

          {onLogout && (
            <div className="relative">
              <button
                onClick={() => setMenuAbierto((v) => !v)}
                aria-label="Mi cuenta"
                aria-expanded={menuAbierto}
                className="w-10 h-10 flex items-center justify-center text-[#44474f] hover:text-[#00183a] transition-colors rounded-full active:bg-[#eceef1]"
              >
                <span className="material-symbols-outlined text-[24px]">account_circle</span>
              </button>
              {menuAbierto && (
                <>
                  <button
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuAbierto(false)}
                  />
                  <div className="absolute right-0 top-11 z-20 w-64 bg-white rounded-xl shadow-xl border border-[#e0e3e6] p-3 flex flex-col gap-2">
                    <p className="font-sans text-[12px] text-[#44474f] break-all">{usuario}</p>
                    <button
                      onClick={() => {
                        setMenuAbierto(false);
                        onLogout();
                      }}
                      className="h-10 rounded-lg bg-[#f2f4f7] text-[#b51a1b] font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
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
