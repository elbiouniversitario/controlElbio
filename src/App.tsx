import { useEffect, useState } from 'react';
import { TabType, Player, AutomationRule, SentMessage, ClubRole } from './types';
import { INITIAL_PLAYERS, INITIAL_RULES, INITIAL_SENT_MESSAGES, CLUB_ROLES } from './data/initialData';
import { isSupabaseConfigured } from './lib/supabase';
import * as db from './lib/db';
import { initialsAvatar } from './lib/avatar';
import { combinarTextos, Textos, TextosProvider, TEXTOS_DEFAULT } from './lib/textos';
import { NOMBRE_ROL, Perfil } from './lib/auth';
import { diasProximoVencimiento } from './lib/habilitacion';
import { Header } from './components/Header';
import { EditarJugadorModal } from './components/EditarJugadorModal';
import { BuscadorJugadores, Notificacion, PanelNotificaciones } from './components/HeaderPaneles';
import { bloquearPorDeuda, estadoHabilitacion } from './lib/habilitacion';
import { CarneLudForm, DocumentosModal, FichaMedicaForm } from './components/DocumentosModal';
import { diasHasta, periodoActual } from './lib/fechas';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import {
  Audiencia,
  NewBroadcastModal,
  EditTemplateModal,
  PaymentModal,
  AssignRoleModal,
  PlanillaPdfModal,
} from './components/Modals';

// Screens
import { AlertasVencimientosScreen, ClavePlantilla, PLANTILLAS } from './screens/AlertasVencimientosScreen';
import { EnvioWhatsApp, EnvioWhatsAppModal } from './components/EnvioWhatsAppModal';
import { abrirWhatsApp, normalizarCelular, rellenarPlantilla } from './lib/whatsapp';
import { variablesMensaje } from './lib/mensajes';
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

const TODAS_LAS_VISTAS: TabType[] = ['alertas', 'tesoreria', 'planilla', 'jugador', 'club', 'nuevo-jugador'];

/** Vistas que puede abrir cada perfil. Sin perfil (modo demo) se ven todas. */
function vistasPermitidas(perfil: Perfil | null): TabType[] {
  if (!perfil) return TODAS_LAS_VISTAS;
  const miFicha: TabType[] = perfil.jugadorId ? ['jugador'] : [];
  switch (perfil.rol) {
    case 'admin':
      return TODAS_LAS_VISTAS.filter((v) => v !== 'jugador' || perfil.jugadorId);
    case 'dt':
      return ['alertas', 'planilla', 'nuevo-jugador', ...miFicha];
    case 'tesorero':
      return ['tesoreria', 'alertas', ...miFicha];
    default:
      return miFicha;
  }
}

interface AppProps {
  /** Quién ingresó. null = modo demo, sin login. */
  perfil: Perfil | null;
  onLogout: () => void;
}

