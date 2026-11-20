import React from 'react';
import {
  SectieTotalen,
  VoertuigZone,
  VOERTUIG_ZONES,
  ZONE_LABELS
} from '../types/audatex';
import { formatAE, formatEuro } from '../utils/calculator';

interface SchadeVisualsProps {
  zones: Record<VoertuigZone, SectieTotalen>;
  actieveZones: VoertuigZone[];
  overig: SectieTotalen;
  totaal: SectieTotalen;
  schade1Zone: VoertuigZone;
  schade2Zone: VoertuigZone;
  eenmaligePostenCount?: number;
  onSelectZone?: (zone: VoertuigZone) => void;
}

const ZONE_BAR_BG: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-600',
  achterzijde: 'bg-indigo-600',
  linkerzijde: 'bg-teal-600',
  rechterzijde: 'bg-amber-600',
  bovenzijde: 'bg-violet-600',
  onderzijde: 'bg-slate-600'
};

const ZONE_DOT_BG: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-500',
  achterzijde: 'bg-indigo-500',
  linkerzijde: 'bg-teal-500',
  rechterzijde: 'bg-amber-500',
  bovenzijde: 'bg-violet-500',
  onderzijde: 'bg-slate-500'
};

const ZONE_TEXT_COLOR: Record<VoertuigZone, string> = {
  voorzijde: 'text-blue-800',
  achterzijde: 'text-indigo-800',
  linkerzijde: 'text-teal-800',
  rechterzijde: 'text-amber-800',
  bovenzijde: 'text-violet-800',
  onderzijde: 'text-slate-800'
};

const ZONE_CARD_ACTIVE: Record<VoertuigZone, string> = {
  voorzijde: 'border-blue-300 bg-blue-50/60 hover:bg-blue-50',
  achterzijde: 'border-indigo-300 bg-indigo-50/60 hover:bg-indigo-50',
  linkerzijde: 'border-teal-300 bg-teal-50/60 hover:bg-teal-50',
  rechterzijde: 'border-amber-300 bg-amber-50/60 hover:bg-amber-50',
  bovenzijde: 'border-violet-300 bg-violet-50/60 hover:bg-violet-50',
  onderzijde: 'border-slate-400 bg-slate-100/80 hover:bg-slate-100'
};

