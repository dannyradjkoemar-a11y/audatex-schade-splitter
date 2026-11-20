/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import {
  AnalyseResultaat,
  MateriaalconstanteMethode,
  Tarieven,
  DossierMeta,
  CalculatieRegel,
  VoertuigZone,
  VOERTUIG_ZONES,
  ZONE_LABELS,
  ZONE_SHORT_LABELS,
  SectieType,
  AudatexEindcalculatieData
} from './types/audatex';
import { berekenSectieTotalen, formatEuro, formatAE } from './utils/calculator';
import {
  isFoutgeheugenPost,
  isOverigeKeuzeHandeling,
  applySchade1Selection,
  detectDefaultSchadeZones
} from './utils/audatexParser';
import { AZT_VOORBEREIDINGSTIJDEN, Laksysteem, Materiaalsoort, SituatieMontage } from './utils/aztTable';
import { lookupRdwVehicle } from './utils/rdwService';
import { apiUrl, getApiBase, buildStaticMarktFallback } from './utils/apiConfig';
import { DossierHeader } from './components/DossierHeader';
import { RdwDagwaardeCard } from './components/RdwDagwaardeCard';
import { KPICards } from './components/KPICards';
import { SoleraConfig } from './components/SoleraConfig';
import { CalculatieTabel } from './components/CalculatieTabel';
import { FinancieelRapport } from './components/FinancieelRapport';
import { InputSection } from './components/InputSection';
import { SoleraInfoModal } from './components/SoleraInfoModal';
import { AftrekCalculator } from './components/AftrekCalculator';
import { AztNaslag } from './components/AztNaslag';
import { AppLogo } from './components/AppLogo';
import { SchadeVisuals } from './components/SchadeVisuals';
import { CinemaIntro } from './components/CinemaIntro';
import { 
  HelpCircle, 
  Printer, 
  PlusCircle, 
  Sliders, 
  Calculator, 
  BookOpen, 
  Split,
  Download,
  Loader2,
  CheckCircle2,
  ArrowLeftRight,
  Film
} from 'lucide-react';

type MainTab = 'splitser' | 'calculator' | 'naslag';
type SubView = 'report' | 'table' | 'aftrek';

