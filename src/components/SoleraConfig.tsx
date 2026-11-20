import React, { useState } from 'react';
import { Tarieven, MateriaalconstanteMethode, VoertuigZone, ZONE_LABELS } from '../types/audatex';
import { formatEuro } from '../utils/calculator';
import { Settings, ShieldCheck, Copy, Check, Info, Sliders } from 'lucide-react';

interface SoleraConfigProps {
  tarieven: Tarieven;
  onUpdateTarieven: (newTarieven: Tarieven) => void;
  methode: MateriaalconstanteMethode;
  onSelectMethode: (methode: MateriaalconstanteMethode) => void;
  invoerTekst143: string;
  advies: string;
  schade1Zone?: VoertuigZone;
  schade2Zone?: VoertuigZone;
}

export const SoleraConfig: React.FC<SoleraConfigProps> = ({
  tarieven,
  onUpdateTarieven,
  methode,
  onSelectMethode,
  invoerTekst143,
  advies,
  schade1Zone = 'voorzijde',
  schade2Zone
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const resolvedS2: VoertuigZone =
    schade2Zone && schade2Zone !== schade1Zone
      ? schade2Zone
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';
  const schade1Naam = ZONE_LABELS[schade1Zone];
  const schade2Naam = ZONE_LABELS[resolvedS2];

  const handleCopy = () => {
    navigator.clipboard?.writeText(invoerTekst143).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRateChange = (field: keyof Tarieven, val: number) => {
    onUpdateTarieven({
      ...tarieven,
      [field]: val
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4 text-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">AZT-Lakcalculatie & Materiaalconstante (Solera Kennisbank)</h3>
              <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                TZ 51 / TZ 143
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Configuratie van de spuitmateriaalvergoeding en aftrekregels bij gesplitste schadedossiers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditingRates(!isEditingRates)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded border transition-colors shadow-2xs ${
            isEditingRates 
              ? 'bg-slate-900 text-white border-slate-900' 
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          {isEditingRates ? 'Sluit Tarieven' : 'Uurlonen & Tarieven'}
        </button>
      </div>

      {/* Tarieven edit panel */}
      {isEditingRates && (
        <div className="mt-4 p-4 rounded bg-slate-50 border border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-blue-600" />
              Tarieven per AE & per Uur (€ excl. BTW)
            </h4>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-300">
              Audatex: 10 AE = 1 uur • 1 AE = 6 min
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Plaatwerk</label>
                <span className="text-[10px] font-mono font-bold text-blue-700">{formatEuro(tarieven.plaatwerktarief / 10)}/AE</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={tarieven.plaatwerktarief}
                  onChange={(e) => handleRateChange('plaatwerktarief', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€/u</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">De/montage</label>
                <span className="text-[10px] font-mono font-bold text-blue-700">{formatEuro(tarieven.demontagetarief / 10)}/AE</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={tarieven.demontagetarief}
                  onChange={(e) => handleRateChange('demontagetarief', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€/u</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Spuittarief</label>
                <span className="text-[10px] font-mono font-bold text-blue-700">{formatEuro(tarieven.spuittarief / 10)}/AE</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={tarieven.spuittarief}
                  onChange={(e) => handleRateChange('spuittarief', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€/u</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Lakmateriaal</label>
                <span className="text-[10px] font-mono font-bold text-blue-700">{formatEuro(tarieven.spuitmateriaaltarief / 10)}/AE</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={tarieven.spuitmateriaaltarief}
                  onChange={(e) => handleRateChange('spuitmateriaaltarief', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€/u</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">AZT Constante</label>
                <span className="text-[10px] font-mono text-slate-400">TZ 51</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tarieven.materiaalconstante}
                  onChange={(e) => handleRateChange('materiaalconstante', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-blue-500 rounded px-2.5 py-1.5 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Milieutoeslag</label>
                <span className="text-[10px] font-mono text-slate-400">Vast</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={tarieven.milieutoeslag}
                  onChange={(e) => handleRateChange('milieutoeslag', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 pr-9"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">€</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Methode Selector */}
      <div className="mt-3.5 grid grid-cols-1 md:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onSelectMethode('solera_tz143')}
          className={`p-3 rounded-md border text-left transition-colors ${
            methode === 'solera_tz143'
              ? 'bg-blue-50/70 border-blue-500 text-slate-900 shadow-2xs'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">
              1. Solera Richtlijn
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300 font-bold">
              TZ 143
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            {schade1Naam} (Schade 1): volledige hoofdvoorbereiding + constante ({formatEuro(tarieven.materiaalconstante)}). {schade2Naam} krijgt aftrek via <strong>TZ 143 / TZ 95</strong>.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectMethode('proportioneel_spuittijd')}
          className={`p-3 rounded-md border text-left transition-colors ${
            methode === 'proportioneel_spuittijd'
              ? 'bg-blue-50/70 border-blue-500 text-slate-900 shadow-2xs'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">
              2. Proportioneel per Materiaal
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 font-bold">
              Standaard
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Constante per materiaal (metaal/kunststof) ÷ totaal spuit-AE van dat materiaal × zone-AE.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectMethode('fifty_fifty')}
          className={`p-3 rounded-md border text-left transition-colors ${
            methode === 'fifty_fifty'
              ? 'bg-blue-50/70 border-blue-500 text-slate-900 shadow-2xs'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">
              3. 50% / 50% Gelijk
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">
              Gelijk
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Beide dossiers dragen exact 50% ({formatEuro(tarieven.materiaalconstante / 2)}) van de constante.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelectMethode('beide_volledig')}
          className={`p-3 rounded-md border text-left transition-colors ${
            methode === 'beide_volledig'
              ? 'bg-amber-50/70 border-amber-500 text-slate-900 shadow-2xs'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">
              4. Beide Volledig
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
              Dubbel
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Beide dossiers dragen {formatEuro(tarieven.materiaalconstante)}.
          </p>
        </button>
      </div>

      {/* Solera Advice & Tekstzone 143 Copier */}
      <div className="mt-3.5 p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Solera Toelichting: </span>
            {advies}
          </div>
        </div>

        {(methode === 'solera_tz143' || methode === 'proportioneel_spuittijd') && (
          <div className="w-full md:w-auto shrink-0 flex items-center gap-2 bg-white border border-slate-300 rounded p-1 pl-2.5 shadow-2xs">
            <span className="font-mono text-xs text-slate-800 font-semibold select-all truncate max-w-xs sm:max-w-md">
              {invoerTekst143}
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors shadow-2xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Kopieer Tekstzone 143 / constante-verdeling naar klembord voor Audapad"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Kopieer TZ 143
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
