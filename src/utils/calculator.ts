import { 
  CalculatieRegel, 
  Tarieven, 
  SectieTotalen, 
  MateriaalconstanteMethode, 
  SectieType,
  Schade1Zone,
  VoertuigZone,
  VOERTUIG_ZONES,
  ZONE_LABELS,
  AudatexEindcalculatieData
} from '../types/audatex';

const ALL_SECTIES: SectieType[] = [...VOERTUIG_ZONES, 'overig'];

function round(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Verdeelt een totaalbedrag over willekeurig veel secties naar rato van gewichten
 * en zorgt dat de som op de cent nauwkeurig gelijk is aan het totaalbedrag.
 */
function distributeExact(total: number, weights: number[]): number[] {
  const shares = new Array<number>(weights.length).fill(0);
  const sumW = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total === 0 || sumW <= 0) {
    return shares;
  }

  let lastActiveIdx = -1;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] > 0) lastActiveIdx = i;
  }
  if (lastActiveIdx === -1) return shares;

  let running = 0;
  for (let i = 0; i < weights.length; i++) {
    if (i === lastActiveIdx) {
      shares[i] = round(total - running, 2);
    } else if (weights[i] > 0) {
      shares[i] = round(total * (weights[i] / sumW), 2);
      running = round(running + shares[i], 2);
    }
  }
  return shares;
}

