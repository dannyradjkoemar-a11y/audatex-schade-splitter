import React, { useState, useEffect } from 'react';
import {
  MarktVergelijkingResultaat,
  RdwVoertuigData
} from '../types/audatex';
import { formatEuro } from '../utils/calculator';
import { apiUrl } from '../utils/apiConfig';
import {
  AlertTriangle,
  Calendar,
  Fuel,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  ExternalLink,
  TrendingUp,
  Gauge,
  Car,
  FileDown
} from 'lucide-react';

interface RdwDagwaardeCardProps {
  rdw?: RdwVoertuigData;
  totaalSchadeBruto: number;
  kenteken: string;
  merkModel: string;
  bouwjaar?: number;
  kilometerstand?: number;
  onRefreshRdw: (newKenteken: string) => Promise<void>;
  isLoading?: boolean;
  marktVergelijking?: MarktVergelijkingResultaat;
  isMarktLoading?: boolean;
  marktError?: string | null;
  onSearchMarkt: (params: {
    kenteken?: string;
    merkModel: string;
    bouwjaar: number;
    kilometerstand: number;
  }) => Promise<void>;
}

export const RdwDagwaardeCard: React.FC<RdwDagwaardeCardProps> = ({
  rdw,
  totaalSchadeBruto,
  kenteken,
  merkModel,
  bouwjaar,
  kilometerstand,
  onRefreshRdw,
  isLoading = false,
  marktVergelijking,
  isMarktLoading = false,
  marktError = null,
  onSearchMarkt
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customPlate, setCustomPlate] = useState(kenteken);
  const [showPlateInput, setShowPlateInput] = useState(false);

  const resolvedDefaultModel =
    rdw?.merk && rdw?.handelsbenaming
      ? `${rdw.merk} ${rdw.handelsbenaming}`
      : merkModel;
  const resolvedDefaultYear = bouwjaar || rdw?.bouwjaar || new Date().getFullYear() - 3;

  const [searchPlate, setSearchPlate] = useState(
    kenteken && kenteken !== 'ONBEKEND' ? kenteken : ''
  );
  const [searchModel, setSearchModel] = useState(resolvedDefaultModel);
  const [searchYear, setSearchYear] = useState<string>(String(resolvedDefaultYear));
  const [searchKm, setSearchKm] = useState<string>(
    kilometerstand !== undefined ? String(kilometerstand) : ''
  );
  const [sourceFilter, setSourceFilter] = useState<string>('alle');
  const [showAllListings, setShowAllListings] = useState(false);

  useEffect(() => {
    setCustomPlate(kenteken);
    setSearchPlate(kenteken && kenteken !== 'ONBEKEND' ? kenteken : '');
  }, [kenteken]);

  useEffect(() => {
    setSearchModel(
      rdw?.merk && rdw?.handelsbenaming
        ? `${rdw.merk} ${rdw.handelsbenaming}`
        : merkModel
    );
  }, [rdw?.merk, rdw?.handelsbenaming, merkModel]);

  useEffect(() => {
    if (bouwjaar || rdw?.bouwjaar) {
      setSearchYear(String(bouwjaar || rdw?.bouwjaar));
    }
  }, [bouwjaar, rdw?.bouwjaar]);

  useEffect(() => {
    if (kilometerstand !== undefined) {
      setSearchKm(String(kilometerstand));
    }
  }, [kilometerstand]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshRdw(customPlate || kenteken);
      setShowPlateInput(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerMarktSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = parseInt(searchYear, 10) || resolvedDefaultYear;
    const km = Math.max(0, parseInt(searchKm.replace(/[^0-9]/g, ''), 10) || 0);
    setSourceFilter('alle');
    setShowAllListings(false);
    await onSearchMarkt({
      kenteken: searchPlate.trim().toUpperCase() || undefined,
      merkModel: searchModel.trim() || resolvedDefaultModel,
      bouwjaar: yr,
      kilometerstand: km
    });
  };

  const rdwDagwaarde = rdw?.indicatieveDagwaarde?.geschat || 0;
  const activeDagwaarde =
    marktVergelijking?.anwbKoerslijst?.waarden?.verzekeringsDagwaarde ||
    marktVergelijking?.statistieken?.expertVervangingswaarde ||
    rdwDagwaarde;

  const catalogusprijs = rdw?.catalogusprijs || 0;
  const schadePercentage = activeDagwaarde > 0 ? (totaalSchadeBruto / activeDagwaarde) * 100 : 0;

  const isEconomischTotalLoss = schadePercentage >= 67;
  const isAandacht = schadePercentage >= 50 && schadePercentage < 67;

  // Semi-circular gauge math
  const clampedPct = Math.min(100, Math.max(0, schadePercentage));
  const arcLen = Math.PI * 52;
  const activeStrokeLen = (clampedPct / 100) * arcLen;
  const angleRad = Math.PI - (clampedPct / 100) * Math.PI;
  const needleX = 70 + 42 * Math.cos(angleRad);
  const needleY = 70 - 42 * Math.sin(angleRad);

  const gaugeColor = isEconomischTotalLoss
    ? '#DC2626'
    : isAandacht
    ? '#D97706'
    : '#16A34A';

  const isStandaloneFile =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  const filteredListings = (marktVergelijking?.advertenties || []).filter(ad =>
    sourceFilter === 'alle' ? true : ad.bron === sourceFilter
  );
  const visibleListings = showAllListings
    ? filteredListings
    : filteredListings.slice(0, 8);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden no-print">
      {/* Background RDW loading indicator banner */}
      {(isLoading || isRefreshing) && (
        <div className="bg-blue-50/80 border-b border-blue-200 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
            <span>
              RDW-voertuiggegevens en dagwaarde worden geladen voor kenteken <strong className="font-mono">{kenteken}</strong>
            </span>
          </div>
          <span className="text-xs text-blue-700 font-medium">
            Calculatie blijft direct bewerkbaar
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0">
            NL
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                RDW Voertuiggegevens, Marktvergelijking &amp; ANWB Koerslijst
              </h3>
              {rdw?.gevonden && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RDW Geverifieerd
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Technische voertuiggegevens, live occasion-aanbod (Marktplaats, AutoScout24, Gaspedaal, AutoTrack) &amp; ANWB Koerslijst
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {showPlateInput ? (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <input
                type="text"
                value={customPlate}
                onChange={(e) => setCustomPlate(e.target.value.toUpperCase())}
                placeholder="Kenteken"
                className="w-28 px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isRefreshing ? 'Laden...' : 'Zoek'}
              </button>
              <button
                onClick={() => setShowPlateInput(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5"
              >
                Annuleer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPlateInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Kenteken ophalen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: RDW Specs & Total-Loss Gauge */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: RDW Specs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Merk &amp; Model</span>
              <span className="font-bold text-slate-900 truncate block">
                {rdw?.merk ? `${rdw.merk} ${rdw.handelsbenaming || ''}` : (isLoading ? 'Laden...' : merkModel)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Bouwjaar / Toelating</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {rdw?.datumEersteToelating || (bouwjaar ? `Bouwjaar ${bouwjaar}` : (isLoading ? 'Laden...' : 'Onbekend'))}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Kilometerstand</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5 font-mono tabular-nums">
                <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {kilometerstand !== undefined ? `${kilometerstand.toLocaleString('nl-NL')} km` : 'Niet op rapport'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Brandstof</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {rdw?.brandstof || (isLoading ? 'Laden...' : 'Onbekend')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">APK Vervaldatum</span>
              <span className={`font-semibold font-mono tabular-nums ${rdw?.apkGeldig ? 'text-slate-900' : rdw ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                {rdw?.vervaldatumApk || (isLoading ? 'Laden...' : 'Niet bekend')}
                {rdw?.apkGeldig === false && ' (Verlopen)'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Catalogusprijs</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums">
                {catalogusprijs > 0 ? formatEuro(catalogusprijs) : (isLoading ? 'Laden...' : 'N.v.t.')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Kleur &amp; Carrosserie:{' '}
              <strong className="text-slate-700 font-medium capitalize">
                {rdw?.eersteKleur || 'Standaard'} · {rdw?.inrichting || 'Personenauto'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              WAM Verzekerd:{' '}
              <strong className={rdw?.wamVerzekerd ? 'text-emerald-700 font-semibold' : 'text-slate-700 font-medium'}>
                {rdw?.wamVerzekerd ? 'Ja' : (isLoading ? 'Controle...' : 'Onbekend')}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Massa ledig: <strong className="text-slate-800 font-semibold">{rdw?.massaLedigVoertuig ? `${rdw.massaLedigVoertuig} kg` : '-'}</strong>
            </span>
          </div>
        </div>

        {/* Right: Dagwaarde + Graphical Semi-Circular Total Loss Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                {marktVergelijking ? 'ANWB / Schade-dagwaarde' : 'Indicatieve RDW Dagwaarde'}
              </span>
              <div className="font-extrabold font-mono text-2xl sm:text-3xl text-slate-900 tracking-tight tabular-nums mt-0.5">
                {activeDagwaarde > 0 ? formatEuro(activeDagwaarde) : (isLoading ? 'Laden...' : 'N.t.b.')}
              </div>
              {marktVergelijking ? (
                <div className="text-[11px] text-slate-600 mt-0.5 font-mono tabular-nums">
                  Marktmediaan {formatEuro(marktVergelijking.statistieken.mediaanVraagprijs)} · RDW {rdwDagwaarde > 0 ? formatEuro(rdwDagwaarde) : '-'}
                </div>
              ) : (
                rdw?.indicatieveDagwaarde?.laag && rdw?.indicatieveDagwaarde?.hoog && (
                  <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    {formatEuro(rdw.indicatieveDagwaarde.laag)} – {formatEuro(rdw.indicatieveDagwaarde.hoog)}
                  </div>
                )
              )}
              {rdw?.indicatieveDagwaarde?.leeftijdInMaanden && (
                <div className="text-[11px] text-slate-500 mt-1">
                  Leeftijd voertuig: {rdw.indicatieveDagwaarde.leeftijdInMaanden} maanden
                </div>
              )}
            </div>

            {/* Graphical Total-Loss Semi-Circular Gauge */}
            <div className="shrink-0 flex flex-col items-center">
              <svg width="140" height="82" viewBox="0 0 140 82" aria-label="Herstelkosten ten opzichte van dagwaarde meter">
                <path
                  d="M 18 70 A 52 52 0 0 1 122 70"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {activeDagwaarde > 0 && (
                  <path
                    d="M 18 70 A 52 52 0 0 1 122 70"
                    fill="none"
                    stroke={gaugeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${activeStrokeLen} ${arcLen}`}
                  />
                )}
                <line x1="94" y1="22" x2="99" y2="14" stroke="#DC2626" strokeWidth="1.5" />
                {activeDagwaarde > 0 && (
                  <>
                    <line
                      x1="70"
                      y1="70"
                      x2={needleX}
                      y2={needleY}
                      stroke="#0F172A"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="70" cy="70" r="3.5" fill="#0F172A" />
                  </>
                )}
                <text
                  x="70"
                  y="60"
                  textAnchor="middle"
                  fill={activeDagwaarde > 0 ? gaugeColor : '#64748B'}
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {activeDagwaarde > 0 ? `${schadePercentage.toFixed(1)}%` : '--%'}
                </text>
              </svg>
              <span className="text-[10px] font-medium text-slate-500 -mt-1">
                Schade / Dagwaarde (grens 67%)
              </span>
            </div>
          </div>

          <div className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
            isEconomischTotalLoss
              ? 'bg-red-50 text-red-900 border border-red-200'
              : isAandacht
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          }`}>
            {isEconomischTotalLoss ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Aandacht Expert:</strong> Herstelbedrag ({formatEuro(totaalSchadeBruto)}) overschrijdt 67% van de dagwaarde.
                </div>
              </>
            ) : isAandacht ? (
              <>
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Grensgebied:</strong> Schade ligt tussen 50% en 67% van de dagwaarde; controleer de restwaarde.
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Economisch herstelbaar:</strong> Herstelkosten ({formatEuro(totaalSchadeBruto)}) blijven onder de 67%-grens.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Live Marktscraper (Marktplaats, AutoScout24, Gaspedaal, AutoTrack) & ANWB Koerslijst */}
      <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-5">
        {/* Search Criteria Bar */}
        <form
          onSubmit={handleTriggerMarktSearch}
          className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col lg:flex-row lg:items-end justify-between gap-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Kenteken (ANWB Koerslijst)
              </label>
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                placeholder="Bijv. JRR-55-X"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Merk &amp; Model (zoekcriteria)
              </label>
              <input
                type="text"
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                placeholder="Bijv. Mazda 2 Hybrid"
                className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Bouwjaar (±1 jr range)
              </label>
              <input
                type="number"
                min={1985}
                max={new Date().getFullYear() + 1}
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                placeholder="2025"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Kilometerstand (km)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={searchKm}
                onChange={(e) => setSearchKm(e.target.value)}
                placeholder="Bijv. 16652"
                className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isMarktLoading || isStandaloneFile}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isMarktLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Marktplaats, AutoScout24 &amp; ANWB scannen...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>{marktVergelijking ? 'Opnieuw scannen' : 'Markt & ANWB Koerslijst Zoeken'}</span>
              </>
            )}
          </button>
        </form>

        {isStandaloneFile && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-900">
            Live multi-site marktscraping werkt alleen via de actieve webapplicatie (niet in los offline HTML-bestand).
          </div>
        )}

        {marktError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{marktError}</span>
          </div>
        )}

        {/* Results Block */}
        {marktVergelijking && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. Expert Market Summary KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Expert Vervangingswaarde
                </span>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums mt-0.5">
                  {formatEuro(marktVergelijking.statistieken.expertVervangingswaarde)}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Gecorrigeerd op {marktVergelijking.zoekCriteria.kilometerstand.toLocaleString('nl-NL')} km
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Marktmediaan Vraagprijs
                </span>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-blue-700 tabular-nums mt-0.5">
                  {marktVergelijking.statistieken.mediaanVraagprijs > 0
                    ? formatEuro(marktVergelijking.statistieken.mediaanVraagprijs)
                    : 'Geen aanbod'}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Uit {marktVergelijking.statistieken.aantalVergelijkbaar} vergelijkbare auto&apos;s
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Bandbreedte (Min – Max)
                </span>
                <div className="text-sm sm:text-base font-bold font-mono text-slate-900 tabular-nums mt-1">
                  {marktVergelijking.statistieken.laagsteVraagprijs > 0
                    ? `${formatEuro(marktVergelijking.statistieken.laagsteVraagprijs)} – ${formatEuro(marktVergelijking.statistieken.hoogsteVraagprijs)}`
                    : '-'}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Gemiddeld:{' '}
                  {marktVergelijking.statistieken.gemiddeldeVraagprijs > 0
                    ? formatEuro(marktVergelijking.statistieken.gemiddeldeVraagprijs)
                    : '-'}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Gem. KM-stand Markt
                </span>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums mt-0.5">
                  {marktVergelijking.statistieken.gemiddeldeKmStand.toLocaleString('nl-NL')} km
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Zoekvenster: {marktVergelijking.zoekCriteria.kmMin.toLocaleString('nl-NL')}–{marktVergelijking.zoekCriteria.kmMax.toLocaleString('nl-NL')} km
                </span>
              </div>
            </div>

            {/* 2. ANWB Koerslijst Analyse Panel */}
            <div className="bg-white border border-amber-200/90 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        ANWB Koerslijst — Effect Leeftijd, Type &amp; KM-stand
                      </h4>
                      {marktVergelijking.anwbKoerslijst.bronType === 'anwb_live_api' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Officieel ANWB Koerslijst Resultaat
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-800">
                          Indicatief ANWB-model
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">
                      {marktVergelijking.anwbKoerslijst.anwbConfiguratieNaam ||
                        marktVergelijking.anwbKoerslijst.voertuigOmschrijving}
                      {marktVergelijking.anwbKoerslijst.kenteken
                        ? ` · Kenteken ${marktVergelijking.anwbKoerslijst.kenteken}`
                        : ''}
                      {` · Bouwjaar ${marktVergelijking.anwbKoerslijst.bouwjaar} (~${marktVergelijking.anwbKoerslijst.leeftijdJaren} jaar)`}
                      {marktVergelijking.anwbKoerslijst.tellerstandOordeel
                        ? ` · Tellerstand: ${marktVergelijking.anwbKoerslijst.tellerstandOordeel}`
                        : ''}
                    </p>
                    {marktVergelijking.anwbKoerslijst.nieuwwaarde && (
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Oorspr. nieuwwaarde: {formatEuro(marktVergelijking.anwbKoerslijst.nieuwwaarde)}
                        {marktVergelijking.anwbKoerslijst.optiePrijs &&
                        marktVergelijking.anwbKoerslijst.optiePrijs > 0
                          ? ` (incl. ${formatEuro(marktVergelijking.anwbKoerslijst.optiePrijs)} opties)`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {marktVergelijking.anwbKoerslijst.anwbPdfUrl && (
                    <a
                      href={apiUrl(marktVergelijking.anwbKoerslijst.anwbPdfUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors whitespace-nowrap"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>ANWB Koerslijst PDF</span>
                    </a>
                  )}
                  <a
                    href={marktVergelijking.anwbKoerslijst.koerslijstUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 transition-colors whitespace-nowrap"
                  >
                    <span>ANWB Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* KM-Norm vs Werkelijk */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">ANWB Jaarkilometernorm</span>
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {marktVergelijking.anwbKoerslijst.normKmPerJaar.toLocaleString('nl-NL')} km/jaar
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Verwacht bij deze leeftijd: ~{marktVergelijking.anwbKoerslijst.verwachteNormKm.toLocaleString('nl-NL')} km
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Afwijking KM-stand</span>
                    <strong
                      className={`font-mono tabular-nums ${
                        marktVergelijking.anwbKoerslijst.kmAfwijking > 5000
                          ? 'text-red-700'
                          : marktVergelijking.anwbKoerslijst.kmAfwijking < -5000
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {marktVergelijking.anwbKoerslijst.kmAfwijking > 0 ? '+' : ''}
                      {marktVergelijking.anwbKoerslijst.kmAfwijking.toLocaleString('nl-NL')} km
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Ingevoerd: {marktVergelijking.anwbKoerslijst.kilometerstand.toLocaleString('nl-NL')} km
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">ANWB KM-correctie op waarde</span>
                    <strong
                      className={`font-mono tabular-nums ${
                        marktVergelijking.anwbKoerslijst.kmCorrectiePerc < 0
                          ? 'text-red-700'
                          : marktVergelijking.anwbKoerslijst.kmCorrectiePerc > 0
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {marktVergelijking.anwbKoerslijst.kmCorrectiePerc > 0 ? '+' : ''}
                      {marktVergelijking.anwbKoerslijst.kmCorrectiePerc}% (
                      {marktVergelijking.anwbKoerslijst.kmCorrectieBedrag >= 0 ? '+' : ''}
                      {formatEuro(marktVergelijking.anwbKoerslijst.kmCorrectieBedrag)})
                    </strong>
                    <span className="text-[11px] text-slate-500 block">
                      Direct verwerkt in koerswaarden hieronder
                    </span>
                  </div>
                </div>

                {/* Official ANWB Koerslijst Tiers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border-2 border-blue-300 bg-blue-50/60">
                    <span className="text-[11px] font-bold text-blue-900 block">
                      Vervangingswaarde (Total loss)
                    </span>
                    <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                      {formatEuro(marktVergelijking.anwbKoerslijst.waarden.vervangingswaardeTotalLoss)}
                    </span>
                    <span className="text-[10px] text-blue-800">
                      ANWB Total loss / Dagwaarde
                    </span>
                  </div>

                  {marktVergelijking.anwbKoerslijst.waarden.verkoopMerkdealer !== undefined && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        Verkoop Merkdealer
                      </span>
                      <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                        {formatEuro(marktVergelijking.anwbKoerslijst.waarden.verkoopMerkdealer)}
                      </span>
                      <span className="text-[10px] text-slate-500">Met merkdealer-garantie</span>
                    </div>
                  )}

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Verkoop Dealer / BOVAG
                    </span>
                    <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                      {formatEuro(marktVergelijking.anwbKoerslijst.waarden.verkoopDealerBovag)}
                    </span>
                    <span className="text-[10px] text-slate-500">Incl. BOVAG-garantie</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Verkoop Particulier
                    </span>
                    <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                      {formatEuro(marktVergelijking.anwbKoerslijst.waarden.verkoopParticulier)}
                    </span>
                    <span className="text-[10px] text-slate-500">Verkoop zonder garantie</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Inruilwaarde
                    </span>
                    <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                      {formatEuro(marktVergelijking.anwbKoerslijst.waarden.inruilwaarde)}
                    </span>
                    <span className="text-[10px] text-slate-500">Bij aankoop andere auto</span>
                  </div>

                  {marktVergelijking.anwbKoerslijst.waarden.rijklaarPrijs !== undefined && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        Rijklaarprijs (Autobedrijf)
                      </span>
                      <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                        {formatEuro(marktVergelijking.anwbKoerslijst.waarden.rijklaarPrijs)}
                      </span>
                      <span className="text-[10px] text-slate-500">Excl. optionele garantie</span>
                    </div>
                  )}

                  {marktVergelijking.anwbKoerslijst.waarden.veilingprijs !== undefined && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        Veiling- / Handelswaarde
                      </span>
                      <span className="text-base sm:text-lg font-extrabold font-mono text-slate-900 tabular-nums block mt-0.5">
                        {formatEuro(marktVergelijking.anwbKoerslijst.waarden.veilingprijs)}
                      </span>
                      <span className="text-[10px] text-slate-500">Indicatie handelsveiling</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {marktVergelijking.anwbKoerslijst.toelichting}
                </p>

                {marktVergelijking.anwbKoerslijst.groundingBronnen &&
                  marktVergelijking.anwbKoerslijst.groundingBronnen.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">Geraadpleegde bronnen:</span>
                      {marktVergelijking.anwbKoerslijst.groundingBronnen.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline truncate max-w-[220px]"
                        >
                          <span className="truncate">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* 3. Portal Status Bar & Direct Clickable Portals */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>
                    Gevonden vergelijkbare advertenties ({filteredListings.length})
                  </span>
                </div>

                {/* Portal Direct Links & Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSourceFilter('alle')}
                    className={`px-2.5 py-1 rounded-md font-semibold border transition-colors ${
                      sourceFilter === 'alle'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Alle ({marktVergelijking.advertenties.length})
                  </button>
                  {marktVergelijking.bronnenStatus.map((b) => (
                    <div key={b.bron} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setSourceFilter(b.bron)}
                        className={`px-2.5 py-1 rounded-l-md font-semibold border-y border-l transition-colors ${
                          sourceFilter === b.bron
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {b.bron} ({b.aantalGevonden})
                      </button>
                      <a
                        href={b.zoekUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${b.bron} met deze bouwjaar- en km-filters`}
                        className="px-1.5 py-1 rounded-r-md border border-slate-200 bg-white hover:bg-blue-50 text-blue-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {visibleListings.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2 px-3">Portaal</th>
                        <th className="py-2 px-3">Advertentie / Uitvoering</th>
                        <th className="py-2 px-3 text-center">Bouwjaar</th>
                        <th className="py-2 px-3 text-right">KM-stand</th>
                        <th className="py-2 px-3 text-right">Vraagprijs</th>
                        <th className="py-2 px-3 text-center">Match</th>
                        <th className="py-2 px-3 text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleListings.map((ad) => (
                        <tr key={ad.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {ad.bron}
                          </td>
                          <td className="py-2 px-3 max-w-[300px]">
                            <div className="font-semibold text-slate-900 truncate" title={ad.titel}>
                              {ad.titel}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {[ad.brandstof, ad.transmissie, ad.plaats].filter(Boolean).join(' · ') || 'Nederland'}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-700">
                            {ad.bouwjaar || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {ad.kilometerstand !== undefined
                              ? `${ad.kilometerstand.toLocaleString('nl-NL')} km`
                              : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                            {formatEuro(ad.vraagprijs)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono tabular-nums text-[11px]">
                            <span
                              className={`font-bold ${
                                ad.matchScore >= 85
                                  ? 'text-emerald-700'
                                  : ad.matchScore >= 70
                                  ? 'text-blue-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {ad.matchScore}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <a
                              href={ad.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold"
                            >
                              <span>Bekijk</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                  Geen directe advertenties gevonden voor deze filter. Klik op de portal-icoontjes rechtsboven om handmatig op Marktplaats, Gaspedaal, AutoScout24 of AutoTrack te openen.
                </div>
              )}

              {filteredListings.length > 8 && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllListings(!showAllListings)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
                  >
                    {showAllListings
                      ? 'Toon minder advertenties'
                      : `Toon alle ${filteredListings.length} gevonden advertenties`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