export const SchadeVisuals: React.FC<SchadeVisualsProps> = ({
  zones,
  actieveZones,
  overig,
  totaal,
  schade1Zone,
  schade2Zone,
  eenmaligePostenCount = 0,
  onSelectZone
}) => {
  const totalArbeid = totaal.bedragTotaalArbeid;
  const totalOnderdelen = totaal.bedragOnderdelen;
  const totalLak = totaal.bedragSpuitmateriaalTotaal;
  const totalRest = totaal.bedragKleinMateriaal + totaal.bedragMilieu + (totaal.bedragBijkomend || 0);
  const nettoBase = Math.max(0.01, totaal.subtotaalNetto);

  const pctArbeid = Math.round((totalArbeid / nettoBase) * 100);
  const pctOnderdelen = Math.round((totalOnderdelen / nettoBase) * 100);
  const pctLak = Math.round((totalLak / nettoBase) * 100);
  const pctRest = Math.max(0, 100 - pctArbeid - pctOnderdelen - pctLak);

  const aeDisplayZones = actieveZones.length > 0 ? actieveZones : [schade1Zone, schade2Zone];
  const maxAE = Math.max(
    1,
    ...aeDisplayZones.map(z => zones[z]?.arbeidTotaalAE || 0),
    overig.arbeidTotaalAE
  );

  const hasMultipleActiveZones = aeDisplayZones.length >= 2;
  const isFrontRearSplit =
    hasMultipleActiveZones &&
    aeDisplayZones.includes('voorzijde') &&
    aeDisplayZones.includes('achterzijde');
  const isLeftRightSplit =
    hasMultipleActiveZones &&
    aeDisplayZones.includes('linkerzijde') &&
    aeDisplayZones.includes('rechterzijde');

  const isZoneHighlighted = (z: VoertuigZone) =>
    aeDisplayZones.includes(z) || (zones[z]?.itemsCount || 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: 6-Zone Voertuig Blueprint Schema (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Schadeverdeling per Voertuigzone (6 kanten)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasMultipleActiveZones
                ? `${ZONE_LABELS[schade1Zone]} (Schade 1) vs. ${ZONE_LABELS[schade2Zone]} (Schade 2)`
                : `${ZONE_LABELS[aeDisplayZones[0]]} (Enkelvoudige schade)`}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
            {totaal.itemsCount} posities
          </span>
        </div>

        {/* Technical Top-Down Vehicle Blueprint Image with 6-Zone Overlays */}
        <div className="relative bg-[#072654] border border-slate-300 rounded-lg overflow-hidden my-1">
          <img
            src={(() => {
              const raw = '/assets/aistudio/Technische_blauwdruk_van_moderne_sedan_846ffc14.png';
              if (raw.startsWith('data:')) return raw;
              const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
              return `${base}${raw}`;
            })()}
            alt="Technische blauwdruk van moderne sedan — schadeverdeling over alle 6 voertuigzones"
            referrerPolicy="no-referrer"
            className="w-full h-auto block select-none"
          />

          {/* Subtle Blueprint Zone Washes for active sides (Car faces LEFT: left=voor, right=achter, bottom=links/stuur, top=rechts) */}
          {isZoneHighlighted('voorzijde') && (
            <div className="absolute inset-y-0 left-0 w-[32%] bg-blue-500/20 border-r border-sky-300/35 pointer-events-none" />
          )}
          {isZoneHighlighted('achterzijde') && (
            <div className="absolute inset-y-0 right-0 w-[32%] bg-indigo-500/20 border-l border-indigo-300/35 pointer-events-none" />
          )}
          {isZoneHighlighted('rechterzijde') && (
            <div className="absolute inset-x-0 top-0 h-[34%] bg-amber-400/20 border-b border-amber-300/35 pointer-events-none" />
          )}
          {isZoneHighlighted('linkerzijde') && (
            <div className="absolute inset-x-0 bottom-0 h-[34%] bg-teal-400/20 border-t border-teal-300/35 pointer-events-none" />
          )}
          {isZoneHighlighted('bovenzijde') && (
            <div className="absolute left-[34%] right-[34%] top-[28%] bottom-[28%] bg-violet-500/25 border border-violet-300/50 rounded-md pointer-events-none" />
          )}
          {isZoneHighlighted('onderzijde') && (
            <div className="absolute left-[22%] right-[22%] bottom-1.5 h-1.5 bg-slate-200/75 rounded-full pointer-events-none" />
          )}

          {/* Straight Vertical Split Line when splitting Voorzijde / Achterzijde */}
          {isFrontRearSplit && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-sky-300 pointer-events-none"
              />
            </>
          )}

          {/* Straight Horizontal Split Line when splitting Linkerzijde / Rechterzijde */}
          {isLeftRightSplit && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)] pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-teal-300 pointer-events-none"
              />
            </>
          )}

          {/* Zone-Anchored Callout Cards: elke zone staat fysiek op de bijbehorende zijde van de blauwe auto */}
          {aeDisplayZones.map((zone) => {
            const zData = zones[zone];
            const isS1 = zone === schade1Zone;
            const isS2 = zone === schade2Zone;
            const badgeText = isS1 ? 'SCHADE 1' : isS2 ? 'SCHADE 2' : 'EXTRA';
            const werkAE = Math.round((zData.arbeidPlaatwerkAE + zData.arbeidDemontageAE) * 10) / 10;

            const posClass =
              zone === 'voorzijde'
                ? 'top-2 left-2 text-left'
                : zone === 'achterzijde'
                ? 'top-2 right-2 text-right'
                : zone === 'rechterzijde'
                ? 'top-2 left-1/2 -translate-x-1/2 text-center'
                : zone === 'linkerzijde'
                ? 'bottom-7 left-1/2 -translate-x-1/2 text-center'
                : zone === 'bovenzijde'
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center'
                : 'bottom-7 right-2 text-right';

            const borderClass =
              zone === 'voorzijde'
                ? 'border-sky-400/80'
                : zone === 'achterzijde'
                ? 'border-indigo-400/80'
                : zone === 'linkerzijde'
                ? 'border-teal-400/80'
                : zone === 'rechterzijde'
                ? 'border-amber-400/80'
                : zone === 'bovenzijde'
                ? 'border-violet-400/80'
                : 'border-slate-300/80';

            const zoneTitleClass =
              zone === 'voorzijde'
                ? 'text-sky-300'
                : zone === 'achterzijde'
                ? 'text-indigo-200'
                : zone === 'linkerzijde'
                ? 'text-teal-300'
                : zone === 'rechterzijde'
                ? 'text-amber-300'
                : zone === 'bovenzijde'
                ? 'text-violet-300'
                : 'text-slate-200';

            return (
              <div
                key={zone}
                className={`absolute ${posClass} bg-slate-950/90 backdrop-blur-xs border ${borderClass} rounded-md px-2.5 py-1.5 text-white pointer-events-none shadow-md`}
              >
                <div
                  className={`flex items-center gap-1.5 ${
                    zone === 'achterzijde' || zone === 'onderzijde'
                      ? 'justify-end'
                      : zone === 'rechterzijde' || zone === 'linkerzijde' || zone === 'bovenzijde'
                      ? 'justify-center'
                      : 'justify-start'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wide uppercase ${zoneTitleClass}`}>
                    {ZONE_LABELS[zone]}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                      isS1
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                        : 'bg-slate-800 text-slate-200 border-slate-600'
                    }`}
                  >
                    {badgeText}
                  </span>
                </div>
                <div
                  className={`flex items-baseline gap-1.5 font-mono tabular-nums mt-0.5 ${
                    zone === 'achterzijde' || zone === 'onderzijde'
                      ? 'justify-end'
                      : zone === 'rechterzijde' || zone === 'linkerzijde' || zone === 'bovenzijde'
                      ? 'justify-center'
                      : 'justify-start'
                  }`}
                >
                  <span className="text-sm font-extrabold text-white">{zData.percentageVanTotaal}%</span>
                  <span className="text-[11px] font-semibold text-slate-200">{formatEuro(zData.totaalBruto)}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-200 tabular-nums font-semibold">
                  {formatAE(zData.arbeidTotaalAE, false)} totaal
                  <span className="text-slate-400 font-normal">
                    {' '}({formatAE(werkAE, false)} werk · {formatAE(zData.spuittijdAE, false)} spuit)
                  </span>
                </div>
                {isS1 && eenmaligePostenCount > 0 && (
                  <div className="text-[9px] font-mono text-emerald-300 tabular-nums">
                    +{eenmaligePostenCount}× foutgeheugen inbegrepen
                  </div>
                )}
              </div>
            );
          })}

          {/* Directional Blueprint Orientation Hints (Car faces LEFT, steering wheel at bottom) */}
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono font-semibold text-sky-200/85 pointer-events-none">
            <span>← Voorzijde · L-flank (onder / stuur) · R-flank (boven)</span>
            <span>Achterzijde →</span>
          </div>
        </div>

        {/* 6 Voertuigzijden Interactive Grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {VOERTUIG_ZONES.map((z) => {
            const zData = zones[z];
            const isS1 = z === schade1Zone;
            const isS2 = z === schade2Zone;
            const hasItems = zData.itemsCount > 0 || zData.totaalBruto > 0;
            const roleText = isS1 ? 'Schade 1' : isS2 ? 'Schade 2' : hasItems ? 'Actief' : '0 pos.';

            return (
              <button
                key={z}
                type="button"
                onClick={() => onSelectZone?.(z)}
                title={`Bekijk ${ZONE_LABELS[z]} in calculatietabel`}
                className={`text-left px-2.5 py-2 rounded-lg border transition-colors ${
                  isS1 || isS2 || hasItems
                    ? ZONE_CARD_ACTIVE[z]
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 truncate">
                    <span className={`w-2 h-2 rounded-xs shrink-0 ${ZONE_DOT_BG[z]}`} />
                    {ZONE_LABELS[z]}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold shrink-0 ${
                      isS1 ? 'text-emerald-700' : isS2 ? 'text-blue-700' : hasItems ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {roleText}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                  <span className={`text-xs font-extrabold ${hasItems ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatEuro(zData.totaalBruto)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {zData.percentageVanTotaal}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stacked Total Split Progress across all active zones */}
        <div className="mt-3">
          <div className="h-2.5 w-full bg-slate-100 rounded-md overflow-hidden flex">
            {VOERTUIG_ZONES.map((z) => {
              const pct = zones[z].percentageVanTotaal;
              if (pct <= 0) return null;
              return (
                <div
                  key={z}
                  className={`${ZONE_BAR_BG[z]} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${ZONE_LABELS[z]}: ${pct}%`}
                />
              );
            })}
            {overig.percentageVanTotaal > 0 && (
              <div
                className="bg-slate-400 transition-all duration-300"
                style={{ width: `${overig.percentageVanTotaal}%` }}
                title={`Overig: ${overig.percentageVanTotaal}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 mt-2">
            <span className="font-medium">
              {aeDisplayZones
                .map(z => `${ZONE_LABELS[z]} ${zones[z].percentageVanTotaal}%`)
                .join(' · ')}
              {overig.percentageVanTotaal > 0 ? ` · Overig ${overig.percentageVanTotaal}%` : ''}
            </span>
            <span className="font-mono text-slate-500">1 AE = 6 min · 10 AE = 1 uur</span>
          </div>
        </div>
      </div>

      {/* Right: Kostenopbouw & AE Arbeidsverdeling Grafiek (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
        {/* Top half: Kostenopbouw Netto */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Kostenopbouw Calculatie (Netto excl. BTW)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verhouding arbeidsloon, onderdelen en lakmateriaal
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {formatEuro(totaal.subtotaalNetto)}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                Incl. BTW: {formatEuro(totaal.totaalBruto)}
              </div>
            </div>
          </div>

          {/* Segmented Cost Bar */}
          <div className="h-6 w-full bg-slate-100 rounded-md overflow-hidden flex border border-slate-200/80">
            <div
              className="bg-blue-600 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300"
              style={{ width: `${pctArbeid}%` }}
              title={`Arbeidsloon: ${formatEuro(totalArbeid)} (${pctArbeid}%)`}
            >
              {pctArbeid >= 12 ? `${pctArbeid}%` : ''}
            </div>
            <div
              className="bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300"
              style={{ width: `${pctOnderdelen}%` }}
              title={`Onderdelen: ${formatEuro(totalOnderdelen)} (${pctOnderdelen}%)`}
            >
              {pctOnderdelen >= 12 ? `${pctOnderdelen}%` : ''}
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300"
              style={{ width: `${pctLak}%` }}
              title={`Spuitmateriaal + AZT: ${formatEuro(totalLak)} (${pctLak}%)`}
            >
              {pctLak >= 10 ? `${pctLak}%` : ''}
            </div>
            {pctRest > 0 && (
              <div
                className="bg-slate-400 flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-300"
                style={{ width: `${pctRest}%` }}
                title={`Overige toeslagen: ${formatEuro(totalRest)} (${pctRest}%)`}
              />
            )}
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 shrink-0" />
                <span>Arbeidsloon</span>
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatEuro(totalArbeid)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 shrink-0" />
                <span>Onderdelen</span>
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatEuro(totalOnderdelen)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 shrink-0" />
                <span>Lakmateriaal & AZT</span>
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatEuro(totalLak)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 shrink-0" />
                <span>Klein mat. / Milieu</span>
              </div>
              <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatEuro(totalRest)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom half: Arbeidseenheden (AE) per Actieve Voertuigzone */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <h4 className="text-xs font-bold text-slate-900">
              Arbeidseenheden (AE) per Discipline
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-sky-500" /> Plaatwerk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-slate-600" /> De/montage
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-indigo-600" /> Spuiten
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {aeDisplayZones.map((z) => {
              const zd = zones[z];
              const roleBadge = z === schade1Zone ? 'Schade 1' : z === schade2Zone ? 'Schade 2' : 'Extra';
              const plaatPct = (zd.arbeidPlaatwerkAE / maxAE) * 100;
              const demPct = (zd.arbeidDemontageAE / maxAE) * 100;
              const spuitPct = (zd.spuittijdAE / maxAE) * 100;

              return (
                <div key={z}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-semibold ${ZONE_TEXT_COLOR[z]}`}>
                      {ZONE_LABELS[z]} ({roleBadge})
                    </span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      PL {zd.arbeidPlaatwerkAE} · DM {zd.arbeidDemontageAE} · SP {zd.spuittijdAE} ={' '}
                      <strong className="text-slate-900">{zd.arbeidTotaalAE} AE</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-sm overflow-hidden flex">
                    <div className="bg-sky-500" style={{ width: `${plaatPct}%` }} />
                    <div className="bg-slate-600" style={{ width: `${demPct}%` }} />
                    <div className="bg-indigo-600" style={{ width: `${spuitPct}%` }} />
                  </div>
                </div>
              );
            })}

            {overig.arbeidTotaalAE > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600">Overig / Algemeen</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    PL {overig.arbeidPlaatwerkAE} · DM {overig.arbeidDemontageAE} · SP {overig.spuittijdAE} ={' '}
                    <strong className="text-slate-900">{overig.arbeidTotaalAE} AE</strong>
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-sm overflow-hidden flex">
                  <div className="bg-sky-500" style={{ width: `${(overig.arbeidPlaatwerkAE / maxAE) * 100}%` }} />
                  <div className="bg-slate-600" style={{ width: `${(overig.arbeidDemontageAE / maxAE) * 100}%` }} />
                  <div className="bg-indigo-600" style={{ width: `${(overig.spuittijdAE / maxAE) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
