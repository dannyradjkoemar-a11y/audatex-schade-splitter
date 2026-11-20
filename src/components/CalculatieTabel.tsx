import React, { useState, useEffect } from 'react';
import {
  CalculatieRegel,
  SectieType,
  VoertuigZone,
  VOERTUIG_ZONES,
  ZONE_LABELS,
  ZONE_SHORT_LABELS,
  BewerkingType
} from '../types/audatex';
import { formatEuro, formatAE } from '../utils/calculator';
import { 
  Trash2, 
  Plus, 
  Paintbrush, 
  Search, 
  CornerDownRight, 
  ShieldCheck
} from 'lucide-react';

interface CalculatieTabelProps {
  regels: CalculatieRegel[];
  onUpdateRegels: (regels: CalculatieRegel[]) => void;
  spuittarief: number;
  schade1Zone: VoertuigZone;
  schade2Zone: VoertuigZone;
  onChangeSchade1Zone: (zone: VoertuigZone) => void;
  onChangeSchade2Zone: (zone: VoertuigZone) => void;
  requestedFilter?: { zone: string; seq: number } | null;
}

const ZONE_FILTER_ACTIVE: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-600 text-white shadow-xs',
  achterzijde: 'bg-indigo-600 text-white shadow-xs',
  linkerzijde: 'bg-teal-600 text-white shadow-xs',
  rechterzijde: 'bg-amber-600 text-white shadow-xs',
  bovenzijde: 'bg-violet-600 text-white shadow-xs',
  onderzijde: 'bg-slate-700 text-white shadow-xs'
};

const ZONE_DOT: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-500',
  achterzijde: 'bg-indigo-500',
  linkerzijde: 'bg-teal-500',
  rechterzijde: 'bg-amber-500',
  bovenzijde: 'bg-violet-500',
  onderzijde: 'bg-slate-500'
};

const ZONE_COUNT_BADGE: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-100 text-blue-900',
  achterzijde: 'bg-indigo-100 text-indigo-900',
  linkerzijde: 'bg-teal-100 text-teal-900',
  rechterzijde: 'bg-amber-100 text-amber-900',
  bovenzijde: 'bg-violet-100 text-violet-900',
  onderzijde: 'bg-slate-200 text-slate-900'
};

const ZONE_SELECT_STYLE: Record<SectieType, string> = {
  voorzijde: 'bg-blue-50 text-blue-900 border-blue-200',
  achterzijde: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  linkerzijde: 'bg-teal-50 text-teal-900 border-teal-200',
  rechterzijde: 'bg-amber-50 text-amber-900 border-amber-200',
  bovenzijde: 'bg-violet-50 text-violet-900 border-violet-200',
  onderzijde: 'bg-slate-100 text-slate-900 border-slate-300',
  overig: 'bg-amber-50 text-amber-900 border-amber-300'
};

const ZONE_BTN_ACTIVE: Record<VoertuigZone, string> = {
  voorzijde: 'bg-blue-600 text-white border-blue-700',
  achterzijde: 'bg-indigo-600 text-white border-indigo-700',
  linkerzijde: 'bg-teal-600 text-white border-teal-700',
  rechterzijde: 'bg-amber-600 text-white border-amber-700',
  bovenzijde: 'bg-violet-600 text-white border-violet-700',
  onderzijde: 'bg-slate-700 text-white border-slate-800'
};

