import React, { useState } from 'react';
import {
  DossierMeta,
  Tarieven,
  SectieTotalen,
  MateriaalconstanteMethode,
  RdwVoertuigData,
  VoertuigZone,
  ZONE_LABELS
} from '../types/audatex';
import { formatEuro, formatAE } from '../utils/calculator';
import { exportFinancieelRapportPdf } from '../utils/pdfExporter';
import { 
  Printer, 
  Download, 
  FileDown,
  Copy, 
  Check, 
  FileText, 
  ShieldCheck
} from 'lucide-react';

interface FinancieelRapportProps {
  meta: DossierMeta;
  tarieven: Tarieven;
  zones: Record<VoertuigZone, SectieTotalen>;
  actieveZones: VoertuigZone[];
  overig: SectieTotalen;
  totaal: SectieTotalen;
  soleraInfo: {
    constanteVoor: number;
    constanteAchter: number;
    constanteOverig: number;
    constanteSchade1: number;
    constanteSchade2: number;
    constantenPerZone: Record<VoertuigZone, number>;
    invoerTekst143: string;
    advies: string;
  };
  methode: MateriaalconstanteMethode;
  schade1Zone?: VoertuigZone;
  schade2Zone?: VoertuigZone;
  eenmaligePosten?: string[];
  rdw?: RdwVoertuigData;
}

const ZONE_HEAD_BG: Record<VoertuigZone, string> = {
  voorzijde: 'text-blue-900 bg-blue-50/40',
  achterzijde: 'text-indigo-900 bg-indigo-50/40',
  linkerzijde: 'text-teal-900 bg-teal-50/40',
  rechterzijde: 'text-amber-900 bg-amber-50/40',
  bovenzijde: 'text-violet-900 bg-violet-50/40',
  onderzijde: 'text-slate-900 bg-slate-100/70'
};

const ZONE_SUBTOTAL_TEXT: Record<VoertuigZone, string> = {
  voorzijde: 'text-blue-900',
  achterzijde: 'text-indigo-900',
  linkerzijde: 'text-teal-900',
  rechterzijde: 'text-amber-900',
  bovenzijde: 'text-violet-900',
  onderzijde: 'text-slate-900'
};

