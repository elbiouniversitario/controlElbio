import React, { useEffect, useState } from 'react';
import { ClaveTexto, TEXTOS, Textos } from '../lib/textos';

interface TextosEditorProps {
  textos: Textos;
  /** Devuelve false si no se pudo guardar. */
  onSave: (textos: Textos) => Promise<boolean>;
  /** false = modo demo: los cambios no se guardan en la base. */
  persistent: boolean;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const CLAVES = Object.keys(TEXTOS) as ClaveTexto[];
const GRUPOS = [...new Set(CLAVES.map((c) => TEXTOS[c].grupo))];

export const TextosEditor: React.FC<TextosEditorProps> = ({ textos, onSave, persistent, showToast }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Textos>(textos);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(textos), [textos]);

  const dirty = CLAVES.some((c) => draft[c] !== textos[c]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      showToast(persistent ? 'Textos guardados' : 'Textos actualizados (modo demo: no se guardan)', 'check_circle', 'success');
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#00183a] text-[22px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            edit_note
          </span>
          <h3 className="font-heading font-bold text-[18px] text-[#00183a]">Textos de la app</h3>
        </div>
        <span className="material-symbols-outlined text-[#44474f]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {!open && (
        <p className="font-sans text-[12px] text-[#44474f] -mt-1">
          Próximo partido: {textos.fecha} vs {textos.rival} • {textos.partido_dia} {textos.partido_hora}. Tocá para editar.
        </p>
      )}

      {open && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60 flex flex-col gap-4">
          <p className="font-sans text-[12px] text-[#44474f] -mb-1">
            Si dejás un campo vacío se usa el valor de fábrica. En las plantillas podés usar {'{nombre}'}, {'{vencimiento}'},{' '}
            {'{documento}'}, {'{deuda}'}, {'{fecha}'}, {'{rival}'}, {'{dia}'}, {'{hora}'}, {'{citacion}'} y {'{cancha}'}.
          </p>
          {GRUPOS.map((grupo) => (
            <div key={grupo} className="flex flex-col gap-2.5">
              <span className="font-heading text-[10px] uppercase tracking-wider font-black text-[#b51a1b]">
                {grupo}
              </span>
              {CLAVES.filter((c) => TEXTOS[c].grupo === grupo).map((clave) => (
                <label key={clave} className="flex flex-col gap-1">
                  <span className="font-heading text-[11px] font-bold text-[#00183a]">{TEXTOS[clave].label}</span>
                  {'multilinea' in TEXTOS[clave] ? (
                    <textarea
                      value={draft[clave]}
                      onChange={(e) => setDraft((d) => ({ ...d, [clave]: e.target.value }))}
                      className="min-h-24 px-3 py-2 leading-snug rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] sm:text-[13px] text-[#191c1e] focus:outline-none focus:border-[#00183a] select-text"
                    />
                  ) : (
                    <input
                      type="text"
                      value={draft[clave]}
                      onChange={(e) => setDraft((d) => ({ ...d, [clave]: e.target.value }))}
                      className="h-10 px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] sm:text-[13px] text-[#191c1e] focus:outline-none focus:border-[#00183a] select-text"
                    />
                  )}
                </label>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => setDraft(textos)}
              className="h-11 rounded-lg bg-[#e6e8eb] text-[#00183a] font-heading text-[12px] font-bold disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={handleSave}
              className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar textos'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