export const CalculatieTabel: React.FC<CalculatieTabelProps> = ({
  regels,
  onUpdateRegels,
  schade1Zone,
  schade2Zone,
  onChangeSchade1Zone,
  onChangeSchade2Zone,
  requestedFilter
}) => {
  const [filterSectie, setFilterSectie] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddRow, setShowAddRow] = useState<boolean>(false);

  // New row form state (primair in AE: 1 AE = 6 min, 10 AE = 1 uur)
  const [newOmschrijving, setNewOmschrijving] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSectie, setNewSectie] = useState<SectieType>(schade1Zone);
  const [newEenmalig, setNewEenmalig] = useState<boolean>(false);
  const [newBewerking, setNewBewerking] = useState<BewerkingType>('VERN');
  const [newOnderdeelPrijs, setNewOnderdeelPrijs] = useState<number>(0);
  const [newPlaatwerkAE, setNewPlaatwerkAE] = useState<number>(0);
  const [newDemontageAE, setNewDemontageAE] = useState<number>(0);
  const [newSpuittijdAE, setNewSpuittijdAE] = useState<number>(0);

  useEffect(() => {
    if (requestedFilter) {
      setFilterSectie(requestedFilter.zone);
    }
  }, [requestedFilter]);

  const zoneCounts = VOERTUIG_ZONES.reduce((acc, z) => {
    acc[z] = regels.filter(r => r.sectie === z).length;
    return acc;
  }, {} as Record<VoertuigZone, number>);

  const counts = {
    alle: regels.length,
    ...zoneCounts,
    overig: regels.filter(r => r.sectie === 'overig').length,
    eenmalig: regels.filter(r => r.isEenmaligePost).length
  };

  useEffect(() => {
    if (filterSectie === 'overig' && counts.overig === 0) {
      setFilterSectie('alle');
    } else if (filterSectie === 'eenmalig' && counts.eenmalig === 0) {
      setFilterSectie('alle');
    }
  }, [filterSectie, counts.overig, counts.eenmalig]);

  // Zones om als filterknop te tonen (Schade 1, Schade 2 en overige zones met posities)
  const filterableZones: VoertuigZone[] = [
    schade1Zone,
    ...(schade2Zone !== schade1Zone ? [schade2Zone] : []),
    ...VOERTUIG_ZONES.filter(
      z => z !== schade1Zone && z !== schade2Zone && (zoneCounts[z] > 0 || filterSectie === z)
    )
  ];

  const filteredRegels = regels.filter(regel => {
    if (filterSectie === 'eenmalig') {
      if (!regel.isEenmaligePost) return false;
    } else if (filterSectie !== 'alle' && regel.sectie !== filterSectie) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        regel.omschrijving.toLowerCase().includes(q) ||
        (regel.code && regel.code.toLowerCase().includes(q)) ||
        (regel.artikelnummer && regel.artikelnummer.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSetSectie = (id: string, nextSectie: SectieType) => {
    const updated = regels.map(r => {
      if (r.id !== id) return r;
      const nextToewijzing: 'schade1' | 'schade2' | undefined = r.isOverigeHandeling
        ? (nextSectie === schade1Zone ? 'schade1' : nextSectie === schade2Zone ? 'schade2' : undefined)
        : undefined;
      return {
        ...r,
        sectie: nextSectie,
        isEenmaligePost: false,
        overigeToewijzing: nextToewijzing
      };
    });
    onUpdateRegels(updated);
  };

  const handleAssignSchade = (id: string, target: 'schade1' | 'schade2') => {
    const targetSectie = target === 'schade1' ? schade1Zone : schade2Zone;
    const updated = regels.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        sectie: targetSectie,
        isEenmaligePost: false,
        overigeToewijzing: r.isOverigeHandeling ? target : undefined
      };
    });
    onUpdateRegels(updated);
  };

  const handleDeleteRegel = (id: string) => {
    const updated = regels.filter(r => r.id !== id);
    onUpdateRegels(updated);
  };

  const handleAddRegel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOmschrijving.trim()) return;

    const spuitAE = Number(newSpuittijdAE) || 0;
    const plaatAE = Number(newPlaatwerkAE) || 0;
    const demAE = Number(newDemontageAE) || 0;
    const prijs = Number(newOnderdeelPrijs) || 0;

    const itemType: CalculatieRegel['itemType'] =
      newBewerking === 'SP' || newBewerking === 'SPH' || newBewerking === 'UITSP' || newBewerking === 'LS'
        ? 'spuitwerk'
        : newBewerking === 'DIV' && prijs > 0 && plaatAE === 0 && demAE === 0 && spuitAE === 0
        ? 'bijkomend'
        : prijs > 0
        ? 'onderdeel'
        : 'arbeid';

    const newRegel: CalculatieRegel = {
      id: 'custom-' + Date.now(),
      code: newCode || '9999',
      omschrijving: newOmschrijving.trim(),
      sectie: newEenmalig ? schade1Zone : newSectie,
      isEenmaligePost: newEenmalig || undefined,
      isOverigeHandeling: !newEenmalig && newSectie === 'overig' ? true : undefined,
      bewerking: newBewerking,
      itemType,
      onderdeelPrijs: prijs,
      arbeidPlaatwerkAE: plaatAE,
      arbeidDemontageAE: demAE,
      spuittijdAE: spuitAE,
      arbeidPlaatwerkUren: plaatAE / 10,
      arbeidDemontageUren: demAE / 10,
      spuittijdUren: spuitAE / 10
    };

    onUpdateRegels([...regels, newRegel]);
    setNewOmschrijving('');
    setNewCode('');
    setNewEenmalig(false);
    setNewOnderdeelPrijs(0);
    setNewPlaatwerkAE(0);
    setNewDemontageAE(0);
    setNewSpuittijdAE(0);
    setShowAddRow(false);
  };

  const getBewerkingBadge = (bewerking: BewerkingType) => {
    switch (bewerking) {
      case 'VERN':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">VERN</span>;
      case 'HERST':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">HERST</span>;
      case 'DM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">D+M</span>;
      case 'SP':
      case 'SPH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{bewerking}</span>;
      case 'UITSP':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">UITSP</span>;
      case 'LS':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">LS (Spot)</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">DIV</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Controls header */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>Calculatieposities & Bewerkingen</span>
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
              {regels.length} regels
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wijs posities toe aan één van de 6 voertuigzijden ({VOERTUIG_ZONES.map(z => ZONE_SHORT_LABELS[z]).join(' · ')}). Foutgeheugen staat 1× op Schade 1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Schade 1 & 2 selectors inside table header */}
          <div className="inline-flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span>Schade 1:</span>
              <select
                value={schade1Zone}
                onChange={(e) => onChangeSchade1Zone(e.target.value as VoertuigZone)}
                className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {VOERTUIG_ZONES.map(z => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
              </select>
            </label>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span>Schade 2:</span>
              <select
                value={schade2Zone}
                onChange={(e) => onChangeSchade2Zone(e.target.value as VoertuigZone)}
                className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {VOERTUIG_ZONES.map(z => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={() => setShowAddRow(!showAddRow)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Positie Toevoegen
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Filter buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterSectie('alle')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filterSectie === 'alle'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Alle posities <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 text-slate-800">{counts.alle}</span>
          </button>

          {filterableZones.map((z) => {
            const roleTag = z === schade1Zone ? ' (S1)' : z === schade2Zone ? ' (S2)' : '';
            return (
              <button
                key={z}
                onClick={() => setFilterSectie(z)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterSectie === z
                    ? ZONE_FILTER_ACTIVE[z]
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-xs ${ZONE_DOT[z]}`} />
                {ZONE_LABELS[z]}
                {roleTag}{' '}
                <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${ZONE_COUNT_BADGE[z]}`}>
                  {zoneCounts[z]}
                </span>
              </button>
            );
          })}

          {counts.eenmalig > 0 && (
            <button
              onClick={() => setFilterSectie('eenmalig')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterSectie === 'eenmalig'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Foutgeheugen (1× S1) <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/80 text-emerald-900">{counts.eenmalig}</span>
            </button>
          )}

          {counts.overig > 0 && (
            <button
              onClick={() => setFilterSectie('overig')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterSectie === 'overig'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overig <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 text-slate-800">{counts.overig}</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Zoek onderdeel of code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Add row form */}
      {showAddRow && (
        <form onSubmit={handleAddRegel} className="p-4 bg-slate-50 border-b border-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Nieuwe bewerking / onderdeel toevoegen
            </h4>
            <button
              type="button"
              onClick={() => setShowAddRow(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Annuleren
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Code</label>
              <input
                type="text"
                placeholder="0101"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Omschrijving</label>
              <input
                type="text"
                required
                placeholder="bv. Portier V R / Dakplaat / Subframe / Voorbumper"
                value={newOmschrijving}
                onChange={(e) => setNewOmschrijving(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Voertuigzone</label>
              <select
                value={newSectie}
                onChange={(e) => setNewSectie(e.target.value as SectieType)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {VOERTUIG_ZONES.map(z => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
                <option value="overig">Overig</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bewerking</label>
              <select
                value={newBewerking}
                onChange={(e) => setNewBewerking(e.target.value as BewerkingType)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="VERN">VERN (Nieuw)</option>
                <option value="HERST">HERST (Plaatwerk)</option>
                <option value="DM">D+M (De/montage)</option>
                <option value="SP">SP (Spuiten)</option>
                <option value="SPH">SPH (Spuiten na herstel)</option>
                <option value="UITSP">LB / UITSP (Uitspuiten)</option>
                <option value="LS">LS (Spot-Repair)</option>
                <option value="DIV">DIV (Overig)</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Spuittijd (AE)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={newSpuittijdAE || ''}
                onChange={(e) => setNewSpuittijdAE(parseFloat(e.target.value) || 0)}
                placeholder="bv. 18"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400">
                {newSpuittijdAE > 0 ? `${(newSpuittijdAE / 10).toFixed(1)} u` : '10 AE = 1u'}
              </span>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Plaatwerk (AE)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={newPlaatwerkAE || ''}
                onChange={(e) => setNewPlaatwerkAE(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">De/Mont (AE)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={newDemontageAE || ''}
                onChange={(e) => setNewDemontageAE(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deel Prijs (€)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={newOnderdeelPrijs || ''}
                onChange={(e) => setNewOnderdeelPrijs(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newEenmalig}
                onChange={(e) => setNewEenmalig(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span>Foutgeheugen / OBD uitlezen (altijd automatisch 1× op Schade 1)</span>
            </label>

            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-2xs"
            >
              Regel Toevoegen
            </button>
          </div>
        </form>
      )}

      {/* Regels Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3.5 w-16">Code</th>
              <th className="py-2.5 px-3.5">Omschrijving / Onderdeel</th>
              <th className="py-2.5 px-3.5 w-36">Voertuigzone</th>
              <th className="py-2.5 px-3.5 w-24">Bewerking</th>
              <th className="py-2.5 px-3.5 text-right w-24">Spuittijd (AE)</th>
              <th className="py-2.5 px-3.5 text-right w-20">Plaatwerk (AE)</th>
              <th className="py-2.5 px-3.5 text-right w-20">De/Mont (AE)</th>
              <th className="py-2.5 px-3.5 text-right w-24">Onderdeel</th>
              <th className="py-2.5 px-3.5 text-center w-36">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredRegels.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Geen regels gevonden voor het huidige filter of zoekopdracht.
                </td>
              </tr>
            ) : (
              filteredRegels.map((regel, idx) => {
                const spuitAE = regel.spuittijdAE !== undefined ? regel.spuittijdAE : Math.round((regel.spuittijdUren || 0) * 10);
                const plaatAE = regel.arbeidPlaatwerkAE !== undefined ? regel.arbeidPlaatwerkAE : Math.round((regel.arbeidPlaatwerkUren || 0) * 10);
                const demAE = regel.arbeidDemontageAE !== undefined ? regel.arbeidDemontageAE : Math.round((regel.arbeidDemontageUren || 0) * 10);

                return (
                  <tr 
                    key={regel.id} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Code */}
                    <td className="py-2.5 px-3.5 font-mono text-slate-500 font-medium">
                      {regel.code || `${idx + 1}`.padStart(3, '0')}
                    </td>

                    {/* Omschrijving */}
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>{regel.omschrijving}</span>
                        {regel.isEenmaligePost && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                            title="Foutgeheugen uitlezen: staat altijd 1× op Schade 1"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Foutgeheugen · 1× S1
                          </span>
                        )}
                        {regel.spuitFase && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {regel.spuitFase}
                          </span>
                        )}
                        {regel.materiaalSoort && (
                          <span className="text-[10px] font-sans text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 capitalize">
                            {regel.materiaalSoort}
                          </span>
                        )}
                        {regel.artikelnummer && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {regel.artikelnummer}
                          </span>
                        )}
                      </div>
                      {regel.opmerking && (
                        <div className="text-[10px] text-slate-500 mt-0.5 italic">
                          {regel.opmerking}
                        </div>
                      )}
                    </td>

                    {/* Voertuigzone Selector (alle 6 zones + Overig) */}
                    <td className="py-2.5 px-3.5">
                      <select
                        value={regel.sectie}
                        onChange={(e) => handleSetSectie(regel.id, e.target.value as SectieType)}
                        title="Kies voertuigzone (6 zijden of Overig)"
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer focus:outline-none focus:border-blue-600 ${ZONE_SELECT_STYLE[regel.sectie]}`}
                      >
                        {VOERTUIG_ZONES.map(z => {
                          const suffix = z === schade1Zone ? ' · S1' : z === schade2Zone ? ' · S2' : '';
                          return (
                            <option key={z} value={z}>
                              {ZONE_LABELS[z]}{suffix}
                            </option>
                          );
                        })}
                        <option value="overig">Overig (kiezen)</option>
                      </select>
                    </td>

                    {/* Bewerking */}
                    <td className="py-2.5 px-3.5">
                      {getBewerkingBadge(regel.bewerking)}
                    </td>

                    {/* Spuittijd in AE */}
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {spuitAE > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="font-extrabold text-slate-900 inline-flex items-center gap-1">
                            <Paintbrush className="w-3 h-3 text-blue-600" />
                            {formatAE(spuitAE)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {(spuitAE / 10).toFixed(1)} u
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Plaatwerk in AE */}
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                      {plaatAE > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="font-semibold text-slate-800">{formatAE(plaatAE)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{(plaatAE / 10).toFixed(1)} u</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Demontage in AE */}
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                      {demAE > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="font-semibold text-slate-800">{formatAE(demAE)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{(demAE / 10).toFixed(1)} u</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Onderdeelprijs */}
                    <td className="py-2.5 px-3.5 text-right font-mono">
                      {regel.onderdeelPrijs > 0 ? (
                        <span className="font-bold text-slate-900">
                          {formatEuro(regel.onderdeelPrijs)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Acties: Simpel Schade 1 | Schade 2 kiezen per regel */}
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAssignSchade(regel.id, 'schade1')}
                          title={`Toewijzen aan Schade 1 (${ZONE_LABELS[schade1Zone]})`}
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors whitespace-nowrap ${
                            regel.sectie === schade1Zone
                              ? ZONE_BTN_ACTIVE[schade1Zone]
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          S1 · {ZONE_SHORT_LABELS[schade1Zone]}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignSchade(regel.id, 'schade2')}
                          title={`Toewijzen aan Schade 2 (${ZONE_LABELS[schade2Zone]})`}
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors whitespace-nowrap ${
                            regel.sectie === schade2Zone
                              ? ZONE_BTN_ACTIVE[schade2Zone]
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          S2 · {ZONE_SHORT_LABELS[schade2Zone]}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRegel(regel.id)}
                          title="Verwijder regel"
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="p-3 bg-slate-50 text-slate-600 text-[11px] flex items-center justify-between border-t border-slate-200">
        <div className="flex items-center gap-1.5">
          <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
          <span>Tip: Spuittijd en materiaalkosten worden in realtime herberekend bij het wisselen van voertuigzone.</span>
        </div>
        <div className="text-slate-500">
          Totaal getoond: <span className="text-slate-900 font-bold">{filteredRegels.length}</span> van {regels.length}
        </div>
      </div>
    </div>
  );
};
