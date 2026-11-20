import React, { useState } from 'react';
import { 
  AZT_VOORBEREIDINGSTIJDEN, 
  EXTRA_SPUITBEWERKINGEN, 
  TWEEDE_MATERIAALSOORT_TOESLAG,
  AZT_VOORBEREIDING_EXTRA_WAARDEN,
  AZT_SPUITFASEN_KUNSTSTOF,
  AZT_SPUITFASEN_METAAL,
  AZT_US_SPUITMETHODIEK,
  AZT_CARROSSERIE_VS_AANBOUW,
  AZT_MEERLAGEN_LAKSYSTEMEN,
  AZT_KRASVASTE_LAK,
  AZT_UITSPUITEN_LB,
  AZT_SPOT_REPAIR,
  AUDATEX_CODEKAART
} from '../utils/aztTable';
import { BookOpen, Layers, ShieldCheck, Wrench, SlidersHorizontal, FileCode, AlertTriangle } from 'lucide-react';

type NaslagTab = 'voorbereiding' | 'spuitfasen' | 'extra' | 'codekaart';

export const AztNaslag: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NaslagTab>('voorbereiding');
  const [selectedLaksysteem, setSelectedLaksysteem] = useState<'2-lagen' | '1-laags'>('2-lagen');

  const filteredTijden = AZT_VOORBEREIDINGSTIJDEN.filter(
    item => item.laksysteem === selectedLaksysteem
  );

  return (
    <div className="space-y-4">
      {/* Header intro */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Naslag AZT & Solera Audatex Kennisbank
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Officiële Solera Nederland referentietabellen en werkbladen (AZT NL I/2013, Codekaart april 2024, 3-/4-lagen, Krasvaste lak, Spot-Repair & Werkblad 2025/2026). Tijdbasis: <strong className="text-slate-700">1 AE = 6 min • 10 AE = 1 uur</strong>.
            </p>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('voorbereiding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeTab === 'voorbereiding'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Voorbereiding & Spuitmethodiek
          </button>
          <button
            onClick={() => setActiveTab('spuitfasen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeTab === 'spuitfasen'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Spuitfasen & 3-/4-Lagen
          </button>
          <button
            onClick={() => setActiveTab('extra')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeTab === 'extra'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Extra Bewerkingen, Z1 & Spot-Repair
          </button>
          <button
            onClick={() => setActiveTab('codekaart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors ${
              activeTab === 'codekaart'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Audatex Codekaart & Tekstzones
          </button>
        </div>
      </div>

      {/* TAB 1: VOORBEREIDINGSTIJDEN & US-SPUITMETHODIEK */}
      {activeTab === 'voorbereiding' && (
        <div className="space-y-4">
          {/* Tabel 1: AZT Voorbereidingstijden */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Voorbereidingstijden AZT (Tabel NL I/2013)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  De waarden voor 2-lagen gelden ook als voorbereidingsbasis voor 3- en 4-lagen lak (+1 AE meerlagen extra)
                </p>
              </div>

              <div className="flex items-center bg-white p-1 rounded border border-slate-300 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setSelectedLaksysteem('2-lagen')}
                  className={`px-3 py-1 rounded font-semibold transition-colors ${
                    selectedLaksysteem === '2-lagen'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2-Lagen (incl. 3/4-lagen)
                </button>
                <button
                  onClick={() => setSelectedLaksysteem('1-laags')}
                  className={`px-3 py-1 rounded font-semibold transition-colors ${
                    selectedLaksysteem === '1-laags'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1-Laags (Uni)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Materiaalsoort</th>
                    <th className="py-2.5 px-4">Montagesituatie</th>
                    <th className="py-2.5 px-4 text-center">Standaard (AE)</th>
                    <th className="py-2.5 px-4 text-center">Binnendeel (AE)</th>
                    <th className="py-2.5 px-4 text-center">Uren (Std)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs text-slate-800">
                  {filteredTijden.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 capitalize">
                        {item.materiaalsoort}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-sans">
                        {item.situatie === 'aan_voertuig_zonder_voorspuiten' && 'Aan voertuig (zonder voorspuiten)'}
                        {item.situatie === 'aan_voertuig_met_voorspuiten' && 'Aan voertuig (met uitgebouwd voorspuiten — Y7)'}
                        {item.situatie === 'uitgebouwd' && 'Alleen uitgebouwd / los onderdeel (Y8)'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                        {item.standaardAE} AE
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-600">
                        {item.binnendeelAE} AE
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-500">
                        {(item.standaardAE / 10).toFixed(1)} u
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50/60 font-semibold border-t border-amber-200">
                    <td className="py-2.5 px-4 text-amber-900 font-sans font-bold" colSpan={2}>
                      Gecombineerd 2e materiaalsoort (bijv. kunststof bij metaal): Standaard (SV/SH/SH1) vs SV1/S/Binnendeel
                    </td>
                    <td className="py-2.5 px-4 text-center text-amber-900 font-extrabold">
                      +{TWEEDE_MATERIAALSOORT_TOESLAG[selectedLaksysteem].standaard} AE
                    </td>
                    <td className="py-2.5 px-4 text-center text-amber-900 font-bold">
                      +{TWEEDE_MATERIAALSOORT_TOESLAG[selectedLaksysteem].sv1OfBinnendeel} AE
                    </td>
                    <td className="py-2.5 px-4 text-center text-amber-800">
                      LS: +{TWEEDE_MATERIAALSOORT_TOESLAG[selectedLaksysteem].spotRepair} AE
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Extra voorbereidingswaarden bij hoofdbewerking */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Overige voorbereidingswaarden (AZT NL I/2013)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-4">Omschrijving</th>
                    <th className="py-2 px-4 text-center">1-laags</th>
                    <th className="py-2 px-4 text-center">2-/3-/4-lagen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {AZT_VOORBEREIDING_EXTRA_WAARDEN.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-4 font-medium">{row.omschrijving}</td>
                      <td className="py-2 px-4 text-center font-mono">{row.eenLaagsAE} AE</td>
                      <td className="py-2 px-4 text-center font-mono font-bold">{row.tweeLagenAE} AE</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* US-codes Spuitmethodiek (Class 3.32) & Carrosserie vs Aanbouwdelen (incl Tankklep) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Keuzeschema Spuitmethodiek Geschroefde Delen (Class 3.32)
              </h4>
              <div className="space-y-2.5 text-xs">
                {AZT_US_SPUITMETHODIEK.map((item) => (
                  <div key={item.usCode} className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 mr-1.5">
                          {item.usCode}
                        </span>
                        {item.titel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600 font-semibold">{item.positieVoertuig}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{item.toelichting}</p>
                    <p className="text-slate-800 font-mono text-[10px] mt-1 font-semibold">2-lagen: {item.voorbereiding2Lagen}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Carrosserie- vs. Aanbouwdelen & Tank-/oplaadklep
              </h4>
              <div className="text-xs space-y-3">
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Carrosseriedelen (bepalend bij combinatie):</span>
                  <div className="flex flex-wrap gap-1">
                    {AZT_CARROSSERIE_VS_AANBOUW.carrosseriedelen.map(d => (
                      <span key={d} className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px]">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-1">Aanbouwdelen:</span>
                  <div className="flex flex-wrap gap-1">
                    {AZT_CARROSSERIE_VS_AANBOUW.aanbouwdelen.map(d => (
                      <span key={d} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                  <strong className="block text-slate-900 mb-0.5">Tank- / oplaadklep spuitregel:</strong>
                  {AZT_CARROSSERIE_VS_AANBOUW.tankklepRegel}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPUITFASEN KUNSTSTOF/METAAL & 3-/4-LAGEN & LB */}
      {activeTab === 'spuitfasen' && (
        <div className="space-y-4">
          {/* Kunststof */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Spuitfasen Kunststof Onderdelen (AZT)</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Werkzaamheden en toewijzingsregels bij nieuw en herstel kunststof</p>
              </div>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> SH1 bestaat niet op kunststof
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-20">Code</th>
                    <th className="py-2.5 px-4 w-36">Fase</th>
                    <th className="py-2.5 px-4">Aanlevering / Toepassing</th>
                    <th className="py-2.5 px-4">Werkzaamheden spuiter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {AZT_SPUITFASEN_KUNSTSTOF.map(item => (
                    <tr key={item.code}>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{item.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.fase}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">{item.aanlevering}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px]">{item.werkzaamheden}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metaal & Overdrachtsconditie & Steenslaglaag */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Spuitfasen Metalen Delen, Overdrachtsconditie & Anti-steenslaglaag</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Plaatwerker levert spuitklaar af (geen haakse slijper, max. P120). Lasnaadomgeving tot 10 cm (handbreedte) valt binnen herstel-/spuitwerk.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-20">Code</th>
                    <th className="py-2.5 px-4 w-56">Omschrijving</th>
                    <th className="py-2.5 px-4">Richtlijn & Anti-steenslaglaag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {AZT_SPUITFASEN_METAAL.map(item => (
                    <tr key={item.code}>
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{item.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.omschrijving}</td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-relaxed">{item.toelichting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3- & 4-lagen lak en LB uitspuiten */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                3- en 4-Lagen Laksystemen (US-codes Z6 & Y9)
              </h4>
              <div className="space-y-3 text-xs">
                {AZT_MEERLAGEN_LAKSYSTEMEN.map(sys => (
                  <div key={sys.usCode} className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px]">{sys.usCode}</span>
                      <span>{sys.type}</span>
                    </div>
                    <p className="text-[11px] text-blue-800 font-semibold">{sys.voorbereidingExtra}</p>
                    <ul className="space-y-1 text-[11px] text-slate-600">
                      {sys.methoden.map(m => (
                        <li key={m.code}>
                          <strong className="font-mono text-slate-900">{m.code}</strong> ({m.naam}): {m.toepassing}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Uitspuiten: Code LB vs. Code S (Deklaag)
              </h4>
              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 rounded bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Bij 2-lagen laksysteem:</strong>
                  <p className="text-[11px]">{AZT_UITSPUITEN_LB.tweeLaags}</p>
                </div>
                <div className="p-3 rounded bg-purple-50/60 border border-purple-200">
                  <strong className="text-purple-950 block mb-0.5">Bij 3- en 4-lagen laksysteem (Z6 / Y9):</strong>
                  <p className="text-[11px] text-purple-950">{AZT_UITSPUITEN_LB.meerLaags}</p>
                </div>
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-800">Vergoeding:</strong> {AZT_UITSPUITEN_LB.berekeningsbasis}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXTRA BEWERKINGEN, KRASVASTE LAK (Z1/NL) & SPOT-REPAIR (LS) */}
      {activeTab === 'extra' && (
        <div className="space-y-4">
          {/* S-codes */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Extra Spuitbewerkingen AZT (S-Codes 2025/2026)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">S-Code</th>
                    <th className="py-2.5 px-4">Omschrijving</th>
                    <th className="py-2.5 px-4 text-center">Normtijd (AE)</th>
                    <th className="py-2.5 px-4">Toepassingsvoorwaarden & Richtlijn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {EXTRA_SPUITBEWERKINGEN.map((extra, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-700">{extra.code}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{extra.omschrijving}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{extra.standaardAE} AE</td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] leading-relaxed">{extra.toelichting}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Krasvaste lak (Z1/NL) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-900">
                Krasvaste Lak / Ceramic Clear (US-code {AZT_KRASVASTE_LAK.usCode} • Mutatiecode {AZT_KRASVASTE_LAK.mutatieCode})
              </h4>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                Alleen Metaal (S / SH / SH1)
              </span>
            </div>
            <p className="text-xs text-slate-600">{AZT_KRASVASTE_LAK.voorwaarde}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Liggende delen (motorkap, dak, kofferdeksel):</span>
                <strong className="text-base font-mono text-slate-900">+{AZT_KRASVASTE_LAK.standaardToeslagLiggendAE} AE standaard</strong>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Staande delen (spatscherm, portier, zijpaneel):</span>
                <strong className="text-base font-mono text-slate-900">+{AZT_KRASVASTE_LAK.standaardToeslagStaandAE} AE standaard</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">{AZT_KRASVASTE_LAK.opmerking}</p>
          </div>

          {/* Spot-Repair (LS) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-900">
                Spot-Repair (Bewerkingscode {AZT_SPOT_REPAIR.code})
              </h4>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                Max. 6 dm² / A4
              </span>
            </div>
            <p className="text-xs text-slate-700">
              {AZT_SPOT_REPAIR.omschrijving}. Geschikt voor {AZT_SPOT_REPAIR.geschiktVoor} {AZT_SPOT_REPAIR.nietInbegrepen}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <table className="w-full text-left text-xs border border-slate-200 rounded">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Zone</th>
                    <th className="py-2 px-3">Delen</th>
                    <th className="py-2 px-3">Beoordeling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {AZT_SPOT_REPAIR.zones.map(z => (
                    <tr key={z.zone}>
                      <td className="py-2 px-3 font-bold text-slate-900">{z.zone}</td>
                      <td className="py-2 px-3 text-slate-600">{z.delen}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{z.geschiktheid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="w-full text-left text-xs border border-slate-200 rounded">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Post (1e / 2e spot)</th>
                    <th className="py-2 px-3 text-right">AE</th>
                    <th className="py-2 px-3 text-right">Materiaal (1 / 2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                  {AZT_SPOT_REPAIR.calculatieWaarden.map(v => (
                    <tr key={v.post}>
                      <td className="py-2 px-3 font-sans text-slate-800">{v.post}</td>
                      <td className="py-2 px-3 text-right font-bold">{v.tijdAE} AE</td>
                      <td className="py-2 px-3 text-right text-slate-600">{v.materiaalEen} / {v.materiaalTwee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDATEX CODEKAART APRIL 2024 & TEKSTZONES */}
      {activeTab === 'codekaart' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="p-3.5 border-b border-slate-200 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-900">Bijzondere Bewerkingscodes (Codekaart apr 2024)</h4>
              </div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {AUDATEX_CODEKAART.bijzondereBewerkingscodes.map(item => (
                    <tr key={item.code}>
                      <td className="py-2 px-4 font-mono font-bold text-blue-700 w-20">{item.code}</td>
                      <td className="py-2 px-4 text-slate-700 text-[11px]">{item.omschrijving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-900">Mutatiecodes (Qapter / Class)</h4>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {AUDATEX_CODEKAART.mutatiecodes.map(item => (
                      <tr key={item.code}>
                        <td className="py-2 px-4 font-mono font-bold text-indigo-700 w-28">{item.code}</td>
                        <td className="py-2 px-4 text-slate-700 text-[11px]">{item.omschrijving}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-900">Controlegegevens</h4>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {AUDATEX_CODEKAART.controlegegevens.map(item => (
                      <tr key={item.code}>
                        <td className="py-2 px-4 font-mono font-bold text-amber-700 w-20">{item.code}</td>
                        <td className="py-2 px-4 text-slate-700 text-[11px]">{item.omschrijving}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tekstzonecodes */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900">Belangrijkste Tekstzonecodes (TZ) in Nederland</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-4 w-24">TZ Code</th>
                    <th className="py-2 px-4 w-36">Categorie</th>
                    <th className="py-2 px-4">Omschrijving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AUDATEX_CODEKAART.tekstzonecodes.map(tz => (
                    <tr key={tz.code}>
                      <td className="py-2 px-4 font-mono font-bold text-slate-900">TZ {tz.code}</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">{tz.categorie}</td>
                      <td className="py-2 px-4 text-slate-700 text-[11px]">{tz.omschrijving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Twee kolommen: TZ 51 en TZ 143 / TZ 95 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">
                  TZ 51
                </span>
                <h4 className="text-sm font-bold text-slate-900">Materiaalconstante (Spuitmateriaal)</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Per materiaalsoort (metaal of kunststof) mag er in één gecombineerde doorgang slechts <em>één</em> materiaalconstante in rekening worden gebracht (evt. verhoogd met de meerlagenconstante bij Z6/Y9).
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-xs font-bold">
                  TZ 143 & TZ 95
                </span>
                <h4 className="text-sm font-bold text-slate-900">Aftrek Meerdere Schades</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gebruik <strong className="font-mono text-amber-800">TZ 143</strong> bij twee losse calculaties in één spuitgang, of <strong className="font-mono text-blue-800">TZ 95</strong> om het eindbedrag van schade 1 af te trekken in één complete calculatie.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
