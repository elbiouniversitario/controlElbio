import React, { useState } from 'react';
import { Player } from '../types';
import { initialsAvatar } from '../lib/avatar';
import { hoyISO, periodoActual } from '../lib/fechas';
import { useTextos } from '../lib/textos';

interface NuevoJugadorWizardProps {
  onCancel: () => void;
  /** Devuelve false si no se pudo guardar. */
  onSavePlayer: (player: Player) => Promise<boolean>;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  /** Modo demo: el formulario arranca con un jugador de ejemplo. Con la base real, vacío. */
  ejemplo?: boolean;
}

export const NuevoJugadorWizard: React.FC<NuevoJugadorWizardProps> = ({
  onCancel,
  onSavePlayer,
  showToast,
  ejemplo = false,
}) => {
  const ej = <T,>(valor: T, vacio: T): T => (ejemplo ? valor : vacio);
  const t = useTextos();
  const [step, setStep] = useState<1 | 2 | 3>(2); // Start on Step 2 as in initial screenshots, with full ability to go to 1, 2, or 3!

  // Form State
  const [firstName, setFirstName] = useState(ej('Mateo', ''));
  const [lastName, setLastName] = useState(ej('Silva', ''));
  const [number, setNumber] = useState(ej(14, 0));
  const [position, setPosition] = useState('Volante Central');
  const [birthYear, setBirthYear] = useState(ej(2001, 0));
  const [ci, setCi] = useState(ej('4.982.120-5', ''));

  // Step 2 State
  const [phone, setPhone] = useState(ej('098 442 190', ''));
  const [email, setEmail] = useState(ej('mateo.silva@elbiou.edu.uy', ''));
  const [address, setAddress] = useState(ej('Pocitos / Canelones 2034', ''));
  const [emergencyName, setEmergencyName] = useState(ej('Laura Martínez', ''));
  const [emergencyPhone, setEmergencyPhone] = useState(ej('099 876 543', ''));
  const [relation, setRelation] = useState<'Padre/Madre' | 'Pareja' | 'Hermano/a' | 'Otro'>('Padre/Madre');
  const [healthProvider, setHealthProvider] = useState('medica_uruguaya');
  const [mobileEmergency, setMobileEmergency] = useState<'SEMM' | 'UCM Falck' | 'SUAT' | 'Otra / Interior'>('SEMM');
  const [memberNumber, setMemberNumber] = useState(ej('142857-4', ''));

  // Step 3 State
  const [expiryDate, setExpiryDate] = useState(() => `${Number(hoyISO().slice(0, 4)) + 1}${hoyISO().slice(4)}`);
  const [clinic, setClinic] = useState(ej('Centro Médico Elbio Fernández - Dpto. Aptitud', ''));
  const [fileName, setFileName] = useState(ej('carnet_salud_frente_dorso.jpg', ''));
  const [medicalNotes, setMedicalNotes] = useState('');
  const [cardInHand, setCardInHand] = useState<'En mano del delegado' | 'En poder del jugador' | 'En trámite secretaría'>('En mano del delegado');
  const [federatedId, setFederatedId] = useState(ej(48291, 0));
  const [signedConsent, setSignedConsent] = useState(true);

  const handleNextStep2 = () => {
    if (!phone || !email || !emergencyName || !emergencyPhone) {
      showToast('Por favor completa los campos obligatorios (*)', 'error', 'error');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (saving) return;
    if (!firstName.trim() || !lastName.trim() || !number) {
      showToast('Completá nombre, apellido y número de camiseta (paso 1)', 'error', 'error');
      setStep(1);
      return;
    }
    if (!signedConsent) {
      showToast('Debe aceptar el consentimiento de responsabilidad deportiva', 'error', 'error');
      return;
    }

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      number: Number(number),
      firstName,
      lastName,
      position,
      category: 'Mayores (Fútbol Universitario)',
      birthYear: Number(birthYear) || 0,
      documento: ci.replace(/[.\s]/g, '') || undefined,
      avatarUrl: initialsAvatar(firstName, lastName),
      phone,
      email,
      address,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relation,
      },
      healthProvider,
      mobileEmergency,
      memberNumber,
      medicalCertificate: {
        expiryDate,
        daysRemaining: 245,
        clinic,
        fileName,
        fileSize: '1.8 MB',
        verified: true,
        notes: medicalNotes,
      },
      ludRegistration: {
        cardInHand,
        federatedId: Number(federatedId) || 0,
        category: 'Mayores (Fútbol Universitario)',
        signedConsent,
      },
      matchStatus: {
        lineupRole: 'SUPLENTE',
        attendanceConfirmed: false,
      },
      // La cuota del mes arranca pendiente; el cobro se registra desde Tesorería.
      dues: {
        period: periodoActual(),
        status: 'pending',
        debtAmount: 1400,
      },
    };

    setSaving(true);
    const ok = await onSavePlayer(newPlayer);
    setSaving(false);
    if (!ok) return;
    showToast(`¡${firstName} ${lastName} dado de alta como jugador HABILITADO!`, 'how_to_reg', 'success');
  };

  return (
    <div className="flex flex-col w-full pb-28">
      {/* Stepper & Progress Tracker */}
      <section className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-[#e0e3e6]/60">
        <div className="flex items-center justify-between mb-3">
          {/* Step 1 */}
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 focus:outline-none"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-[10px] font-bold ${
                step > 1
                  ? 'bg-emerald-100 text-emerald-800'
                  : step === 1
                  ? 'bg-[#00183a] text-white shadow-sm'
                  : 'bg-[#e6e8eb] text-[#747780]'
              }`}
            >
              {step > 1 ? (
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              ) : (
                '1'
              )}
            </div>
            <span
              className={`font-heading text-[10px] uppercase tracking-wider font-bold ${
                step === 1 ? 'text-[#00183a]' : 'text-[#44474f]'
              }`}
            >
              Personal
            </span>
          </button>

          <span
            className={`w-6 h-0.5 ${step >= 2 ? 'bg-emerald-300' : 'bg-[#e0e3e6]'}`}
          ></span>

          {/* Step 2 */}
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 focus:outline-none"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-[10px] font-bold ${
                step > 2
                  ? 'bg-emerald-100 text-emerald-800'
                  : step === 2
                  ? 'bg-[#00183a] text-white shadow-sm'
                  : 'bg-[#e6e8eb] text-[#747780]'
              }`}
            >
              {step > 2 ? (
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              ) : (
                '2'
              )}
            </div>
            <span
              className={`font-heading text-[10px] uppercase tracking-wider font-bold ${
                step === 2 ? 'text-[#00183a]' : 'text-[#44474f]'
              }`}
            >
              Contacto
            </span>
          </button>

          <span
            className={`w-6 h-0.5 ${step === 3 ? 'bg-[#00183a]' : 'bg-[#e0e3e6]'}`}
          ></span>

          {/* Step 3 */}
          <button
            onClick={() => setStep(3)}
            className="flex items-center gap-1.5 focus:outline-none"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-[10px] font-bold ${
                step === 3
                  ? 'bg-[#b51a1b] text-white shadow-sm'
                  : 'bg-[#e6e8eb] text-[#747780]'
              }`}
            >
              3
            </div>
            <span
              className={`font-heading text-[10px] uppercase tracking-wider font-bold ${
                step === 3 ? 'text-[#b51a1b]' : 'text-[#747780]'
              }`}
            >
              Salud
            </span>
          </button>
        </div>

        {/* Completion Progress Bar */}
        <div className="w-full bg-[#e6e8eb] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#00183a] h-full rounded-full transition-all duration-500"
            style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="font-sans text-[11px] text-[#44474f]">
            Paso {step} de 3
          </span>
          <span className="font-heading text-[10px] text-[#b51a1b] font-bold">
            {step === 1 ? '33%' : step === 2 ? '66%' : '100%'} COMPLETADO
          </span>
        </div>
      </section>

      {/* STEP 1: DATOS PERSONALES */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="mb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#00183a] text-[22px]">
                badge
              </span>
              <h2 className="font-heading font-bold text-[18px] text-[#00183a]">
                Datos Personales del Jugador
              </h2>
            </div>
            <p className="font-sans text-[12px] text-[#44474f] leading-relaxed">
              Filiación básica y registro para fichaje oficial de la Liga Universitaria.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Nombre <span className="text-[#b51a1b]">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="ej: Mateo"
                className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Apellido <span className="text-[#b51a1b]">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="ej: Silva"
                className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-heading text-[12px] font-bold text-[#00183a]">
                  Cédula (CI) <span className="text-[#b51a1b]">*</span>
                </label>
                <input
                  type="text"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  placeholder="4.982.120-5"
                  className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-heading text-[12px] font-bold text-[#00183a]">
                  Año Nacimiento <span className="text-[#b51a1b]">*</span>
                </label>
                <input
                  type="number"
                  value={birthYear || ''}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  placeholder="2001"
                  className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-heading text-[12px] font-bold text-[#00183a]">
                  Número de Camiseta
                </label>
                <input
                  type="number"
                  value={number || ''}
                  onChange={(e) => setNumber(Number(e.target.value))}
                  placeholder="14"
                  className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-heading text-[12px] font-bold text-[#00183a]">
                  Posición Habitual
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                >
                  <option value="Arquero / Golero">Arquero / Golero</option>
                  <option value="Defensa Central">Defensa Central</option>
                  <option value="Lateral Derecho">Lateral Derecho</option>
                  <option value="Lateral Izquierdo">Lateral Izquierdo</option>
                  <option value="Volante Central">Volante Central</option>
                  <option value="Volante Ofensivo">Volante Ofensivo</option>
                  <option value="Extremo">Extremo</option>
                  <option value="Delantero Centro">Delantero Centro</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full h-12 bg-[#00183a] hover:bg-[#0d2d59] text-white rounded-lg font-heading text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            <span>Siguiente: Contacto y Emergencia (Paso 2)</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* STEP 2: CONTACTO Y EMERGENCIA MÉDICA (Exact matches for Screen 2) */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Section Title & Narrative */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="material-symbols-outlined text-[#b51a1b] text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                contact_emergency
              </span>
              <h2 className="font-heading font-bold text-[18px] text-[#00183a]">
                Contacto y Emergencia Médica
              </h2>
            </div>
            <p className="font-sans text-[12px] text-[#44474f] leading-relaxed">
              Información vital para comunicación interna del plantel y protocolo de asistencia en
              entrenamientos y partidos oficiales.
            </p>
          </div>

          {/* Card 1: Player Direct Contact */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex items-center justify-between pb-1 border-b border-[#f2f4f7]">
              <h3 className="font-heading font-bold text-[13px] text-[#00183a] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#00183a] rounded-full"></span>
                Datos del Jugador
              </h3>
              <span className="font-heading text-[10px] text-[#b51a1b] font-bold">
                * Campos obligatorios
              </span>
            </div>

            {/* Celular / WhatsApp */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Teléfono celular / WhatsApp <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden">
                <div className="flex items-center gap-1 px-3 bg-[#eceef1] text-[#191c1e] font-heading font-bold text-[12px] h-full shrink-0 border-r border-[#e0e3e6]">
                  <span>🇺🇾</span>
                  <span className="text-[#44474f]">+598</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="099 123 456"
                  className="flex-1 h-full px-3 font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
                <span
                  className="material-symbols-outlined text-green-600 text-[20px] pr-3 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <span className="font-sans text-[11px] text-[#44474f]">
                Se enviarán recordatorios de citaciones y fixtures por WhatsApp.
              </span>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Correo electrónico <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden px-3">
                <span className="material-symbols-outlined text-[#747780] text-[20px] mr-2">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej: mateo.silva@correo.com"
                  className="flex-1 h-full font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
                <span
                  className="material-symbols-outlined text-green-600 text-[20px] shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            </div>

            {/* Residencia / Barrio */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Domicilio / Barrio de residencia
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden px-3">
                <span className="material-symbols-outlined text-[#747780] text-[20px] mr-2">
                  location_on
                </span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ej: Pocitos / Canelones 2034"
                  className="flex-1 h-full font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contacto de Emergencia / Familiar */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex items-center justify-between pb-1 border-b border-[#f2f4f7]">
              <h3 className="font-heading font-bold text-[13px] text-[#00183a] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#b51a1b] rounded-full"></span>
                Contacto de Urgencia / Familiar
              </h3>
              <span className="inline-flex items-center gap-1 bg-[#ffdad6] text-[#b51a1b] text-[10px] font-heading px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b51a1b]"></span>
                Prioridad 1
              </span>
            </div>

            {/* Nombre Contacto */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Nombre completo del contacto de urgencia <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden px-3">
                <span className="material-symbols-outlined text-[#747780] text-[20px] mr-2">
                  person_alert
                </span>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="ej: Laura Martínez"
                  className="flex-1 h-full font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Teléfono de urgencia */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Teléfono directo de urgencia <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden px-3">
                <span
                  className="material-symbols-outlined text-[#b51a1b] text-[20px] mr-2"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  phone_in_talk
                </span>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="ej: 099 876 543"
                  className="flex-1 h-full font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Relación / Vínculo Chips */}
            <div className="flex flex-col gap-1.5">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Vínculo / Relación con el deportista <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['Padre/Madre', 'Pareja', 'Hermano/a', 'Otro'] as const).map((v) => {
                  const isSelected = relation === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRelation(v)}
                      className={`h-11 px-3 rounded-lg font-heading text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00183a] text-white shadow-sm'
                          : 'bg-[#eceef1] text-[#44474f] hover:bg-[#e6e8eb]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {v === 'Padre/Madre'
                          ? 'family_restroom'
                          : v === 'Pareja'
                          ? 'favorite'
                          : v === 'Hermano/a'
                          ? 'group'
                          : 'more_horiz'}
                      </span>
                      {v === 'Padre/Madre'
                        ? 'Padre / Madre'
                        : v === 'Hermano/a'
                        ? 'Hermano / a'
                        : v === 'Otro'
                        ? 'Otro tutor'
                        : 'Pareja'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 3: Cobertura Médica Asistencial */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex items-center justify-between pb-1 border-b border-[#f2f4f7]">
              <h3 className="font-heading font-bold text-[13px] text-[#00183a] uppercase tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#fabc4d] rounded-full"></span>
                Cobertura Médica Asistencial
              </h3>
              <span className="font-heading text-[10px] text-[#44474f] bg-[#eceef1] px-2 py-0.5 rounded font-bold">
                Requerido por Liga
              </span>
            </div>

            {/* Mutualista / Prestador */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Mutualista / Prestador de Salud <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="relative bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] flex items-center px-3">
                <span className="material-symbols-outlined text-[#747780] text-[20px] mr-2">
                  local_hospital
                </span>
                <select
                  value={healthProvider}
                  onChange={(e) => setHealthProvider(e.target.value)}
                  className="w-full h-full bg-transparent font-sans text-[14px] text-[#00183a] appearance-none focus:outline-none pr-8 cursor-pointer"
                >
                  <option value="medica_uruguaya">Médica Uruguaya</option>
                  <option value="casmu">CASMU</option>
                  <option value="smi">SMI (Servicio Médico Integral)</option>
                  <option value="espanola">Asociación Española</option>
                  <option value="britanico">Hospital Británico</option>
                  <option value="evangelico">Hospital Evangélico</option>
                  <option value="cosem">COSEM</option>
                  <option value="asse">ASSE</option>
                  <option value="bluecross">BlueCross & BlueShield</option>
                </select>
                <span className="material-symbols-outlined text-[#747780] absolute right-3 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Emergencia Móvil Chips */}
            <div className="flex flex-col gap-1.5">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Servicio de Emergencia Móvil <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['SEMM', 'UCM Falck', 'SUAT', 'Otra / Interior'] as const).map((em) => {
                  const isSelected = mobileEmergency === em;
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setMobileEmergency(em)}
                      className={`h-11 px-3 rounded-lg font-heading text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00183a] text-white shadow-sm'
                          : 'bg-[#eceef1] text-[#44474f] hover:bg-[#e6e8eb]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {em === 'SEMM'
                          ? 'ambulance'
                          : em === 'UCM Falck'
                          ? 'emergency'
                          : em === 'SUAT'
                          ? 'medical_services'
                          : 'add_circle'}
                      </span>
                      {em}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Número de Afiliado */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#191c1e]">
                Número de afiliado / socio médico
              </label>
              <div className="flex items-center bg-white rounded-lg h-12 shadow-xs border border-[#e0e3e6] focus-within:ring-2 focus-within:ring-[#00183a] overflow-hidden px-3">
                <span className="material-symbols-outlined text-[#747780] text-[20px] mr-2">
                  badge
                </span>
                <input
                  type="text"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder="ej: 142857-4 (opcional)"
                  className="flex-1 h-full font-sans text-[14px] text-[#00183a] bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* Institutional Safety Notice Card */}
            <div className="bg-[#f2f4f7] p-3 rounded-lg flex items-start gap-2.5 border border-[#e0e3e6]">
              <span
                className="material-symbols-outlined text-[#00183a] text-[20px] shrink-0 mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield_with_heart
              </span>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-[10px] text-[#00183a] uppercase">
                  Protocolo de Asistencia Cancha
                </span>
                <span className="font-sans text-[11px] text-[#44474f]">
                  En caso de incidente en campo, el delegado activará de inmediato el servicio móvil
                  indicado y se dará aviso al contacto principal registrado.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions / Navigation Zone */}
          <div className="flex flex-col gap-2.5 mt-2">
            <button
              onClick={handleNextStep2}
              className="w-full h-12 bg-[#00183a] hover:bg-[#0d2d59] text-white rounded-lg font-heading text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
              type="button"
            >
              <span>Siguiente: Salud y Liga (Paso 3)</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full h-12 bg-[#eceef1] hover:bg-[#e6e8eb] text-[#00183a] rounded-lg font-heading text-[12px] font-bold tracking-wide uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Volver a Paso 1 (Datos Personales)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: HABILITACIÓN DEPORTIVA Y CARNÉ DE LIGA (Exact matches for Screen 4) */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#d7e3ff] text-[#00183a] font-heading text-[9px] uppercase tracking-wider font-bold">
                Paso Final 3/3
              </span>
              <span className="inline-flex items-center gap-1 text-[#fabc4d] font-heading text-[10px] font-bold">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                Club Elbio Fernández
              </span>
            </div>
            <h2 className="font-heading font-bold text-[20px] text-[#00183a]">
              Habilitación Deportiva y Carné de Liga
            </h2>
            <p className="font-sans text-[12px] text-[#44474f] mt-0.5 leading-relaxed">
              Documentación requerida para habilitación oficial de la Liga Universitaria de Deportes.
            </p>
          </div>

          {/* Bloque 1: Carné de Salud del Deporte */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex items-center gap-2.5 pb-1 border-b border-[#f2f4f7]">
              <div className="w-9 h-9 rounded-lg bg-[#f2f4f7] flex items-center justify-center text-[#00183a] border border-[#e0e3e6]">
                <span className="material-symbols-outlined text-[22px]">medical_services</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-[14px] text-[#00183a]">
                  Carné de Salud del Deporte
                </h3>
                <p className="font-sans text-[11px] text-[#44474f]">
                  Requisito médico habilitante
                </p>
              </div>
            </div>

            {/* Fecha de Vencimiento */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center justify-between">
                <span>
                  Fecha de Vencimiento <span className="text-[#b51a1b]">*</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6e8eb] text-[#44474f] text-[10px] font-medium font-sans">
                  <span className="material-symbols-outlined text-[12px]">schedule</span> Al día
                  sugerido
                </span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-12 px-3 pl-11 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747780] text-[20px] pointer-events-none">
                  event
                </span>
              </div>
            </div>

            {/* Centro Emisor */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Centro de emisión / Médico <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  placeholder="Ej. Centro Médico Elbio / Clínica Deportiva"
                  className="w-full h-12 px-3 pl-11 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747780] text-[20px] pointer-events-none">
                  local_hospital
                </span>
              </div>
            </div>

            {/* Archivo / Foto del Carné de Salud */}
            <div className="flex flex-col gap-1.5">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Adjuntar foto o PDF del carné por ambos lados
              </label>
              <div className="bg-[#f2f4f7] rounded-xl p-3 flex items-center justify-between gap-3 border border-[#e0e3e6]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#0d2d59] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">description</span>
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="font-heading font-bold text-[12px] text-[#00183a] truncate">
                      {fileName}
                    </span>
                    <span className="font-sans text-[11px] text-[#44474f] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> 1.8 MB ·
                      Verificado
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileName('comprobante_actualizado.jpg')}
                  aria-label="Eliminar archivo"
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#b51a1b] active:scale-95 transition-transform border border-[#e0e3e6]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => showToast('Abriendo selector de cámara o archivos del dispositivo')}
                className="w-full h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                Reemplazar documento o tomar foto
              </button>
            </div>

            {/* Observaciones Médicas */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Observaciones médicas o alergias (Opcional)
              </label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Alergias a medicación, uso de inhalador o cirugías previas..."
                rows={2}
                className="w-full p-3 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6] resize-none"
              ></textarea>
            </div>
          </div>

          {/* Bloque 2: Carné y Ficha de Liga Universitaria */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3.5 border border-[#e0e3e6]/60">
            <div className="flex items-center gap-2.5 pb-1 border-b border-[#f2f4f7]">
              <div className="w-9 h-9 rounded-lg bg-[#ffdad6] flex items-center justify-center text-[#b51a1b]">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-[14px] text-[#00183a]">
                  Liga Universitaria de Deportes
                </h3>
                <p className="font-sans text-[11px] text-[#44474f]">Filiación oficial {t.temporada}</p>
              </div>
            </div>

            {/* ¿Se posee el Carné Físico? Selector Tabs */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                ¿Se posee el Carné Físico de Liga?
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#f2f4f7] p-1 rounded-xl border border-[#e0e3e6]">
                {(
                  [
                    'En mano del delegado',
                    'En poder del jugador',
                    'En trámite secretaría',
                  ] as const
                ).map((opt) => {
                  const isSelected = cardInHand === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCardInHand(opt)}
                      className={`px-2 py-2 rounded-lg font-heading text-[10px] font-bold text-center transition-all ${
                        isSelected
                          ? 'bg-[#00183a] text-white shadow-sm'
                          : 'text-[#44474f] hover:text-[#00183a]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Número de Ficha Federada */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Número de Ficha Federada Liga <span className="text-[#b51a1b]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={federatedId || ''}
                  onChange={(e) => setFederatedId(Number(e.target.value))}
                  placeholder="Ej. 48291"
                  className="w-full h-12 px-3 pl-11 rounded-lg bg-[#f2f4f7] text-[#00183a] font-heading font-bold text-[16px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
                />
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747780] text-[20px] pointer-events-none">
                  tag
                </span>
              </div>
            </div>

            {/* Categoría a inscribir */}
            <div className="flex flex-col gap-1">
              <label className="font-heading text-[12px] font-bold text-[#00183a]">
                Categoría a inscribir
              </label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6]">
                <div className="flex items-center gap-2.5">
                  <span
                    className="material-symbols-outlined text-[#b51a1b] text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspace_premium
                  </span>
                  <div>
                    <p className="font-heading font-bold text-[13px] text-[#00183a]">
                      Mayores (Fútbol Universitario)
                    </p>
                    <p className="font-sans text-[11px] text-[#44474f]">
                      Divisional oficial Elbio Fernández
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#747780] text-[20px]">lock</span>
              </div>
            </div>

            {/* Checkbox de Consentimiento Responsabilidad */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-[#f2f4f7] cursor-pointer hover:bg-[#eceef1] transition-colors border border-[#e0e3e6]">
              <input
                type="checkbox"
                checked={signedConsent}
                onChange={(e) => setSignedConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded text-[#00183a] focus:ring-0 accent-[#00183a] cursor-pointer shrink-0"
              />
              <span className="font-sans text-[12px] text-[#00183a] select-none leading-relaxed">
                El jugador firmó el{' '}
                <strong>consentimiento de responsabilidad deportiva</strong> de la temporada {t.temporada}
                bajo la tutela del Club Elbio Fernández.
              </span>
            </label>
          </div>

          {/* Tarjeta de Resumen / Estado de Habilitación */}
          <div className="bg-[#00183a] text-white rounded-xl p-4 shadow-md flex items-center gap-3.5 relative overflow-hidden border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#fabc4d] text-[#241600] flex items-center justify-center shrink-0 shadow-sm">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                sports_soccer
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-[10px] uppercase tracking-wider text-[#fabc4d] font-black">
                ESTADO AUTOMÁTICO
              </span>
              <p className="font-heading font-bold text-[15px] text-white leading-tight mt-0.5">
                Jugador quedará automáticamente HABILITADO
              </p>
              <span className="font-sans text-[11px] text-[#acc7fc] mt-0.5">
                Apto para la próxima fecha oficial de Liga
              </span>
            </div>
          </div>

          {/* Botones de Acción Inferior */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full h-14 rounded-xl bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all disabled:opacity-60"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">how_to_reg</span>
              <span>Finalizar y Dar de Alta al Jugador</span>
            </button>

            <button
              onClick={() => setStep(2)}
              className="w-full h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-1 active:scale-98 transition-transform"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver a Paso 2 (Contacto)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
