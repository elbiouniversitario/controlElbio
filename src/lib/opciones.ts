import { Player } from '../types';

/** Opciones de los desplegables de jugador (alta y edición). */
export const POSICIONES = [
  'Arquero / Golero',
  'Defensa Central',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Volante Central',
  'Volante Ofensivo',
  'Extremo',
  'Delantero Centro',
];

export const PRESTADORES: { valor: string; nombre: string }[] = [
  { valor: 'medica_uruguaya', nombre: 'Médica Uruguaya' },
  { valor: 'casmu', nombre: 'CASMU' },
  { valor: 'smi', nombre: 'SMI (Servicio Médico Integral)' },
  { valor: 'espanola', nombre: 'Asociación Española' },
  { valor: 'britanico', nombre: 'Hospital Británico' },
  { valor: 'evangelico', nombre: 'Hospital Evangélico' },
  { valor: 'cosem', nombre: 'COSEM' },
  { valor: 'asse', nombre: 'ASSE' },
  { valor: 'bluecross', nombre: 'BlueCross & BlueShield' },
];

export const EMERGENCIAS_MOVILES: Player['mobileEmergency'][] = ['SEMM', 'UCM Falck', 'SUAT', 'Otra / Interior'];

export const RELACIONES: Player['emergencyContact']['relation'][] = ['Padre/Madre', 'Pareja', 'Hermano/a', 'Otro'];

export const ROLES_PLANILLA: Player['matchStatus']['lineupRole'][] = ['TITULAR', 'SUPLENTE', 'RESERVA', 'BAJA'];

export const CARNE_EN_MANO: Player['ludRegistration']['cardInHand'][] = [
  'En mano del delegado',
  'En poder del jugador',
  'En trámite secretaría',
];
