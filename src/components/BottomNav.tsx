import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingAlertsCount?: number;
  pendingDuesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  pendingAlertsCount = 3,
  pendingDuesCount = 5,
}) => {
  const tabs = [
    {
      id: 'alertas' as TabType,
      label: 'Alertas',
      icon: 'notifications_active',
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
    },
    {
      id: 'tesoreria' as TabType,
      label: 'Cuotas',
      icon: 'payments',
      badge: pendingDuesCount > 0 ? pendingDuesCount : undefined,
    },
    {
      id: 'planilla' as TabType,
      label: 'Planilla',
      icon: 'assignment',
      badge: undefined,
    },
    {
      id: 'jugador' as TabType,
      label: 'Mi Ficha',
      icon: 'badge',
      badge: undefined,
    },
    {
      id: 'club' as TabType,
      label: 'Club',
      icon: 'shield',
      badge: undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom,0px)] bg-[#ffffff]/92 backdrop-blur-xl shadow-[0_-2px_14px_rgba(13,45,89,0.08)] border-t border-[#e0e3e6]/60">
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[58px] h-12 rounded-xl transition-all relative ${
                isActive
                  ? 'text-[#b51a1b] font-bold scale-105'
                  : 'text-[#44474f] hover:text-[#00183a]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[24px] transition-transform ${
                    isActive ? 'scale-110 font-bold' : ''
                  }`}
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 bg-[#b51a1b] text-white text-[10px] font-heading font-black rounded-full flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="font-heading text-[10px] tracking-tight mt-0.5">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-[#b51a1b] rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