export function berekenSectieTotalen(
  regels: CalculatieRegel[],
  tarieven: Tarieven,
  methode: MateriaalconstanteMethode,
  audatexEindcalculatie?: AudatexEindcalculatieData,
  schade1Zone: Schade1Zone = 'voorzijde',
  schade2ZoneParam?: VoertuigZone
): {
  voorzijde: SectieTotalen;
  achterzijde: SectieTotalen;
  overig: SectieTotalen;
  zones: Record<VoertuigZone, SectieTotalen>;
  actieveZones: VoertuigZone[];
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
} {
  const schade2Zone: VoertuigZone =
    schade2ZoneParam && schade2ZoneParam !== schade1Zone
      ? schade2ZoneParam
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';

  const schade1Label = `${ZONE_LABELS[schade1Zone]} (Schade 1)`;
  const schade2Label = `${ZONE_LABELS[schade2Zone]} (Schade 2)`;

  const getSectieLabel = (s: SectieType): string => {
    if (s === 'overig') return 'Overig / Algemeen';
    if (s === schade1Zone) return schade1Label;
    if (s === schade2Zone) return schade2Label;
    return ZONE_LABELS[s];
  };

  // Regels groeperen over alle 7 secties (6 voertuigzones + overig)
  const regelsPerSectie = ALL_SECTIES.map(s => regels.filter(r => r.sectie === s));
  const idxOf = (s: SectieType) => ALL_SECTIES.indexOf(s);
  const s1Idx = idxOf(schade1Zone);
  const s2Idx = idxOf(schade2Zone);

  const getSpuitAE = (r: CalculatieRegel) =>
    r.spuittijdAE !== undefined ? r.spuittijdAE : Math.round((r.spuittijdUren || 0) * 10);
  const getPlaatAE = (r: CalculatieRegel) =>
    r.arbeidPlaatwerkAE !== undefined ? r.arbeidPlaatwerkAE : Math.round((r.arbeidPlaatwerkUren || 0) * 10);
  const getDemAE = (r: CalculatieRegel) =>
    r.arbeidDemontageAE !== undefined ? r.arbeidDemontageAE : Math.round((r.arbeidDemontageUren || 0) * 10);

  // Spuittijden paneel per sectie (in AE: 10 AE = 1 uur)
  const spuitPaneelPerSectie = regelsPerSectie.map(list => list.reduce((sum, r) => sum + getSpuitAE(r), 0));
  const spuitPaneelTotaal = spuitPaneelPerSectie.reduce((s, v) => s + v, 0);

  // Bepaal actieve zones (altijd Schade 1 & Schade 2 als er >= 2 zones zijn, of alleen Schade 1 bij enkelvoudige calculatie)
  const computeActieveZones = (counts: number[]): VoertuigZone[] => {
    const populatedZones = VOERTUIG_ZONES.filter(z => counts[idxOf(z)] > 0);
    if (populatedZones.length <= 1) {
      return [populatedZones[0] ?? schade1Zone];
    }
    const ordered: VoertuigZone[] = [schade1Zone, schade2Zone];
    for (const z of VOERTUIG_ZONES) {
      if (z !== schade1Zone && z !== schade2Zone && counts[idxOf(z)] > 0) {
        ordered.push(z);
      }
    }
    return ordered;
  };

  // Verdeling materiaalconstante voor tekstuele adviezen & standaard rekenmethode
  const basisConstante = tarieven.materiaalconstante || 33.60;
  let stdConstPerSectie = new Array<number>(ALL_SECTIES.length).fill(0);
  let advies = '';
  let invoerTekst143 = '';

  switch (methode) {
    case 'solera_tz143': {
      stdConstPerSectie[s1Idx] = basisConstante;
      advies = `Conform Solera AZT-richtlijn: ${schade1Label} is aangemerkt als Schade 1 (incl. eenmalige diagnose-/voertuigposten en de hoofdmateriaalconstante € ${basisConstante.toFixed(2)}). Voor ${schade2Label} voorkomt Tekstzone 143 (-€ ${basisConstante.toFixed(2)}) dubbele vergoeding; bij één complete calculatie voorkomt Tekstzone 95 dubbele telling.`;
      invoerTekst143 = `TZ 143 (${schade2Label}): Aftrek spuitbedrag -${basisConstante.toFixed(2)} EUR (Voorkomen dubbele AZT materiaalconstante ivm gecombineerde spuitdoorgang met ${schade1Label})`;
      break;
    }

    case 'proportioneel_spuittijd': {
      if (spuitPaneelTotaal > 0) {
        stdConstPerSectie = distributeExact(basisConstante, spuitPaneelPerSectie);
      } else {
        stdConstPerSectie[s1Idx] = round(basisConstante / 2, 2);
        stdConstPerSectie[s2Idx] = round(basisConstante - stdConstPerSectie[s1Idx], 2);
      }
      const p1 = spuitPaneelTotaal > 0 ? ((spuitPaneelPerSectie[s1Idx] / spuitPaneelTotaal) * 100).toFixed(1) : '50.0';
      const p2 = spuitPaneelTotaal > 0 ? ((spuitPaneelPerSectie[s2Idx] / spuitPaneelTotaal) * 100).toFixed(1) : '50.0';
      advies = `Proportioneel per materiaalsoort (AE): Materiaalconstante (€ ${basisConstante.toFixed(2)}) is naar rato van paneel-spuit-AE verdeeld (${ZONE_LABELS[schade1Zone]}: ${p1}%, ${ZONE_LABELS[schade2Zone]}: ${p2}%).`;
      invoerTekst143 = `TZ 143: Proportionele verdeling per materiaalsoort (${ZONE_LABELS[schade1Zone]}: €${stdConstPerSectie[s1Idx].toFixed(2)}, ${ZONE_LABELS[schade2Zone]}: €${stdConstPerSectie[s2Idx].toFixed(2)})`;
      break;
    }

    case 'fifty_fifty': {
      const paintZones = VOERTUIG_ZONES.filter(z => spuitPaneelPerSectie[idxOf(z)] > 0);
      const targetZones = paintZones.length >= 2 ? paintZones : [schade1Zone, schade2Zone];
      const eqWeights = ALL_SECTIES.map(s => (s !== 'overig' && targetZones.includes(s as VoertuigZone) ? 1 : 0));
      stdConstPerSectie = distributeExact(basisConstante, eqWeights);
      advies = `Gelijkmatige verdeling: De materiaalconstante (€ ${basisConstante.toFixed(2)}) wordt gelijk verdeeld over ${targetZones.map(z => ZONE_LABELS[z]).join(' & ')}; eenmalige diagnoseposten staan op ${schade1Label}.`;
      invoerTekst143 = `TZ 143: Aftrek 50% materiaalconstante -${stdConstPerSectie[s2Idx].toFixed(2)} EUR ivm gesplitste calculatie (${ZONE_LABELS[schade1Zone]} / ${ZONE_LABELS[schade2Zone]})`;
      break;
    }

    case 'beide_volledig': {
      const paintZones = VOERTUIG_ZONES.filter(z => spuitPaneelPerSectie[idxOf(z)] > 0);
      const targetZones = paintZones.length >= 2 ? paintZones : [schade1Zone, schade2Zone];
      targetZones.forEach(z => {
        stdConstPerSectie[idxOf(z)] = basisConstante;
      });
      advies = `Let op: Meerdere schadezones (${targetZones.map(z => ZONE_LABELS[z]).join(' & ')}) bevatten de volledige materiaalconstante (€ ${basisConstante.toFixed(2)}). Indien de auto in één spuitgang wordt behandeld, adviseert Solera TZ 143 aftrek op ${schade2Label}.`;
      invoerTekst143 = 'Geen aftrek toegepast (Beide calculaties dragen onafhankelijk de volledige constante).';
      break;
    }
  }

  // =========================================================================
  // 1. DYNAMISCHE BEREKENING O.B.V. OFFICIËLE AUDATEX EINDCALCULATIE
  // =========================================================================
  if (audatexEindcalculatie && audatexEindcalculatie.totaalExclBtw > 0) {
    const {
      onderdelenNetto,
      arbeidNetto,
      bijkomendNetto,
      spuitwerkNetto,
      milieuNetto,
      totaalExclBtw,
      btwBedrag,
      totaalInclBtw
    } = audatexEindcalculatie;

    const tariefPerAE = tarieven.tariefPerAE || (tarieven.plaatwerktarief / 10) || 8.81;
    const btwRate = (tarieven.btwPercentage || 21.0) / 100;

    // 1. Onderdelen splitsing (netto excl. kleinmateriaal: bruto - korting%; kleinmateriaal apart)
    const isOnderdeel = (r: CalculatieRegel) =>
      r.itemType === 'onderdeel' || (r.itemType !== 'bijkomend' && r.onderdeelPrijs > 0);
    const brutoPerSectie = regelsPerSectie.map(list =>
      round(list.filter(isOnderdeel).reduce((s, r) => s + r.onderdeelPrijs, 0), 2)
    );
    const brutoTotaal = round(brutoPerSectie.reduce((s, v) => s + v, 0), 2);

    const kleinMateriaalNetto =
      audatexEindcalculatie.kleinMateriaal !== undefined &&
      audatexEindcalculatie.kleinMateriaal > 0 &&
      onderdelenNetto > audatexEindcalculatie.kleinMateriaal
        ? round(audatexEindcalculatie.kleinMateriaal, 2)
        : 0;
    const onderdelenExclKleinTotaal = round(onderdelenNetto - kleinMateriaalNetto, 2);

    const kortingPerc = tarieven.onderdelenKortingPerc || 0;
    let onderdelenPerSectie: number[];
    if (kortingPerc > 0 && brutoTotaal > 0) {
      const approx = brutoPerSectie.map(b => round(b * (1 - kortingPerc / 100), 2));
      const approxSum = round(approx.reduce((s, v) => s + v, 0), 2);
      const diff = round(onderdelenExclKleinTotaal - approxSum, 2);
      if (Math.abs(diff) <= 0.05) {
        let maxIdx = 0;
        for (let i = 1; i < brutoPerSectie.length; i++) {
          if (brutoPerSectie[i] > brutoPerSectie[maxIdx]) maxIdx = i;
        }
        approx[maxIdx] = round(approx[maxIdx] + diff, 2);
        onderdelenPerSectie = approx;
      } else {
        onderdelenPerSectie = distributeExact(onderdelenExclKleinTotaal, brutoPerSectie);
      }
    } else {
      onderdelenPerSectie = distributeExact(onderdelenExclKleinTotaal, brutoPerSectie);
    }

    const kleinMateriaalPerSectie = distributeExact(kleinMateriaalNetto, onderdelenPerSectie);

    // 2. Werkplaats-Arbeidsloon splitsing (PL + DM + DIV)
    const plaatAEPerSectie = regelsPerSectie.map(list => list.reduce((s, r) => s + getPlaatAE(r), 0));
    const demAEPerSectie = regelsPerSectie.map(list => list.reduce((s, r) => s + getDemAE(r), 0));

    const rawArbBedrag = (list: CalculatieRegel[]) =>
      list
        .filter(r => r.itemType !== 'spuitwerk' && (getPlaatAE(r) + getDemAE(r)) > 0)
        .reduce((s, r) => s + (r.arbeidsloonBedrag ?? (getPlaatAE(r) + getDemAE(r)) * tariefPerAE), 0);

    const arbeidPerSectie = distributeExact(arbeidNetto, regelsPerSectie.map(rawArbBedrag));
    const plaatBedragPerSectie: number[] = [];
    const demBedragPerSectie: number[] = [];

    for (let i = 0; i < ALL_SECTIES.length; i++) {
      const [pl, dm] = distributeExact(arbeidPerSectie[i], [plaatAEPerSectie[i], demAEPerSectie[i]]);
      plaatBedragPerSectie.push(pl);
      demBedragPerSectie.push(dm);
    }

    // 3. Bijkomende kosten (TZ 60-74)
    const getBijk = (list: CalculatieRegel[]) =>
      list.filter(r => r.itemType === 'bijkomend').reduce((s, r) => s + (r.onderdeelPrijs || 0), 0);
    const bijkWeights = regelsPerSectie.map(getBijk);
    const hasBijkWeights = bijkWeights.some(w => w > 0);
    const bijkomendPerSectie = distributeExact(
      bijkomendNetto,
      hasBijkWeights ? bijkWeights : regelsPerSectie.map(list => list.length)
    );

    // 4. Spuitwerk (Spuitarbeid + Spuitmateriaal inclusief AZT-voorbereidingstijd & materiaalconstante)
    const spuitTariefPerAE = (tarieven.spuittarief ? tarieven.spuittarief / 10 : 0) || tariefPerAE;
    const spuitarbeidNetto =
      audatexEindcalculatie.spuitarbeidNetto !== undefined && audatexEindcalculatie.spuitarbeidNetto > 0
        ? audatexEindcalculatie.spuitarbeidNetto
        : round((audatexEindcalculatie.spuitLoonTotaalAE || spuitPaneelTotaal) * spuitTariefPerAE, 2);
    const spuitmateriaalNetto = round(spuitwerkNetto - spuitarbeidNetto, 2);

    const sumSpuitByMat = (list: CalculatieRegel[], mat: 'metaal' | 'kunststof') =>
      list.filter(r => (r.materiaalSoort || 'metaal') === mat).reduce((s, r) => s + getSpuitAE(r), 0);

    const metaalAEPerSectie = regelsPerSectie.map(list => sumSpuitByMat(list, 'metaal'));
    const metaalAETotaal = metaalAEPerSectie.reduce((s, v) => s + v, 0);

    const kunstAEPerSectie = regelsPerSectie.map(list => sumSpuitByMat(list, 'kunststof'));
    const kunstAETotaal = kunstAEPerSectie.reduce((s, v) => s + v, 0);

    const vbMetaalAE = audatexEindcalculatie.spuitVoorbereidingMetaalAE || 0;
    const vbKunstAE = audatexEindcalculatie.spuitVoorbereidingKunststofAE || 0;
    const vbMeerAE = audatexEindcalculatie.spuitVoorbereidingMeerlagenAE || 0;
    const totalReportSpuitAE =
      audatexEindcalculatie.spuitLoonTotaalAE ||
      (spuitPaneelTotaal + vbMetaalAE + vbKunstAE + vbMeerAE);
    const overigeVbAE = Math.max(0, totalReportSpuitAE - spuitPaneelTotaal - vbMetaalAE - vbKunstAE - vbMeerAE);

    const priorityOrder: number[] = [
      s1Idx,
      s2Idx,
      ...ALL_SECTIES.map((_, i) => i).filter(i => i !== s1Idx && i !== s2Idx)
    ];

    const pickOwner = (val: number, aeList: number[]): number[] => {
      const out = new Array<number>(ALL_SECTIES.length).fill(0);
      if (val <= 0) return out;
      for (const idx of priorityOrder) {
        if (aeList[idx] > 0) {
          out[idx] = val;
          return out;
        }
      }
      out[s1Idx] = val;
      return out;
    };

    let vbMetaalPerSectie: number[];
    let vbKunstPerSectie: number[];
    let vbMeerPerSectie: number[];

    if (methode === 'solera_tz143') {
      // Solera Richtlijn TZ 143 / TZ 95: hoofdvoorbereidingstijd hoort bij Schade 1 (zodat Schade 1 gelijkloopt aan losse calculatie en Schade 2 via TZ 143 geen dubbele voorbereiding krijgt)
      vbMetaalPerSectie = pickOwner(vbMetaalAE, metaalAETotaal > 0 ? metaalAEPerSectie : spuitPaneelPerSectie);
      vbKunstPerSectie = pickOwner(vbKunstAE, kunstAETotaal > 0 ? kunstAEPerSectie : spuitPaneelPerSectie);
      vbMeerPerSectie = pickOwner(vbMeerAE + overigeVbAE, spuitPaneelPerSectie);
    } else {
      vbMetaalPerSectie = metaalAEPerSectie.map(ae => (metaalAETotaal > 0 ? vbMetaalAE * (ae / metaalAETotaal) : 0));
      vbKunstPerSectie = kunstAEPerSectie.map(ae => (kunstAETotaal > 0 ? vbKunstAE * (ae / kunstAETotaal) : 0));
      vbMeerPerSectie = spuitPaneelPerSectie.map(ae => (spuitPaneelTotaal > 0 ? (vbMeerAE + overigeVbAE) * (ae / spuitPaneelTotaal) : 0));
    }

    const spuitTotaalAERawPerSectie = ALL_SECTIES.map((_, i) =>
      spuitPaneelPerSectie[i] +
      vbMetaalPerSectie[i] +
      vbKunstPerSectie[i] +
      vbMeerPerSectie[i]
    );
    const spuitTotaalAEPerSectie = spuitTotaalAERawPerSectie.map(v => round(v, 1));
    const spuitTotaalAESom = round(spuitTotaalAERawPerSectie.reduce((s, v) => s + v, 0), 1);

    const spuitArbeidPerSectie = distributeExact(spuitarbeidNetto, spuitTotaalAERawPerSectie);

    // Verdeel Spuitmateriaal = Variabele lakkosten + Materiaalconstanten (Metaal / Kunststof / Meerlagen)
    const indexFactor = (audatexEindcalculatie.materiaalIndexPerc ?? 100) / 100;
    const constMetaalNet = round((audatexEindcalculatie.materiaalConstanteMetaal || 0) * indexFactor, 2);
    const constKunstNet = round((audatexEindcalculatie.materiaalConstanteKunststof || 0) * indexFactor, 2);
    const constMeerNet = round((audatexEindcalculatie.materiaalConstanteMeerlagen || 0) * indexFactor, 2);
    const totaleConstanteNet = round(constMetaalNet + constKunstNet + constMeerNet, 2);

    const actieveZones = computeActieveZones(regelsPerSectie.map(l => l.length));
    const isSingleZoneCalc = actieveZones.length <= 1;

    let constMatPerSectie = new Array<number>(ALL_SECTIES.length).fill(0);
    let extraConstanteVoorDubbel = 0;

    if (totaleConstanteNet > 0) {
      if (methode === 'beide_volledig') {
        for (let i = 0; i < VOERTUIG_ZONES.length; i++) {
          if (spuitPaneelPerSectie[i] > 0) {
            constMatPerSectie[i] = totaleConstanteNet;
          }
        }
        const toegekendeSom = round(constMatPerSectie.reduce((s, v) => s + v, 0), 2);
        extraConstanteVoorDubbel = round(Math.max(0, toegekendeSom - totaleConstanteNet), 2);

        const activePaintZones = VOERTUIG_ZONES.filter((_, i) => spuitPaneelPerSectie[i] > 0);
        if (isSingleZoneCalc || activePaintZones.length <= 1) {
          const singleZ = activePaintZones[0] ?? actieveZones[0] ?? schade1Zone;
          advies = `Enkelvoudige calculatie (${ZONE_LABELS[singleZ]}): volledige materiaalconstante (€ ${totaleConstanteNet.toFixed(2)}) wordt toegekend.`;
          invoerTekst143 = `Geen TZ 143 aftrek nodig (één actieve spuitzone: ${ZONE_LABELS[singleZ]}).`;
        } else {
          advies = `Let op: Alle actieve spuitzones (${activePaintZones.map(z => ZONE_LABELS[z]).join(' & ')}) dragen de volledige materiaalconstante (€ ${totaleConstanteNet.toFixed(2)}). Indien de auto in één spuitgang wordt behandeld, adviseert Solera TZ 143 aftrek op ${schade2Label}.`;
          invoerTekst143 = 'Geen aftrek toegepast (Beide calculaties dragen onafhankelijk de volledige constante).';
        }
      } else if (methode === 'fifty_fifty') {
        const activeSpuit = ALL_SECTIES.map((_, i) => (spuitPaneelPerSectie[i] > 0 ? 1 : 0));
        const hasAny = activeSpuit.some(v => v > 0);
        constMatPerSectie = distributeExact(
          totaleConstanteNet,
          hasAny ? activeSpuit : ALL_SECTIES.map((_, i) => (i === s1Idx || i === s2Idx ? 1 : 0))
        );
        const paintZones = VOERTUIG_ZONES.filter(z => spuitPaneelPerSectie[idxOf(z)] > 0);
        if (isSingleZoneCalc || paintZones.length <= 1) {
          const singleZ = paintZones[0] ?? actieveZones[0] ?? schade1Zone;
          advies = `Enkelvoudige calculatie (${ZONE_LABELS[singleZ]}): volledige materiaalconstante (€ ${totaleConstanteNet.toFixed(2)}) toegekend.`;
          invoerTekst143 = `Geen TZ 143 aftrek nodig (${ZONE_LABELS[singleZ]}: € ${constMatPerSectie[idxOf(singleZ)].toFixed(2)}).`;
        } else {
          advies = `Gelijkmatige verdeling: De materiaalconstante (€ ${totaleConstanteNet.toFixed(2)}) wordt gelijk verdeeld over ${paintZones.map(z => `${ZONE_LABELS[z]} € ${constMatPerSectie[idxOf(z)].toFixed(2)}`).join(' & ')}; eenmalige diagnoseposten staan op ${schade1Label}.`;
          invoerTekst143 = `TZ 143: Aftrek 50% materiaalconstante -${constMatPerSectie[s2Idx].toFixed(2)} EUR ivm gesplitste calculatie (${ZONE_LABELS[schade1Zone]} / ${ZONE_LABELS[schade2Zone]})`;
        }
      } else if (methode === 'proportioneel_spuittijd') {
        // Per materiaalsoort apart verdelen:
        // Formule: Materiaalconstante van dat materiaal (netto) ÷ Totale paneel-spuit-AE van datzelfde materiaal × Paneel-AE in zone
        const constMetaalShares =
          constMetaalNet > 0
            ? distributeExact(constMetaalNet, metaalAETotaal > 0 ? metaalAEPerSectie : spuitPaneelPerSectie)
            : new Array<number>(ALL_SECTIES.length).fill(0);
        const constKunstShares =
          constKunstNet > 0
            ? distributeExact(constKunstNet, kunstAETotaal > 0 ? kunstAEPerSectie : spuitPaneelPerSectie)
            : new Array<number>(ALL_SECTIES.length).fill(0);
        const constMeerShares =
          constMeerNet > 0
            ? distributeExact(constMeerNet, spuitPaneelPerSectie)
            : new Array<number>(ALL_SECTIES.length).fill(0);

        for (let i = 0; i < ALL_SECTIES.length; i++) {
          constMatPerSectie[i] = round(constMetaalShares[i] + constKunstShares[i] + constMeerShares[i], 2);
        }

        const populatedZ = VOERTUIG_ZONES.filter(z => regelsPerSectie[idxOf(z)].length > 0);
        const displayZones: VoertuigZone[] =
          populatedZ.length >= 2
            ? [
                schade1Zone,
                schade2Zone,
                ...populatedZ.filter(z => z !== schade1Zone && z !== schade2Zone)
              ].filter((z, idx, arr) => arr.indexOf(z) === idx)
            : [populatedZ[0] ?? schade1Zone];

        const indexTag = indexFactor !== 1 ? ` (${(indexFactor * 100).toFixed(0)}% index)` : '';
        const formatMatFormule = (
          naam: string,
          constNet: number,
          aePerSectie: number[],
          aeTotaal: number,
          shares: number[]
        ) => {
          const gebruiktTotaal = aeTotaal > 0 ? aeTotaal : spuitPaneelTotaal;
          const gebruikteAE = aeTotaal > 0 ? aePerSectie : spuitPaneelPerSectie;
          if (constNet <= 0 || gebruiktTotaal <= 0) return '';
          const perAE = constNet / gebruiktTotaal;
          const zoneDelen = displayZones.map(z => {
            const zi = idxOf(z);
            return `${ZONE_LABELS[z]} × ${gebruikteAE[zi]} AE = € ${shares[zi].toFixed(2)}`;
          });
          return `${naam}: € ${constNet.toFixed(2)}${indexTag} ÷ ${gebruiktTotaal} AE = € ${perAE.toFixed(3)}/AE (${zoneDelen.join(', ')})`;
        };

        const formuleDelen = [
          formatMatFormule('Metaal', constMetaalNet, metaalAEPerSectie, metaalAETotaal, constMetaalShares),
          formatMatFormule('Kunststof', constKunstNet, kunstAEPerSectie, kunstAETotaal, constKunstShares),
          formatMatFormule('Meerlagen', constMeerNet, spuitPaneelPerSectie, spuitPaneelTotaal, constMeerShares)
        ].filter(Boolean);

        if (formuleDelen.length > 0) {
          const zoneSamenvatting = displayZones
            .map(z => `${ZONE_LABELS[z]} € ${constMatPerSectie[idxOf(z)].toFixed(2)}`)
            .join(' • ');
          advies = `Formule per materiaalsoort (constante ÷ spuit-AE × gebruikte spuit-AE): ${formuleDelen.join(' | ')}.`;
          invoerTekst143 = `TZ 143 (Per materiaalsoort): ${zoneSamenvatting} (${formuleDelen.join('; ')})`;
        }
      } else {
        // Solera TZ 143: per materiaalsoort maximaal 1x toewijzen met prioriteit Schade 1 -> Schade 2 -> overige actieve zones -> overig
        const mOwner = pickOwner(constMetaalNet, metaalAETotaal > 0 ? metaalAEPerSectie : spuitPaneelPerSectie);
        const kOwner = pickOwner(constKunstNet, kunstAETotaal > 0 ? kunstAEPerSectie : spuitPaneelPerSectie);
        const mlOwner = pickOwner(constMeerNet, spuitPaneelPerSectie);

        for (let i = 0; i < ALL_SECTIES.length; i++) {
          constMatPerSectie[i] = round(mOwner[i] + kOwner[i] + mlOwner[i], 2);
        }

        const cS1 = constMatPerSectie[s1Idx];
        const cS2 = constMatPerSectie[s2Idx];
        if (isSingleZoneCalc) {
          advies = `Enkelvoudige calculatie (${ZONE_LABELS[actieveZones[0]]}): hoofdvoorbereiding en volledige materiaalconstante (€ ${totaleConstanteNet.toFixed(2)}) zijn 100% toegewezen aan ${ZONE_LABELS[actieveZones[0]]}.`;
          invoerTekst143 = `Geen TZ 143 aftrek nodig (enkelvoudige calculatie: ${ZONE_LABELS[actieveZones[0]]}).`;
        } else {
          const aftrekBedrag = round(Math.max(0, totaleConstanteNet - cS2), 2);
          advies = `Conform Solera AZT-richtlijn: ${schade1Label} krijgt de hoofdvoorbereidingstijd en € ${cS1.toFixed(2)} materiaalconstante${cS2 > 0 ? ` (${schade2Label}: € ${cS2.toFixed(2)} voor eigen materiaalsoort)` : ''}. Voor ${schade2Label} voorkomt TZ 143 (-€ ${aftrekBedrag.toFixed(2)}) dubbele vergoeding; gecombineerde Audatex-materiaalposten (zoals SPUITEN NA HERST.) worden naar rato van spuit-AE verdeeld.`;
          invoerTekst143 = `TZ 143 (${schade2Label}): Aftrek spuitbedrag -${aftrekBedrag.toFixed(2)} EUR (Voorkomen dubbele AZT voorbereiding/materiaalconstante ivm gecombineerde spuitgang met ${schade1Label})`;
        }
      }
    } else if (isSingleZoneCalc) {
      advies = `Enkelvoudige calculatie (${ZONE_LABELS[actieveZones[0]]}): alle posities en tarieven zijn volledig toegewezen aan ${ZONE_LABELS[actieveZones[0]]}.`;
      invoerTekst143 = `Geen TZ 143 aftrek nodig (enkelvoudige calculatie: ${ZONE_LABELS[actieveZones[0]]}).`;
    }

    const spuitMateriaalBasisTotaal = round(spuitmateriaalNetto - totaleConstanteNet, 2);
    const spuitmateriaalMetMethode = round(spuitmateriaalNetto + extraConstanteVoorDubbel, 2);
    const totaleConstanteMetMethode = round(constMatPerSectie.reduce((s, v) => s + v, 0), 2);

    // Variabele spuitmateriaalkosten verdelen naar rato van spuitposten (met onderscheid VERN->SV1/SV2 vs HERST->SH/HERSTELSP. én materiaalsoort)
    const matBasisPerSectie = new Array<number>(ALL_SECTIES.length).fill(0);

    if (audatexEindcalculatie.spuitMateriaalPosten && audatexEindcalculatie.spuitMateriaalPosten.length > 0) {
      const matchesCat = (r: CalculatieRegel, cat: string) => {
        if (r.itemType !== 'spuitwerk') return false;
        if (cat === 'vern') return r.bewerking === 'SP';
        if (cat === 'herst') return r.bewerking === 'SPH';
        if (cat === 'uitspuiten') return r.bewerking === 'UITSP';
        if (cat === 'deklaag') return r.bewerking === 'SP' || r.bewerking === 'UITSP';
        return r.bewerking === 'DIV' || r.bewerking === 'LS';
      };

      const computePostWeights = (post: { categorie: string; omschrijving: string; spuitFase?: string; materiaalSoort?: 'metaal' | 'kunststof' }) => {
        const isPostKunst = (post.omschrijving || '').toUpperCase().includes('KUNSTSTOF');

        if (post.spuitFase && /^SV[1-4]$/.test(post.spuitFase)) {
          const faseW = regelsPerSectie.map(list =>
            list
              .filter(r => matchesCat(r, post.categorie) && (r.spuitFase || '').toUpperCase() === post.spuitFase)
              .reduce((s, r) => s + getSpuitAE(r), 0)
          );
          if (faseW.some(v => v > 0)) return faseW;
        }
        if (post.categorie === 'vern' && !post.spuitFase) {
          const nonSvW = regelsPerSectie.map(list =>
            list
              .filter(r => matchesCat(r, 'vern') && !/^SV[1-4]$/.test((r.spuitFase || '').toUpperCase()))
              .reduce((s, r) => s + getSpuitAE(r), 0)
          );
          if (nonSvW.some(v => v > 0)) return nonSvW;
        }
        if (post.categorie === 'herst') {
          const herstW = regelsPerSectie.map(list =>
            list
              .filter(
                r =>
                  matchesCat(r, 'herst') &&
                  (r.omschrijving || '').toUpperCase().includes('KUNSTSTOF') === isPostKunst
              )
              .reduce((s, r) => s + getSpuitAE(r), 0)
          );
          if (herstW.some(v => v > 0)) return herstW;
        }
        if (post.materiaalSoort) {
          const matW = regelsPerSectie.map(list =>
            list
              .filter(r => matchesCat(r, post.categorie) && (r.materiaalSoort || 'metaal') === post.materiaalSoort)
              .reduce((s, r) => s + getSpuitAE(r), 0)
          );
          if (matW.some(v => v > 0)) return matW;
        }
        const catW = regelsPerSectie.map(list =>
          list.filter(r => matchesCat(r, post.categorie)).reduce((s, r) => s + getSpuitAE(r), 0)
        );
        return catW.some(v => v > 0) ? catW : spuitPaneelPerSectie;
      };

      let sumCatAssigned = 0;
      for (const post of audatexEindcalculatie.spuitMateriaalPosten) {
        const scaledPostNet = round(post.bedragBruto * indexFactor, 2);
        const parts = distributeExact(scaledPostNet, computePostWeights(post));
        for (let i = 0; i < ALL_SECTIES.length; i++) {
          matBasisPerSectie[i] = round(matBasisPerSectie[i] + parts[i], 2);
          sumCatAssigned = round(sumCatAssigned + parts[i], 2);
        }
      }

      const diff = round(spuitMateriaalBasisTotaal - sumCatAssigned, 2);
      if (Math.abs(diff) > 0) {
        const diffParts = distributeExact(diff, spuitPaneelPerSectie);
        for (let i = 0; i < ALL_SECTIES.length; i++) {
          matBasisPerSectie[i] = round(matBasisPerSectie[i] + diffParts[i], 2);
        }
      }
    } else {
      const fallbackParts = distributeExact(spuitMateriaalBasisTotaal, spuitPaneelPerSectie);
      for (let i = 0; i < ALL_SECTIES.length; i++) {
        matBasisPerSectie[i] = fallbackParts[i];
      }
    }

    const spuitMatTotaalPerSectie = ALL_SECTIES.map((_, i) =>
      round(matBasisPerSectie[i] + constMatPerSectie[i], 2)
    );

    // 5. Milieutoeslag splitsing (exact naar rato van totale AE)
    const aeTotaalPerSectie = ALL_SECTIES.map(
      (_, i) => plaatAEPerSectie[i] + demAEPerSectie[i] + spuitTotaalAEPerSectie[i]
    );
    const aeTotaalSom = round(aeTotaalPerSectie.reduce((s, v) => s + v, 0), 1);
    const milieuPerSectie = distributeExact(milieuNetto, aeTotaalPerSectie);

    // 6. Subtotalen Netto per sectie
    const subPerSectie = ALL_SECTIES.map((_, i) =>
      round(
        onderdelenPerSectie[i] +
          kleinMateriaalPerSectie[i] +
          arbeidPerSectie[i] +
          spuitArbeidPerSectie[i] +
          spuitMatTotaalPerSectie[i] +
          bijkomendPerSectie[i] +
          milieuPerSectie[i],
        2
      )
    );
    const subSom = round(subPerSectie.reduce((s, v) => s + v, 0), 2);
    const matchesAudatexNet = extraConstanteVoorDubbel === 0 && Math.abs(subSom - totaalExclBtw) <= 0.02;
    const subTotaal = matchesAudatexNet ? totaalExclBtw : subSom;

    // 7. BTW berekening
    const totaalBtwVal = btwBedrag > 0 && matchesAudatexNet ? btwBedrag : round(subTotaal * btwRate, 2);
    const btwPerSectie = distributeExact(totaalBtwVal, subPerSectie);

    // 8. Totalen Bruto per sectie
    const totPerSectie = ALL_SECTIES.map((_, i) => round(subPerSectie[i] + btwPerSectie[i], 2));
    const totTotaal =
      matchesAudatexNet && totaalInclBtw > 0
        ? totaalInclBtw
        : round(totPerSectie.reduce((s, v) => s + v, 0), 2);

    const pct = (val: number) => (totTotaal > 0 ? round((val / totTotaal) * 100, 1) : 0);

    const buildSectieTotal = (i: number): SectieTotalen => {
      const s = ALL_SECTIES[i];
      return {
        sectie: s,
        label: getSectieLabel(s),
        itemsCount: regelsPerSectie[i].length,
        spuittijdAE: round(spuitTotaalAEPerSectie[i], 1),
        arbeidPlaatwerkAE: round(plaatAEPerSectie[i], 1),
        arbeidDemontageAE: round(demAEPerSectie[i], 1),
        arbeidTotaalAE: round(aeTotaalPerSectie[i], 1),
        spuittijdUren: round(spuitTotaalAEPerSectie[i] / 10, 2),
        arbeidPlaatwerkUren: round(plaatAEPerSectie[i] / 10, 2),
        arbeidDemontageUren: round(demAEPerSectie[i] / 10, 2),
        arbeidTotaalUren: round(aeTotaalPerSectie[i] / 10, 2),
        bedragPlaatwerk: plaatBedragPerSectie[i],
        bedragDemontage: demBedragPerSectie[i],
        bedragSpuitarbeid: spuitArbeidPerSectie[i],
        bedragTotaalArbeid: round(arbeidPerSectie[i] + spuitArbeidPerSectie[i], 2),
        bedragOnderdelen: onderdelenPerSectie[i],
        bedragOnderdelenBruto: brutoPerSectie[i],
        kortingOnderdelen: round(brutoPerSectie[i] - onderdelenPerSectie[i], 2),
        kleinMateriaalOnderdelen: kleinMateriaalPerSectie[i],
        bedragBijkomend: bijkomendPerSectie[i],
        bedragSpuitmateriaalBasis: matBasisPerSectie[i],
        bedragMateriaalconstante: constMatPerSectie[i],
        bedragSpuitmateriaalTotaal: spuitMatTotaalPerSectie[i],
        bedragKleinMateriaal: kleinMateriaalPerSectie[i],
        bedragMilieu: milieuPerSectie[i],
        subtotaalNetto: subPerSectie[i],
        btwBedrag: btwPerSectie[i],
        totaalBruto: totPerSectie[i],
        percentageVanTotaal: pct(totPerSectie[i])
      };
    };

    const allSectieTotals = ALL_SECTIES.map((_, i) => buildSectieTotal(i));
    const zones = VOERTUIG_ZONES.reduce((acc, z) => {
      acc[z] = allSectieTotals[idxOf(z)];
      return acc;
    }, {} as Record<VoertuigZone, SectieTotalen>);

    const constantenPerZone = VOERTUIG_ZONES.reduce((acc, z) => {
      acc[z] = constMatPerSectie[idxOf(z)];
      return acc;
    }, {} as Record<VoertuigZone, number>);

    const totaalPlaatAE = plaatAEPerSectie.reduce((s, v) => s + v, 0);
    const totaalDemAE = demAEPerSectie.reduce((s, v) => s + v, 0);

    const totaal: SectieTotalen = {
      sectie: 'totaal',
      label: 'Totale Audatex Eindcalculatie',
      itemsCount: regels.length,
      spuittijdAE: round(spuitTotaalAESom, 1),
      arbeidPlaatwerkAE: round(totaalPlaatAE, 1),
      arbeidDemontageAE: round(totaalDemAE, 1),
      arbeidTotaalAE: round(aeTotaalSom, 1),
      spuittijdUren: round(spuitTotaalAESom / 10, 2),
      arbeidPlaatwerkUren: round(totaalPlaatAE / 10, 2),
      arbeidDemontageUren: round(totaalDemAE / 10, 2),
      arbeidTotaalUren: round(aeTotaalSom / 10, 2),
      bedragPlaatwerk: round(plaatBedragPerSectie.reduce((s, v) => s + v, 0), 2),
      bedragDemontage: round(demBedragPerSectie.reduce((s, v) => s + v, 0), 2),
      bedragSpuitarbeid: spuitarbeidNetto,
      bedragTotaalArbeid: round(arbeidNetto + spuitarbeidNetto, 2),
      bedragOnderdelen: onderdelenExclKleinTotaal,
      bedragOnderdelenBruto: audatexEindcalculatie.onderdelenBruto || brutoTotaal,
      kortingOnderdelen:
        audatexEindcalculatie.onderdelenKorting ||
        round((audatexEindcalculatie.onderdelenBruto || brutoTotaal) - onderdelenExclKleinTotaal, 2),
      kleinMateriaalOnderdelen: kleinMateriaalNetto,
      bedragBijkomend: bijkomendNetto,
      bedragSpuitmateriaalBasis: spuitMateriaalBasisTotaal,
      bedragMateriaalconstante: totaleConstanteMetMethode,
      bedragSpuitmateriaalTotaal: spuitmateriaalMetMethode,
      bedragKleinMateriaal: kleinMateriaalNetto,
      bedragMilieu: milieuNetto,
      subtotaalNetto: subTotaal,
      btwBedrag: totaalBtwVal,
      totaalBruto: totTotaal,
      percentageVanTotaal: 100
    };

    return {
      voorzijde: zones.voorzijde,
      achterzijde: zones.achterzijde,
      overig: allSectieTotals[idxOf('overig')],
      zones,
      actieveZones,
      totaal,
      soleraInfo: {
        constanteVoor: constMatPerSectie[idxOf('voorzijde')],
        constanteAchter: constMatPerSectie[idxOf('achterzijde')],
        constanteOverig: constMatPerSectie[idxOf('overig')],
        constanteSchade1: constMatPerSectie[s1Idx],
        constanteSchade2: constMatPerSectie[s2Idx],
        constantenPerZone,
        invoerTekst143,
        advies
      }
    };
  }

  // =========================================================================
  // 2. STANDAARD REKENMETHODE (indien geen officiële Audatex eindcalculatie aanwezig)
  // =========================================================================
  function berekenEnkeleSectie(
    sectieKey: SectieType | 'totaal',
    label: string,
    sectieRegels: CalculatieRegel[],
    toegekendeConstante: number,
    milieuDeel: number
  ): SectieTotalen {
    const itemsCount = sectieRegels.length;

    const plaatwerkAE = sectieRegels.reduce((s, r) => s + getPlaatAE(r), 0);
    const demontageAE = sectieRegels.reduce((s, r) => s + getDemAE(r), 0);
    const spuitAE = sectieRegels.reduce((s, r) => s + getSpuitAE(r), 0);
    const arbeidTotaalAE = plaatwerkAE + demontageAE + spuitAE;

    const plaatwerkUren = plaatwerkAE / 10;
    const demontageUren = demontageAE / 10;
    const spuitUren = spuitAE / 10;
    const arbeidTotaalUren = arbeidTotaalAE / 10;

    const tariefPlaatwerkPerAE = tarieven.plaatwerktarief / 10;
    const tariefDemontagePerAE = tarieven.demontagetarief / 10;
    const tariefSpuitenPerAE = tarieven.spuittarief / 10;
    const tariefSpuitmatPerAE = tarieven.spuitmateriaaltarief / 10;

    const bedragPlaatwerk = plaatwerkAE * tariefPlaatwerkPerAE;
    const bedragDemontage = demontageAE * tariefDemontagePerAE;
    const bedragSpuitarbeid = spuitAE * tariefSpuitenPerAE;
    const bedragTotaalArbeid = bedragPlaatwerk + bedragDemontage + bedragSpuitarbeid;

    const bedragOnderdelenBruto = sectieRegels
      .filter(r => r.itemType !== 'bijkomend')
      .reduce((s, r) => s + (r.onderdeelPrijs || 0), 0);
    const kortingPerc = tarieven.onderdelenKortingPerc || 0;
    const bedragOnderdelen = bedragOnderdelenBruto * (1 - kortingPerc / 100);
    const bedragBijkomend = sectieRegels
      .filter(r => r.itemType === 'bijkomend')
      .reduce((s, r) => s + (r.onderdeelPrijs || 0), 0);

    const bedragSpuitmateriaalBasis = sectieRegels.reduce((s, r) => {
      if (r.spuitmateriaalBedrag !== undefined && r.spuitmateriaalBedrag > 0) {
        return s + r.spuitmateriaalBedrag;
      }
      return s + getSpuitAE(r) * tariefSpuitmatPerAE;
    }, 0);

    const bedragMateriaalconstante = itemsCount > 0 || sectieKey === 'totaal' ? toegekendeConstante : 0;
    const bedragSpuitmateriaalTotaal = bedragSpuitmateriaalBasis + bedragMateriaalconstante;

    const calcHasAnyParts = regels.some(r => r.itemType !== 'bijkomend' && (r.onderdeelPrijs || 0) > 0);
    const bedragKleinMateriaal =
      (calcHasAnyParts ? bedragOnderdelen : bedragTotaalArbeid) * (tarieven.kleinMateriaalPerc / 100);
    const bedragMilieu = itemsCount > 0 || sectieKey === 'totaal' ? milieuDeel : 0;

    const subtotaalNetto =
      bedragTotaalArbeid +
      bedragOnderdelen +
      bedragBijkomend +
      bedragSpuitmateriaalTotaal +
      bedragKleinMateriaal +
      bedragMilieu;
    const btwBedrag = subtotaalNetto * (tarieven.btwPercentage / 100);
    const totaalBruto = subtotaalNetto + btwBedrag;

    return {
      sectie: sectieKey,
      label,
      itemsCount,
      spuittijdAE: round(spuitAE, 1),
      arbeidPlaatwerkAE: round(plaatwerkAE, 1),
      arbeidDemontageAE: round(demontageAE, 1),
      arbeidTotaalAE: round(arbeidTotaalAE, 1),
      spuittijdUren: round(spuitUren, 2),
      arbeidPlaatwerkUren: round(plaatwerkUren, 2),
      arbeidDemontageUren: round(demontageUren, 2),
      arbeidTotaalUren: round(arbeidTotaalUren, 2),
      bedragPlaatwerk: round(bedragPlaatwerk, 2),
      bedragDemontage: round(bedragDemontage, 2),
      bedragSpuitarbeid: round(bedragSpuitarbeid, 2),
      bedragTotaalArbeid: round(bedragTotaalArbeid, 2),
      bedragOnderdelen: round(bedragOnderdelen, 2),
      bedragOnderdelenBruto: round(bedragOnderdelenBruto, 2),
      bedragBijkomend: round(bedragBijkomend, 2),
      bedragSpuitmateriaalBasis: round(bedragSpuitmateriaalBasis, 2),
      bedragMateriaalconstante: round(bedragMateriaalconstante, 2),
      bedragSpuitmateriaalTotaal: round(bedragSpuitmateriaalTotaal, 2),
      bedragKleinMateriaal: round(bedragKleinMateriaal, 2),
      bedragMilieu: round(bedragMilieu, 2),
      subtotaalNetto: round(subtotaalNetto, 2),
      btwBedrag: round(btwBedrag, 2),
      totaalBruto: round(totaalBruto, 2),
      percentageVanTotaal: 0
    };
  }

  const milieuPerSectie = distributeExact(
    tarieven.milieutoeslag,
    regelsPerSectie.map(list => list.length)
  );

  const allSectieTotals = ALL_SECTIES.map((s, i) =>
    berekenEnkeleSectie(s, getSectieLabel(s), regelsPerSectie[i], stdConstPerSectie[i], milieuPerSectie[i])
  );

  // Alleen actieve secties dragen daadwerkelijk toegekende constante bij aan totaal
  const totaalConstante = round(
    allSectieTotals.reduce((sum, st) => sum + st.bedragMateriaalconstante, 0),
    2
  );
  const totaal = berekenEnkeleSectie(
    'totaal',
    'Totale Calculatie',
    regels,
    totaalConstante > 0 ? totaalConstante : basisConstante,
    tarieven.milieutoeslag
  );

  if (totaal.totaalBruto > 0) {
    allSectieTotals.forEach(st => {
      st.percentageVanTotaal = round((st.totaalBruto / totaal.totaalBruto) * 100, 1);
    });
    totaal.percentageVanTotaal = 100;
  }

  const zones = VOERTUIG_ZONES.reduce((acc, z) => {
    acc[z] = allSectieTotals[idxOf(z)];
    return acc;
  }, {} as Record<VoertuigZone, SectieTotalen>);

  const constantenPerZone = VOERTUIG_ZONES.reduce((acc, z) => {
    acc[z] = round(zones[z].bedragMateriaalconstante, 2);
    return acc;
  }, {} as Record<VoertuigZone, number>);

  const actieveZones = computeActieveZones(regelsPerSectie.map(l => l.length));

  return {
    voorzijde: zones.voorzijde,
    achterzijde: zones.achterzijde,
    overig: allSectieTotals[idxOf('overig')],
    zones,
    actieveZones,
    totaal,
    soleraInfo: {
      constanteVoor: constantenPerZone.voorzijde,
      constanteAchter: constantenPerZone.achterzijde,
      constanteOverig: round(allSectieTotals[idxOf('overig')].bedragMateriaalconstante, 2),
      constanteSchade1: round(zones[schade1Zone].bedragMateriaalconstante, 2),
      constanteSchade2: round(zones[schade2Zone].bedragMateriaalconstante, 2),
      constantenPerZone,
      invoerTekst143,
      advies
    }
  };
}

