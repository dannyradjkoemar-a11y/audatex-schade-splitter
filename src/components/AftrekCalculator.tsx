import React, { useState, useMemo, useEffect } from 'react';
import { 
  berekenMeerdereSchadesAftrek, 
  AftrekSchadeInvoer, 
  Materiaalsoort, 
  SituatieMontage,
  Laksysteem,
  AZT_VOORBEREIDINGSTIJDEN
} from '../utils/aztTable';
import { Copy, Check, Info, Calculator } from 'lucide-react';

interface AftrekCalculatorProps {
  initialSchade1?: Partial<AftrekSchadeInvoer>;
  initialSchade2?: Partial<AftrekSchadeInvoer>;
  uurtarief?: number;
  aePerUur?: number;
  initialLaksysteem?: Laksysteem;
}

export const AftrekCalculator: React.FC<AftrekCalculatorProps> = ({
  initialSchade1,
  initialSchade2,
  uurtarief = 94.00,
  aePerUur = 10,
  initialLaksysteem
}) => {
  const [schade1, setSchade1] = useState<AftrekSchadeInvoer>({
    naam: initialSchade1?.naam || 'Schade 1 (Voorzijde)',
    materiaalsoort: initialSchade1?.materiaalsoort || 'metaal',
    situatie: initialSchade1?.situatie || 'aan_voertuig_zonder_voorspuiten',
    voorbereidingstijdAE: initialSchade1?.voorbereidingstijdAE ?? 23,
    materiaalconstante: initialSchade1?.materiaalconstante ?? 56.80
  });

  const [schade2, setSchade2] = useState<AftrekSchadeInvoer>({
    naam: initialSchade2?.naam || 'Schade 2 (Achterzijde)',
    materiaalsoort: initialSchade2?.materiaalsoort || 'kunststof',
    situatie: initialSchade2?.situatie || 'uitgebouwd',
    voorbereidingstijdAE: initialSchade2?.voorbereidingstijdAE ?? 14,
    materiaalconstante: initialSchade2?.materiaalconstante ?? 52.90
  });

  const [spuittarief, setSpuittarief] = useState<number>(uurtarief);
  const [arbeidseenhedenPerUur] = useState<number>(aePerUur);
  const [kortingPerc, setKortingPerc] = useState<number>(0);
  const [laksysteem, setLaksysteem] = useState<Laksysteem>(initialLaksysteem || '2-lagen');
  const [isKunststofSV1OfBinnendeel, setIsKunststofSV1OfBinnendeel] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync wanneer dossierdata of uurtarief wijzigt
  useEffect(() => {
    setSpuittarief(uurtarief);
  }, [uurtarief]);

  useEffect(() => {
    if (initialLaksysteem) {
      setLaksysteem(initialLaksysteem);
    }
  }, [initialLaksysteem]);

  useEffect(() => {
    if (initialSchade1) {
      setSchade1(prev => ({
        ...prev,
        ...initialSchade1
      }));
    }
  }, [
    initialSchade1?.naam,
    initialSchade1?.materiaalsoort,
    initialSchade1?.situatie,
    initialSchade1?.voorbereidingstijdAE,
    initialSchade1?.materiaalconstante
  ]);

  useEffect(() => {
    if (initialSchade2) {
      setSchade2(prev => ({
        ...prev,
        ...initialSchade2
      }));
    }
  }, [
    initialSchade2?.naam,
    initialSchade2?.materiaalsoort,
    initialSchade2?.situatie,
    initialSchade2?.voorbereidingstijdAE,
    initialSchade2?.materiaalconstante
  ]);

  const getBaseLak = (lak: Laksysteem): '2-lagen' | '1-laags' => (lak === '1-laags' ? '1-laags' : '2-lagen');

  // Sync preset if situations change
  const handleSituatieChange = (
    schadeIndex: 1 | 2, 
    materiaalsoort: Materiaalsoort, 
    situatie: SituatieMontage
  ) => {
    const baseLak = getBaseLak(laksysteem);
    const gevonden = AZT_VOORBEREIDINGSTIJDEN.find(
      r => r.laksysteem === baseLak && r.materiaalsoort === materiaalsoort && r.situatie === situatie
    );
    const standardAE = gevonden ? gevonden.standaardAE : 23;

    if (schadeIndex === 1) {
      setSchade1(prev => ({
        ...prev,
        situatie,
        voorbereidingstijdAE: standardAE
      }));
    } else {
      setSchade2(prev => ({
        ...prev,
        situatie,
        voorbereidingstijdAE: standardAE
      }));
    }
  };

  const handleMateriaalsoortChange = (schadeIndex: 1 | 2, materiaalsoort: Materiaalsoort) => {
    const baseLak = getBaseLak(laksysteem);
    if (schadeIndex === 1) {
      const gevonden = AZT_VOORBEREIDINGSTIJDEN.find(
        r => r.laksysteem === baseLak && r.materiaalsoort === materiaalsoort && r.situatie === schade1.situatie
      );
      setSchade1(prev => ({
        ...prev,
        materiaalsoort,
        voorbereidingstijdAE: gevonden ? gevonden.standaardAE : prev.voorbereidingstijdAE
      }));
    } else {
      const gevonden = AZT_VOORBEREIDINGSTIJDEN.find(
        r => r.laksysteem === baseLak && r.materiaalsoort === materiaalsoort && r.situatie === schade2.situatie
      );
      setSchade2(prev => ({
        ...prev,
        materiaalsoort,
        voorbereidingstijdAE: gevonden ? gevonden.standaardAE : prev.voorbereidingstijdAE
      }));
    }
  };

  const handleLaksysteemChange = (newLak: Laksysteem) => {
    setLaksysteem(newLak);
    const baseLak = getBaseLak(newLak);
    const f1 = AZT_VOORBEREIDINGSTIJDEN.find(
      r => r.laksysteem === baseLak && r.materiaalsoort === schade1.materiaalsoort && r.situatie === schade1.situatie
    );
    const f2 = AZT_VOORBEREIDINGSTIJDEN.find(
      r => r.laksysteem === baseLak && r.materiaalsoort === schade2.materiaalsoort && r.situatie === schade2.situatie
    );
    if (f1) setSchade1(prev => ({ ...prev, voorbereidingstijdAE: f1.standaardAE }));
    if (f2) setSchade2(prev => ({ ...prev, voorbereidingstijdAE: f2.standaardAE }));
  };

  const aftrekResultaat = useMemo(() => {
    return berekenMeerdereSchadesAftrek(
      schade1,
      schade2,
      spuittarief,
      arbeidseenhedenPerUur,
      kortingPerc,
      laksysteem,
      isKunststofSV1OfBinnendeel
    );
  }, [schade1, schade2, spuittarief, arbeidseenhedenPerUur, kortingPerc, laksysteem, isKunststofSV1OfBinnendeel]);

  const tz143Tekst = aftrekResultaat.totaalAftrekBedragTZ143 > 0
    ? `TZ 143: Aftrek spuitbedrag -${aftrekResultaat.totaalAftrekBedragTZ143.toFixed(2)} EUR (${aftrekResultaat.aftrekVoorbereidingstijdAE > 0 ? `${aftrekResultaat.aftrekVoorbereidingstijdAE} AE VBT` : ''}${aftrekResultaat.dubbeleMateriaalconstanteAftrek > 0 ? ` + materiaalconstante -€${aftrekResultaat.dubbeleMateriaalconstanteAftrek.toFixed(2)}` : ''})`
    : `TZ 143: Geen aftrek noodzakelijk`;

  const handleCopyTZ = () => {
    navigator.clipboard?.writeText(tz143Tekst).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Input panel voor Schade 1 en Schade 2 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-500" />
              Zelf Rekenen: Aftrek Meerdere Schades (AZT-Norm)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bereken de aftrek van voorbereidingstijd (AE) en materiaalconstante conform de Solera AZT NL I/2013 & 2026 methodiek
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 text-[11px] font-medium">Laksysteem:</span>
              <select
                value={laksysteem}
                onChange={(e) => handleLaksysteemChange(e.target.value as Laksysteem)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-semibold"
              >
                <option value="2-lagen">2-lagen (Metallic/Mica)</option>
                <option value="1-laags">1-laags (Uni)</option>
                <option value="3-lagen">3-lagen (Z6 Parelmoer)</option>
                <option value="4-lagen">4-lagen (Y9 Meerlagen)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 text-[11px] font-medium">Spuittarief:</span>
              <input
                type="number"
                step="0.5"
                value={spuittarief}
                onChange={(e) => setSpuittarief(parseFloat(e.target.value) || 0)}
                className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 text-right font-mono font-semibold"
              />
              <span className="text-slate-500 text-[10px]">€/u</span>
              <span className="text-blue-700 font-mono text-[10px] font-bold">
                (€ {(spuittarief / 10).toFixed(2)}/AE)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 text-[11px] font-medium">Korting mat.:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={kortingPerc}
                onChange={(e) => setKortingPerc(parseFloat(e.target.value) || 0)}
                className="w-12 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 text-right font-mono font-semibold"
              />
              <span className="text-slate-500 text-[10px]">%</span>
            </div>
          </div>
        </div>

        {/* Schade 1 & Schade 2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SCHADE 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                Schade 1
              </span>
              <input
                type="text"
                value={schade1.naam}
                onChange={(e) => setSchade1({ ...schade1, naam: e.target.value })}
                className="bg-transparent border-none text-right text-xs font-medium text-slate-700 focus:text-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Materiaalsoort</label>
                <select
                  value={schade1.materiaalsoort}
                  onChange={(e) => handleMateriaalsoortChange(1, e.target.value as Materiaalsoort)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 capitalize font-medium"
                >
                  <option value="metaal">Metaal</option>
                  <option value="kunststof">Kunststof</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Situatie / Montage</label>
                <select
                  value={schade1.situatie}
                  onChange={(e) => handleSituatieChange(1, schade1.materiaalsoort, e.target.value as SituatieMontage)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="aan_voertuig_zonder_voorspuiten">Aan voertuig</option>
                  <option value="aan_voertuig_met_voorspuiten">Met voorspuiten (Y7)</option>
                  <option value="uitgebouwd">Uitgebouwd (Y8)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Voorbereidingstijd (AE)</label>
                <input
                  type="number"
                  min="0"
                  value={schade1.voorbereidingstijdAE}
                  onChange={(e) => setSchade1({ ...schade1, voorbereidingstijdAE: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Materiaalconstante (€)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={schade1.materiaalconstante}
                  onChange={(e) => setSchade1({ ...schade1, materiaalconstante: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* SCHADE 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                Schade 2
              </span>
              <input
                type="text"
                value={schade2.naam}
                onChange={(e) => setSchade2({ ...schade2, naam: e.target.value })}
                className="bg-transparent border-none text-right text-xs font-medium text-slate-700 focus:text-slate-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Materiaalsoort</label>
                <select
                  value={schade2.materiaalsoort}
                  onChange={(e) => handleMateriaalsoortChange(2, e.target.value as Materiaalsoort)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 capitalize font-medium"
                >
                  <option value="kunststof">Kunststof</option>
                  <option value="metaal">Metaal</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Situatie / Montage</label>
                <select
                  value={schade2.situatie}
                  onChange={(e) => handleSituatieChange(2, schade2.materiaalsoort, e.target.value as SituatieMontage)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="uitgebouwd">Uitgebouwd (Y8)</option>
                  <option value="aan_voertuig_zonder_voorspuiten">Aan voertuig</option>
                  <option value="aan_voertuig_met_voorspuiten">Met voorspuiten (Y7)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Voorbereidingstijd (AE)</label>
                <input
                  type="number"
                  min="0"
                  value={schade2.voorbereidingstijdAE}
                  onChange={(e) => setSchade2({ ...schade2, voorbereidingstijdAE: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Materiaalconstante (€)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={schade2.materiaalconstante}
                  onChange={(e) => setSchade2({ ...schade2, materiaalconstante: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {schade1.materiaalsoort !== schade2.materiaalsoort && (
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isKunststofSV1OfBinnendeel}
              onChange={(e) => setIsKunststofSV1OfBinnendeel(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span>
              2e materiaalsoort betreft <strong>SV1 / S (gegrond/deklaag) of Binnendeel</strong> (gecombineerde toeslag AZT: <strong>+5 AE</strong> i.p.v. +8 AE bij 2-lagen)
            </span>
          </label>
        )}
      </div>

      {/* Resultaten aftrekberekening */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900">
          Resultaten aftrekberekening
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BOX 1: IN MINDERING BRENGEN AE */}
          <div className="p-4 rounded-md border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              IN MINDERING BRENGEN
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              −{aftrekResultaat.aftrekVoorbereidingstijdAE} AE
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              voorbereidingstijd
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed font-mono">
              {schade1.materiaalsoort === schade2.materiaalsoort ? (
                `${aftrekResultaat.somVoorbereidingstijdAE} AE − ${aftrekResultaat.gecombineerdeVoorbereidingstijdAE} AE = ${aftrekResultaat.aftrekVoorbereidingstijdAE} AE (zelfde materiaal ${schade1.materiaalsoort}: alleen hoofdbewerking)`
              ) : (
                `${aftrekResultaat.somVoorbereidingstijdAE} AE − ${aftrekResultaat.gecombineerdeVoorbereidingstijdAE} AE = ${aftrekResultaat.aftrekVoorbereidingstijdAE} AE (hoofdbewerking ${aftrekResultaat.hoofdbewerkingAE} AE + toeslag 2e materiaal ${aftrekResultaat.toeslagTweedeMateriaalAE} AE)`
              )}
            </div>
          </div>

          {/* BOX 2: INVULLEN BIJ TZ-CODE 143 */}
          <div className="p-4 rounded-md border-2 border-amber-500 bg-amber-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  INVULLEN BIJ TZ-CODE 143
                </span>
                <span className="text-[10px] font-mono text-slate-600">
                  Aftrek spuitbedrag
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
                € −{aftrekResultaat.totaalAftrekBedragTZ143.toFixed(2)}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {aftrekResultaat.heeftDubbeleConstante 
                  ? `Inclusief € ${aftrekResultaat.dubbeleMateriaalconstanteAftrek.toFixed(2)} dubbele materiaalconstante`
                  : 'Geen dubbele materiaalconstante'}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-700 truncate max-w-xs font-semibold">
                TZ 143: -{aftrekResultaat.totaalAftrekBedragTZ143.toFixed(2)} EUR
              </span>
              <button
                onClick={handleCopyTZ}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Gekopieerd' : 'Kopieer'}
              </button>
            </div>
          </div>
        </div>

        {/* IN HET KORT BANNER */}
        <div className="p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r text-xs text-amber-950">
          <strong className="text-slate-900 block mb-0.5">In het kort (2 separate calculaties — TZ 143):</strong>
          <span>{aftrekResultaat.korteConclusie}</span>
        </div>

        {/* ALTERNATIEF TZ 95 BANNER */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-slate-700 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 block mb-0.5">Solera Alternatief (TZ 95):</strong>
            <span>{aftrekResultaat.tz95Opmerking}</span>
          </div>
        </div>

        {/* DE REKENSOM, STAP VOOR STAP */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1.5">
          <strong className="text-slate-900 text-xs block mb-1">De rekensom, stap voor stap:</strong>
          {aftrekResultaat.stappen.map((stap, idx) => (
            <div key={idx} className="text-slate-700 leading-relaxed font-mono text-[11px]">
              {stap}
            </div>
          ))}
        </div>

        {/* WAT DE APP IN DE CALCULATIES VOND */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Calculatie</th>
                <th className="py-2 px-3">Voorbereidingstijd</th>
                <th className="py-2 px-3">Materiaalconstante</th>
                <th className="py-2 px-3">Situatie / Montage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs text-slate-800">
              <tr>
                <td className="py-2 px-3 font-bold text-slate-900">{schade1.naam}</td>
                <td className="py-2 px-3 text-slate-700">{schade1.materiaalsoort} {schade1.voorbereidingstijdAE} AE</td>
                <td className="py-2 px-3 text-slate-700">{schade1.materiaalsoort} € {schade1.materiaalconstante.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500 capitalize">{schade1.situatie.replace(/_/g, ' ')}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-slate-900">{schade2.naam}</td>
                <td className="py-2 px-3 text-slate-700">{schade2.materiaalsoort} {schade2.voorbereidingstijdAE} AE</td>
                <td className="py-2 px-3 text-slate-700">{schade2.materiaalsoort} € {schade2.materiaalconstante.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500 capitalize">{schade2.situatie.replace(/_/g, ' ')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CONTROLEER DIT ZELF */}
        <div className="text-[11px] text-slate-500 space-y-1">
          <strong className="text-slate-700 block">Controleer dit zelf:</strong>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Aangenomen is dat beide schades in één doorgang worden hersteld/gespoten.</li>
            <li>Per materiaalsoort hoort slechts één materiaalconstante te worden gerekend. Het dubbele bedrag is gecorrigeerd conform korting.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