export default function App({ perfil, onLogout }: AppProps) {
  const vistas = vistasPermitidas(perfil);
  const [currentTab, setCurrentTab] = useState<TabType>(vistas[0] ?? 'jugador');
  /** Cambia de vista solo si el perfil puede verla. */
  const goTo = (tab: TabType) => setCurrentTab(vistas.includes(tab) ? tab : vistas[0] ?? 'jugador');
  // Vistas de la barra de navegación (el alta de jugador se abre desde Planilla).
  const vistasMenu = vistas.filter((v) => v !== 'nuevo-jugador');
  const mostrarMenu = vistasMenu.length > 1;
  const [players, setPlayers] = useState<Player[]>(isSupabaseConfigured ? [] : INITIAL_PLAYERS);
  const [rules, setRules] = useState<AutomationRule[]>(isSupabaseConfigured ? [] : INITIAL_RULES);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>(
    isSupabaseConfigured ? [] : INITIAL_SENT_MESSAGES
  );
  const [roles, setRoles] = useState<ClubRole[]>(isSupabaseConfigured ? [] : CLUB_ROLES);
  const [dataMode, setDataMode] = useState<DataMode>(isSupabaseConfigured ? 'cargando' : 'demo');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [textos, setTextos] = useState<Textos>(TEXTOS_DEFAULT);
  const [miembros, setMiembros] = useState<db.Miembro[]>([]);

  // Toast feedback state
  const [toast, setToast] = useState<{
    message: string | null;
    icon?: string;
    type?: 'success' | 'warning' | 'info' | 'error';
  }>({ message: null });

  // Modal states
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState<ClavePlantilla | null>(null);
  const [envio, setEnvio] = useState<EnvioWhatsApp | null>(null);
  const [verBuscador, setVerBuscador] = useState(false);
  const [verNotificaciones, setVerNotificaciones] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlayerForPayment, setSelectedPlayerForPayment] = useState<Player | undefined>();
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [jugadorEditando, setJugadorEditando] = useState<Player | null>(null);
  // Por id, así el formulario ve los datos actualizados después de cada guardado.
  const [documentosId, setDocumentosId] = useState<string | null>(null);
  const jugadorDocumentos = players.find((p) => p.id === documentosId) ?? null;
  // Editar fichas: DT y admin (en modo demo, todos).
  const puedeEditarJugadores = !perfil || perfil.rol === 'admin' || perfil.rol === 'dt';

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
    // 42501 = sin permiso (RLS o chequeo de rol en la base)
    const code = (err as { code?: string } | null)?.code;
    if (code === '42501' || /row-level security/i.test((err as { message?: string } | null)?.message ?? '')) {
      showToast(`No tenés permiso para ${accion}.`, 'lock', 'error');
      return;
    }
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

  // Accesos del staff (solo el admin ve la lista completa)
  useEffect(() => {
    if (!useDb || perfil?.rol !== 'admin') return;
    db.listarMiembros()
      .then(setMiembros)
      .catch((err) => console.error('Error cargando accesos', err));
  }, [useDb, perfil?.rol]);

  const handleAsignarAcceso = async (
    nombre: string,
    email: string,
    rol: db.RolStaff
  ): Promise<boolean> => {
    const miembro: db.Miembro = { email, rol, nombre: nombre || null };
    if (useDb) {
      try {
        await db.guardarMiembro(miembro);
      } catch (err) {
        reportDbError('dar el acceso', err);
        return false;
      }
    }
    setMiembros((prev) => [...prev.filter((m) => m.email !== email), miembro]);
    showToast(`Acceso habilitado para ${email}`, 'verified_user', 'success');
    return true;
  };

  const handleQuitarAcceso = async (email: string) => {
    if (useDb) {
      try {
        await db.quitarMiembro(email);
      } catch (err) {
        reportDbError('quitar el acceso', err);
        return;
      }
    }
    setMiembros((prev) => prev.filter((m) => m.email !== email));
    showToast(`Acceso quitado a ${email}`, 'person_remove', 'warning');
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

  // Historial de envíos por WhatsApp. Sin destinatarios = mensaje al grupo.
  const handleRegistrarEnvio = async (destinatarios: Player[], tema: string) => {
    if (useDb) {
      try {
        const guardados = destinatarios.length
          ? await db.registrarMensajes(destinatarios, tema)
          : [await db.registrarMensajeGrupo(tema)];
        setSentMessages((prev) => [...guardados, ...prev]);
      } catch (err) {
        reportDbError('guardar el historial de mensajes', err);
      }
      return;
    }
    const lista = destinatarios.length ? destinatarios : [null];
    const newSent: SentMessage[] = lista.map((p, index) => ({
      id: `sent-${Date.now()}-${index}`,
      playerName: p ? `${p.firstName} ${p.lastName}` : 'Grupo del plantel',
      playerAvatar: p?.avatarUrl || initialsAvatar('Grupo', 'Plantel'),
      topic: `${tema} • Recién`,
      timestamp: 'Ahora',
      status: 'Enviado',
      statusColor: 'text-[#445e8d]',
      avatarIndicatorColor: 'bg-[#445e8d]',
    }));
    setSentMessages((prev) => [...newSent, ...prev]);
  };

  /** Abre WhatsApp con un mensaje para un solo jugador y lo registra. */
  const avisarJugador = (p: Player, plantilla: string, tema: string) => {
    if (!normalizarCelular(p.phone)) {
      showToast(`${p.firstName} no tiene celular cargado. Cargalo en Planilla → Editar.`, 'phone_disabled', 'warning');
      return;
    }
    abrirWhatsApp(p.phone, rellenarPlantilla(plantilla, variablesMensaje(textos, p)));
    void handleRegistrarEnvio([p], tema);
  };

  const puedeEditarTextos = !perfil || perfil.rol === 'admin';

  const convocados = players.filter((p) => p.matchStatus.lineupRole !== 'BAJA');
  const abrirConvocatoria = () =>
    setEnvio({
      titulo: 'Convocatoria',
      tema: `Convocatoria ${textos.fecha}`,
      plantilla: textos.plantilla_convocatoria,
      destinatarios: convocados,
      permitirGrupo: true,
    });

  const audiencias: Record<Audiencia, Player[]> = {
    por_vencer: players.filter((p) => diasProximoVencimiento(p) <= (Number(textos.dias_aviso_preventivo) || 30)),
    deudores: players.filter((p) => p.dues.debtAmount > 0 || p.dues.status === 'overdue'),
    citados: convocados,
    plantel: players,
  };

  // Convocatoria: roles de la planilla de varios jugadores a la vez (DT y admin)
  const handleGuardarConvocatoria = async (
    cambios: Record<string, Player['matchStatus']['lineupRole']>
  ): Promise<boolean> => {
    if (useDb) {
      try {
        await db.actualizarRolesPlanilla(cambios);
      } catch (err) {
        reportDbError('guardar la convocatoria', err);
        return false;
      }
    }
    setPlayers((prev) =>
      prev.map((p) => (cambios[p.id] ? { ...p, matchStatus: { ...p.matchStatus, lineupRole: cambios[p.id] } } : p))
    );
    showToast(`Convocatoria guardada (${Object.keys(cambios).length} cambios)`, 'assignment_turned_in', 'success');
    return true;
  };

  // Cuotas del mes actual para todo el plantel (admin y tesorería)
  const handleGenerarCuotas = async () => {
    const monto = Number(textos.cuota_monto) || 1400;
    if (!useDb) {
      const periodo = periodoActual();
      setPlayers((prev) =>
        prev.map((p) =>
          p.dues.period === periodo
            ? p
            : { ...p, dues: { ...p.dues, period: periodo, status: 'pending', debtAmount: p.dues.debtAmount + monto } }
        )
      );
      showToast('Cuotas del mes generadas (modo demo)', 'payments', 'success');
      return;
    }
    try {
      const nuevas = await db.generarCuotasDelMes(monto);
      const datos = await db.cargarDatos();
      setPlayers(datos.players);
      showToast(
        nuevas ? `Se generaron ${nuevas} cuotas de $${monto.toLocaleString('es-UY')}` : 'Las cuotas de este mes ya estaban generadas',
        'payments',
        'success'
      );
    } catch (err) {
      reportDbError('generar las cuotas', err);
    }
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

  const handleGuardarJugador = async (editado: Player): Promise<boolean> => {
    let guardado = editado;
    if (useDb) {
      try {
        guardado = await db.actualizarJugador(editado);
      } catch (err) {
        reportDbError('guardar los datos del jugador', err);
        return false;
      }
    }
    replacePlayer(guardado);
    showToast(`Datos de ${guardado.firstName} ${guardado.lastName} guardados`, 'check_circle', 'success');
    return true;
  };

  // --- Habilitación y documentos -----------------------------------------
  const refrescarJugador = async (id: string) => replacePlayer(await db.cargarJugador(id));

  const handleGuardarHabilitacion = async (override: Player['eligibilityOverride']): Promise<boolean> => {
    const p = jugadorDocumentos;
    if (!p) return false;
    try {
      if (useDb) {
        await db.guardarHabilitacion(p.id, override);
        await refrescarJugador(p.id);
      } else {
        replacePlayer({ ...p, eligibilityOverride: override });
      }
    } catch (err) {
      reportDbError('guardar la habilitación', err);
      return false;
    }
    showToast(
      override ? `${p.firstName} quedó ${override.status} (manual)` : `Habilitación de ${p.firstName} en automático`,
      'verified_user',
      'success'
    );
    return true;
  };

  const handleCargarFichaMedica = async (f: FichaMedicaForm): Promise<boolean> => {
    const p = jugadorDocumentos;
    if (!p) return false;
    try {
      if (useDb) {
        await db.cargarFichaMedica(p.id, {
          vencimiento: f.vencimiento,
          fechaExamen: f.fechaExamen,
          clinica: f.clinica,
        });
        await refrescarJugador(p.id);
      } else if (f.vencimiento >= p.medicalCertificate.expiryDate) {
        replacePlayer({
          ...p,
          medicalCertificate: {
            ...p.medicalCertificate,
            expiryDate: f.vencimiento,
            daysRemaining: diasHasta(f.vencimiento),
            examDate: f.fechaExamen || undefined,
            clinic: f.clinica,
            verified: true,
          },
        });
      }
    } catch (err) {
      reportDbError('cargar la ficha médica', err);
      return false;
    }
    showToast(`Ficha médica de ${p.firstName} cargada`, 'medical_services', 'success');
    return true;
  };

  const handleGuardarCarneLud = async (c: CarneLudForm): Promise<boolean> => {
    const p = jugadorDocumentos;
    if (!p) return false;
    try {
      if (useDb) {
        const archivoPath = c.archivo ? await db.subirDocumento(p.id, 'carne-lud', c.archivo) : undefined;
        await db.guardarCarneLud(p.id, { idFederado: c.idFederado, vencimiento: c.vencimiento, archivoPath });
        await refrescarJugador(p.id);
      } else {
        replacePlayer({
          ...p,
          ludRegistration: {
            ...p.ludRegistration,
            federatedId: c.idFederado ?? 0,
            cardExpiry: c.vencimiento ?? undefined,
          },
        });
      }
    } catch (err) {
      reportDbError('guardar el carné LUD', err);
      return false;
    }
    showToast(`Carné LUD de ${p.firstName} guardado`, 'badge', 'success');
    return true;
  };

  const handleVerArchivo = async (ruta: string) => {
    if (!useDb) return;
    // La ventana se abre ya (dentro del toque) para que el navegador no la bloquee.
    const ventana = window.open('', '_blank');
    try {
      const url = await db.urlDocumento(ruta);
      if (ventana) ventana.location.href = url;
      else window.location.href = url;
    } catch (err) {
      ventana?.close();
      reportDbError('abrir el archivo', err);
    }
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
    goTo('planilla');
    return true;
  };

  // "Mi ficha": la ficha vinculada al email de quien ingresó (en modo demo, el primer jugador).
  const myPlayer: Player | undefined = perfil
    ? players.find((p) => p.id === perfil.jugadorId)
    : players[0];

  // Update attendance of the player shown in "Mi ficha"
  const handleUpdateAttendance = async (confirmed: boolean, reason?: string): Promise<boolean> => {
    if (!myPlayer) return false;
    if (useDb) {
      try {
        await db.confirmarAsistencia(confirmed, reason);
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

  // --- Notificaciones del encabezado ------------------------------------
  const esStaff = !perfil || perfil.rol === 'admin' || perfil.rol === 'dt' || perfil.rol === 'tesorero';
  const opcionesHabilitacion = { bloquearPorDeuda: bloquearPorDeuda(textos.bloquear_por_deuda) };
  const textoVencimiento = (p: Player) => {
    const d = diasProximoVencimiento(p);
    const lud = p.ludRegistration.cardExpiry && diasHasta(p.ludRegistration.cardExpiry) === d;
    const que = lud ? 'carné LUD' : 'ficha médica';
    return d <= 0 ? `${que} vencido` : `${que} vence en ${d} días`;
  };
  const notificaciones: Notificacion[] = [];
  const diasUrgente = Number(textos.dias_alerta_urgente) || 5;
  if (esStaff) {
    players
      .filter((p) => diasProximoVencimiento(p) <= diasUrgente)
      .forEach((p) =>
        notificaciones.push({
          id: `venc-${p.id}`,
          icono: 'medical_services',
          urgente: diasProximoVencimiento(p) <= 0,
          texto: `${p.firstName} ${p.lastName}: ${textoVencimiento(p)}`,
          onClick: vistas.includes('alertas') ? () => goTo('alertas') : undefined,
        })
      );
    players
      .filter((p) => p.matchStatus.lineupRole !== 'BAJA' && !p.matchStatus.attendanceConfirmed && p.matchStatus.declineReason)
      .forEach((p) =>
        notificaciones.push({
          id: `aus-${p.id}`,
          icono: 'event_busy',
          texto: `${p.firstName} ${p.lastName} avisó que falta: ${p.matchStatus.declineReason}`,
          onClick: vistas.includes('planilla') ? () => goTo('planilla') : undefined,
        })
      );
    const vencidas = players.filter((p) => p.dues.status === 'overdue').length;
    if (vencidas && vistas.includes('tesoreria'))
      notificaciones.push({
        id: 'cuotas-vencidas',
        icono: 'payments',
        texto: `${vencidas} jugadores con cuotas vencidas`,
        onClick: () => goTo('tesoreria'),
      });
  } else if (myPlayer) {
    const estado = estadoHabilitacion(myPlayer, opcionesHabilitacion);
    if (!estado.habilitado)
      notificaciones.push({ id: 'hab', icono: 'block', urgente: true, texto: `No estás habilitado: ${estado.motivo}` });
    if (diasProximoVencimiento(myPlayer) <= (Number(textos.dias_aviso_preventivo) || 30))
      notificaciones.push({
        id: 'venc',
        icono: 'medical_services',
        urgente: diasProximoVencimiento(myPlayer) <= diasUrgente,
        texto: `${diasProximoVencimiento(myPlayer) <= 0 ? 'Tenés vencido' : 'Se te vence'} el ${
          myPlayer.ludRegistration.cardExpiry && diasHasta(myPlayer.ludRegistration.cardExpiry) === diasProximoVencimiento(myPlayer)
            ? 'carné LUD'
            : 'la ficha médica'
        }${diasProximoVencimiento(myPlayer) > 0 ? ` en ${diasProximoVencimiento(myPlayer)} días` : ''}. Renovalo y avisale al delegado.`,
      });
    if (myPlayer.dues.debtAmount > 0)
      notificaciones.push({
        id: 'deuda',
        icono: 'payments',
        texto: `Tenés $${myPlayer.dues.debtAmount.toLocaleString('es-UY')} de cuota pendiente.`,
      });
    if (myPlayer.matchStatus.attendanceConfirmed == null && !myPlayer.matchStatus.declineReason)
      notificaciones.push({
        id: 'asistencia',
        icono: 'sports_soccer',
        texto: `Confirmá si vas a ${textos.fecha} vs ${textos.rival} (${textos.partido_dia}).`,
      });
  }

  const pendingAlertsCount = players.filter((p) => diasProximoVencimiento(p) <= 5).length;
  // Quienes deben plata (sin cuotas generadas todavía no cuentan como deudores).
  const pendingDuesCount = players.filter((p) => p.dues.debtAmount > 0 || p.dues.status === 'overdue').length;

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
        onBackClick={() => goTo('alertas')}
        onSearchClick={esStaff ? () => setVerBuscador(true) : undefined}
        onNotificationsClick={() => setVerNotificaciones(true)}
        notificaciones={notificaciones.length}
        usuario={
          perfil
            ? `${perfil.email || (myPlayer ? `${myPlayer.firstName} ${myPlayer.lastName}` : 'Este celular')} · ${
                perfil.rol ? NOMBRE_ROL[perfil.rol] : ''
              }`
            : undefined
        }
        onLogout={perfil ? onLogout : undefined}
      />

      {/* Quick Screen Carousel Shortcut Ribbon for Easy Exploration of ALL Screens */}
      {mostrarMenu && (
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
        ].filter((btn) => vistas.includes(btn.id)).map((btn) => (
          <button
            key={btn.id}
            onClick={() => goTo(btn.id)}
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
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-lg mx-auto px-4 ${mostrarMenu ? 'pt-28' : 'pt-20'} pb-8 flex flex-col`}>
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
            onAbrirEnvio={setEnvio}
            onOpenNewBroadcastModal={() => setIsBroadcastModalOpen(true)}
            onEditarPlantilla={puedeEditarTextos ? setPlantillaEditando : undefined}
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
            onSendWhatsAppReminder={(p) => avisarJugador(p, textos.plantilla_cuota, 'Recordatorio de cuota')}
            onGenerarCuotas={!perfil || perfil.rol === 'admin' || perfil.rol === 'tesorero' ? handleGenerarCuotas : undefined}
            onSendMassReminder={() =>
              setEnvio({
                titulo: 'Recordatorio de cuota',
                tema: 'Recordatorio de cuota',
                plantilla: textos.plantilla_cuota,
                destinatarios: audiencias.deudores,
              })
            }
            showToast={showToast}
          />
        )}

        {currentTab === 'planilla' && (
          <PlanillaOpsScreen
            players={players}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onSendWhatsappCitation={abrirConvocatoria}
            onGuardarConvocatoria={puedeEditarJugadores ? handleGuardarConvocatoria : undefined}
            onRecordarAsistencia={(pendientes) =>
              setEnvio({
                titulo: 'Confirmar asistencia',
                tema: `Asistencia ${textos.fecha}`,
                plantilla: textos.plantilla_convocatoria,
                destinatarios: pendientes,
              })
            }
            onOpenLineupModal={() => goTo('nuevo-jugador')}
            onEditPlayer={puedeEditarJugadores ? setJugadorEditando : undefined}
            onOpenDocuments={puedeEditarJugadores ? (p) => setDocumentosId(p.id) : undefined}
            showToast={showToast}
          />
        )}

        {currentTab === 'jugador' &&
          (myPlayer ? (
            <PerfilJugadorScreen
              key={myPlayer.id}
              player={myPlayer}
              onUpdateAttendance={handleUpdateAttendance}
              onVerArchivo={useDb ? handleVerArchivo : undefined}
              showToast={showToast}
            />
          ) : (
            <p className="py-24 text-center text-[13px] text-[#44474f]">
              Todavía no hay jugadores cargados.
            </p>
          ))}

        {currentTab === 'club' && (
          <ClubProfileScreen
            players={players}
            roles={roles}
            textos={textos}
            onSaveTextos={handleSaveTextos}
            persistent={useDb}
            miembros={miembros}
            miEmail={perfil?.email}
            onQuitarMiembro={handleQuitarAcceso}
            onOpenAssignRoleModal={() => setIsAssignRoleModalOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'nuevo-jugador' && (
          <NuevoJugadorWizard
            onCancel={() => goTo('alertas')}
            onSavePlayer={handleSaveNewPlayer}
            showToast={showToast}
            ejemplo={!useDb}
          />
        )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      {currentTab !== 'nuevo-jugador' && mostrarMenu && (
        <BottomNav
          allowedTabs={vistasMenu}
          currentTab={currentTab}
          onTabChange={goTo}
          pendingAlertsCount={pendingAlertsCount}
          pendingDuesCount={pendingDuesCount}
        />
      )}

      {/* Global Interactive Modals */}
      <NewBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        conteos={{
          por_vencer: audiencias.por_vencer.length,
          deudores: audiencias.deudores.length,
          citados: audiencias.citados.length,
          plantel: audiencias.plantel.length,
        }}
        onSend={(audience, msg) =>
          setEnvio({
            titulo: 'Mensaje al plantel',
            tema: 'Mensaje del club',
            plantilla: msg,
            destinatarios: audiencias[audience],
            permitirGrupo: audience === 'plantel' || audience === 'citados',
          })
        }
      />

      <EditTemplateModal
        plantilla={
          plantillaEditando
            ? {
                titulo: PLANTILLAS.find((x) => x.clave === plantillaEditando)?.titulo ?? 'Plantilla',
                valor: textos[plantillaEditando],
              }
            : null
        }
        onClose={() => setPlantillaEditando(null)}
        onSave={(valor) => (plantillaEditando ? handleSaveTextos({ ...textos, [plantillaEditando]: valor }) : Promise.resolve(false))}
      />

      <EnvioWhatsAppModal envio={envio} onClose={() => setEnvio(null)} onRegistrar={handleRegistrarEnvio} />

      <BuscadorJugadores
        abierto={verBuscador}
        players={players}
        onClose={() => setVerBuscador(false)}
        onElegir={
          puedeEditarJugadores
            ? (p) => {
                setVerBuscador(false);
                setJugadorEditando(p);
              }
            : undefined
        }
        describir={(p) => {
          const e = estadoHabilitacion(p, opcionesHabilitacion);
          return [
            e.habilitado ? 'Habilitado' : `No habilitado (${e.motivo})`,
            p.dues.debtAmount > 0 ? `debe $${p.dues.debtAmount.toLocaleString('es-UY')}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
        }}
      />

      <PanelNotificaciones abierto={verNotificaciones} items={notificaciones} onClose={() => setVerNotificaciones(false)} />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        player={selectedPlayerForPayment}
        players={players}
        onConfirmPayment={handleConfirmPayment}
      />

      <AssignRoleModal
        isOpen={isAssignRoleModalOpen}
        onClose={() => setIsAssignRoleModalOpen(false)}
        onConfirm={handleAsignarAcceso}
      />

      <EditarJugadorModal
        player={jugadorEditando}
        onClose={() => setJugadorEditando(null)}
        onSave={handleGuardarJugador}
      />

      <DocumentosModal
        player={jugadorDocumentos}
        persistent={useDb}
        onClose={() => setDocumentosId(null)}
        onGuardarHabilitacion={handleGuardarHabilitacion}
        onCargarFichaMedica={handleCargarFichaMedica}
        onGuardarCarneLud={handleGuardarCarneLud}
        onVerArchivo={handleVerArchivo}
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
