import { useEffect, useState } from 'react';
import { TabType, Player, AutomationRule, SentMessage, ClubRole } from './types';
import { INITIAL_PLAYERS, INITIAL_RULES, INITIAL_SENT_MESSAGES, CLUB_ROLES } from './data/initialData';
import { isSupabaseConfigured } from './lib/supabase';
import * as db from './lib/db';
import { initialsAvatar } from './lib/avatar';
import { combinarTextos, Textos, TextosProvider, TEXTOS_DEFAULT } from './lib/textos';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import {
  NewBroadcastModal,
  EditTemplateModal,
  PaymentModal,
  AssignRoleModal,
  PlanillaPdfModal,
} from './components/Modals';

// Screens
import { AlertasVencimientosScreen } from './screens/AlertasVencimientosScreen';
import { TesoreriaCuotasScreen } from './screens/TesoreriaCuotasScreen';
import { PlanillaOpsScreen } from './screens/PlanillaOpsScreen';
import { PerfilJugadorScreen } from './screens/PerfilJugadorScreen';
import { ClubProfileScreen } from './screens/ClubProfileScreen';
import { NuevoJugadorWizard } from './screens/NuevoJugadorWizard';

// 'supabase': datos reales. 'demo': datos de ejemplo en memoria (sin variables
// de entorno); los cambios se pierden al recargar. 'error': la base está
// configurada pero no respondió (sin conexión, etc.): se ofrece reintentar.
type DataMode = 'cargando' | 'supabase' | 'demo' | 'error';

