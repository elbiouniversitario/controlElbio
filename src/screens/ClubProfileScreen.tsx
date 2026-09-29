import React, { useState } from 'react';
import { CLUB_CREST_URL } from '../data/initialData';
import { ClubRole } from '../types';
import { Textos } from '../lib/textos';
import { TextosEditor } from '../components/TextosEditor';

interface ClubProfileScreenProps {
  roles: ClubRole[];
  textos: Textos;
  onSaveTextos: (textos: Textos) => Promise<boolean>;
  persistent: boolean;
  onOpenAssignRoleModal: () => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ClubProfileScreen: React.FC<ClubProfileScreenProps> = ({
  roles,
  textos,
  onSaveTextos,
  persistent,
  onOpenAssignRoleModal,
  showToast,
}) => {
  const [preventivoDays, setPreventivoDays] = useState(30);
  const [inhabilitacionDays, setInhabilitacionDays] = useState(5);
  const [blockOnDebt, setBlockOnDebt] = useState(true);

  const handleTestPing = () => {
    showToast('Ping enviado a WhatsApp Cloud API: Status 200 OK (Latencia: 42ms)', 'cell_tower', 'success');
  };

  const handleExportCsv = () => {
    showToast(`Descargando planilla_elbio_${textos.categoria.toLowerCase()}_${textos.temporada}.csv`, 'table_view', 'success');
  };

  const handleExportPdf = () => {
    showToast('Generando Acta Oficial LUD de habilitaciones en PDF...', 'picture_as_pdf', 'info');
  };

  return (
    <div className="flex flex-col w-full pb-28">
      {/* Top Admin Hero Banner */}
      <section className="relative overflow-hidden bg-[#00183a] px-4 pt-5 pb-8 text-white rounded-b-3xl shadow-md">
        {/* Ambient institutional background graphic */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#0d2d59] opacity-40 blur-2xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-32 h-32 rounded-full bg-[#b51a1b] opacity-15 blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-14 shrink-0 bg-white p-1 rounded-xl shadow-md flex items-center justify-center">
              <img
                src={CLUB_CREST_URL}
                alt="Escudo Oficial Club Elbio Fernández"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d93630] text-white font-heading font-extrabold text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Superusuario
                </span>
                <span className="text-[#fabc4d] text-xs font-heading font-bold">★ ★ ★</span>
              </div>
              <h2 className="font-heading font-bold text-[20px] text-white truncate">
                Configuración General
              </h2>
              <p className="font-sans text-[12px] text-[#7b96c8] truncate">
                Club Elbio Fernández · Gestión Elbio U
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#0d2d59] text-[#7b96c8] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[20px]">
                admin_panel_settings
              </span>
            </div>
          </div>
        </div>

        {/* Quick Vital Metrics Ribbon */}
        <div className="grid grid-cols-3 gap-2 bg-[#0d2d59]/70 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
          <div className="flex flex-col items-center text-center p-1">
            <span className="font-heading font-bold text-[18px] text-[#fabc4d]">32</span>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              Accesos
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-1 bg-[#00183a]/40 rounded-lg">
            <span className="font-heading font-bold text-[18px] text-white">LUD 'A'</span>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              División
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-heading font-bold text-[18px] text-white">Activo</span>
            </div>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              API Wpp
            </span>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <div className="px-4 flex flex-col gap-5 mt-4">
        <TextosEditor textos={textos} onSave={onSaveTextos} persistent={persistent} showToast={showToast} />

        {/* Section 1: Role & Permission Management */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#00183a] text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                badge
              </span>
              <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
                Gestión de Roles
              </h3>
            </div>
            <span className="font-heading text-[10px] text-[#44474f] bg-[#e6e8eb] px-2 py-0.5 rounded-full font-bold">
              3 Perfiles
            </span>
          </div>

          {/* Action Button: Invite / Create User */}
          <button
            onClick={onOpenAssignRoleModal}
            className="w-full h-12 bg-[#00183a] hover:bg-[#0d2d59] text-white rounded-lg font-heading text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            + Asignar Nuevo Rol / Acceso
          </button>

          {/* Roles Stack */}
          <div className="flex flex-col gap-2.5 mt-1">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden border border-[#e0e3e6]/60"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg ${role.iconBg} flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {role.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-[14px] text-[#00183a] truncate leading-tight">
                        {role.title}
                      </h4>
                      <p className="font-heading font-bold text-[10px] text-[#b51a1b]">
                        {role.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="font-heading text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#d7e3ff] text-[#00183a] flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {role.activeCount} activos
                  </span>
                </div>
                <p className="font-sans text-[12px] text-[#44474f] mb-3">
                  {role.description}
                </p>
                <div className="flex items-center justify-between pt-2 bg-[#f2f4f7] px-3 py-2 rounded-lg border border-[#e0e3e6]/60">
                  <span className="font-heading text-[11px] text-[#44474f] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00183a]">
                      verified_user
                    </span>
                    {role.badgeLabel}
                  </span>
                  <button
                    onClick={() =>
                      showToast(`Mostrando listado de usuarios con rol ${role.title}`)
                    }
                    className="font-heading text-[11px] text-[#00183a] font-bold hover:underline flex items-center gap-0.5"
                  >
                    Ver usuarios{' '}
                    <span className="material-symbols-outlined text-[14px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Global System Parameters */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              tune
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Parámetros del Sistema
            </h3>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-4 border border-[#e0e3e6]/60">
            {/* Param 1: Competition Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#b51a1b]">
                  emoji_events
                </span>
                Liga & Competición Oficial
              </label>
              <div className="relative bg-[#f2f4f7] rounded-lg p-3 flex items-center justify-between border border-[#e0e3e6]">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-heading font-bold text-[14px] text-[#00183a] truncate">
                    Liga Universitaria de Deportes
                  </span>
                  <span className="font-sans text-[12px] text-[#44474f] truncate">
                    Categoría {textos.categoria} · {textos.divisional} (Uruguay)
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#00183a] text-white font-heading text-[10px] font-bold uppercase shrink-0">
                  FIJADA
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-[#eceef1]"></div>

            {/* Param 2: Medical Clearance Expiration Thresholds */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">
                    notification_important
                  </span>
                  Reglas de Semáforo de Fichas Médicas
                </label>
                <span className="font-heading text-[10px] text-[#b51a1b] uppercase font-bold">
                  PROTOCOLO LUD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f2f4f7] p-2.5 rounded-lg flex flex-col border border-[#e0e3e6]">
                  <div className="flex items-center gap-1 text-[#604100] mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-heading text-[10px] uppercase font-bold">
                      Preventivo
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={preventivoDays}
                      onChange={(e) => setPreventivoDays(Number(e.target.value))}
                      className="font-heading font-bold text-[18px] text-[#00183a] w-14 bg-white px-1 rounded border border-[#e0e3e6]"
                    />
                    <span className="font-heading text-sm text-[#00183a]">días</span>
                  </div>
                  <span className="font-sans text-[11px] text-[#44474f] mt-0.5">
                    Alerta previa por WhatsApp
                  </span>
                </div>

                <div className="bg-[#f2f4f7] p-2.5 rounded-lg flex flex-col border border-[#e0e3e6]">
                  <div className="flex items-center gap-1 text-[#b51a1b] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#b51a1b]"></span>
                    <span className="font-heading text-[10px] uppercase font-bold">
                      Inhabilitación
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={inhabilitacionDays}
                      onChange={(e) => setInhabilitacionDays(Number(e.target.value))}
                      className="font-heading font-bold text-[18px] text-[#b51a1b] w-14 bg-white px-1 rounded border border-[#e0e3e6]"
                    />
                    <span className="font-heading text-sm text-[#b51a1b]">días</span>
                  </div>
                  <span className="font-sans text-[11px] text-[#44474f] mt-0.5">
                    Bloqueo en planilla
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-[#eceef1]"></div>

            {/* Param 3: WhatsApp Cloud API Integration */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    chat
                  </span>
                  WhatsApp Cloud API
                </label>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-heading text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Conectado
                </span>
              </div>
              <div className="bg-[#f2f4f7] p-3 rounded-lg flex items-center justify-between border border-[#e0e3e6]">
                <div className="flex flex-col min-w-0">
                  <span className="font-heading font-bold text-[13px] text-[#00183a]">
                    +598 99 352 460
                  </span>
                  <span className="font-sans text-[11px] text-[#44474f] truncate">
                    Número oficial verificado · Meta Business
                  </span>
                </div>
                <button
                  onClick={handleTestPing}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#e0e3e6] text-[#00183a] font-heading text-[11px] font-bold hover:bg-[#eceef1] active:scale-95 transition-all shadow-xs"
                >
                  Test Ping
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-[#eceef1]"></div>

            {/* Param 4: Treasury / Cuotas Settings */}
            <div className="flex flex-col gap-2">
              <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#00183a]">
                  account_balance_wallet
                </span>
                Parámetros de Tesorería & Cuotas
              </label>
              <div className="bg-[#f2f4f7] p-3 rounded-lg flex flex-col gap-2.5 border border-[#e0e3e6]">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] text-[#44474f]">
                    Valor Cuota Social Mensual
                  </span>
                  <span className="font-heading font-bold text-[14px] text-[#00183a]">
                    $ 1.400 UYU
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] text-[#44474f]">
                    Día de vencimiento regular
                  </span>
                  <span className="font-heading font-bold text-[12px] text-[#00183a]">
                    Día 10 del mes
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#e0e3e6]">
                  <div className="flex flex-col">
                    <span className="font-heading text-[12px] font-bold text-[#00183a]">
                      Bloqueo por mora de carné
                    </span>
                    <span className="font-sans text-[11px] text-[#44474f]">
                      Impide citación tras 60d impago
                    </span>
                  </div>
                  {/* Toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockOnDebt}
                      onChange={(e) => {
                        setBlockOnDebt(e.target.checked);
                        showToast(
                          `Bloqueo por mora ${e.target.checked ? 'activado' : 'desactivado'}`
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#e0e3e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b51a1b]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Club Institutional Information */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              corporate_fare
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Identidad Institucional
            </h3>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-[#e0e3e6]/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-14 p-1 bg-[#f2f4f7] rounded-lg flex items-center justify-center shrink-0 border border-[#e0e3e6]">
                <img
                  src={CLUB_CREST_URL}
                  alt="Escudo Elbio"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="font-heading font-bold text-[16px] text-[#00183a] truncate">
                  Club Elbio Fernández
                </h4>
                <span className="font-sans text-[12px] text-[#44474f]">
                  Personería Jurídica MEC Nº 4.821/98
                </span>
              </div>
            </div>
            <div className="bg-[#f2f4f7] rounded-lg p-3 flex flex-col gap-2 border border-[#e0e3e6]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#44474f] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-[10px] text-[#00183a] uppercase">
                    Sede Central
                  </span>
                  <span className="font-sans text-[12px] text-[#44474f]">
                    Canelones 1382 esq. Ejido, Montevideo, Uruguay
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#44474f] shrink-0 mt-0.5">
                  call
                </span>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-[10px] text-[#00183a] uppercase">
                    Contacto Deportivo
                  </span>
                  <span className="font-sans text-[12px] text-[#44474f]">
                    +598 2901 1254 · deportes@elbiofernandez.edu.uy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Security, Audit & Backups */}
        <section className="flex flex-col gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              database
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Seguridad & Respaldos
            </h3>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-[#e0e3e6]/60">
            <p className="font-sans text-[12px] text-[#44474f]">
              Exportación de registros oficiales de plantel, carné de salud y estados de tesorería
              para presentación ante autoridades de la LUD.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCsv}
                className="h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                Exportar CSV
              </button>
              <button
                onClick={handleExportPdf}
                className="h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Acta Oficial
              </button>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#f2f4f7]">
              <div className="flex items-center gap-1.5 text-[#44474f] font-sans text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  lock
                </span>
                Último backup: Hoy, 04:30 AM
              </div>
              <button
                onClick={() => showToast('Abriendo registro de eventos y auditoría del sistema')}
                className="font-heading text-[10px] text-[#b51a1b] uppercase font-bold hover:underline"
              >
                Ver Logs
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