export function formatEuro(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '€ 0,00';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

/**
 * Formatteert Arbeidseenheden (AE) voor Audatex
 * 1 AE = 6 minuten, 10 AE = 1 uur
 */
export function formatAE(val: number | undefined, showHours: boolean = false): string {
  if (val === undefined || isNaN(val)) return '0 AE';
  const isWhole = Math.abs(val - Math.round(val)) < 0.05;
  const aeStr = isWhole ? `${Math.round(val)} AE` : `${val.toFixed(1).replace('.', ',')} AE`;
  
  if (showHours) {
    const uren = val / 10;
    return `${aeStr} (${uren.toFixed(1).replace('.', ',')} u)`;
  }
  return aeStr;
}

export function formatAELabel(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '0 AE (0,0 u)';
  const aeFormatted = formatAE(val, false);
  const uren = (val / 10).toFixed(1).replace('.', ',');
  const min = Math.round(val * 6);
  return `${aeFormatted} (${uren} u • ${min} min)`;
}

export function formatUren(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '0,00 u';
  return `${val.toFixed(2).replace('.', ',')} u`;
}

export function aeNaarUren(ae: number): number {
  return ae / 10;
}

export function urenNaarAE(uren: number): number {
  return Math.round(uren * 10);
}

export function formatTariefPerAE(uurtarief: number): string {
  const perAE = uurtarief / 10;
  return `${formatEuro(perAE)} / AE (${formatEuro(uurtarief)} / uur)`;
}
