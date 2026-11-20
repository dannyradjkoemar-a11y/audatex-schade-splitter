import React from 'react';
import { X, BookOpen, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SoleraInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoleraInfoModal: React.FC<SoleraInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-xl text-slate-800">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white px-5 py-3.5 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Solera Audatex Richtlijnen: Schadesplitsing</h3>
              <p className="text-[11px] text-slate-500">Spuittijd, Materiaalconstante (TZ 51) en Aftrekregels (TZ 143)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm leading-relaxed">
          {/* Section 1 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              1. Wat is de AZT-Materiaalconstante (Tekstzone 51)?
            </h4>
            <p className="text-slate-700">
              In het Audatex-systeem van Solera wordt spuitmateriaal berekend volgens de AZT-formule (tijdseenheid: <strong>1 AE = 6 min • 10 AE = 1 uur</strong>). Deze bestaat uit twee componenten:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
              <li><strong>Variabel lakkosten-deel:</strong> Rechtstreeks gekoppeld aan de gespoten oppervlakte-index, spuitfase (SV/SV1-4/S/SH/SH1/LB/LS) en het aantal laklagen (1-, 2-, 3- of 4-lagen).</li>
              <li><strong>Vaste AZT-materiaalconstante (TZ 51):</strong> Dekt mengbekers, reiniging, filterzeefjes, apparatuurklaarzetting en afplakmaterialen. Audatex hanteert per materiaalsoort één constante (NL-spec. metaal, gecombineerde kunststofconstante, en eventueel meerlagen).</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              2. Het Probleem bij Meerdere Schades (Voor- en Achterzijde)
            </h4>
            <p className="text-slate-700">
              Wanneer een voertuig schade heeft aan zowel de voorzijde als de achterzijde die in één spuitgang wordt hersteld (bijv. dubbele parkeerschade, kettingbotsing of lease-inlevering):
            </p>
            <p className="mt-2 text-slate-700">
              Als hiervoor <strong>twee afzonderlijke calculaties</strong> worden gemaakt, rekent Audatex in <em>beide</em> calculaties opnieuw de vaste voorbereidingstijd (bijv. 23 AE metaal / 14 AE kunststof) en materiaalconstante, wat tot dubbele vergoeding leidt.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Solera Oplossingen: Tekstzone 143 én Tekstzone 95
            </h4>
            <p className="text-slate-700">
              Solera hanteert in de officiële AZT-check twee methoden:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1.5 text-slate-700">
              <li>
                <strong>Twee separate calculaties (TZ 143):</strong> Breng het verschil in voorbereidingstijd en eventuele dubbele materiaalconstante van dezelfde materiaalsoort in mindering op de tweede calculatie via <strong>TZ 143 (Aftrek spuitbedrag)</strong>.
              </li>
              <li>
                <strong>Eén complete calculatie (TZ 95):</strong> Neem alle schades samen op in één Audatex-calculatie en trek het eindbedrag van de eerste schade af via <strong>TZ 95 (Aftrek eerste schade)</strong>. Audatex combineert de voorbereiding en constanten dan automatisch correct.
              </li>
            </ul>
            <div className="mt-2.5 p-3 rounded bg-white border border-amber-300 font-mono text-xs text-amber-950 font-bold">
              Tekstzone 143: Aftrek spuitbedrag - EUR (zie tabblad Aftrekcheck voor exact bedrag)
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-2xs"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};