export default function App() {
  const [data, setData] = useState<AnalyseResultaat | null>(null);
  const [methode, setMethode] = useState<MateriaalconstanteMethode>('proportioneel_spuittijd');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRdwLoading, setIsRdwLoading] = useState<boolean>(false);
  const [isMarktLoading, setIsMarktLoading] = useState<boolean>(false);
  const [marktError, setMarktError] = useState<string | null>(null);
  const [isHtmlDownloading, setIsHtmlDownloading] = useState<boolean>(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [mainTab, setMainTab] = useState<MainTab>('splitser');
  const [activeSubView, setActiveSubView] = useState<SubView>('report');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [tableFilterRequest, setTableFilterRequest] = useState<{ zone: string; seq: number } | null>(null);
  const [isCinemaIntroOpen, setIsCinemaIntroOpen] = useState<boolean>(true);

  const isStandaloneHtml =
    (typeof __IS_STANDALONE_HTML__ !== 'undefined' && __IS_STANDALONE_HTML__) ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:');

  const schade1Zone: VoertuigZone = data?.schade1Zone || 'voorzijde';
  const schade2Zone: VoertuigZone =
    data?.schade2Zone && data.schade2Zone !== schade1Zone
      ? data.schade2Zone
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';

  const eenmaligePosten = useMemo(() => {
    if (!data) return [];
    return data.regels.filter(r => r.isEenmaligePost);
  }, [data]);

  const overigeHandelingen = useMemo(() => {
    if (!data) return [];
    return data.regels.filter(r => !r.isEenmaligePost && (r.isOverigeHandeling || r.sectie === 'overig'));
  }, [data]);

  const openOverigeCount = useMemo(
    () => overigeHandelingen.filter(r => r.sectie === 'overig').length,
    [overigeHandelingen]
  );

  // Live calculation of all section totals
  const totalen = useMemo(() => {
    if (!data) return null;
    return berekenSectieTotalen(
      data.regels,
      data.tarieven,
      methode,
      data.audatexEindcalculatie,
      schade1Zone,
      schade2Zone
    );
  }, [data, methode, schade1Zone, schade2Zone]);

  const handleChangeSchade1Zone = (nextS1: VoertuigZone) => {
    if (!data) return;
    const nextS2: VoertuigZone =
      nextS1 === schade2Zone ? schade1Zone : schade2Zone;
    setData({
      ...data,
      schade1Zone: nextS1,
      schade2Zone: nextS2,
      regels: applySchade1Selection(data.regels, nextS1, nextS2)
    });
  };

  const handleChangeSchade2Zone = (nextS2: VoertuigZone) => {
    if (!data) return;
    const nextS1: VoertuigZone =
      nextS2 === schade1Zone ? schade2Zone : schade1Zone;
    setData({
      ...data,
      schade1Zone: nextS1,
      schade2Zone: nextS2,
      regels: applySchade1Selection(data.regels, nextS1, nextS2)
    });
  };

  const handleSwapSchadeZones = () => {
    if (!data) return;
    setData({
      ...data,
      schade1Zone: schade2Zone,
      schade2Zone: schade1Zone,
      regels: applySchade1Selection(data.regels, schade2Zone, schade1Zone)
    });
  };

  const handleAssignOverigeHandeling = (id: string, keuze: 'schade1' | 'schade2' | 'overig') => {
    if (!data) return;
    const nextSectie: SectieType =
      keuze === 'schade1' ? schade1Zone : keuze === 'schade2' ? schade2Zone : 'overig';
    const updatedRegels = data.regels.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        isEenmaligePost: undefined,
        isOverigeHandeling: true,
        overigeToewijzing: keuze === 'overig' ? undefined : keuze,
        sectie: nextSectie
      };
    });
    setData({
      ...data,
      regels: updatedRegels
    });
  };

  const handleAssignAllOverigeHandelingen = (keuze: 'schade1' | 'schade2') => {
    if (!data) return;
    const nextSectie: SectieType = keuze === 'schade1' ? schade1Zone : schade2Zone;
    const updatedRegels = data.regels.map(r => {
      if (r.isEenmaligePost || !(r.isOverigeHandeling || r.sectie === 'overig')) {
        return r;
      }
      return {
        ...r,
        isEenmaligePost: undefined,
        isOverigeHandeling: true,
        overigeToewijzing: keuze,
        sectie: nextSectie
      };
    });
    setData({
      ...data,
      regels: updatedRegels
    });
  };

  const handleSelectZoneFromVisuals = (zone: VoertuigZone) => {
    setActiveSubView('table');
    setTableFilterRequest(prev => ({ zone, seq: (prev?.seq ?? 0) + 1 }));
  };

  const reconcileEindcalculatie = (
    prevRegels: CalculatieRegel[],
    newRegels: CalculatieRegel[],
    prevEind: AudatexEindcalculatieData | undefined,
    tarieven: Tarieven
  ): AudatexEindcalculatieData | undefined => {
    if (!prevEind) return undefined;

    const prevMap = new Map(prevRegels.map(r => [r.id, r]));
    const newMap = new Map(newRegels.map(r => [r.id, r]));
    const added = newRegels.filter(r => !prevMap.has(r.id));
    const removed = prevRegels.filter(r => !newMap.has(r.id));

    if (added.length === 0 && removed.length === 0) {
      return prevEind;
    }

    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const tariefPerAE = tarieven.tariefPerAE || (tarieven.plaatwerktarief / 10) || 8.81;
    const plaatPerAE = (tarieven.plaatwerktarief ? tarieven.plaatwerktarief / 10 : 0) || tariefPerAE;
    const demPerAE = (tarieven.demontagetarief ? tarieven.demontagetarief / 10 : 0) || tariefPerAE;
    const spuitTariefPerAE = (tarieven.spuittarief ? tarieven.spuittarief / 10 : 0) || tariefPerAE;
    const spuitMatPerAE = (tarieven.spuitmateriaaltarief || 49.5) / 10;
    const kortingPerc = tarieven.onderdelenKortingPerc || 0;
    const kortingFactor = 1 - kortingPerc / 100;
    const kleinMatFactor = (tarieven.kleinMateriaalPerc || 0) / 100;
    const milieuPerAE = tarieven.milieuTariefPerAE || 0;

    let dOnderdelenBruto = 0;
    let dKorting = 0;
    let dOnderdelen = 0;
    let dKlein = 0;
    let dArbeid = 0;
    let dBijkomend = 0;
    let dSpuitArbeid = 0;
    let dSpuitMat = 0;
    let dSpuitAE = 0;
    let dMilieu = 0;

    const applySign = (r: CalculatieRegel, sign: 1 | -1) => {
      const spuitAE = r.spuittijdAE !== undefined ? r.spuittijdAE : Math.round((r.spuittijdUren || 0) * 10);
      const plaatAE = r.arbeidPlaatwerkAE !== undefined ? r.arbeidPlaatwerkAE : Math.round((r.arbeidPlaatwerkUren || 0) * 10);
      const demAE = r.arbeidDemontageAE !== undefined ? r.arbeidDemontageAE : Math.round((r.arbeidDemontageUren || 0) * 10);

      if (r.itemType === 'bijkomend') {
        dBijkomend += sign * (r.onderdeelPrijs || 0);
      } else if ((r.onderdeelPrijs || 0) > 0) {
        const bruto = r.onderdeelPrijs || 0;
        const naKorting = bruto * kortingFactor;
        const kleinDeel = naKorting * kleinMatFactor;
        dOnderdelenBruto += sign * bruto;
        dKorting += sign * (bruto - naKorting);
        dKlein += sign * kleinDeel;
        dOnderdelen += sign * (naKorting + kleinDeel);
      }

      if (r.itemType !== 'spuitwerk' && (plaatAE + demAE) > 0) {
        const arb =
          r.arbeidsloonBedrag !== undefined
            ? r.arbeidsloonBedrag
            : plaatAE * plaatPerAE + demAE * demPerAE;
        dArbeid += sign * arb;
        dMilieu += sign * (plaatAE + demAE) * milieuPerAE;
      }

      if (spuitAE > 0) {
        const spuitArb =
          r.arbeidsloonBedrag !== undefined && r.itemType === 'spuitwerk'
            ? r.arbeidsloonBedrag
            : spuitAE * spuitTariefPerAE;
        const spuitMat =
          r.spuitmateriaalBedrag !== undefined ? r.spuitmateriaalBedrag : spuitAE * spuitMatPerAE;
        dSpuitArbeid += sign * spuitArb;
        dSpuitMat += sign * spuitMat;
        dSpuitAE += sign * spuitAE;
        dMilieu += sign * spuitAE * milieuPerAE;
      }
    };

    added.forEach(r => applySign(r, 1));
    removed.forEach(r => applySign(r, -1));

    const onderdelenNetto = Math.max(0, r2(prevEind.onderdelenNetto + dOnderdelen));
    const onderdelenBruto =
      prevEind.onderdelenBruto !== undefined
        ? Math.max(0, r2(prevEind.onderdelenBruto + dOnderdelenBruto))
        : undefined;
    const onderdelenKorting =
      prevEind.onderdelenKorting !== undefined
        ? Math.max(0, r2(prevEind.onderdelenKorting + dKorting))
        : undefined;
    const kleinMateriaal =
      prevEind.kleinMateriaal !== undefined
        ? Math.max(0, r2(prevEind.kleinMateriaal + dKlein))
        : undefined;
    const arbeidNetto = Math.max(0, r2(prevEind.arbeidNetto + dArbeid));
    const bijkomendNetto = Math.max(0, r2(prevEind.bijkomendNetto + dBijkomend));
    const spuitarbeidNetto =
      prevEind.spuitarbeidNetto !== undefined
        ? Math.max(0, r2(prevEind.spuitarbeidNetto + dSpuitArbeid))
        : undefined;
    const spuitmateriaalNetto =
      prevEind.spuitmateriaalNetto !== undefined
        ? Math.max(0, r2(prevEind.spuitmateriaalNetto + dSpuitMat))
        : undefined;
    const spuitwerkNetto = Math.max(0, r2(prevEind.spuitwerkNetto + dSpuitArbeid + dSpuitMat));
    const spuitTijdPaneelAE =
      prevEind.spuitTijdPaneelAE !== undefined
        ? Math.max(0, Math.round((prevEind.spuitTijdPaneelAE + dSpuitAE) * 10) / 10)
        : undefined;
    const spuitLoonTotaalAE =
      prevEind.spuitLoonTotaalAE !== undefined
        ? Math.max(0, Math.round((prevEind.spuitLoonTotaalAE + dSpuitAE) * 10) / 10)
        : undefined;
    const milieuNetto = Math.max(0, r2(prevEind.milieuNetto + dMilieu));
    const totaalExclBtw = r2(onderdelenNetto + arbeidNetto + bijkomendNetto + spuitwerkNetto + milieuNetto);
    const btwRate = (tarieven.btwPercentage || 21) / 100;
    const btwBedrag = r2(totaalExclBtw * btwRate);
    const totaalInclBtw = r2(totaalExclBtw + btwBedrag);

    return {
      ...prevEind,
      onderdelenNetto,
      onderdelenBruto,
      onderdelenKorting,
      kleinMateriaal,
      arbeidNetto,
      bijkomendNetto,
      spuitarbeidNetto,
      spuitmateriaalNetto,
      spuitTijdPaneelAE,
      spuitLoonTotaalAE,
      spuitwerkNetto,
      milieuNetto,
      totaalExclBtw,
      btwBedrag,
      totaalInclBtw
    };
  };

  const handleUpdateRegels = (newRegels: CalculatieRegel[]) => {
    if (!data) return;
    const nextEind = reconcileEindcalculatie(data.regels, newRegels, data.audatexEindcalculatie, data.tarieven);
    setData({
      ...data,
      regels: newRegels,
      audatexEindcalculatie: nextEind
    });
  };

  const handleUpdateTarieven = (newTarieven: Tarieven) => {
    if (!data) return;
    const prevEind = data.audatexEindcalculatie;
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    if (!prevEind) {
      setData({ ...data, tarieven: newTarieven });
      return;
    }

    const oldTar = data.tarieven;
    const syncedTarieven: Tarieven = {
      ...newTarieven,
      tariefPerAE:
        newTarieven.plaatwerktarief !== oldTar.plaatwerktarief
          ? newTarieven.plaatwerktarief / 10
          : newTarieven.tariefPerAE
    };

    // 1. Onderdelen herberekenen indien korting% of kleinmateriaal% is aangepast
    let onderdelenBruto = prevEind.onderdelenBruto ?? 0;
    let onderdelenKorting = prevEind.onderdelenKorting ?? 0;
    let kleinMateriaal = prevEind.kleinMateriaal ?? 0;
    let onderdelenNetto = prevEind.onderdelenNetto;
    if (
      newTarieven.onderdelenKortingPerc !== oldTar.onderdelenKortingPerc ||
      newTarieven.kleinMateriaalPerc !== oldTar.kleinMateriaalPerc
    ) {
      if (onderdelenBruto <= 0) {
        onderdelenBruto = r2(
          data.regels
            .filter(r => r.itemType !== 'bijkomend')
            .reduce((s, r) => s + (r.onderdeelPrijs || 0), 0)
        );
      }
      const kortingPerc = newTarieven.onderdelenKortingPerc || 0;
      onderdelenKorting = r2(onderdelenBruto * (kortingPerc / 100));
      const naKorting = r2(onderdelenBruto - onderdelenKorting);
      kleinMateriaal = r2(naKorting * ((newTarieven.kleinMateriaalPerc || 0) / 100));
      onderdelenNetto = r2(naKorting + kleinMateriaal);
    }

    // 2. Werkplaats-arbeid herberekenen bij gewijzigd plaatwerk- of demontagetarief
    let arbeidNetto = prevEind.arbeidNetto;
    if (
      newTarieven.plaatwerktarief !== oldTar.plaatwerktarief ||
      newTarieven.demontagetarief !== oldTar.demontagetarief
    ) {
      const plaatPerAE = newTarieven.plaatwerktarief / 10;
      const demPerAE = newTarieven.demontagetarief / 10;
      arbeidNetto = r2(
        data.regels
          .filter(r => r.itemType !== 'spuitwerk')
          .reduce(
            (s, r) => s + (r.arbeidPlaatwerkAE || 0) * plaatPerAE + (r.arbeidDemontageAE || 0) * demPerAE,
            0
          )
      );
    }

    // 3. Spuitarbeid herberekenen bij gewijzigd spuittarief (met behoud van AZT-voorbereidingstijd!)
    const prevSpuitArbeid =
      prevEind.spuitarbeidNetto ??
      r2((prevEind.spuitLoonTotaalAE || 0) * ((oldTar.spuittarief || 94) / 10));
    let spuitarbeidNetto = prevSpuitArbeid;
    if (newTarieven.spuittarief !== oldTar.spuittarief) {
      const spuitLoonAE =
        prevEind.spuitLoonTotaalAE ||
        (data.regels.reduce((s, r) => s + (r.spuittijdAE || 0), 0) +
          (prevEind.spuitVoorbereidingMetaalAE || 0) +
          (prevEind.spuitVoorbereidingKunststofAE || 0) +
          (prevEind.spuitVoorbereidingMeerlagenAE || 0));
      spuitarbeidNetto = r2(spuitLoonAE * (newTarieven.spuittarief / 10));
    }

    // 4. Spuitmateriaal & AZT-constanten bijwerken met behoud van postenstructuur
    const indexFactor = (prevEind.materiaalIndexPerc ?? 100) / 100 || 1;
    let constMetaal = prevEind.materiaalConstanteMetaal || 0;
    let constKunst = prevEind.materiaalConstanteKunststof || 0;
    let constMeer = prevEind.materiaalConstanteMeerlagen || 0;
    const oldConstNet = r2((constMetaal + constKunst + constMeer) * indexFactor);
    const oldSpuitMatNet = prevEind.spuitmateriaalNetto ?? r2(prevEind.spuitwerkNetto - prevSpuitArbeid);
    const oldBasisMat = r2(oldSpuitMatNet - oldConstNet);

    let newBasisMat = oldBasisMat;
    let nextSpuitMatPosten = prevEind.spuitMateriaalPosten;
    if (newTarieven.spuitmateriaaltarief !== oldTar.spuitmateriaaltarief && oldTar.spuitmateriaaltarief > 0) {
      const ratio = newTarieven.spuitmateriaaltarief / oldTar.spuitmateriaaltarief;
      newBasisMat = r2(oldBasisMat * ratio);
      if (nextSpuitMatPosten) {
        nextSpuitMatPosten = nextSpuitMatPosten.map(p => ({
          ...p,
          bedragBruto: r2(p.bedragBruto * ratio)
        }));
      }
    }

    let newConstNet = oldConstNet;
    if (newTarieven.materiaalconstante !== oldTar.materiaalconstante) {
      newConstNet = Math.max(0, r2(newTarieven.materiaalconstante));
      const newRawTotal = newConstNet / indexFactor;
      const oldRawTotal = constMetaal + constKunst + constMeer;
      if (oldRawTotal > 0) {
        const scale = newRawTotal / oldRawTotal;
        constMetaal = r2(constMetaal * scale);
        constKunst = r2(constKunst * scale);
        constMeer = r2(newRawTotal - constMetaal - constKunst);
      } else {
        constMetaal = r2(newRawTotal);
      }
    }

    const spuitmateriaalNetto = r2(newBasisMat + newConstNet);
    const spuitwerkNetto = r2(spuitarbeidNetto + spuitmateriaalNetto);

    // 5. Milieutoeslag & Eindtotaal
    const milieuNetto =
      newTarieven.milieutoeslag !== oldTar.milieutoeslag
        ? Math.max(0, r2(newTarieven.milieutoeslag))
        : prevEind.milieuNetto;
    const totaalExclBtw = r2(
      onderdelenNetto + arbeidNetto + prevEind.bijkomendNetto + spuitwerkNetto + milieuNetto
    );
    const btwBedrag = r2(totaalExclBtw * ((newTarieven.btwPercentage || 21) / 100));
    const totaalInclBtw = r2(totaalExclBtw + btwBedrag);

    setData({
      ...data,
      tarieven: syncedTarieven,
      audatexEindcalculatie: {
        ...prevEind,
        onderdelenBruto: onderdelenBruto || prevEind.onderdelenBruto,
        onderdelenKorting,
        kleinMateriaal,
        onderdelenNetto,
        arbeidNetto,
        spuitarbeidNetto,
        spuitmateriaalNetto,
        spuitwerkNetto,
        materiaalConstanteMetaal: constMetaal || undefined,
        materiaalConstanteKunststof: constKunst || undefined,
        materiaalConstanteMeerlagen: constMeer || undefined,
        spuitMateriaalPosten: nextSpuitMatPosten,
        milieuNetto,
        totaalExclBtw,
        btwBedrag,
        totaalInclBtw
      }
    });
  };

  const handleUpdateMeta = (newMeta: DossierMeta) => {
    if (!data) return;
    setData({
      ...data,
      meta: newMeta
    });
  };

  const fetchRdwWithFallback = async (cleanPlate: string) => {
    const isGitHubPagesWithoutBackend =
      typeof window !== 'undefined' &&
      window.location.hostname.endsWith('github.io') &&
      !getApiBase();
    if (window.location.protocol === 'file:' || isGitHubPagesWithoutBackend) {
      return lookupRdwVehicle(cleanPlate);
    }
    try {
      const res = await fetch(apiUrl(`/api/rdw/${encodeURIComponent(cleanPlate)}`));
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to direct RDW lookup
    }
    return lookupRdwVehicle(cleanPlate);
  };

  const handleLoadData = (newData: AnalyseResultaat) => {
    const prelimRegels = newData.regels.map(r => {
      const isFoutgeheugen = r.isEenmaligePost ?? isFoutgeheugenPost(r.omschrijving, r.code);
      const isOverig = !isFoutgeheugen && (r.isOverigeHandeling || r.sectie === 'overig' || isOverigeKeuzeHandeling(r.omschrijving, r.code));
      return {
        ...r,
        isEenmaligePost: isFoutgeheugen || undefined,
        isOverigeHandeling: isOverig || undefined
      };
    });

    const detected = detectDefaultSchadeZones(prelimRegels);
    const s1: VoertuigZone = newData.schade1Zone || detected.schade1Zone;
    const s2: VoertuigZone =
      newData.schade2Zone && newData.schade2Zone !== s1
        ? newData.schade2Zone
        : detected.schade2Zone !== s1
        ? detected.schade2Zone
        : s1 === 'voorzijde'
        ? 'achterzijde'
        : 'voorzijde';

    const normalizedRegels = applySchade1Selection(prelimRegels, s1, s2);

    // 1. Directe weergave van de calculatie (geen vertraging)
    setMarktError(null);
    setData({
      ...newData,
      schade1Zone: s1,
      schade2Zone: s2,
      regels: normalizedRegels
    });
    if (newData.materiaalconstanteMethode) {
      setMethode(newData.materiaalconstanteMethode);
    }
    setMainTab('splitser');
    setTableFilterRequest(null);

    // 2. RDW-gegevens + live marktvergelijking & ANWB Koerslijst asynchroon ophalen
    const plate = newData.meta?.kenteken;
    const cleanPlate = plate && plate !== 'ONBEKEND' ? plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '';

    if (cleanPlate.length >= 5 && cleanPlate.length <= 8) {
      setIsRdwLoading(true);
      fetchRdwWithFallback(cleanPlate)
        .then((rdwData) => {
          const resolvedMerkModel =
            rdwData?.merk && rdwData?.handelsbenaming
              ? `${rdwData.merk} ${rdwData.handelsbenaming}`
              : newData.meta.merkModel;
          const resolvedBouwjaar = newData.meta.bouwjaar || rdwData?.bouwjaar;

          if (rdwData) {
            setData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                meta: {
                  ...prev.meta,
                  kenteken: rdwData.geformatteerdKenteken || prev.meta.kenteken,
                  merkModel: resolvedMerkModel,
                  bouwjaar: prev.meta.bouwjaar || rdwData.bouwjaar
                },
                rdw: rdwData
              };
            });
          }

          if (resolvedMerkModel && resolvedBouwjaar) {
            handleSearchMarkt(
              {
                merkModel: resolvedMerkModel,
                bouwjaar: resolvedBouwjaar,
                kilometerstand: newData.meta.kilometerstand ?? 0
              },
              rdwData || undefined,
              cleanPlate
            );
          }
        })
        .catch(err => {
          console.warn('Achtergrond RDW-koppeling overgeslagen:', err);
        })
        .finally(() => {
          setIsRdwLoading(false);
        });
    } else if (newData.meta?.merkModel && newData.meta?.bouwjaar) {
      handleSearchMarkt(
        {
          merkModel: newData.meta.merkModel,
          bouwjaar: newData.meta.bouwjaar,
          kilometerstand: newData.meta.kilometerstand ?? 0
        },
        undefined,
        newData.meta.kenteken
      );
    }
  };

  const handleNewCalculation = () => {
    setData(null);
    setMarktError(null);
    setMainTab('splitser');
  };

  const handleDownloadHtmlApp = async () => {
    if (isHtmlDownloading) return;
    setIsHtmlDownloading(true);
    try {
      if (window.location.protocol === 'file:') {
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        const clonedRoot = clone.querySelector('#root');
        if (clonedRoot) clonedRoot.innerHTML = '';
        const htmlContent = '<!doctype html>\n' + clone.outerHTML;
        const blob = new Blob([htmlContent], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Audatex-Schade-Splitter.html';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }

      const prepRes = await fetch(apiUrl('/api/download-html?prepare=1'));
      if (!prepRes.ok) {
        throw new Error('Kon standalone HTML-bestand niet voorbereiden.');
      }

      const res = await fetch(apiUrl('/api/download-html'));
      if (!res.ok) {
        throw new Error('Kon standalone HTML-bestand niet genereren.');
      }
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Audatex-Schade-Splitter.html';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Fout bij downloaden HTML-app:', err);
    } finally {
      setIsHtmlDownloading(false);
    }
  };

  // Live market scraper (Marktplaats, AutoScout24, Gaspedaal, AutoTrack) & officiële ANWB Koerslijst
  const handleSearchMarkt = async (
    params: { kenteken?: string; merkModel: string; bouwjaar: number; kilometerstand: number },
    overrideRdw?: AnalyseResultaat['rdw'],
    overrideKenteken?: string
  ) => {
    if (window.location.protocol === 'file:') return;
    setIsMarktLoading(true);
    setMarktError(null);
    try {
      let rdwRef = overrideRdw ?? data?.rdw;
      const targetPlate = (params.kenteken ?? overrideKenteken ?? data?.meta.kenteken ?? '').trim();
      const cleanTarget = targetPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const cleanRdw = (rdwRef?.kenteken || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      if (cleanTarget.length >= 5 && cleanTarget.length <= 8 && cleanTarget !== 'ONBEKEND' && cleanTarget !== cleanRdw) {
        try {
          const freshRdw = await fetchRdwWithFallback(cleanTarget);
          rdwRef = freshRdw || undefined;
        } catch {
          rdwRef = undefined;
        }
      }

      const useRdwSpecs = rdwRef && (!cleanTarget || (rdwRef.kenteken || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanTarget);

      let payload: any;
      try {
        const res = await fetch(apiUrl('/api/markt-vergelijking'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merk: useRdwSpecs ? rdwRef?.merk : undefined,
            model: useRdwSpecs ? rdwRef?.handelsbenaming : undefined,
            merkModel: params.merkModel,
            bouwjaar: params.bouwjaar,
            kilometerstand: params.kilometerstand,
            brandstof: useRdwSpecs ? rdwRef?.brandstof : undefined,
            kenteken: targetPlate,
            catalogusprijs: useRdwSpecs ? rdwRef?.catalogusprijs : undefined,
            datumEersteToelating: useRdwSpecs ? rdwRef?.datumEersteToelating : undefined
          })
        });
        const raw = await res.text();
        let parsed: any = null;
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          parsed = null;
        }
        if (!res.ok || !parsed || !parsed.anwbKoerslijst) {
          if (res.status === 404 || res.status === 405 || !parsed) {
            payload = buildStaticMarktFallback({
              merkModel: params.merkModel,
              bouwjaar: params.bouwjaar,
              kilometerstand: params.kilometerstand,
              kenteken: targetPlate,
              brandstof: useRdwSpecs ? rdwRef?.brandstof : undefined,
              catalogusprijs: useRdwSpecs ? rdwRef?.catalogusprijs : undefined,
              datumEersteToelating: useRdwSpecs ? rdwRef?.datumEersteToelating : undefined
            });
          } else {
            throw new Error(parsed?.error || `Fout bij marktvergelijking (HTTP ${res.status}).`);
          }
        } else {
          payload = parsed;
        }
      } catch (fetchErr: any) {
        if (!getApiBase() && typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
          payload = buildStaticMarktFallback({
            merkModel: params.merkModel,
            bouwjaar: params.bouwjaar,
            kilometerstand: params.kilometerstand,
            kenteken: targetPlate,
            brandstof: useRdwSpecs ? rdwRef?.brandstof : undefined,
            catalogusprijs: useRdwSpecs ? rdwRef?.catalogusprijs : undefined,
            datumEersteToelating: useRdwSpecs ? rdwRef?.datumEersteToelating : undefined
          });
        } else {
          throw fetchErr;
        }
      }

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          meta: {
            ...prev.meta,
            kenteken: (useRdwSpecs && rdwRef?.geformatteerdKenteken) || targetPlate || prev.meta.kenteken,
            bouwjaar: params.bouwjaar,
            kilometerstand: params.kilometerstand
          },
          rdw: useRdwSpecs ? rdwRef : prev.rdw,
          marktVergelijking: payload
        };
      });
    } catch (err: any) {
      setMarktError(err?.message || 'Kon marktvergelijking en ANWB Koerslijst niet ophalen.');
    } finally {
      setIsMarktLoading(false);
    }
  };

  // Live RDW lookup for manual plate update or refresh
  const handleLookupPlate = async (kenteken: string) => {
    if (!kenteken) return;
    const cleanPlate = kenteken.trim().toUpperCase();
    setIsRdwLoading(true);
    try {
      const rdwData = await fetchRdwWithFallback(cleanPlate);
      const nextMerkModel =
        rdwData?.merk && rdwData?.handelsbenaming
          ? `${rdwData.merk} ${rdwData.handelsbenaming}`
          : data?.meta.merkModel || '';
      const nextBouwjaar = rdwData?.bouwjaar || data?.meta.bouwjaar;
      const nextKm = data?.meta.kilometerstand ?? 0;

      if (rdwData) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            meta: {
              ...prev.meta,
              kenteken: rdwData.geformatteerdKenteken || cleanPlate,
              merkModel:
                rdwData.merk && rdwData.handelsbenaming
                  ? `${rdwData.merk} ${rdwData.handelsbenaming}`
                  : prev.meta.merkModel,
              bouwjaar: rdwData.bouwjaar || prev.meta.bouwjaar
            },
            rdw: rdwData
          };
        });
      } else {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            meta: {
              ...prev.meta,
              kenteken: cleanPlate
            }
          };
        });
      }

      if (nextMerkModel && nextBouwjaar) {
        await handleSearchMarkt(
          {
            kenteken: cleanPlate,
            merkModel: nextMerkModel,
            bouwjaar: nextBouwjaar,
            kilometerstand: nextKm
          },
          rdwData || undefined,
          rdwData?.geformatteerdKenteken || cleanPlate
        );
      }
    } catch (e) {
      console.error('Fout bij opvragen RDW:', e);
    } finally {
      setIsRdwLoading(false);
    }
  };

  // Derive initial AZT parameters for AftrekCalculator from parsed dossier data
  const buildAftrekInitForZone = (zone: VoertuigZone, labelPrefix: string) => {
    if (!data || !totalen) return undefined;
    const sec = totalen.zones[zone];
    const zonePaintRules = data.regels.filter(r => r.sectie === zone && r.itemType === 'spuitwerk');
    const hasMetaal = zonePaintRules.some(r => (r.materiaalSoort || 'metaal') === 'metaal');
    const hasKunst = zonePaintRules.some(r => r.materiaalSoort === 'kunststof');
    const materiaalsoort: Materiaalsoort = hasMetaal ? 'metaal' : hasKunst ? 'kunststof' : 'metaal';

    const usCodes = data.meta.usCodes || [];
    let situatie: SituatieMontage = 'aan_voertuig_zonder_voorspuiten';
    if (usCodes.includes('Y7')) {
      situatie = 'aan_voertuig_met_voorspuiten';
    } else if (usCodes.includes('Y8') || (!hasMetaal && hasKunst)) {
      situatie = 'uitgebouwd';
    }

    const is1Laags = (data.meta.laksoort || '').toLowerCase().includes('1-laag') || (data.meta.laksoort || '').toLowerCase().includes('uni');
    const baseLak: '2-lagen' | '1-laags' = is1Laags ? '1-laags' : '2-lagen';
    const tableMatch = AZT_VOORBEREIDINGSTIJDEN.find(
      row => row.laksysteem === baseLak && row.materiaalsoort === materiaalsoort && row.situatie === situatie
    );
    const parsedVbtAE =
      materiaalsoort === 'metaal'
        ? data.audatexEindcalculatie?.spuitVoorbereidingMetaalAE
        : data.audatexEindcalculatie?.spuitVoorbereidingKunststofAE;

    const voorbereidingstijdAE =
      parsedVbtAE && parsedVbtAE >= 7 ? parsedVbtAE : (tableMatch?.standaardAE ?? 23);

    return {
      naam: `${labelPrefix} (${ZONE_LABELS[zone]})`,
      materiaalsoort,
      situatie,
      voorbereidingstijdAE,
      materiaalconstante: sec.bedragMateriaalconstante > 0 ? sec.bedragMateriaalconstante : data.tarieven.materiaalconstante
    };
  };

  const calculatorInitialSchade1 = useMemo(
    () => buildAftrekInitForZone(schade1Zone, 'Schade 1'),
    [data, totalen, schade1Zone]
  );

  const calculatorInitialSchade2 = useMemo(
    () => buildAftrekInitForZone(schade2Zone, 'Schade 2'),
    [data, totalen, schade2Zone]
  );

  const dossierLaksysteem: Laksysteem | undefined = useMemo(() => {
    if (!data) return undefined;
    const usCodes = data.meta.usCodes || [];
    const lakLower = (data.meta.laksoort || '').toLowerCase();
    if (usCodes.includes('Y9') || lakLower.includes('4-lag')) return '4-lagen';
    if (usCodes.includes('Z6') || lakLower.includes('3-lag')) return '3-lagen';
    if (lakLower.includes('1-laag') || lakLower.includes('uni')) return '1-laags';
    return '2-lagen';
  }, [data]);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900 flex flex-col font-sans">
      {/* Immediate Full-Screen Video Intro on Site Open */}
      {isCinemaIntroOpen && (
        <CinemaIntro onFinish={() => setIsCinemaIntroOpen(false)} />
      )}

      {/* Top Navbar - Clean 3-Zone Enterprise Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <AppLogo className="w-9 h-9" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Audatex Schade Splitter
            </h1>
          </div>

          {/* Zone 2: Clean typographic navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setMainTab('splitser')}
              className={`flex items-center gap-1.5 py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                mainTab === 'splitser'
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-blue-600" />
              <span>Calculatie Splitsen</span>
            </button>

            <button
              onClick={() => setMainTab('calculator')}
              className={`flex items-center gap-1.5 py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                mainTab === 'calculator'
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-slate-500" />
              <span>Aftrekcheck</span>
            </button>

            <button
              onClick={() => setMainTab('naslag')}
              className={`flex items-center gap-1.5 py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                mainTab === 'naslag'
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Naslag AZT</span>
            </button>
          </nav>

          {/* Zone 3: Utility & Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCinemaIntroOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors whitespace-nowrap shrink-0"
              title="Speel de 3D bioscoop-intro opnieuw af"
            >
              <Film className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Film Intro</span>
            </button>

            <button
              onClick={() => setIsKnowledgeBaseOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors whitespace-nowrap shrink-0"
              title="Solera Kennisbank richtlijnen over TZ 51 en TZ 143"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Solera Richtlijnen</span>
            </button>

            {!isStandaloneHtml && (
              <button
                onClick={handleDownloadHtmlApp}
                disabled={isHtmlDownloading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
                title="Download de volledige applicatie als los HTML-bestand voor offline gebruik"
              >
                {isHtmlDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden lg:inline">{isHtmlDownloading ? 'Bouwen...' : 'Download HTML'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden border-t border-slate-200 bg-slate-50 px-4 py-1.5 gap-1 text-xs">
          <button
            onClick={() => setMainTab('splitser')}
            className={`flex-1 py-1.5 text-center rounded-md font-semibold ${
              mainTab === 'splitser' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
            }`}
          >
            Splitsen
          </button>
          <button
            onClick={() => setMainTab('calculator')}
            className={`flex-1 py-1.5 text-center rounded-md font-semibold ${
              mainTab === 'calculator' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
            }`}
          >
            Aftrekcheck
          </button>
          <button
            onClick={() => setMainTab('naslag')}
            className={`flex-1 py-1.5 text-center rounded-md font-semibold ${
              mainTab === 'naslag' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600'
            }`}
          >
            Naslag AZT
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: SPLITSER */}
        {mainTab === 'splitser' && (
          <>
            {!data ? (
              /* STATE 1: Geen calculatie geladen -> Wide 2-Column Enterprise Intake Workspace */
              <div className="py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                {/* Left Column: Intake & Upload */}
                <div className="lg:col-span-5 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-blue-700 tracking-wide mb-1.5">
                      Solera Audatex & AZT Schade-expertise
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
                      Schadecalculaties zuiver splitsen per voertuigzone
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Plak een Audatex-tekstexport of upload een calculatiebestand. Alle 6 voertuigzijden, spuittijden in AE (10 AE = 1 uur), AZT-materiaalconstanten (TZ 51 / TZ 143) en RDW/ANWB-dagwaarde worden direct uitgesplitst.
                    </p>
                  </div>

                  <InputSection
                    onLoadData={handleLoadData}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    isCompact={false}
                  />
                </div>

                {/* Right Column: Clean 3-Step Workflow + Capabilities */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Hoe werkt het splitsen van een Audatex-calculatie?
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Van één gecombineerde export naar twee losse, kloppende dossiers in 3 stappen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCinemaIntroOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Bekijk Intro Video</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold mb-2">
                          1
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">
                          Plak of upload dossier
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Upload een Audatex PDF/tekstbestand of plak de volledige calculatietekst.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold mb-2">
                          2
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">
                          Zone- &amp; AZT-analyse
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Alle posten worden per voertuigzone en spuitfase (TZ 51 &amp; TZ 143) uitgesplitst.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold mb-2">
                          3
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mb-1">
                          2 aparte rapporten
                        </h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Download direct twee gescheiden A4 PDF-calculaties inclusief ANWB-koerscheck.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clean 3-point capability strip */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">AE &amp; AZT-splitsing</span>
                        <span className="text-slate-600">Herkent spuitfasen (SV1–4, SH, LB) en past TZ 143-aftrek toe.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">RDW &amp; ANWB Koerslijst</span>
                        <span className="text-slate-600">Automatische dagwaarde- en occasioncheck op kenteken.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block">Direct A4 PDF-rapport</span>
                        <span className="text-slate-600">Exporteer twee kant-en-klare dossiers voor de expert.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STATE 2: Calculatie geladen -> Graphical Modern Dashboard */
              <div className="space-y-5">
                {/* Contextual Dossier Toolbar */}
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">Actief dossier</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-bold text-slate-900">{data.meta.kenteken}</span>
                    <span aria-hidden="true" className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline font-mono text-slate-500">{data.regels.length} calculatieposities</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleNewCalculation}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-colors whitespace-nowrap"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Nieuwe calculatie</span>
                    </button>

                    <button
                      onClick={() => setShowConfig(!showConfig)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                        showConfig
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Tarieven &amp; Constante</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Afdrukken</span>
                    </button>
                  </div>
                </div>

                {/* Dossier Header Info */}
                <DossierHeader 
                  meta={data.meta} 
                  onUpdateMeta={handleUpdateMeta}
                  onLookupPlate={handleLookupPlate}
                />

                {/* Config & Rates Drawer (Toggled) */}
                {showConfig && totalen && (
                  <div className="no-print">
                    <SoleraConfig
                      tarieven={data.tarieven}
                      onUpdateTarieven={handleUpdateTarieven}
                      methode={methode}
                      onSelectMethode={setMethode}
                      invoerTekst143={totalen.soleraInfo.invoerTekst143}
                      advies={totalen.soleraInfo.advies}
                      schade1Zone={schade1Zone}
                      schade2Zone={schade2Zone}
                    />
                  </div>
                )}

                {/* Schade 1 & Schade 2 keuzebalk (alle 6 zijden) + Overige handelingen per positie */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden no-print">
                  <div className="px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
                        Schade 1 &amp; 2 instellen:
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1 text-xs">
                          <span className="font-bold text-blue-800 whitespace-nowrap">Schade 1</span>
                          <select
                            aria-label="Zone voor Schade 1"
                            value={schade1Zone}
                            onChange={(e) => handleChangeSchade1Zone(e.target.value as VoertuigZone)}
                            className="bg-white border border-blue-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                          >
                            {VOERTUIG_ZONES.map(z => (
                              <option key={z} value={z}>
                                {ZONE_LABELS[z]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={handleSwapSchadeZones}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Wissel Schade 1 en Schade 2 om"
                          aria-label="Wissel Schade 1 en Schade 2 om"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>

                        <label className="inline-flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 rounded-lg px-2.5 py-1 text-xs">
                          <span className="font-bold text-indigo-800 whitespace-nowrap">Schade 2</span>
                          <select
                            aria-label="Zone voor Schade 2"
                            value={schade2Zone}
                            onChange={(e) => handleChangeSchade2Zone(e.target.value as VoertuigZone)}
                            className="bg-white border border-indigo-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                          >
                            {VOERTUIG_ZONES.map(z => (
                              <option key={z} value={z}>
                                {ZONE_LABELS[z]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {eenmaligePosten.length > 0 ? (
                        <span>
                          <strong className="text-slate-900">Foutgeheugen ({eenmaligePosten.length}×)</strong>{' '}
                          staat automatisch <strong>1× op {ZONE_LABELS[schade1Zone]}</strong>.
                        </span>
                      ) : (
                        <span>
                          Foutgeheugen uitlezen staat altijd <strong>1× op {ZONE_LABELS[schade1Zone]}</strong> (Schade 1).
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubView('table');
                        }}
                        className="text-blue-700 hover:text-blue-900 font-semibold underline underline-offset-2 ml-1 whitespace-nowrap"
                      >
                        Alle posities
                      </button>
                    </div>
                  </div>

                  {/* Simpele per-handeling selector voor overige handelingen (uitlijnen, tijdtoeslag hoofdbewerking, proefrit, etc.) */}
                  {overigeHandelingen.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Overige handelingen toewijzen per positie
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Kies per handeling (bijv. uitlijnen, tijdtoeslag hoofdbewerking of proefrit) of deze bij Schade 1 ({ZONE_LABELS[schade1Zone]}) of Schade 2 ({ZONE_LABELS[schade2Zone]}) hoort.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {overigeHandelingen.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAssignAllOverigeHandelingen('schade1')}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 transition-colors whitespace-nowrap"
                              >
                                Alles → Schade 1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignAllOverigeHandelingen('schade2')}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors whitespace-nowrap"
                              >
                                Alles → Schade 2
                              </button>
                            </>
                          )}
                          {openOverigeCount > 0 ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                              Nog {openOverigeCount} handeling{openOverigeCount === 1 ? '' : 'en'} kiezen
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Alle overige handelingen toegewezen
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg overflow-hidden">
                        {overigeHandelingen.map((item) => {
                          const assignedSchade1 = item.sectie === schade1Zone;
                          const assignedSchade2 = item.sectie === schade2Zone;
                          const itemAE =
                            (item.spuittijdAE || 0) +
                            (item.arbeidPlaatwerkAE || 0) +
                            (item.arbeidDemontageAE || 0);
                          const wpPerAE = data.tarieven.tariefPerAE || data.tarieven.plaatwerktarief / 10;
                          const spuitPerAE = data.tarieven.spuittarief / 10 || wpPerAE;
                          const itemBedrag =
                            (item.onderdeelPrijs || 0) > 0
                              ? item.onderdeelPrijs
                              : item.arbeidsloonBedrag !== undefined
                              ? item.arbeidsloonBedrag
                              : (item.spuittijdAE || 0) * spuitPerAE +
                                ((item.arbeidPlaatwerkAE || 0) + (item.arbeidDemontageAE || 0)) * wpPerAE;

                          return (
                            <div
                              key={item.id}
                              className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0">
                                  {item.code || 'OVERIG'}
                                </span>
                                <span className="font-semibold text-slate-900 truncate">
                                  {item.omschrijving}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                                  {itemAE > 0 ? `${formatAE(itemAE)} · ` : ''}
                                  {formatEuro(itemBedrag)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAssignOverigeHandeling(item.id, 'schade1')}
                                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors whitespace-nowrap ${
                                    assignedSchade1
                                      ? 'bg-blue-600 text-white border-blue-700'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Schade 1 ({ZONE_SHORT_LABELS[schade1Zone]})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAssignOverigeHandeling(item.id, 'schade2')}
                                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors whitespace-nowrap ${
                                    assignedSchade2
                                      ? 'bg-indigo-600 text-white border-indigo-700'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Schade 2 ({ZONE_SHORT_LABELS[schade2Zone]})
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Graphical Split Visuals: Blueprint & Cost/AE Charts */}
                {totalen && (
                  <SchadeVisuals
                    zones={totalen.zones}
                    actieveZones={totalen.actieveZones}
                    overig={totalen.overig}
                    totaal={totalen.totaal}
                    schade1Zone={schade1Zone}
                    schade2Zone={schade2Zone}
                    eenmaligePostenCount={eenmaligePosten.length}
                    onSelectZone={handleSelectZoneFromVisuals}
                  />
                )}

                {/* Executive KPI Cards */}
                {totalen && (
                  <KPICards
                    zones={totalen.zones}
                    actieveZones={totalen.actieveZones}
                    overig={totalen.overig}
                    totaal={totalen.totaal}
                    schade1Zone={schade1Zone}
                    schade2Zone={schade2Zone}
                    eenmaligePostenCount={eenmaligePosten.length}
                  />
                )}

                {/* RDW Voertuiggegevens, Marktvergelijking & ANWB Koerslijst */}
                {totalen && (
                  <RdwDagwaardeCard
                    rdw={data.rdw}
                    totaalSchadeBruto={totalen.totaal.totaalBruto}
                    kenteken={data.meta.kenteken}
                    merkModel={data.meta.merkModel}
                    bouwjaar={data.meta.bouwjaar}
                    kilometerstand={data.meta.kilometerstand}
                    onRefreshRdw={handleLookupPlate}
                    isLoading={isRdwLoading}
                    marktVergelijking={data.marktVergelijking}
                    isMarktLoading={isMarktLoading}
                    marktError={marktError}
                    onSearchMarkt={(p) => handleSearchMarkt(p)}
                  />
                )}

                {/* Sub View Switcher Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5 no-print">
                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setActiveSubView('report')}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeSubView === 'report'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Financieel Rapport
                    </button>

                    <button
                      onClick={() => setActiveSubView('table')}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeSubView === 'table'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Calculatieposities ({data.regels.length})
                    </button>

                    <button
                      onClick={() => setActiveSubView('aftrek')}
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeSubView === 'aftrek'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Aftrekcheck Meerdere Schades (TZ 143)
                    </button>
                  </div>

                  {totalen && (
                    <div className="text-xs text-slate-600 font-mono tabular-nums hidden sm:block">
                      Totaal schadebedrag <strong className="text-slate-900 font-bold">{formatEuro(totalen.totaal.totaalBruto)}</strong>
                    </div>
                  )}
                </div>

                {/* Active Sub View Content */}
                {totalen && activeSubView === 'report' && (
                  <FinancieelRapport
                    meta={data.meta}
                    tarieven={data.tarieven}
                    zones={totalen.zones}
                    actieveZones={totalen.actieveZones}
                    overig={totalen.overig}
                    totaal={totalen.totaal}
                    soleraInfo={totalen.soleraInfo}
                    methode={methode}
                    schade1Zone={schade1Zone}
                    schade2Zone={schade2Zone}
                    eenmaligePosten={eenmaligePosten.map(r => r.omschrijving)}
                    rdw={data.rdw}
                  />
                )}

                {totalen && activeSubView === 'table' && (
                  <CalculatieTabel
                    regels={data.regels}
                    onUpdateRegels={handleUpdateRegels}
                    spuittarief={data.tarieven.spuittarief}
                    schade1Zone={schade1Zone}
                    schade2Zone={schade2Zone}
                    onChangeSchade1Zone={handleChangeSchade1Zone}
                    onChangeSchade2Zone={handleChangeSchade2Zone}
                    requestedFilter={tableFilterRequest}
                  />
                )}

                {totalen && activeSubView === 'aftrek' && (
                  <AftrekCalculator
                    initialSchade1={calculatorInitialSchade1}
                    initialSchade2={calculatorInitialSchade2}
                    uurtarief={data.tarieven.spuittarief}
                    initialLaksysteem={dossierLaksysteem}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: ZELF REKENEN (AFTREKCHECK) */}
        {mainTab === 'calculator' && (
          <div className="max-w-5xl mx-auto py-2">
            <AftrekCalculator
              initialSchade1={calculatorInitialSchade1}
              initialSchade2={calculatorInitialSchade2}
              uurtarief={data?.tarieven.spuittarief || 94.00}
              initialLaksysteem={dossierLaksysteem}
            />
          </div>
        )}

        {/* VIEW 3: NASLAG AZT */}
        {mainTab === 'naslag' && (
          <div className="max-w-6xl mx-auto py-2">
            <AztNaslag />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="font-medium text-slate-700">
            Audatex Schade Calculatie Splitter · Solera AZT & RDW Open Data
          </span>
          <div className="flex flex-wrap items-center gap-2.5 text-slate-500">
            <span>1 AE = 6 min (10 AE = 1 uur)</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900">Developed by Danny Radjkoemar</span>
          </div>
        </div>
      </footer>

      {/* Solera Knowledge Base Modal */}
      <SoleraInfoModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />
    </div>
  );
}
