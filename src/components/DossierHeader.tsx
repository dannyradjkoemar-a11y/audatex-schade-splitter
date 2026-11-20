import React, { useState } from 'react';
import { DossierMeta } from '../types/audatex';
import { LicensePlateBadge } from './LicensePlateBadge';
import { Calendar, Palette, Edit3, Check } from 'lucide-react';

interface DossierHeaderProps {
  meta: DossierMeta;
  onUpdateMeta: (newMeta: DossierMeta) => void;
  onLookupPlate?: (kenteken: string) => Promise<void>;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ 
  meta, 
  onUpdateMeta,
  onLookupPlate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMeta, setEditedMeta] = useState<DossierMeta>(meta);

  // Sync if prop changes
  React.useEffect(() => {
    setEditedMeta(meta);
  }, [meta]);

  const handleSave = () => {
    onUpdateMeta(editedMeta);
    setIsEditing(false);
    if (onLookupPlate && editedMeta.kenteken) {
      onLookupPlate(editedMeta.kenteken);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-900">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: License plate and vehicle model */}
        <div className="flex items-start sm:items-center gap-4">
          <LicensePlateBadge plate={meta.kenteken} size="md" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {meta.merkModel}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span className="font-mono text-slate-700 tabular-nums">VIN {meta.chassisnummer}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-800 font-medium font-mono tabular-nums">Calculatie {meta.calculatienummer}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Dossier {meta.dossiernummer}</span>
              {meta.bouwjaar && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700">Bouwjaar {meta.bouwjaar}</span>
                </>
              )}
              {meta.kilometerstand !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {meta.kilometerstand.toLocaleString('nl-NL')} km
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Meta indicators and edit toggle */}
        <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-center justify-start lg:justify-end">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px] leading-tight">Laksoort</span>
              <span className="font-semibold text-slate-900">{meta.laksoort}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px] leading-tight">Calculatiedatum</span>
              <span className="font-semibold text-slate-900 font-mono tabular-nums">{meta.datumCalculatie}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors whitespace-nowrap"
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Opslaan & RDW ophalen
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                Wijzig gegevens
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gedetecteerde Solera Audatex US-codes & Tekstzones */}
      {((meta.usCodes && meta.usCodes.length > 0) || (meta.actieveTekstzones && meta.actieveTekstzones.length > 0)) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
          {meta.usCodes && meta.usCodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold text-slate-500 mr-1">US-codes:</span>
              {meta.usCodes.map(code => {
                const isSpecial = ['Z1', 'Z6', 'Y9', 'Y7', 'Y8'].includes(code);
                const labelMap: Record<string, string> = {
                  Z1: 'Z1 Krasvaste lak',
                  Z6: 'Z6 3-lagen',
                  Y9: 'Y9 4-lagen',
                  Y7: 'Y7 Voorspuiten',
                  Y8: 'Y8 Alleen uitgebouwd'
                };
                return (
                  <span
                    key={code}
                    className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${
                      isSpecial
                        ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {labelMap[code] || code}
                  </span>
                );
              })}
            </div>
          )}

          {meta.actieveTekstzones && meta.actieveTekstzones.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-semibold text-slate-500 mr-1">Actieve TZ:</span>
              {meta.actieveTekstzones.map((tz, i) => (
                <span
                  key={`${tz.code}-${i}`}
                  className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]"
                >
                  TZ {tz.code}: {tz.waarde}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editing Form */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs animate-fadeIn">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Kenteken</label>
            <input
              type="text"
              value={editedMeta.kenteken}
              onChange={(e) => setEditedMeta({ ...editedMeta, kenteken: e.target.value.toUpperCase() })}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 uppercase font-bold focus:outline-none focus:border-blue-600"
              placeholder="Bijv. JRR-55-X"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Merk & Model</label>
            <input
              type="text"
              value={editedMeta.merkModel}
              onChange={(e) => setEditedMeta({ ...editedMeta, merkModel: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Bouwjaar</label>
            <input
              type="number"
              min={1980}
              max={new Date().getFullYear() + 1}
              value={editedMeta.bouwjaar ?? ''}
              onChange={(e) =>
                setEditedMeta({
                  ...editedMeta,
                  bouwjaar: e.target.value ? parseInt(e.target.value, 10) : undefined
                })
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              placeholder="Bijv. 2025"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">KM-stand</label>
            <input
              type="number"
              min={0}
              step={500}
              value={editedMeta.kilometerstand ?? ''}
              onChange={(e) =>
                setEditedMeta({
                  ...editedMeta,
                  kilometerstand: e.target.value ? parseInt(e.target.value, 10) : undefined
                })
              }
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
              placeholder="Bijv. 16652"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Calculatienummer</label>
            <input
              type="text"
              value={editedMeta.calculatienummer}
              onChange={(e) => setEditedMeta({ ...editedMeta, calculatienummer: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Expert / Hersteller</label>
            <input
              type="text"
              value={editedMeta.expertHersteller}
              onChange={(e) => setEditedMeta({ ...editedMeta, expertHersteller: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};
