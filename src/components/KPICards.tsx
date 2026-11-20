import React from 'react';
import {
  SectieTotalen,
  VoertuigZone,
  ZONE_LABELS
} from '../types/audatex';
import { formatEuro, formatUren, formatAE } from '../utils/calculator';
import { Paintbrush, Wrench, Package, Layers, Tag } from 'lucide-react';

interface KPICardsProps {
  zones: Record<VoertuigZone, SectieTotalen>;
  actieveZones: VoertuigZone[];
  overig: SectieTotalen;
  totaal: SectieTotalen;
  schade1Zone: VoertuigZone;
  schade2Zone: VoertuigZone;
  eenmaligePostenCount?: number;
}

interface SectionCardConfig {
  key: string;
  titel: string;
  sublabel: string;
  data: SectieTotalen;
  accentColor: string;
  barArbeidClass: string;
  barOnderdelenClass: string;
  barLakClass: string;
  titleColorClass: string;
  isSchade1?: boolean;
  isSchade2?: boolean;
}

const ZONE_STYLE: Record<
  VoertuigZone,
  { accent: string; bar: string; title: string }
> = {
  voorzijde: { accent: '#2563eb', bar: 'bg-blue-600', title: 'text-blue-700' },
  achterzijde: { accent: '#4f46e5', bar: 'bg-indigo-600', title: 'text-indigo-700' },
  linkerzijde: { accent: '#0d9488', bar: 'bg-teal-600', title: 'text-teal-700' },
  rechterzijde: { accent: '#d97706', bar: 'bg-amber-600', title: 'text-amber-800' },
  bovenzijde: { accent: '#7c3aed', bar: 'bg-violet-600', title: 'text-violet-700' },
  onderzijde: { accent: '#475569', bar: 'bg-slate-600', title: 'text-slate-700' }
};

export const KPICards: React.FC<KPICardsProps> = ({
  zones,
  actieveZones,
  overig,
  totaal,
  schade1Zone,
  schade2Zone,
  eenmaligePostenCount = 0
}) => {
  const displayZones = actieveZones.length > 0 ? actieveZones : [schade1Zone, schade2Zone];

  const cards: SectionCardConfig[] = [
    ...displayZones.map((z) => {
      const zData = zones[z];
      const isS1 = z === schade1Zone;
      const isS2 = z === schade2Zone;
      const st = ZONE_STYLE[z];
      const roleSuffix = isS1 ? 'Schade 1' : isS2 ? 'Schade 2' : 'Extra zone';

      return {
        key: z,
        titel: `${ZONE_LABELS[z]} · ${roleSuffix}`,
        sublabel:
          isS1 && eenmaligePostenCount > 0
            ? `${zData.itemsCount} pos. (incl. ${eenmaligePostenCount}× foutgeh.)`
            : `${zData.itemsCount} bewerkingen`,
        data: zData,
        accentColor: st.accent,
        barArbeidClass: st.bar,
        barOnderdelenClass: 'bg-slate-700',
        barLakClass: 'bg-amber-500',
        titleColorClass: st.title,
        isSchade1: isS1,
        isSchade2: isS2
      };
    }),
    {
      key: 'totaal',
      titel: 'Totale Calculatie',
      sublabel: overig.itemsCount > 0
        ? `${totaal.itemsCount} pos. (${overig.itemsCount} overig)`
        : `${totaal.itemsCount} posities`,
      data: totaal,
      accentColor: '#0f172a',
      barArbeidClass: 'bg-slate-900',
      barOnderdelenClass: 'bg-slate-600',
      barLakClass: 'bg-amber-500',
      titleColorClass: 'text-slate-900'
    }
  ];

  const gridColsClass =
    cards.length >= 4
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'
      : 'grid grid-cols-1 md:grid-cols-3 gap-4';

  return (
    <div className="space-y-3">
      {overig.itemsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Let op:</strong> Er {overig.itemsCount === 1 ? 'staat' : 'staan'} nog{' '}
            <strong>{overig.itemsCount} overige handeling{overig.itemsCount === 1 ? '' : 'en'}</strong> ({formatEuro(overig.totaalBruto)}) in <em>Overig</em>. Kies hierboven per handeling voor Schade 1 of Schade 2 voor een 100% verdeling.
          </span>
        </div>
      )}
      <div className={gridColsClass}>
        {cards.map((card) => {
          const d = card.data;
          const base = Math.max(0.01, d.bedragTotaalArbeid + d.bedragOnderdelen + d.bedragSpuitmateriaalTotaal);
          const pctArbeid = (d.bedragTotaalArbeid / base) * 100;
          const pctOnderdelen = (d.bedragOnderdelen / base) * 100;
          const pctLak = (d.bedragSpuitmateriaalTotaal / base) * 100;

          return (
            <div
              key={card.key}
              className="bg-white border border-slate-200 rounded-xl p-5 text-slate-800 flex flex-col justify-between transition-colors hover:border-slate-300"
            >
              <div>
                {/* Unboxed typographic header */}
                <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
                  <span className={`text-xs font-bold tracking-tight ${card.titleColorClass}`}>
                    {card.titel}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {card.sublabel} · {card.key === 'totaal' ? '100%' : `${d.percentageVanTotaal}%`}
                  </span>
                </div>

                {/* Primary Hero Amount */}
                <div className="mt-3.5 mb-3">
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                    {formatEuro(d.totaalBruto)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    Netto {formatEuro(d.subtotaalNetto)} · BTW {formatEuro(d.btwBedrag)}
                  </div>
                </div>

                {/* Mini proportional graphical bar */}
                <div className="mb-3.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden flex">
                    <div className={card.barArbeidClass} style={{ width: `${pctArbeid}%` }} title={`Arbeid: ${formatEuro(d.bedragTotaalArbeid)}`} />
                    <div className={card.barOnderdelenClass} style={{ width: `${pctOnderdelen}%` }} title={`Onderdelen: ${formatEuro(d.bedragOnderdelen)}`} />
                    <div className={card.barLakClass} style={{ width: `${pctLak}%` }} title={`Lakmateriaal: ${formatEuro(d.bedragSpuitmateriaalTotaal)}`} />
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Paintbrush className="w-3.5 h-3.5 shrink-0" style={{ color: card.accentColor }} />
                    <div>
                      <div className="font-semibold text-slate-900">Spuittijd (AE)</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {formatEuro(d.bedragSpuitarbeid)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-bold text-sm text-slate-900 block">
                      {formatAE(d.spuittijdAE)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatUren(d.spuittijdUren)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-0.5 text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    AZT Materiaalconstante
                  </span>
                  <span
                    className={`font-bold font-mono tabular-nums ${
                      card.isSchade2 && d.bedragMateriaalconstante === 0
                        ? 'text-amber-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatEuro(d.bedragMateriaalconstante)}
                    {card.isSchade2 && d.bedragMateriaalconstante === 0 ? ' (TZ 143)' : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5 text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Lakmateriaal totaal
                  </span>
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {formatEuro(d.bedragSpuitmateriaalTotaal)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5 text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    Nieuwe Onderdelen
                  </span>
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {formatEuro(d.bedragOnderdelen)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-0.5 text-slate-700">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    Arbeid (PL + DM)
                  </span>
                  <span className="font-semibold text-slate-800 font-mono tabular-nums">
                    {formatAE(d.arbeidPlaatwerkAE + d.arbeidDemontageAE, false)} · {formatEuro(d.bedragPlaatwerk + d.bedragDemontage)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-slate-800">
                  <span className="text-slate-600 font-semibold">Totaal Arbeidseenheden</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {formatAE(d.arbeidTotaalAE, true)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