const LOAD_TIMEOUT_MS = 15000;

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('alertas');
  const [players, setPlayers] = useState<Player[]>(isSupabaseConfigured ? [] : INITIAL_PLAYERS);
  const [rules, setRules] = useState<AutomationRule[]>(isSupabaseConfigured ? [] : INITIAL_RULES);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>(
    isSupabaseConfigured ? [] : INITIAL_SENT_MESSAGES
  );
  const [roles, setRoles] = useState<ClubRole[]>(isSupabaseConfigured ? [] : CLUB_ROLES);
  const [dataMode, setDataMode] = useState<DataMode>(isSupabaseConfigured ? 'cargando' : 'demo');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [textos, setTextos] = useState<Textos>(TEXTOS_DEFAULT);

  // Toast feedback state
  const [toast, setToast] = useState<{
    message: string | null;
    icon?: string;
    type?: 'success' | 'warning' | 'info' | 'error';
  }>({ message: null });

  // Modal states
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlayerForPayment, setSelectedPlayerForPayment] = useState<Player | undefined>();
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const showToast = (
    message: string,
    icon: string = 'check_circle',
    type: 'success' | 'warning' | 'info' | 'error' = 'success'
  ) => {
    setToast({ message, icon, type });
    setTimeout(() => {
      setToast({ message: null });
    }, 3200);
  };

  const [loadAttempt, setLoadAttempt] = useState(0);

  // Carga inicial desde Supabase (y al tocar "Reintentar").
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelado = false;
    setDataMode('cargando');
    const carga = navigator.onLine
      ? Promise.race([
          db.cargarDatos(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('la base de datos tardó demasiado en responder')), LOAD_TIMEOUT_MS)
          ),
        ])
      : Promise.reject(new Error('el teléfono no tiene conexión a internet'));
    carga
      .then((datos) => {
        if (cancelado) return;
        setPlayers(datos.players);
        setRules(datos.rules);
        setSentMessages(datos.sentMessages);
        setRoles(datos.roles);
        setTextos(combinarTextos(datos.textos));
        setDataMode('supabase');
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        console.error('Error cargando datos de Supabase', err);
        setLoadError(err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err));
        setDataMode('error');
      });
    return () => {
      cancelado = true;
    };
  }, [loadAttempt]);

  const useDb = dataMode === 'supabase';

  const reportDbError = (accion: string, err: unknown) => {
    console.error(`Error al ${accion}`, err);
    // 23505 = unique_violation (p. ej. número de ficha LUD repetido)
    if ((err as { code?: string } | null)?.code === '23505') {
      showToast(`No se pudo ${accion}: ya existe un registro con esos datos (¿ID de federado repetido?).`, 'error', 'error');
      return;
    }
    showToast(`No se pudo ${accion}. Revisá la conexión e intentá de nuevo.`, 'cloud_off', 'error');
  };

  const replacePlayer = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Textos editados por el admin en Club Admin
  const handleSaveTextos = async (nuevos: Textos): Promise<boolean> => {
    if (useDb) {
      try {
        await db.guardarTextos(nuevos);
      } catch (err) {
        reportDbError('guardar los textos', err);
        return false;
      }
    }
    setTextos(combinarTextos(nuevos));
    return true;
  };

  // Rule toggle handler
  const handleToggleRule = async (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    if (useDb) {
      try {
        await db.actualizarRegla(ruleId, !rule.active);
      } catch (err) {
        reportDbError('actualizar la regla', err);
        return;
      }
    }
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  };

  // Broadcast sender
  const handleSendBroadcast = async (playerIds: string[], topic: string) => {
    if (useDb) {
      const destinatarios = players.filter((p) => playerIds.includes(p.id));
      try {
        const guardados = await db.registrarMensajes(destinatarios, topic);
        setSentMessages((prev) => [...guardados, ...prev]);
      } catch (err) {
        reportDbError('guardar el historial de mensajes', err);
      }
      return;
    }
    const newSent: SentMessage[] = playerIds.map((id, index) => {
      const p = players.find((pl) => pl.id === id);
      return {
        id: `sent-${Date.now()}-${index}`,
        playerName: p ? `${p.firstName} ${p.lastName}` : 'Jugador Elbio',
        playerAvatar: p?.avatarUrl || initialsAvatar('Elbio', 'Fernández'),
        topic: `${topic} • Hace unos instantes`,
        timestamp: 'Ahora',
        status: 'Entregado',
        statusColor: 'text-[#445e8d]',
        avatarIndicatorColor: 'bg-[#445e8d]',
      };
    });
    setSentMessages((prev) => [...newSent, ...prev]);
  };

  // Payment confirmation
  const handleConfirmPayment = async (playerId: string, amount: number, method: string) => {
    if (useDb) {
      try {
        replacePlayer(await db.registrarPago(playerId, method));
        showToast(`Cobro de $${amount} registrado exitosamente (${method})`, 'verified', 'success');
      } catch (err) {
        reportDbError('registrar el cobro', err);
      }
      return;
    }
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            dues: {
              ...p.dues,
              status: 'paid',
              debtAmount: 0,
              paidDate: 'Hoy',
              paymentMethod: method,
              receiptNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
            },
          };
        }
        return p;
      })
    );
    showToast(`Cobro de $${amount} registrado exitosamente (${method})`, 'verified', 'success');
  };

  // Add new player from wizard. Se agrega al final para que "Mi ficha"
  // (el primer jugador) sea el mismo con y sin base de datos.
  const handleSaveNewPlayer = async (newPlayer: Player): Promise<boolean> => {
    let saved = newPlayer;
    if (useDb) {
      try {
        saved = await db.crearJugador(newPlayer);
      } catch (err) {
        reportDbError('dar de alta al jugador', err);
        return false;
      }
    }
    setPlayers((prev) => [...prev, saved]);
    setCurrentTab('planilla');
    return true;
  };

  // Sin login todavía: "Mi ficha" muestra al primer jugador cargado.
  const myPlayer: Player | undefined = players[0];

  // Update attendance of the player shown in "Mi ficha"
  const handleUpdateAttendance = async (confirmed: boolean, reason?: string): Promise<boolean> => {
    if (!myPlayer) return false;
    if (useDb) {
      try {
        await db.actualizarAsistencia(myPlayer.id, confirmed, reason);
      } catch (err) {
        reportDbError('guardar la asistencia', err);
        return false;
      }
    }
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === myPlayer.id
          ? {
              ...p,
              matchStatus: {
                ...p.matchStatus,
                attendanceConfirmed: confirmed,
                declineReason: reason,
              },
            }
          : p
      )
    );
    return true;
  };

  const pendingAlertsCount = players.filter((p) => p.medicalCertificate.daysRemaining <= 5).length;
  const pendingDuesCount = players.filter((p) => p.dues.status !== 'paid').length;

  // Screen titles
  const screenMeta: Record<TabType, { title: string; subtitle: string }> = {
    alertas: { title: 'Alertas Y Vencimientos', subtitle: 'Club Elbio Fernández' },
    tesoreria: { title: 'Tesorería & Cuotas', subtitle: 'Club Elbio Fernández' },
    planilla: { title: 'Match Sheet Ops', subtitle: 'Club Elbio Fernández' },
    jugador: { title: 'Mi Perfil Deportista', subtitle: 'Club Elbio Fernández' },
    club: { title: 'Configuración General', subtitle: 'Club Elbio Fernández' },
    'nuevo-jugador': { title: 'Nuevo Jugador', subtitle: 'Club Elbio Fernández' },
  };

  return (
    <TextosProvider value={textos}>
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col antialiased">
      {/* Dynamic Top App Bar */}
      <Header
        currentTab={currentTab}
        title={screenMeta[currentTab].title}
        subtitle={screenMeta[currentTab].subtitle}
        showBack={currentTab === 'nuevo-jugador'}
        onBackClick={() => setCurrentTab('alertas')}
        onSearchClick={() => showToast('Buscador rápido activado')}
        onNotificationsClick={() => showToast('Tienes 3 avisos prioritarios de Liga')}
      />

      {/* Quick Screen Carousel Shortcut Ribbon for Easy Exploration of ALL Screens */}
      <div className="fixed top-16 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e0e3e6]/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
        <span className="font-heading font-extrabold text-[9px] uppercase tracking-wider text-[#747780] mr-1 shrink-0">
          Vistas:
        </span>
        {[
          { id: 'alertas' as TabType, label: '🔔 Alertas', count: pendingAlertsCount },
          { id: 'tesoreria' as TabType, label: '💰 Cuotas', count: pendingDuesCount },
          { id: 'planilla' as TabType, label: '📋 Planilla DT', count: undefined },
          { id: 'jugador' as TabType, label: '⚽ Mi Ficha', count: undefined },
          { id: 'club' as TabType, label: '⚙️ Club Admin', count: undefined },
          { id: 'nuevo-jugador' as TabType, label: '➕ Nuevo Jugador', count: undefined },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setCurrentTab(btn.id)}
            className={`px-2.5 py-1 rounded-full font-heading text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              currentTab === btn.id
                ? 'bg-[#00183a] text-white shadow-xs'
                : 'bg-[#f2f4f7] text-[#44474f] hover:bg-[#e6e8eb]'
            }`}
          >
            <span>{btn.label}</span>
            {!!btn.count && (
              <span className="w-4 h-4 rounded-full bg-[#b51a1b] text-white text-[9px] flex items-center justify-center font-bold">
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-28 pb-8 flex flex-col">
        {dataMode === 'demo' && (
          <div
            role="status"
            className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">science</span>
            <span>
              Modo demo: la base de datos no está configurada. Se muestran datos de ejemplo y los cambios se pierden al recargar.
            </span>
          </div>
        )}

        {dataMode === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center text-[#44474f]">
            <span className="material-symbols-outlined text-[40px] text-[#b51a1b]">cloud_off</span>
            <p className="font-heading text-[15px] font-bold text-[#00183a]">No se pudieron cargar los datos del club</p>
            <p className="font-sans text-[12px] max-w-xs">Motivo: {loadError}. Revisá la conexión y volvé a intentar.</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((n) => n + 1)}
              className="mt-1 h-11 px-6 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {dataMode === 'cargando' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-[#44474f]">
            <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
            <span className="font-heading text-[12px] font-bold">Cargando datos del club…</span>
          </div>
        )}

        {(dataMode === 'supabase' || dataMode === 'demo') && (
          <>
        {currentTab === 'alertas' && (
          <AlertasVencimientosScreen
            players={players}
            rules={rules}
            sentMessages={sentMessages}
            onToggleRule={handleToggleRule}
            onSendBroadcast={handleSendBroadcast}
            onOpenNewBroadcastModal={() => setIsBroadcastModalOpen(true)}
            onOpenEditTemplateModal={() => setIsEditTemplateModalOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'tesoreria' && (
          <TesoreriaCuotasScreen
            players={players}
            onOpenPaymentModal={(p) => {
              setSelectedPlayerForPayment(p);
              setIsPaymentModalOpen(true);
            }}
            onSendWhatsAppReminder={(p) => {
              showToast(`WhatsApp de cobro enviado a ${p.firstName} (${p.phone})`, 'send', 'success');
            }}
            onSendMassReminder={() => {
              const deudores = players
                .filter((p) => p.dues.status !== 'paid')
                .map((p) => p.id);
              handleSendBroadcast(deudores, 'Recordatorio de Cuota Social');
              showToast(`Recordatorio enviado por WhatsApp a ${deudores.length} jugadores`, 'campaign', 'success');
            }}
            showToast={showToast}
          />
        )}

        {currentTab === 'planilla' && (
          <PlanillaOpsScreen
            players={players}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onSendWhatsappCitation={() => {
              showToast(`Citación oficial de ${textos.fecha} enviada al grupo del plantel por WhatsApp`, 'chat', 'success');
            }}
            onOpenLineupModal={() => setCurrentTab('nuevo-jugador')}
            showToast={showToast}
          />
        )}

        {currentTab === 'jugador' &&
          (myPlayer ? (
            <PerfilJugadorScreen
              key={myPlayer.id}
              player={myPlayer}
              onUpdateAttendance={handleUpdateAttendance}
              showToast={showToast}
            />
          ) : (
            <p className="py-24 text-center text-[13px] text-[#44474f]">
              Todavía no hay jugadores cargados.
            </p>
          ))}

        {currentTab === 'club' && (
          <ClubProfileScreen
            roles={roles}
            textos={textos}
            onSaveTextos={handleSaveTextos}
            persistent={useDb}
            onOpenAssignRoleModal={() => setIsAssignRoleModalOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'nuevo-jugador' && (
          <NuevoJugadorWizard
            onCancel={() => setCurrentTab('alertas')}
            onSavePlayer={handleSaveNewPlayer}
            showToast={showToast}
          />
        )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      {currentTab !== 'nuevo-jugador' && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          pendingAlertsCount={pendingAlertsCount}
          pendingDuesCount={pendingDuesCount}
        />
      )}

      {/* Global Interactive Modals */}
      <NewBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSend={(audience, msg) => {
          showToast(`Campaña masiva enviada a la audiencia: ${audience}`, 'campaign', 'success');
        }}
      />

      <EditTemplateModal
        isOpen={isEditTemplateModalOpen}
        onClose={() => setIsEditTemplateModalOpen(false)}
        onSave={(newText) => {
          showToast('Plantilla HSM actualizada y sincronizada con Meta', 'check_circle', 'success');
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        player={selectedPlayerForPayment}
        onConfirmPayment={handleConfirmPayment}
      />

      <AssignRoleModal
        isOpen={isAssignRoleModalOpen}
        onClose={() => setIsAssignRoleModalOpen(false)}
        onConfirm={(name, ci, role) => {
          showToast(`Rol de ${role} asignado a ${name} (${ci})`, 'verified_user', 'success');
        }}
      />

      <PlanillaPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        players={players}
      />

      {/* Toast Notification Component */}
      <Toast
        message={toast.message}
        icon={toast.icon}
        type={toast.type}
      />
    </div>
    </TextosProvider>
  );
}