export const FinancieelRapport: React.FC<FinancieelRapportProps> = ({
  meta,
  tarieven,
  zones,
  actieveZones,
  overig,
  totaal,
  soleraInfo,
  methode,
  schade1Zone = 'voorzijde',
  schade2Zone,
  eenmaligePosten = [],
  rdw
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const resolvedS2: VoertuigZone =
    schade2Zone && schade2Zone !== schade1Zone
      ? schade2Zone
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';

  const displayZones = actieveZones.length > 0 ? actieveZones : [schade1Zone, resolvedS2];
  const hasOverig = overig.totaalBruto > 0 || overig.itemsCount > 0;
  const schade1Label = `${ZONE_LABELS[schade1Zone]} (Schade 1)`;

  const getColLabel = (z: VoertuigZone) => {
    if (z === schade1Zone) return `${ZONE_LABELS[z]} (Schade 1)`;
    if (z === resolvedS2) return `${ZONE_LABELS[z]} (Schade 2)`;
    return ZONE_LABELS[z];
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    exportFinancieelRapportPdf({
      meta,
      tarieven,
      zones,
      actieveZones: displayZones,
      overig,
      totaal,
      soleraInfo,
      methode,
      schade1Zone,
      schade2Zone: resolvedS2,
      eenmaligePosten,
      rdw
    });
  };

  const handleExportCSV = () => {
    const csvCols: SectieTotalen[] = [...displayZones.map(z => zones[z]), overig];
    const colHeaders = [...displayZones.map(z => getColLabel(z).toUpperCase()), 'OVERIG', 'TOTAAL GECOMBINEERD'];

    const csvRows = [
      ['SOLERA AUDATEX SCHADECALCULATIE - VOERTUIGZONE SPLITSINGSRAPPORT'],
      ['Audatex norm', '1 AE = 6 minuten • 10 AE = 1 uur'],
      ['Primaire schade (Schade 1)', schade1Label],
      ['Kenteken', meta.kenteken, 'Voertuig', meta.merkModel],
      ['Calculatienummer', meta.calculatienummer, 'Dossiernummer', meta.dossiernummer],
      ['Datum calculatie', meta.datumCalculatie, 'Expert / Hersteller', meta.expertHersteller],
      ['Laksoort', meta.laksoort, 'Kleurcode', meta.kleurcode],
      [],
      ['POST', ...colHeaders],
      ['Spuittijd (AE)', ...csvCols.map(c => c.spuittijdAE), totaal.spuittijdAE],
      ['Spuittijd (uren)', ...csvCols.map(c => c.spuittijdUren), totaal.spuittijdUren],
      ['Spuitarbeid (€)', ...csvCols.map(c => c.bedragSpuitarbeid), totaal.bedragSpuitarbeid],
      ['Plaatwerk (AE)', ...csvCols.map(c => c.arbeidPlaatwerkAE), totaal.arbeidPlaatwerkAE],
      ['Plaatwerk bedrag (€)', ...csvCols.map(c => c.bedragPlaatwerk), totaal.bedragPlaatwerk],
      ['De/montage (AE)', ...csvCols.map(c => c.arbeidDemontageAE), totaal.arbeidDemontageAE],
      ['De/montage bedrag (€)', ...csvCols.map(c => c.bedragDemontage), totaal.bedragDemontage],
      ['TOTAAL ARBEID (€)', ...csvCols.map(c => c.bedragTotaalArbeid), totaal.bedragTotaalArbeid],
      ['Nieuwe Onderdelen (€)', ...csvCols.map(c => c.bedragOnderdelen), totaal.bedragOnderdelen],
      ['Lakmateriaal basis (€)', ...csvCols.map(c => c.bedragSpuitmateriaalBasis), totaal.bedragSpuitmateriaalBasis],
      ['AZT Materiaalconstante TZ 51 (€)', ...csvCols.map(c => c.bedragMateriaalconstante), totaal.bedragMateriaalconstante],
      ['TOTAAL SPUITMATERIAAL (€)', ...csvCols.map(c => c.bedragSpuitmateriaalTotaal), totaal.bedragSpuitmateriaalTotaal],
      ['Klein materiaal (€)', ...csvCols.map(c => c.bedragKleinMateriaal), totaal.bedragKleinMateriaal],
      ['Milieutoeslag (€)', ...csvCols.map(c => c.bedragMilieu), totaal.bedragMilieu],
      ['SUBTOTAAL NETTO (€)', ...csvCols.map(c => c.subtotaalNetto), totaal.subtotaalNetto],
      [`BTW (${tarieven.btwPercentage}%) (€)`, ...csvCols.map(c => c.btwBedrag), totaal.btwBedrag],
      ['TOTAAL SCHADEBEDRAG BRUTO (€)', ...csvCols.map(c => c.totaalBruto), totaal.totaalBruto],
      ['Aandeel (%)', ...csvCols.map(c => `${c.percentageVanTotaal}%`), '100%'],
      [],
      ['SOLERA RICHTLIJN TEKSTZONE 143'],
      ['Invoerinstructie', soleraInfo.invoerTekst143],
      ['Toelichting', soleraInfo.advies]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audatex_split_${meta.kenteken}_${meta.calculatienummer}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmailSummary = () => {
    const zonesSummary = displayZones
      .map((z, idx) => {
        const zd = zones[z];
        const constante = soleraInfo.constantenPerZone[z] ?? zd.bedragMateriaalconstante;
        return `${idx + 1}. ${getColLabel(z).toUpperCase()}:
- Spuittijd: ${formatAE(zd.spuittijdAE, true)} (${formatEuro(zd.bedragSpuitarbeid)})
- Spuitmateriaal (AZT constante ${formatEuro(constante)}): ${formatEuro(zd.bedragSpuitmateriaalTotaal)}
- Onderdelen: ${formatEuro(zd.bedragOnderdelen)}
- Arbeid (PL + DM): ${formatAE(zd.arbeidPlaatwerkAE + zd.arbeidDemontageAE, true)} (${formatEuro(zd.bedragPlaatwerk + zd.bedragDemontage)})
- Subtotaal Netto: ${formatEuro(zd.subtotaalNetto)}
- TOTAAL BRUTO (INCL BTW): ${formatEuro(zd.totaalBruto)} (${zd.percentageVanTotaal}%)`;
      })
      .join('\n\n');

    const text = `SCHADECALCULATIE SPLITSINGSRAPPORT (SOLERA AUDATEX)
Voertuig: ${meta.merkModel}
Kenteken: ${meta.kenteken}
Calculatienummer: ${meta.calculatienummer}
Dossiernummer: ${meta.dossiernummer}
Datum: ${meta.datumCalculatie}
Eenheid: Arbeidseenheden (1 AE = 6 min • 10 AE = 1 uur)

OVERZICHT SPLITSING:
-----------------------------------------------------------
${zonesSummary}

${eenmaligePosten.length > 0 ? `EENMALIGE / DIAGNOSEPOSTEN (1x OP ${schade1Label.toUpperCase()}):\n- ${eenmaligePosten.join(', ')}\n\n` : ''}${overig.totaalBruto > 0 ? `${displayZones.length + 1}. OVERIG / ALGEMEEN:\n- TOTAAL BRUTO: ${formatEuro(overig.totaalBruto)} (${overig.percentageVanTotaal}%)\n\n` : ''}
GEZAMENLIJK TOTAALBEDRAG: ${formatEuro(totaal.totaalBruto)} (Netto: ${formatEuro(totaal.subtotaalNetto)})
Totale spuittijd: ${formatAE(totaal.spuittijdAE, true)}

SOLERA AUDATEX INVOERVOORSCHRIFT:
${soleraInfo.invoerTekst143}
Advies: ${soleraInfo.advies}

Gegenereerd via Audatex Schade Calculatie Splitter conform Solera AZT-richtlijnen.`;

    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Header with actions */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Financieel Splitsingsrapport & Vergelijking
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Uitsplitsing van spuittijd, AZT materiaalconstante en bedragen per actieve voertuigzone
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleCopyEmailSummary}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
            title="Kopieer samenvatting als tekst voor e-mail"
          >
            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copiedEmail ? 'Gekopieerd' : 'Kopieer E-mail'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
            title="Download CSV bestand"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Export
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
            title="Afdrukken via browser"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
            title="Genereer en download officieel financieel rapport als PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exporteren als PDF
          </button>
        </div>
      </div>

      {/* Financial Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3.5">Kostenpost / Omschrijving</th>
              {displayZones.map((z) => (
                <th
                  key={z}
                  className={`py-2.5 px-3.5 text-right border-l border-slate-200 whitespace-nowrap ${ZONE_HEAD_BG[z]}`}
                >
                  {getColLabel(z)}
                </th>
              ))}
              {hasOverig && (
                <th className="py-2.5 px-3.5 text-right text-slate-700 border-l border-slate-200">
                  Overig
                </th>
              )}
              <th className="py-2.5 px-3.5 text-right text-slate-900 font-bold border-l border-slate-200 bg-slate-100 whitespace-nowrap">
                Totaal Calculatie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
            {/* SPUITTIJD & SPUITARBEID */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  <span>Spuittijd (AE)</span>
                  <span className="text-[10px] font-normal text-slate-500 font-mono">@{formatEuro(tarieven.spuittarief / 10)}/AE ({formatEuro(tarieven.spuittarief)}/u)</span>
                </div>
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-3.5 text-right text-slate-900 font-bold border-l border-slate-200">
                  {formatAE(zones[z].spuittijdAE, true)} <span className="text-slate-500 font-normal">({formatEuro(zones[z].bedragSpuitarbeid)})</span>
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-3.5 text-right text-slate-800 border-l border-slate-200">
                  {formatAE(overig.spuittijdAE, true)} <span className="text-slate-500 font-normal">({formatEuro(overig.bedragSpuitarbeid)})</span>
                </td>
              )}
              <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                {formatAE(totaal.spuittijdAE, true)} <span className="text-slate-500 font-normal">({formatEuro(totaal.bedragSpuitarbeid)})</span>
              </td>
            </tr>

            {/* PLAATWERK ARBEID */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-4 font-sans text-slate-700">
                Plaatwerk arbeid (AE) <span className="text-[10px] text-slate-500 font-mono">@{formatEuro(tarieven.plaatwerktarief / 10)}/AE</span>
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatAE(zones[z].arbeidPlaatwerkAE, true)} <span className="text-slate-500 font-normal">({formatEuro(zones[z].bedragPlaatwerk)})</span>
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatAE(overig.arbeidPlaatwerkAE, true)} <span className="text-slate-500">({formatEuro(overig.bedragPlaatwerk)})</span>
                </td>
              )}
              <td className="py-2.5 px-4 text-right font-semibold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                {formatAE(totaal.arbeidPlaatwerkAE, true)} <span className="text-slate-500">({formatEuro(totaal.bedragPlaatwerk)})</span>
              </td>
            </tr>

            {/* DE/MONTAGE ARBEID */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-4 font-sans text-slate-700">
                De/montage arbeid (AE) <span className="text-[10px] text-slate-500 font-mono">@{formatEuro(tarieven.demontagetarief / 10)}/AE</span>
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatAE(zones[z].arbeidDemontageAE, true)} <span className="text-slate-500 font-normal">({formatEuro(zones[z].bedragDemontage)})</span>
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatAE(overig.arbeidDemontageAE, true)} <span className="text-slate-500">({formatEuro(overig.bedragDemontage)})</span>
                </td>
              )}
              <td className="py-2.5 px-4 text-right font-semibold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                {formatAE(totaal.arbeidDemontageAE, true)} <span className="text-slate-500">({formatEuro(totaal.bedragDemontage)})</span>
              </td>
            </tr>

            {/* TOTAAL ARBEID SUBTOTAAL */}
            <tr className="bg-slate-50 font-bold text-slate-900 border-y border-slate-200">
              <td className="py-2.5 px-4 font-sans">
                Totaal Arbeidsloon ({formatAE(totaal.arbeidTotaalAE, true)})
              </td>
              {displayZones.map((z) => (
                <td key={z} className={`py-2.5 px-4 text-right border-l border-slate-200 ${ZONE_SUBTOTAL_TEXT[z]}`}>
                  {formatEuro(zones[z].bedragTotaalArbeid)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right border-l border-slate-200">
                  {formatEuro(overig.bedragTotaalArbeid)}
                </td>
              )}
              <td className="py-2.5 px-4 text-right border-l border-slate-200 font-extrabold text-slate-900 bg-slate-100">
                {formatEuro(totaal.bedragTotaalArbeid)}
              </td>
            </tr>

            {/* ONDERDELEN */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-4 font-sans text-slate-700">
                Nieuwe Onderdelen{tarieven.onderdelenKortingPerc ? ` (na ${tarieven.onderdelenKortingPerc}% korting)` : ''}
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatEuro(zones[z].bedragOnderdelen)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatEuro(overig.bedragOnderdelen)}
                </td>
              )}
              <td className="py-2.5 px-4 text-right font-semibold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                {formatEuro(totaal.bedragOnderdelen)}
              </td>
            </tr>

            {/* SPUITMATERIAAL BASIS */}
            <tr className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-4 font-sans text-slate-700">
                Lakmateriaal basis (AZT formule)
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatEuro(zones[z].bedragSpuitmateriaalBasis)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatEuro(overig.bedragSpuitmateriaalBasis)}
                </td>
              )}
              <td className="py-2.5 px-4 text-right font-semibold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                {formatEuro(totaal.bedragSpuitmateriaalBasis)}
              </td>
            </tr>

            {/* MATERIAALCONSTANTE (TZ 51 / 143) */}
            <tr className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors border-y border-amber-200/50">
              <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  <span>AZT Materiaalconstante (TZ 51)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    {methode === 'proportioneel_spuittijd'
                      ? 'Pro-rata per materiaal (AE)'
                      : methode === 'solera_tz143'
                      ? 'Solera TZ 143'
                      : methode === 'fifty_fifty'
                      ? '50% / 50%'
                      : 'Beide volledig'}
                  </span>
                </div>
              </td>
              {displayZones.map((z) => {
                const isS2Zero =
                  methode === 'solera_tz143' &&
                  z === resolvedS2 &&
                  zones[z].bedragMateriaalconstante === 0;
                return (
                  <td
                    key={z}
                    className={`py-2.5 px-4 text-right font-bold border-l border-slate-200 ${
                      isS2Zero ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {formatEuro(zones[z].bedragMateriaalconstante)}
                    {isS2Zero && soleraInfo.constanteSchade1 > 0 && (
                      <span className="block text-[10px] font-normal text-amber-700">
                        (-{formatEuro(soleraInfo.constanteSchade1)} via TZ 143)
                      </span>
                    )}
                  </td>
                );
              })}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-800 border-l border-slate-200">
                  {formatEuro(overig.bedragMateriaalconstante)}
                </td>
              )}
              <td className="py-2.5 px-4 text-right font-bold text-slate-900 border-l border-slate-200 bg-amber-100/40">
                {formatEuro(totaal.bedragMateriaalconstante)}
              </td>
            </tr>

            {/* SPUITMATERIAAL TOTAAL */}
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="py-2.5 px-4 font-sans">
                Totaal Spuitmateriaal (Basis + Constante)
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right border-l border-slate-200 text-slate-900">
                  {formatEuro(zones[z].bedragSpuitmateriaalTotaal)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right border-l border-slate-200">
                  {formatEuro(overig.bedragSpuitmateriaalTotaal)}
                </td>
              )}
              <td className="py-2.5 px-4 text-right border-l border-slate-200 font-bold text-slate-900 bg-slate-100">
                {formatEuro(totaal.bedragSpuitmateriaalTotaal)}
              </td>
            </tr>

            {/* BIJKOMENDE KOSTEN */}
            {(totaal.bedragBijkomend ?? 0) > 0 && (
              <tr className="hover:bg-slate-50/80 transition-colors text-slate-700">
                <td className="py-2.5 px-4 font-sans text-slate-700">
                  Bijkomende kosten ({tarieven.bijkomendeKostenOmschrijving || 'Anti-roestbehandeling'})
                </td>
                {displayZones.map((z) => (
                  <td key={z} className="py-2.5 px-4 text-right text-slate-700 border-l border-slate-200">
                    {(zones[z].bedragBijkomend ?? 0) > 0 ? formatEuro(zones[z].bedragBijkomend!) : '-'}
                  </td>
                ))}
                {hasOverig && (
                  <td className="py-2.5 px-4 text-right text-slate-700 border-l border-slate-200">
                    {(overig.bedragBijkomend ?? 0) > 0 ? formatEuro(overig.bedragBijkomend!) : '-'}
                  </td>
                )}
                <td className="py-2.5 px-4 text-right font-semibold text-slate-900 border-l border-slate-200 bg-slate-50/60">
                  {formatEuro(totaal.bedragBijkomend ?? 0)}
                </td>
              </tr>
            )}

            {/* DIVERSE KOSTEN */}
            <tr className="hover:bg-slate-50/80 transition-colors text-slate-700">
              <td className="py-2.5 px-4 font-sans text-slate-600">
                Klein materiaal ({tarieven.kleinMateriaalPerc}%) & Milieutoeslag
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2.5 px-4 text-right text-slate-700 border-l border-slate-200">
                  <div>{formatEuro(zones[z].bedragKleinMateriaal + zones[z].bedragMilieu)}</div>
                  {zones[z].bedragKleinMateriaal > 0 && (
                    <div className="text-[10px] text-slate-400">
                      ({formatEuro(zones[z].bedragKleinMateriaal)} + {formatEuro(zones[z].bedragMilieu)})
                    </div>
                  )}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2.5 px-4 text-right text-slate-700 border-l border-slate-200">
                  <div>{formatEuro(overig.bedragKleinMateriaal + overig.bedragMilieu)}</div>
                  {overig.bedragKleinMateriaal > 0 && (
                    <div className="text-[10px] text-slate-400">
                      ({formatEuro(overig.bedragKleinMateriaal)} + {formatEuro(overig.bedragMilieu)})
                    </div>
                  )}
                </td>
              )}
              <td className="py-2.5 px-4 text-right text-slate-700 border-l border-slate-200 bg-slate-50/60">
                <div>{formatEuro(totaal.bedragKleinMateriaal + totaal.bedragMilieu)}</div>
                {totaal.bedragKleinMateriaal > 0 && (
                  <div className="text-[10px] text-slate-400">
                    ({formatEuro(totaal.bedragKleinMateriaal)} + {formatEuro(totaal.bedragMilieu)})
                  </div>
                )}
              </td>
            </tr>

            {/* SUBTOTAAL NETTO */}
            <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <td className="py-3 px-4 font-sans text-sm">
                SUBTOTAAL NETTO (Excl. BTW)
              </td>
              {displayZones.map((z) => (
                <td key={z} className={`py-3 px-4 text-right border-l border-slate-200 text-sm ${ZONE_SUBTOTAL_TEXT[z]}`}>
                  {formatEuro(zones[z].subtotaalNetto)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-3 px-4 text-right border-l border-slate-200 text-slate-800">
                  {formatEuro(overig.subtotaalNetto)}
                </td>
              )}
              <td className="py-3 px-4 text-right border-l border-slate-200 font-extrabold text-slate-900 text-sm bg-slate-200/70">
                {formatEuro(totaal.subtotaalNetto)}
              </td>
            </tr>

            {/* BTW */}
            <tr className="hover:bg-slate-50/80 transition-colors text-slate-600">
              <td className="py-2 px-4 font-sans">
                BTW ({tarieven.btwPercentage}%)
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-2 px-4 text-right border-l border-slate-200">
                  {formatEuro(zones[z].btwBedrag)}
                </td>
              ))}
              {hasOverig && (
                <td className="py-2 px-4 text-right border-l border-slate-200">
                  {formatEuro(overig.btwBedrag)}
                </td>
              )}
              <td className="py-2 px-4 text-right border-l border-slate-200 bg-slate-50/60">
                {formatEuro(totaal.btwBedrag)}
              </td>
            </tr>

            {/* TOTAAL BRUTO */}
            <tr className="bg-slate-900 font-black text-white border-t border-b-2 border-slate-950">
              <td className="py-3.5 px-4 font-sans text-base">
                TOTAAL SCHADEBEDRAG (INCL. BTW)
              </td>
              {displayZones.map((z) => (
                <td key={z} className="py-3.5 px-4 text-right border-l border-slate-800 text-white text-base">
                  <div>{formatEuro(zones[z].totaalBruto)}</div>
                  <div className="text-[11px] font-sans font-normal text-slate-300">({zones[z].percentageVanTotaal}%)</div>
                </td>
              ))}
              {hasOverig && (
                <td className="py-3.5 px-4 text-right border-l border-slate-800 text-slate-200 text-sm">
                  <div>{formatEuro(overig.totaalBruto)}</div>
                  <div className="text-[11px] font-sans font-normal text-slate-300">({overig.percentageVanTotaal}%)</div>
                </td>
              )}
              <td className="py-3.5 px-4 text-right border-l border-slate-800 text-white text-base bg-black">
                <div>{formatEuro(totaal.totaalBruto)}</div>
                <div className="text-[11px] font-sans font-normal text-slate-300">100%</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Solera Compliance Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Calculatie berekend conform Solera Audatex AZT-normen en Tekstzone 143 richtlijnen (1 AE = 6 min • 10 AE = 1 uur).</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-slate-500">
          <span>Dossier: <span className="font-mono font-semibold text-slate-800">{meta.calculatienummer}</span></span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-700">Developed by Danny Radjkoemar</span>
        </div>
      </div>

      {/* DEDICATED PRINT TEMPLATE FOR WINDOW.PRINT() */}
      <div className="hidden print:block print:p-8 print:bg-white print:text-black">
        {/* Print Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-black">
                Solera Audatex Schadecalculatie
              </h1>
              <p className="text-sm font-semibold text-gray-700">
                Officiële Uitsplitsing per Voertuigzone ({displayZones.map(z => ZONE_LABELS[z]).join(' / ')})
              </p>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-black">{meta.kenteken}</div>
              <div className="text-xs text-gray-600">Calculatie: {meta.calculatienummer}</div>
              <div className="text-xs text-gray-600">Datum: {meta.datumCalculatie}</div>
            </div>
          </div>

          {/* Voertuig gegevens box */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs border border-gray-300 p-2.5 rounded bg-gray-50">
            <div>
              <span className="text-gray-500 block">Voertuig:</span>
              <strong className="text-black">{meta.merkModel}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Chassisnummer (VIN):</span>
              <span className="font-mono text-black">{meta.chassisnummer}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Laksoort / Kleur:</span>
              <span className="text-black">{meta.laksoort} - {meta.kleurcode}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Hersteller / Expert:</span>
              <span className="text-black">{meta.expertHersteller}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Opdrachtgever:</span>
              <span className="text-black">{meta.opdrachtgever || 'Verzekering / Lease'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Dossiernummer:</span>
              <span className="font-mono text-black">{meta.dossiernummer}</span>
            </div>
          </div>
        </div>

        {/* Print Financial Table */}
        <h2 className="text-base font-bold mb-2 uppercase text-black">Financieel Splitsingsoverzicht</h2>
        <table className="w-full text-xs border-collapse border border-black mb-6">
          <thead>
            <tr className="bg-gray-200 border-b border-black">
              <th className="p-2 text-left border-r border-black">Kostenpost</th>
              {displayZones.map((z) => (
                <th key={z} className="p-2 text-right border-r border-black">
                  {getColLabel(z)}
                </th>
              ))}
              {hasOverig && (
                <th className="p-2 text-right border-r border-black">Overig</th>
              )}
              <th className="p-2 text-right">Totaal Gecombineerd</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-2 font-semibold">Spuittijd (AE)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatAE(zones[z].spuittijdAE, true)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatAE(overig.spuittijdAE, true)}</td>
              )}
              <td className="p-2 text-right font-mono font-bold">{formatAE(totaal.spuittijdAE, true)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">Spuitarbeid</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].bedragSpuitarbeid)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.bedragSpuitarbeid)}</td>
              )}
              <td className="p-2 text-right font-mono">{formatEuro(totaal.bedragSpuitarbeid)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">Plaatwerk + De/montage Arbeid (AE)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">
                  {formatAE(zones[z].arbeidPlaatwerkAE + zones[z].arbeidDemontageAE, true)} ({formatEuro(zones[z].bedragPlaatwerk + zones[z].bedragDemontage)})
                </td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">
                  {formatAE(overig.arbeidPlaatwerkAE + overig.arbeidDemontageAE, true)} ({formatEuro(overig.bedragPlaatwerk + overig.bedragDemontage)})
                </td>
              )}
              <td className="p-2 text-right font-mono">
                {formatAE(totaal.arbeidPlaatwerkAE + totaal.arbeidDemontageAE, true)} ({formatEuro(totaal.bedragPlaatwerk + totaal.bedragDemontage)})
              </td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50">
              <td className="p-2 font-semibold">Totaal Arbeid</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono font-semibold">{formatEuro(zones[z].bedragTotaalArbeid)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono font-semibold">{formatEuro(overig.bedragTotaalArbeid)}</td>
              )}
              <td className="p-2 text-right font-mono font-bold">{formatEuro(totaal.bedragTotaalArbeid)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">Nieuwe Onderdelen</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].bedragOnderdelen)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.bedragOnderdelen)}</td>
              )}
              <td className="p-2 text-right font-mono font-semibold">{formatEuro(totaal.bedragOnderdelen)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">AZT Materiaalconstante (Tekstzone 51/143)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].bedragMateriaalconstante)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.bedragMateriaalconstante)}</td>
              )}
              <td className="p-2 text-right font-mono">{formatEuro(totaal.bedragMateriaalconstante)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">Lakmateriaal Basis</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].bedragSpuitmateriaalBasis)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.bedragSpuitmateriaalBasis)}</td>
              )}
              <td className="p-2 text-right font-mono">{formatEuro(totaal.bedragSpuitmateriaalBasis)}</td>
            </tr>
            <tr className="border-b border-gray-300 bg-gray-50">
              <td className="p-2 font-semibold">Totaal Spuitmateriaal</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono font-semibold">{formatEuro(zones[z].bedragSpuitmateriaalTotaal)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono font-semibold">{formatEuro(overig.bedragSpuitmateriaalTotaal)}</td>
              )}
              <td className="p-2 text-right font-mono font-bold">{formatEuro(totaal.bedragSpuitmateriaalTotaal)}</td>
            </tr>
            {(totaal.bedragBijkomend ?? 0) > 0 && (
              <tr className="border-b border-gray-300">
                <td className="p-2">Bijkomende kosten ({tarieven.bijkomendeKostenOmschrijving || 'Anti-roestbehandeling'})</td>
                {displayZones.map((z) => (
                  <td key={z} className="p-2 text-right font-mono">
                    {(zones[z].bedragBijkomend ?? 0) > 0 ? formatEuro(zones[z].bedragBijkomend!) : '-'}
                  </td>
                ))}
                {hasOverig && (
                  <td className="p-2 text-right font-mono">
                    {(overig.bedragBijkomend ?? 0) > 0 ? formatEuro(overig.bedragBijkomend!) : '-'}
                  </td>
                )}
                <td className="p-2 text-right font-mono">{formatEuro(totaal.bedragBijkomend ?? 0)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-300">
              <td className="p-2">Klein Materiaal & Milieutoeslag</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].bedragKleinMateriaal + zones[z].bedragMilieu)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.bedragKleinMateriaal + overig.bedragMilieu)}</td>
              )}
              <td className="p-2 text-right font-mono">{formatEuro(totaal.bedragKleinMateriaal + totaal.bedragMilieu)}</td>
            </tr>
            <tr className="border-b-2 border-black bg-gray-100 font-bold">
              <td className="p-2 text-sm">SUBTOTAAL NETTO (Excl. BTW)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono text-sm">{formatEuro(zones[z].subtotaalNetto)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono text-sm">{formatEuro(overig.subtotaalNetto)}</td>
              )}
              <td className="p-2 text-right font-mono text-sm">{formatEuro(totaal.subtotaalNetto)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2">BTW ({tarieven.btwPercentage}%)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2 text-right font-mono">{formatEuro(zones[z].btwBedrag)}</td>
              ))}
              {hasOverig && (
                <td className="p-2 text-right font-mono">{formatEuro(overig.btwBedrag)}</td>
              )}
              <td className="p-2 text-right font-mono">{formatEuro(totaal.btwBedrag)}</td>
            </tr>
            <tr className="bg-gray-200 font-black text-sm">
              <td className="p-2.5">TOTAAL SCHADEBEDRAG (INCL. BTW)</td>
              {displayZones.map((z) => (
                <td key={z} className="p-2.5 text-right font-mono">
                  {formatEuro(zones[z].totaalBruto)} ({zones[z].percentageVanTotaal}%)
                </td>
              ))}
              {hasOverig && (
                <td className="p-2.5 text-right font-mono">
                  {formatEuro(overig.totaalBruto)} ({overig.percentageVanTotaal}%)
                </td>
              )}
              <td className="p-2.5 text-right font-mono text-base">{formatEuro(totaal.totaalBruto)} (100%)</td>
            </tr>
          </tbody>
        </table>

        {/* Solera Richtlijn vermelding op print */}
        <div className="p-3 border border-black rounded bg-gray-50 text-xs mb-8">
          <strong className="block mb-1">Solera Audatex Kennisbank Verantwoording:</strong>
          <p className="mb-1">{soleraInfo.advies}</p>
          <div className="font-mono bg-white p-1.5 border border-gray-300 rounded text-[11px]">
            {soleraInfo.invoerTekst143}
          </div>
        </div>

        {/* Handtekeningen blok */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-gray-400">
          <div>
            <span className="block text-gray-600 mb-12">Voor akkoord Schadehersteller / Calculateur:</span>
            <div className="border-b border-black w-48 mb-1"></div>
            <span>Datum: .......................................</span>
          </div>
          <div>
            <span className="block text-gray-600 mb-12">Voor akkoord Schade-expert / Verzekeraar:</span>
            <div className="border-b border-black w-48 mb-1"></div>
            <span>Datum: .......................................</span>
          </div>
        </div>

        {/* Print Colofon */}
        <div className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between items-center">
          <span>Solera Audatex Schadecalculatie Splitter (1 AE = 6 min • 10 AE = 1 uur)</span>
          <span className="font-semibold text-gray-700">Developed by Danny Radjkoemar</span>
        </div>
      </div>
    </div>
  );
};
