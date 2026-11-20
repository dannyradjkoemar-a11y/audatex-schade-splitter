import { 
  AnalyseResultaat, 
  CalculatieRegel, 
  SectieType,
  Schade1Zone,
  VoertuigZone,
  VOERTUIG_ZONES,
  ZONE_LABELS,
  BewerkingType, 
  AudatexEindcalculatieData,
  SpuitMateriaalSplitPost,
  TekstzoneItem
} from '../types/audatex';
import { formatDutchPlate } from './rdwService';

/**
 * Herkent strikt foutgeheugen- / storingsgeheugen- / OBD-uitleesposten die altijd
 * eenmalig op Schade 1 (de primaire schade) worden geplaatst.
 */
export function isFoutgeheugenPost(description: string, code?: string): boolean {
  const lower = (description || '').toLowerCase();
  const c = (code || '').trim().toUpperCase();

  if (
    lower.includes('foutgeheugen') ||
    lower.includes('storingsgeheugen') ||
    lower.includes('obd') ||
    (lower.includes('diagnose') && lower.includes('uitlezen')) ||
    lower.includes('storingscodes') ||
    lower.includes('storing uitlezen')
  ) {
    return true;
  }

  // Audatex foutgeheugen positiecodes (bijv. 9852 Foutgeheugen na rep uitlezen, 9854 Foutgeheugen uitlezen)
  if (/^985[0-9]/.test(c)) {
    return true;
  }

  return false;
}

// Backwards-compatible export alias (verwijst uitsluitend naar foutgeheugen)
export const isAlgemeneEenmaligePost = isFoutgeheugenPost;

/**
 * Herkent overige / overkoepelende handelingen (zoals uitlijnen, tijdtoeslag voor een hoofdbewerking,
 * proefrit, wassen/reinigen, airco afvullen, kalibreren zonder zone-aanduiding) waarvoor de
 * gebruiker zelf per handeling kan kiezen tussen Schade 1 of Schade 2.
 */
export function isOverigeKeuzeHandeling(description: string, code?: string): boolean {
  if (isFoutgeheugenPost(description, code)) return false;

  const lower = (description || '').toLowerCase();
  const c = (code || '').trim().toUpperCase();

  const hasExplicitZone =
    lower.includes('voorbumper') ||
    lower.includes('achterbumper') ||
    lower.includes('koplamp') ||
    lower.includes('achterlicht') ||
    lower.includes('motorkap') ||
    lower.includes('achterklep') ||
    /\bbumper\s+v\b/.test(lower) ||
    /\bbumper\s+a\b/.test(lower) ||
    /\bradar\s+v\b/.test(lower) ||
    /\bradar\s+a\b/.test(lower) ||
    lower.includes('portier') ||
    lower.includes('buitenspiegel') ||
    lower.includes('zijpaneel') ||
    lower.includes('voorzijde') ||
    lower.includes('achterzijde') ||
    lower.includes('linkerzijde') ||
    lower.includes('rechterzijde') ||
    lower.includes('bovenzijde') ||
    lower.includes('onderzijde');

  if (
    lower.includes('tijdtoeslag voor een hoofdbewerking') ||
    lower.includes('proefrit') ||
    lower.includes('testrit') ||
    lower.includes('wegproef') ||
    lower.includes('wassen') ||
    lower.includes('reinigen') ||
    lower.includes('poetsen') ||
    lower.includes('airco afvullen') ||
    lower.includes('airco-service') ||
    lower.includes('koudemiddel') ||
    lower.includes('uitlijnen') ||
    lower.includes('wielgeometrie') ||
    lower.includes('accu laden') ||
    lower.includes('laadapparaat') ||
    lower.includes('begrotingskosten') ||
    lower.includes('transportkosten') ||
    lower.includes('afslepen') ||
    lower.includes('voorbereidingstijd voertuig')
  ) {
    return true;
  }

  if (!hasExplicitZone && (lower.includes('kalibreren') || lower.includes('calibreren') || lower.includes('adas'))) {
    return true;
  }

  // Overige algemene 98xx posities (niet 985x foutgeheugen)
  if (/^98[0-9]{2}/.test(c)) {
    return true;
  }

  return false;
}

/**
 * Detecteert links (L) vs rechts (R) voor zijdelingse carrosseriedelen.
 */
function detectSideLR(description: string): 'links' | 'rechts' | null {
  const lower = (description || '').toLowerCase();
  const hasLeft = /\b(links|linker|linkervoor|linkerachter|l)\b/.test(lower) || /\bl\)/.test(lower) || /\(l\)/.test(lower);
  const hasRight = /\b(rechts|rechter|rechtervoor|rechterachter|r)\b/.test(lower) || /\br\)/.test(lower) || /\(r\)/.test(lower);

  if (hasLeft && !hasRight) return 'links';
  if (hasRight && !hasLeft) return 'rechts';
  return null;
}

/**
 * Bepaalt automatisch de twee hoofd-schadezones (Schade 1 & Schade 2) op basis van de gevonden posities.
 */
export function detectDefaultSchadeZones(regels: CalculatieRegel[]): {
  schade1Zone: VoertuigZone;
  schade2Zone: VoertuigZone;
} {
  const scores: Record<VoertuigZone, number> = {
    voorzijde: 0,
    achterzijde: 0,
    linkerzijde: 0,
    rechterzijde: 0,
    bovenzijde: 0,
    onderzijde: 0
  };
  const counts: Record<VoertuigZone, number> = {
    voorzijde: 0,
    achterzijde: 0,
    linkerzijde: 0,
    rechterzijde: 0,
    bovenzijde: 0,
    onderzijde: 0
  };

  for (const r of regels) {
    if (r.isEenmaligePost) continue;
    if (r.sectie === 'overig') continue;
    const z = r.sectie as VoertuigZone;
    counts[z] += 1;
    const spuit = r.spuittijdAE || 0;
    const arb = (r.arbeidPlaatwerkAE || 0) + (r.arbeidDemontageAE || 0);
    scores[z] += 10 + (r.onderdeelPrijs || 0) / 100 + spuit + arb * 0.5;
  }

  const activeZones = VOERTUIG_ZONES
    .filter(z => counts[z] > 0)
    .sort((a, b) => scores[b] - scores[a]);

  const schade1Zone: VoertuigZone = activeZones[0] ?? 'voorzijde';
  const schade2Zone: VoertuigZone =
    activeZones[1] ?? (schade1Zone === 'voorzijde' ? 'achterzijde' : 'voorzijde');

  return { schade1Zone, schade2Zone };
}

/**
 * Verplaatst uitsluitend foutgeheugen-posten automatisch naar de gekozen Schade 1-zone
 * (en werkt eventueel eerder expliciet aan Schade 1 / Schade 2 gekoppelde overige handelingen bij).
 * Niet-toegewezen overige handelingen blijven in 'overig' zodat de gebruiker per item Schade 1 of 2 kiest.
 */
export function applySchade1Selection(
  regels: CalculatieRegel[],
  schade1Zone: Schade1Zone,
  schade2Zone?: VoertuigZone
): CalculatieRegel[] {
  const resolvedSchade2: VoertuigZone =
    schade2Zone && schade2Zone !== schade1Zone
      ? schade2Zone
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';

  return regels.map(regel => {
    const isFoutgeheugen = regel.isEenmaligePost ?? isFoutgeheugenPost(regel.omschrijving, regel.code);
    if (isFoutgeheugen) {
      return {
        ...regel,
        isEenmaligePost: true,
        isOverigeHandeling: false,
        sectie: schade1Zone
      };
    }

    const isOverig =
      regel.isOverigeHandeling ||
      regel.sectie === 'overig' ||
      isOverigeKeuzeHandeling(regel.omschrijving, regel.code);

    if (isOverig) {
      let nextSectie = regel.sectie;
      if (regel.overigeToewijzing === 'schade1') {
        nextSectie = schade1Zone;
      } else if (regel.overigeToewijzing === 'schade2') {
        nextSectie = resolvedSchade2;
      }
      return {
        ...regel,
        isEenmaligePost: undefined,
        isOverigeHandeling: true,
        sectie: nextSectie
      };
    }

    return regel;
  });
}

/**
 * Categoriseert een calculatiepositie/onderdeel naar één van de 6 voertuigzones
 * ('voorzijde', 'achterzijde', 'linkerzijde', 'rechterzijde', 'bovenzijde', 'onderzijde') of 'overig'
 * conform Solera Audatex standaarden (positiecodes en vaktermen).
 */
export function categorizeSector(description: string, code?: string): SectieType {
  const lower = (description || '').toLowerCase();

  // 0. Expliciete zonenaam in omschrijving
  if (lower.includes('linkerzijde')) return 'linkerzijde';
  if (lower.includes('rechterzijde')) return 'rechterzijde';
  if (lower.includes('bovenzijde')) return 'bovenzijde';
  if (lower.includes('onderzijde')) return 'onderzijde';

  // 1. Overig (foutgeheugen/diagnose, uitlijnen, proefrit, hoofdbewerkingstoeslag)
  if (
    isFoutgeheugenPost(description, code) ||
    isOverigeKeuzeHandeling(description, code)
  ) {
    return 'overig';
  }

  // 2. Bovenzijde (Dak, panoramadak, schuifdak, hemelbekleding, daklijst, dakrail, dakantenne)
  if (
    lower.includes('dakplaat') ||
    lower.includes('dakpaneel') ||
    lower.includes('schuifdak') ||
    lower.includes('panoramadak') ||
    lower.includes('zonnedak') ||
    lower.includes('cabriodak') ||
    lower.includes('dakhemel') ||
    lower.includes('hemelbekleding') ||
    lower.includes('daklijst') ||
    lower.includes('dakraam') ||
    lower.includes('dakdrager') ||
    lower.includes('dakrail') ||
    lower.includes('dakreling') ||
    lower.includes('dakantenne') ||
    lower.includes('haaienvin') ||
    lower.includes('dakspant') ||
    /\bdak\b/.test(lower)
  ) {
    return 'bovenzijde';
  }

  // 2b. Uitdrukkelijke achterschade-uitlaat (bv. '8833 UITLAATPIJP A HERSTELLEN')
  if (
    /\buitlaat(?:pijp|demper|eindstuk|pot)?\s+a\b/.test(lower) ||
    lower.includes('uitlaat achter')
  ) {
    return 'achterzijde';
  }

  // 3. Onderzijde (Bodemplaat, subframe, uitlaat, carter, ophanging, tank)
  if (
    lower.includes('bodemplaat') ||
    lower.includes('bodembescherm') ||
    lower.includes('onderplaat') ||
    lower.includes('onderbescherm') ||
    lower.includes('subframe') ||
    lower.includes('voorasdrager') ||
    lower.includes('achterasdrager') ||
    lower.includes('dwarsdrager onder') ||
    lower.includes('uitlaat') ||
    lower.includes('einddemper') ||
    lower.includes('middendemper') ||
    lower.includes('katalysator') ||
    lower.includes('roetfilter') ||
    lower.includes('cardan') ||
    lower.includes('differentieel') ||
    lower.includes('motorbescherm') ||
    lower.includes('carterbescherm') ||
    lower.includes('carterpan') ||
    lower.includes('brandstoftank') ||
    lower.includes('bodemgroep') ||
    lower.includes('stuurhuis') ||
    lower.includes('draagarm') ||
    lower.includes('wielophanging') ||
    lower.includes('aandrijfas') ||
    lower.includes('stabilisatorstang')
  ) {
    return 'onderzijde';
  }

  // 4. Expliciete Voorzijde (inclusief L/R steunen of roosters van voorbumper / koplamp)
  if (
    lower.includes('voorbumper') || 
    lower.includes('bumper voor') ||
    /\bbumper\s+v\b/.test(lower) || 
    lower.includes('motorkap') || 
    /\bklep\s+v\b/.test(lower) ||
    lower.includes('koplamp') || 
    lower.includes('mistlamp') ||
    lower.includes('radiateur') || 
    lower.includes('koeler') || 
    lower.includes('condensor') ||
    lower.includes('intercooler') ||
    lower.includes('grille') || 
    /\bembleem\s+v\b/.test(lower) ||
    lower.includes('voorscherm') || 
    /\bspatscherm\s+v\b/.test(lower) || 
    /\bkentekenplaat\s+v\b/.test(lower) || 
    /\bkenteken-verst\s+v\b/.test(lower) || 
    /\bschokdemper\s+v\b/.test(lower) || 
    /\bsteun(?:\s+[lr])?\s+bumper\s+v\b/.test(lower) ||
    lower.includes('lu-rooster') ||
    /\bafdek\s+m\s+bumper\s+v\b/.test(lower) ||
    lower.includes('frontpaneel') ||
    lower.includes('frontplaat') ||
    lower.includes('frontafdek') ||
    lower.includes('voorpaneel') ||
    lower.includes('voorruit') ||
    lower.includes('voorbalk') ||
    lower.includes('slotplaat') ||
    lower.includes('slotbalk') ||
    /\btraverse\s+v\b/.test(lower) ||
    /\bradar\s+v\b/.test(lower)
  ) {
    return 'voorzijde';
  }

  // 5. Expliciete Achterzijde (inclusief L/R steunen/houders van achterbumper / achterlicht)
  if (
    lower.includes('achterbumper') || 
    lower.includes('bumper achter') ||
    /\bbumper\s+a\b/.test(lower) || 
    /\bbumper\s*versterking\s+a\b/.test(lower) ||
    /\bbumper\s*steun\s+a\b/.test(lower) ||
    /\btraverse\s+a\b/.test(lower) ||
    lower.includes('achterklep') || 
    lower.includes('kofferdeksel') || 
    lower.includes('achterlicht') || 
    /\bspatscherm\s+a\b/.test(lower) || 
    lower.includes('achterpaneel') ||
    lower.includes('achtertussenpaneel') ||
    /\bkentekenplaat\s+a\b/.test(lower) || 
    lower.includes('trekhaak') || 
    lower.includes('diffusor') || 
    lower.includes('diffuser') || 
    /\bhouder\s+bumper\s+a\b/.test(lower) || 
    /\bsteun(?:\s+[lr])?\s+bumper\s+a\b/.test(lower) ||
    lower.includes('achterruit') ||
    lower.includes('kofferruimte')
  ) {
    return 'achterzijde';
  }

  // 6. Zijkanten: Linkerzijde vs Rechterzijde (portieren, buitenspiegels, dorpels, zijpanelen, achterschermen, wieldelen)
  const sideLR = detectSideLR(description);
  const isExplicitSidePart =
    lower.includes('portier') ||
    lower.includes('deur') ||
    lower.includes('schuifdeur') ||
    lower.includes('buitenspiegel') ||
    lower.includes('spiegelkap') ||
    lower.includes('spiegel') ||
    lower.includes('dorpel') ||
    lower.includes('zijpaneel') ||
    lower.includes('zijwand') ||
    lower.includes('achterzijpaneel') ||
    lower.includes('achterscherm') ||
    lower.includes('zijscherm') ||
    lower.includes('zijruit') ||
    lower.includes('flank') ||
    lower.includes('a-stijl') ||
    lower.includes('b-stijl') ||
    lower.includes('c-stijl') ||
    lower.includes('wielkastlijst') ||
    lower.includes('wielafdekking') ||
    lower.includes('wieldop') ||
    lower.includes('wielkuip') ||
    lower.includes('ruitschachtlijst') ||
    lower.includes('steenslagbesch') ||
    lower.includes('band/velg');

  if (isExplicitSidePart && sideLR === 'links') return 'linkerzijde';
  if (isExplicitSidePart && sideLR === 'rechts') return 'rechterzijde';
  if (lower.includes('achterscherm') || lower.includes('achterzijpaneel')) {
    return 'achterzijde';
  }

  // 7. Audatex Positiecode logica
  if (code) {
    const c = code.trim().toUpperCase();
    // Front codes in Audatex: 01xx, 02xx, 03xx, 04xx (motorkap), 07xx (voorscherm), 10xx (frontplaat/traverse), 51 11 (BMW front), 61 67, 63 10
    if (
      c.startsWith('01') || 
      c.startsWith('02') || 
      c.startsWith('03') || 
      c.startsWith('04') ||
      c.startsWith('07') ||
      c.startsWith('10') ||
      c.startsWith('51 11') || 
      c.startsWith('61 67') || 
      c.startsWith('63 10')
    ) {
      return 'voorzijde';
    }

    // Roof codes in Audatex: 17xx, 18xx
    if (c.startsWith('17') || c.startsWith('18')) {
      return 'bovenzijde';
    }

    // Side codes in Audatex: 13xx-16xx (portieren), 19xx (dorpels/stijlen), 21xx-23xx (zijpanelen), S10/S11/S18/Q01, 51 16, 51 21, 51 22
    if (
      c.startsWith('13') ||
      c.startsWith('14') ||
      c.startsWith('15') ||
      c.startsWith('16') ||
      c.startsWith('19') ||
      c.startsWith('21') ||
      c.startsWith('22') ||
      c.startsWith('23') ||
      c.startsWith('S10') ||
      c.startsWith('S11') ||
      c.startsWith('S18') ||
      c.startsWith('Q01') ||
      c.startsWith('51 16') ||
      c.startsWith('51 21') ||
      c.startsWith('51 22')
    ) {
      if (sideLR === 'links') return 'linkerzijde';
      if (sideLR === 'rechts') return 'rechterzijde';
    }

    // Rear codes in Audatex: 11xx, 12xx, 24xx (indien geen L/R zijpaneel), 25xx-29xx, 51 12 (BMW rear), 63 21, 51 99
    if (
      c.startsWith('11') || 
      c.startsWith('12') || 
      c.startsWith('24') ||
      c.startsWith('25') || 
      c.startsWith('26') || 
      c.startsWith('27') ||
      c.startsWith('28') ||
      c.startsWith('29') || 
      c.startsWith('51 12') || 
      c.startsWith('63 21') || 
      c.startsWith('51 99')
    ) {
      return 'achterzijde';
    }

    // Specific PDC sensor pos numbers in Audatex
    if (c.includes('66 20 610')) return 'voorzijde';
    if (c.includes('66 20 603')) return 'achterzijde';
    if (c.startsWith('98')) return 'overig';
  }

  return 'overig';
}

/**
 * Context-bewuste nabewerking:
 * Wanneer een calculatie duidelijke Voorzijde-kerndelen (bumper V, koplamp, grille, frontafdek, spatscherm V)
 * én duidelijke Achterzijde-kerndelen (bumper achter, achterlicht, achterklep) bevat op één enkele flank (alléén L of alléén R),
 * worden voorportier/spiegel/wieldop-posities met `V L`/`V R` naar `voorzijde` en achterportier/zijpaneel/wielkuip-posities
 * met `A L`/`A R` naar `achterzijde` toegewezen. Pure L-vs-R zijschades blijven `linkerzijde` / `rechterzijde`.
 */
function reconcileFrontRearZones(regels: CalculatieRegel[]): CalculatieRegel[] {
  const hasFrontCore = regels.some(
    r =>
      r.sectie === 'voorzijde' &&
      !r.isEenmaligePost &&
      /bumper|front|koplamp|mistlamp|grille|motorkap|radiateur|condensor|spatscherm\s+v|voorscherm|\bklep\s+v\b/i.test(
        r.omschrijving
      )
  );
  const hasRearCore = regels.some(
    r =>
      r.sectie === 'achterzijde' &&
      !r.isEenmaligePost &&
      /bumper|achterlicht|achterklep|koffer|achterpaneel|uitlaat/i.test(r.omschrijving)
  );

  const hasLeftSide = regels.some(r => r.sectie === 'linkerzijde');
  const hasRightSide = regels.some(r => r.sectie === 'rechterzijde');

  const isFrontCorner = (r: CalculatieRegel) => {
    const lower = r.omschrijving.toLowerCase();
    const code = (r.code || '').trim().toUpperCase();
    return (
      /\bv\s+[lr]\b/.test(lower) ||
      /\b[lr]\s+v\b/.test(lower) ||
      code.startsWith('S10') ||
      code.startsWith('Q0101')
    );
  };

  const isRearCorner = (r: CalculatieRegel) => {
    const lower = r.omschrijving.toLowerCase();
    const code = (r.code || '').trim().toUpperCase();
    return (
      /\ba\s+[lr]\b/.test(lower) ||
      /\b[lr]\s+a\b/.test(lower) ||
      code.startsWith('S11') ||
      code.startsWith('Q0103')
    );
  };

  const hasRearFlankItems = regels.some(
    r =>
      (r.sectie === 'linkerzijde' || r.sectie === 'rechterzijde') &&
      (isRearCorner(r) || /zijpaneel|zijwand|achterscherm|dorpel/i.test(r.omschrijving))
  );

  // Alleen herindelen bij één enkele flank (geen L-vs-R zijschade conflict) wanneer er:
  // (a) zowel een duidelijke Voorzijde als Achterzijde kern aanwezig is, OF
  // (b) uitsluitend voorhoek-posities (V L/R + buitenspiegel) samen met Voorzijde-kerndelen bestaan zonder achterflankdelen
  if (!hasFrontCore || (hasLeftSide && hasRightSide) || (!hasRearCore && hasRearFlankItems)) {
    return regels;
  }

  const promotedFrontSides = new Set<'links' | 'rechts'>();
  for (const r of regels) {
    if (r.sectie !== 'linkerzijde' && r.sectie !== 'rechterzijde') continue;
    if (isFrontCorner(r)) {
      const s = r.sectie === 'linkerzijde' ? 'links' : 'rechts';
      promotedFrontSides.add(s);
    }
  }

  return regels.map(r => {
    if (r.sectie !== 'linkerzijde' && r.sectie !== 'rechterzijde') {
      return r;
    }

    if (isFrontCorner(r)) {
      return { ...r, sectie: 'voorzijde' };
    }
    if (hasRearCore && isRearCorner(r)) {
      return { ...r, sectie: 'achterzijde' };
    }

    // Buitenspiegel hoort fysiek aan het voorportier wanneer er geen achter-spiegel bestaat en de voorhoek op deze flank zit
    const lower = r.omschrijving.toLowerCase();
    const side = r.sectie === 'linkerzijde' ? 'links' : 'rechts';
    if (lower.includes('spiegel') && promotedFrontSides.has(side)) {
      return { ...r, sectie: 'voorzijde' };
    }

    return r;
  });
}

/**
 * Bepaalt of een onderdeel/spuitregel metaal of kunststof betreft conform Solera AZT indeling
 */
export function detectMateriaalSoort(description: string, spuitFase?: string): 'metaal' | 'kunststof' {
  const upper = (description || '').toUpperCase();
  const fase = (spuitFase || '').toUpperCase();

  // SV1..SV4 zijn per definitie kunststof bewerkingscodes in AZT (TZ 51)
  if (fase.startsWith('SV1') || fase.startsWith('SV2') || fase.startsWith('SV3') || fase.startsWith('SV4')) {
    return 'kunststof';
  }

  if (
    upper.includes('BUMPER') ||
    upper.includes('GRILLE') ||
    upper.includes('SPOILER') ||
    upper.includes('SPIEGEL') ||
    upper.includes('STOOTLIJST') ||
    upper.includes('SIERLIJST') ||
    upper.includes('KUNSTSTOF') ||
    upper.includes('DIFFUS') ||
    upper.includes('DORPELVERBR') ||
    upper.includes('AFDEKKAP') ||
    upper.includes('PORTIERGREEP') ||
    upper.includes('WIELDOP') ||
    upper.includes('WIELAFDEKKING')
  ) {
    return 'kunststof';
  }

  return 'metaal';
}

/**
 * Hulpfunctie voor het parsen van Nederlandse/Audatex getalnotaties (bv. "2 095.68", "1.234,42", "33.60-")
 */
function parseDutchNumber(input?: string): number {
  if (!input) return 0;
  let clean = input.replace(/\s+/g, '').replace(/\*/g, '').trim();
  const isNegative = clean.endsWith('-') || clean.startsWith('-');
  clean = clean.replace(/-/g, '');
  let val = 0;
  if (clean.includes(',') && clean.includes('.')) {
    // 1.234,56
    val = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  } else if (clean.includes(',')) {
    val = parseFloat(clean.replace(',', '.')) || 0;
  } else {
    val = parseFloat(clean) || 0;
  }
  return isNegative ? -val : val;
}

/**
 * Volledige Solera Audatex Parser voor officiële Audatex calculatierapporten en teksten
 */
export function parseAudatexReport(rawText: string): AnalyseResultaat | null {
  if (!rawText || rawText.trim().length < 20) return null;

  // Herkenningscheck: bevat de tekst Audatex-specifieke secties of tabellen?
  const isAudatexStructure =
    /S\s*P\s*U\s*I\s*T\s*W\s*E\s*R\s*K/i.test(rawText) ||
    /E\s*I\s*N\s*D\s*C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E/i.test(rawText) ||
    /A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N\s+TIJDBASIS/i.test(rawText) ||
    /O\s*N\s*D\s*E\s*R\s*D\s*E\s*L\s*E\s*N/i.test(rawText) ||
    /SYSTEEM\s+(?:AZT|AUDATEX)/i.test(rawText);

  if (!isAudatexStructure) {
    return null;
  }

  // 1. Voertuig & Dossier Metadata
  let kenteken = 'ONBEKEND';
  const kentMatch = rawText.match(/KENT(?:EKEN)?\.?\s*[:\s]+([0-9A-Z-]{5,10})/i) || 
                    rawText.match(/\b([0-9A-Z]{1,3}-[0-9A-Z]{1,3}-[0-9A-Z]{1,3})\b/i);
  if (kentMatch) {
    kenteken = formatDutchPlate(kentMatch[1].trim());
  }

  let merk = '';
  let model = '';
  // Format op controleblad: "MERK        BMW                   5-SERIE (E60/E61)     520I"
  const controleMerkMatch = rawText.match(/^MERK\s+([A-Z0-9-]+)\s{2,}(.+)$/mi);
  if (controleMerkMatch) {
    merk = controleMerkMatch[1].trim();
    model = controleMerkMatch[2].replace(/\s{2,}/g, ' / ').trim();
  } else {
    const merkMatch = rawText.match(/MERK\s*[:\s]+([A-Z0-9-]+)(?:\s{2,}|\n|$)/i);
    if (merkMatch) merk = merkMatch[1].trim();
    const modelMatch = rawText.match(/MODEL\/TYPE\s*[:\s]+([^\n]+)/i);
    if (modelMatch) model = modelMatch[1].replace(/\s{2,}/g, ' ').trim();
  }
  const merkModel = [merk, model].filter(Boolean).join(' ').trim() || 'Onbekend voertuig (via Audatex)';

  let calculatienummer = 'ADX-' + Math.floor(100000 + Math.random() * 900000);
  let datumCalculatie = new Date().toLocaleDateString('nl-NL');
  const calcNrMatch = rawText.match(/S\s*C\s*H\s*A\s*D\s*E\s*-\s*C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+NR\s+([0-9]+)\s+([0-9.]+)/i) ||
                      rawText.match(/CALCULATIE\s+NR\s+([0-9]+)\s+([0-9.]+)/i);
  if (calcNrMatch) {
    calculatienummer = calcNrMatch[1].trim();
    datumCalculatie = calcNrMatch[2].trim();
  }

  let dossiernummer = calculatienummer;
  const schadeNrMatch = rawText.match(/SCHADE(?:NUMMER|-NR)\s*[:\s]+([0-9A-Z-]+)/i);
  if (schadeNrMatch) dossiernummer = schadeNrMatch[1].trim();

  let datumSchade = datumCalculatie;
  const datumSchadeMatch = rawText.match(/SCHADE-DATUM\s*[:\s]+([0-9.]+)/i);
  if (datumSchadeMatch) datumSchade = datumSchadeMatch[1].trim();

  let chassisnummer = 'N/A';
  const chassisMatch = rawText.match(/(?:CHASSISNUMMER|VTG\.-ID\.-NR\.)\s*[:\s]*([A-Z0-9]{8,17})/i);
  if (chassisMatch) chassisnummer = chassisMatch[1].trim();

  let kilometerstand: number | undefined;
  const kmMatch =
    rawText.match(/KILOMETERSTAND\s*[:\s]+([0-9][0-9.\s]{1,9})\s*(?:KM)?/i) ||
    rawText.match(/\bKM-?STAND\s*[:\s]+([0-9][0-9.\s]{1,9})/i);
  if (kmMatch) {
    const cleanedKm = kmMatch[1].replace(/[^0-9]/g, '');
    const parsedKm = parseInt(cleanedKm, 10);
    if (!Number.isNaN(parsedKm) && parsedKm >= 0 && parsedKm <= 2000000) {
      kilometerstand = parsedKm;
    }
  }

  let bouwjaar: number | undefined;
  const afgifteMatch =
    rawText.match(/AFGIFTE\s+DEEL\s*1(?:\s*\/\s*APK-DATUM)?\s*[:\s]+[0-9]{2}[.-][0-9]{2}[.-]([12][09][0-9]{2})/i) ||
    rawText.match(/BOUWJAAR\s*[:\s]+([12][09][0-9]{2})/i) ||
    rawText.match(/BASIS-\s+VA\s+[0-9]{2}\/([12][09][0-9]{2})/i);
  if (afgifteMatch) {
    const parsedYr = parseInt(afgifteMatch[1], 10);
    if (parsedYr >= 1980 && parsedYr <= new Date().getFullYear() + 1) {
      bouwjaar = parsedYr;
    }
  }

  let expertHersteller = 'Solera Audatex Schadehersteller';
  const reparateurMatch = rawText.match(/REPARATEUR\s*[:\s]+([^\n]+)/i);
  if (reparateurMatch) expertHersteller = reparateurMatch[1].trim();

  let laksoort = 'Metallic / 2-Laags (AZT)';
  const lakMatch = rawText.match(/AANDUIDING\s+-\s+([^\n]+)/i);
  if (lakMatch) {
    let lakRaw = lakMatch[1].replace(/\s+AE\s*$/, '').trim();
    // Check op een vervolgregel voor Nat in Nat / Drogen/Schuren / Blanke lak hard
    const lakIdx = rawText.indexOf(lakMatch[0]);
    const nextLineBlock = rawText.slice(lakIdx + lakMatch[0].length, lakIdx + lakMatch[0].length + 120);
    const subLak = nextLineBlock.match(/^\r?\n\s+-\s+([^\r\n]+)/);
    if (subLak) {
      lakRaw += ` (${subLak[1].trim()})`;
    }
    laksoort = lakRaw;
  }

  // US-codes uitlezen
  const usCodes: string[] = [];
  const usBlockMatch = rawText.match(/-\s*BASIS-SPECIFICATIES\s*:\s*([\s\S]*?)(?:\r?\n\r?\n|ONDERDELEN|TARIEF)/i) ||
                       rawText.match(/-\s*US CODES AUDAID\s*:\s*([\s\S]*?)(?:-|ONDERDELEN)/i);
  if (usBlockMatch) {
    const tokens = usBlockMatch[1].match(/\b[A-Z][0-9]\b/g);
    if (tokens) {
      tokens.forEach(t => { if (!usCodes.includes(t)) usCodes.push(t); });
    }
  }

  // Actieve Tekstzone-codes uitlezen
  const actieveTekstzones: TekstzoneItem[] = [];
  const tzBlockMatch = rawText.match(/-\s*ACTIEVE CODES\s*:\s*([\s\S]*?)(?:-\s*ONGELDIGE CODES|ONDERDELEN\r?\n|\r?\n\r?\n)/i);
  if (tzBlockMatch) {
    const pairs = tzBlockMatch[1].matchAll(/\b([0-9]{2,3})\s+([0-9.,]+-?)/g);
    for (const p of pairs) {
      actieveTekstzones.push({ code: p[1], waarde: p[2] });
    }
  }

  // 2. Tarieven & Factoren uitlezen (werkplaats vs spuiterij kunnen in Audatex verschillen)
  const wpTariefMatch =
    rawText.match(/WERKPLAATS\s*:\s*([0-9.,]+)\s*EURO\/AE/i) ||
    rawText.match(/A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N[^\n]*TARIEF\s*=\s*([0-9.,]+)\s*EURO\/AE/i) ||
    rawText.match(/TARIEF\/KL[123]\s*=\s*([0-9.,]+)\s*EURO\/AE/i);
  const spTariefMatch =
    rawText.match(/SPUITERIJ\s*:\s*([0-9.,]+)\s*EURO\/AE/i) ||
    rawText.match(/SPUITLOON[\s\S]{0,100}?TARIEF\s+([0-9.,]+)\s*EURO\/AE/i);
  const fallbackTariefMatch =
    rawText.match(/TARIEF\s*=?\s*([0-9.,]+)\s*EURO\/AE/i) ||
    rawText.match(/X\s+([0-9.,]+)\s*EURO\/AE/i);

  const tariefPerAE = parseDutchNumber((wpTariefMatch || spTariefMatch || fallbackTariefMatch)?.[1]) || 8.81;
  const spuitTariefPerAE = parseDutchNumber((spTariefMatch || wpTariefMatch || fallbackTariefMatch)?.[1]) || tariefPerAE;
  const uurtarief = Math.round(tariefPerAE * 10 * 100) / 100;
  const spuitUurtarief = Math.round(spuitTariefPerAE * 10 * 100) / 100;

  let milieuTariefPerAE = 0;
  const milieuTariefMatch = rawText.match(/TOESLAG\s+WP\+SP[^\n]+?X\s+([0-9.,]+)\s*EURO\/AE/i);
  if (milieuTariefMatch) {
    milieuTariefPerAE = parseDutchNumber(milieuTariefMatch[1]);
  } else {
    const tz123 = actieveTekstzones.find(t => t.code === '123');
    if (tz123) milieuTariefPerAE = parseDutchNumber(tz123.waarde);
  }

  let onderdelenKortingPerc = 0;
  const kortingMatch = rawText.match(/KORTING\s+([0-9.,]+)%/i);
  if (kortingMatch) {
    onderdelenKortingPerc = parseDutchNumber(kortingMatch[1]);
  } else {
    const tz20 = actieveTekstzones.find(t => t.code === '20');
    if (tz20) onderdelenKortingPerc = parseDutchNumber(tz20.waarde);
  }

  let kleinMateriaalPerc = 2.0;
  const kleinMatMatch = rawText.match(/KLEINMATERIAAL\s*\(\s*([0-9.,]+)%\)/i);
  if (kleinMatMatch) {
    kleinMateriaalPerc = parseDutchNumber(kleinMatMatch[1]);
  }

  // Materiaalindex (TZ 51)
  let materiaalIndexPerc = 100;
  const matIndexMatch = rawText.match(/MATERIAALINDEX\s+([0-9.,]+)\s*%/i);
  if (matIndexMatch) {
    materiaalIndexPerc = parseDutchNumber(matIndexMatch[1]);
  } else {
    const tz51 = actieveTekstzones.find(t => t.code === '51');
    if (tz51) materiaalIndexPerc = parseDutchNumber(tz51.waarde);
  }

  // 3. Gedetailleerde SPUITWERK sectie uitlezen
  let spuitTijdPaneelAE = 0;
  let spuitVoorbereidingMetaalAE = 0;
  let spuitVoorbereidingKunststofAE = 0;
  let spuitVoorbereidingMeerlagenAE = 0;
  let spuitLoonTotaalAE = 0;
  let spuitLoonBedragUitTabel = 0;

  let materiaalConstanteMetaal = 0;
  let materiaalConstanteKunststof = 0;
  let materiaalConstanteMeerlagen = 0;
  const spuitMateriaalPosten: SpuitMateriaalSplitPost[] = [];

  const paintHeaderMatch =
    rawText.match(/S\s*P\s*U\s*I\s*T\s*W\s*E\s*R\s*K\s+SYSTEEM\s+AZT/i) ||
    rawText.match(/^\s*S\s*P\s*U\s*I\s*T\s*W\s*E\s*R\s*K\s*$/im);
  const paintHeaderIndex = paintHeaderMatch ? (paintHeaderMatch.index ?? -1) : -1;
  const eindCalcAfterPaintRe = /^\s*E\s+I\s+N\s+D\s+C\s+A\s+L\s+C\s+U\s+L\s+A\s+T\s+I\s+E\b/im;
  const afterPaintText = paintHeaderIndex !== -1 ? rawText.slice(paintHeaderIndex) : '';
  const eindAfterPaintMatch = afterPaintText.match(eindCalcAfterPaintRe);
  const paintBlock = paintHeaderIndex !== -1
    ? rawText.slice(
        paintHeaderIndex,
        eindAfterPaintMatch && eindAfterPaintMatch.index !== undefined
          ? paintHeaderIndex + eindAfterPaintMatch.index
          : paintHeaderIndex + 4000
      )
    : '';

  if (paintBlock) {
    const spLines = paintBlock.split(/\r?\n/);
    let inMateriaalKosten = false;

    for (const spLine of spLines) {
      if (/^\s*SPUIT-MATERIAALKOSTEN\s*$/i.test(spLine) || /^\s*SPUIT-MATERIAALKOSTEN\b/i.test(spLine)) {
        inMateriaalKosten = true;
        continue;
      }

      if (!inMateriaalKosten) {
        const spuitTijdM = spLine.match(/^\s*SPUITTIJD\s+([0-9.,]+)/i);
        if (spuitTijdM) { spuitTijdPaneelAE = parseDutchNumber(spuitTijdM[1]); continue; }

        const vbMetaalM = spLine.match(/VOORBER(?:EIDING)?[^0-9]*METAAL\s+([0-9.,]+)/i);
        if (vbMetaalM) { spuitVoorbereidingMetaalAE = parseDutchNumber(vbMetaalM[1]); continue; }

        const vbKunstM = spLine.match(/VOORBER(?:EIDING)?[^0-9]*KUNSTSTOF\s+([0-9.,]+)/i);
        if (vbKunstM) { spuitVoorbereidingKunststofAE = parseDutchNumber(vbKunstM[1]); continue; }

        const vbMeerM = spLine.match(/VOORBER(?:EIDING)?[^0-9]*MEERLAGEN\s+([0-9.,]+)/i);
        if (vbMeerM) { spuitVoorbereidingMeerlagenAE = parseDutchNumber(vbMeerM[1]); continue; }

        const totSpuitM = spLine.match(/TOTAAL\s+10\s*AE\/UUR\s*:\s*([0-9.,]+)\s+([0-9.,]+)/i);
        if (totSpuitM) {
          spuitLoonTotaalAE = parseDutchNumber(totSpuitM[1]);
          spuitLoonBedragUitTabel = parseDutchNumber(totSpuitM[2]);
          continue;
        }
      } else {
        const matMetaalM = spLine.match(/(?:HOOFDMATERIAALCONST\.?|MATERIAAL-?CONSTANTE)[^0-9]*METAAL\s+([0-9.,]+)/i);
        if (matMetaalM) { materiaalConstanteMetaal = parseDutchNumber(matMetaalM[1]); continue; }

        const matKunstM = spLine.match(/(?:GECOMB\.?\s*)?MATERIAAL-?CONSTANTE[^0-9]*KUNSTSTOF\s+([0-9.,]+)/i);
        if (matKunstM) { materiaalConstanteKunststof = parseDutchNumber(matKunstM[1]); continue; }

        const matMeerM = spLine.match(/MATERIAAL-?CONSTANTE[^0-9]*MEERLAGEN\s+([0-9.,]+)/i);
        if (matMeerM) { materiaalConstanteMeerlagen = parseDutchNumber(matMeerM[1]); continue; }

        const trimmedSp = spLine.trim();
        if (
          !trimmedSp ||
          /^(?:MATERIAAL-?CONSTANTE|HOOFDMATERIAALCONST|GECOMB\.?\s*MATERIAAL|MATERIAALINDEX|TOTAAL|ARBEIDSLOON|SPUIT-MATERIAALKOSTEN|SYSTEEM\s+AZT|REPARATIEKOSTEN|TOESLAG\s+WP\+SP)/i.test(
            trimmedSp
          )
        ) {
          continue;
        }

        const postM = trimmedSp.match(/^(.+?)\s+([0-9]{1,3}(?:\s[0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})\s*$/);
        if (postM) {
          const omsch = postM[1].trim().replace(/\s{2,}/g, ' ');
          const upperO = omsch.toUpperCase();
          if (
            !/^(?:SPUITEN|HERSTELSP|DEKLAAG|UITSPUIT|SPOT-?REPAIR|KRASVAST|MEERLAGEN)/i.test(upperO)
          ) {
            continue;
          }
          const bedrag = parseDutchNumber(postM[2]);
          const cat: SpuitMateriaalSplitPost['categorie'] =
            upperO.includes('VERN') ? 'vern' :
            (upperO.includes('HERST') || upperO.includes('HERSTELSP')) ? 'herst' :
            upperO.includes('UITSPUIT') ? 'uitspuiten' :
            upperO.includes('DEKLAAG') ? 'deklaag' : 'overig';
          const postFaseMatch = upperO.match(/\b(SV1|SV2|SV3|SV4|SV|SH1|SH|LB|LS)\b/);
          const postFase = postFaseMatch ? postFaseMatch[1] : undefined;
          const postMat: 'metaal' | 'kunststof' | undefined =
            upperO.includes('KUNSTSTOF') || (postFase && /^SV[1-4]$/.test(postFase))
              ? 'kunststof'
              : upperO.includes('METAAL')
              ? 'metaal'
              : undefined;
          spuitMateriaalPosten.push({
            categorie: cat,
            omschrijving: omsch,
            bedragBruto: bedrag,
            spuitFase: postFase,
            materiaalSoort: postMat
          });
        }
      }
    }
  }

  const materiaalconstante =
    (materiaalConstanteMetaal + materiaalConstanteKunststof + materiaalConstanteMeerlagen) > 0
      ? Math.round((materiaalConstanteMetaal + materiaalConstanteKunststof + materiaalConstanteMeerlagen) * (materiaalIndexPerc / 100) * 100) / 100
      : 33.60;

  // 4. Officiële Audatex Eindcalculatie Samenvatting
  const parseAmount = (re: RegExp) => {
    const m = rawText.match(re);
    return m ? Math.abs(parseDutchNumber(m[1])) : 0;
  };

  const onderdelenNetto = parseAmount(/TOTAALBEDRAG\s+O\s*N\s*D\s*E\s*R\s*D\s*E\s*L\s*E\s*N[^\d\n]*([0-9\s.,]+)/i);
  const arbeidNetto = parseAmount(/TOTAALBEDRAG\s+A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N[^\d\n]*([0-9\s.,]+)/i);
  const bijkomendNetto = parseAmount(/TOTAALBEDRAG\s+B\s*I\s*J\s*K\s*O\s*M\s*E\s*N\s*D\s*E\s*K\s*O\s*S\s*T\s*E\s*N[^\d\n]*([0-9\s.,]+)/i);
  const spuitwerkNetto = parseAmount(/TOTAALBEDRAG\s+S\s*P\s*U\s*I\s*T\s*W\s*E\s*R\s*K[^\d\n]*([0-9\s.,]+)/i);
  const milieuNetto = parseAmount(/TOTAALBEDRAG\s+M\s*I\s*L\s*I\s*E\s*U\s*T\s*O\s*E\s*S\s*L\s*A\s*G[^\d\n]*([0-9\s.,]+)/i);
  const totaalExclBtw = parseAmount(/R\s*E\s*P\s*A\s*R\s*A\s*T\s*I\s*E\s*K\s*O\s*S\s*T\s*E\s*N\s+EXCL\.\s*BTW[^\d\n]*([0-9\s.,]+)/i);
  const btwMatch = rawText.match(/BTW\s+([0-9.,]+)\s*%\s+([0-9\s.,]+)/i);
  const btwPercentage = btwMatch ? parseDutchNumber(btwMatch[1]) : 21.0;
  const btwBedrag = btwMatch ? parseDutchNumber(btwMatch[2]) : 0;
  const totaalInclBtw = parseAmount(/R\s*E\s*P\s*A\s*R\s*A\s*T\s*I\s*E\s*K\s*O\s*S\s*T\s*E\s*N\s+INCL\.\s*BTW[^\d\n]*([0-9\s.,]+)/i);

  const aftrekSpuitbedragTZ143 = parseAmount(/AFTREK\s+SPUITBEDRAG\s+([0-9\s.,]+-?)/i);
  const aftrekEersteSchadeTZ95 = parseAmount(/AFTREK\s+EERSTE\s+SCHADE\s+([0-9\s.,]+-?)/i);

  const eindCalcSpuitArbeid = parseAmount(/ARBEIDSLOON\s+([0-9\s.,]+)\r?\n\s*SPUIT-MATERIAALKOSTEN/i) || spuitLoonBedragUitTabel;
  const eindCalcSpuitMateriaal = parseAmount(/SPUIT-MATERIAALKOSTEN\s+([0-9][0-9\s.,]+)\s*$/m);

  const heeftAudatexSamenvatting = totaalExclBtw > 0 && (onderdelenNetto > 0 || arbeidNetto > 0 || spuitwerkNetto > 0);

  const audatexEindcalculatie: AudatexEindcalculatieData | undefined = heeftAudatexSamenvatting ? {
    onderdelenNetto,
    arbeidNetto,
    bijkomendNetto,
    spuitwerkNetto,
    milieuNetto,
    totaalExclBtw,
    btwBedrag,
    totaalInclBtw,
    onderdelenBruto: parseAmount(/O\s*N\s*D\s*E\s*R\s*D\s*E\s*L\s*E\s*N\s+([0-9\s.,]+)\r?\n\s*(?:KORTING|KLEINMATERIAAL)/i),
    onderdelenKorting: parseAmount(/KORTING[^\n]+?([0-9\s.,]+-?)\s*$/m),
    kleinMateriaal: parseAmount(/KLEINMATERIAAL[^\n]*?([0-9.,]+)\s*$/m),
    spuitarbeidNetto: eindCalcSpuitArbeid,
    spuitmateriaalNetto: eindCalcSpuitMateriaal,
    spuitTijdPaneelAE: spuitTijdPaneelAE || undefined,
    spuitVoorbereidingMetaalAE: spuitVoorbereidingMetaalAE || undefined,
    spuitVoorbereidingKunststofAE: spuitVoorbereidingKunststofAE || undefined,
    spuitVoorbereidingMeerlagenAE: spuitVoorbereidingMeerlagenAE || undefined,
    spuitLoonTotaalAE: spuitLoonTotaalAE || undefined,
    materiaalConstanteMetaal: materiaalConstanteMetaal || undefined,
    materiaalConstanteKunststof: materiaalConstanteKunststof || undefined,
    materiaalConstanteMeerlagen: materiaalConstanteMeerlagen || undefined,
    materiaalIndexPerc,
    aftrekSpuitbedragTZ143: aftrekSpuitbedragTZ143 || undefined,
    aftrekEersteSchadeTZ95: aftrekEersteSchadeTZ95 || undefined,
    spuitMateriaalPosten: spuitMateriaalPosten.length > 0 ? spuitMateriaalPosten : undefined
  } : undefined;

  // 5. Calculatieregels uitlezen
  const regels: CalculatieRegel[] = [];
  let regelsIndex = 1;

  // TABEL 1: O N D E R D E L E N
  const partsHeaderIndex = rawText.indexOf('PRIJSLIJST VAN') !== -1
    ? rawText.indexOf('PRIJSLIJST VAN')
    : rawText.search(/O\s*N\s*D\s*E\s*R\s*D\s*E\s*L\s*E\s*N/i);
  if (partsHeaderIndex !== -1) {
    const afterParts = rawText.slice(partsHeaderIndex);
    const stopPartsMatch = afterParts.match(
      /\r?\n\s*(?:A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N|ARB\.?\s*POS\.?\s*NR|S\s*P\s*U\s*I\s*T\s*W\s*E\s*R\s*K|E\s*I\s*N\s*D\s*C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E)/i
    );
    const endPartsIdx =
      stopPartsMatch && stopPartsMatch.index !== undefined
        ? partsHeaderIndex + stopPartsMatch.index
        : Math.min(rawText.length, partsHeaderIndex + 4000);
    const partsBlock = rawText.slice(partsHeaderIndex, endPartsIdx);
    const pLines = partsBlock.split(/\r?\n/);

    for (const pLine of pLines) {
      // Ondersteunt zowel "15.00*" als duizendtallen met spatie "1 245.50" (na min. 1 spatie of 2+ spaties)
      const m =
        pLine.match(/^\s*([0-9]{4})\s+(.+?)\s{2,}([0-9]{1,3}(?:\s[0-9]{3})*[.,][0-9]{2})\*?\s*$/) ||
        pLine.match(/^\s*([0-9]{4})\s+(.+?)\s+([0-9]+[.,][0-9]{2})\*?\s*$/);
      if (m) {
        const code = m[1];
        const rest = m[2].trim();
        const prijs = parseDutchNumber(m[3]);

        let oeNr = '';
        let benaming = rest;
        const oeMatch =
          rest.match(/\s{2,}[:;]?([A-Z0-9-]+(?:\s+[A-Z0-9-]+)*)$/) ||
          rest.match(/\s+[:;]?((?:(?=[A-Z0-9-]*[0-9])[A-Z0-9-]{4,})|(?:[0-9A-Z]{2}(?:\s+[0-9A-Z]{1,4}){2,4}))$/);
        if (oeMatch && /[0-9]/.test(oeMatch[1]) && oeMatch[1].trim().length >= 5) {
          oeNr = oeMatch[1].trim();
          benaming = rest.slice(0, rest.length - oeMatch[0].length).trim();
        }

        const isFoutgeheugen = isFoutgeheugenPost(benaming, code);
        const rawSectie = categorizeSector(benaming, code);
        const isOverige = !isFoutgeheugen && (rawSectie === 'overig' || isOverigeKeuzeHandeling(benaming, code));
        const sectie: SectieType = isFoutgeheugen ? 'voorzijde' : rawSectie;

        regels.push({
          id: `regel-ond-${regelsIndex++}`,
          code,
          omschrijving: benaming,
          sectie,
          isEenmaligePost: isFoutgeheugen || undefined,
          isOverigeHandeling: isOverige || undefined,
          bewerking: 'VERN',
          itemType: 'onderdeel',
          onderdeelPrijs: prijs,
          arbeidPlaatwerkAE: 0,
          arbeidDemontageAE: 0,
          spuittijdAE: 0,
          arbeidPlaatwerkUren: 0,
          arbeidDemontageUren: 0,
          spuittijdUren: 0,
          artikelnummer: oeNr || undefined
        });
      }
    }
  }

  // TABEL 2: A R B E I D S L O O N  (ondersteunt zowel 'A R B E I D S L O O N TIJDBASIS' als 'ARB.POS.NR/ SPECIFICATIE HERSTELWERKZAAMHEDEN')
  const eindCalcMatch = rawText.match(/^\s*E\s+I\s+N\s+D\s+C\s+A\s+L\s+C\s+U\s+L\s+A\s+T\s+I\s+E\b/im);
  const eindCalcIdxAll = eindCalcMatch?.index ?? -1;
  const laborLimit = eindCalcIdxAll !== -1 ? eindCalcIdxAll : rawText.length;
  const preEindText = rawText.slice(0, laborLimit);

  const laborHeaderCandidates = [
    preEindText.match(/A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N\s+TIJDBASIS/i),
    preEindText.match(/ARB\.?\s*POS\.?\s*NR\/?\s+SPECIFICATIE\s+HERSTELWERKZAAMHEDEN/i),
    preEindText.match(/^\s*A\s*R\s*B\s*E\s*I\s*D\s*S\s*L\s*O\s*O\s*N\s*$/im)
  ]
    .filter((m): m is RegExpMatchArray => m !== null && m.index !== undefined)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  if (laborHeaderCandidates.length > 0 && laborHeaderCandidates[0].index !== undefined) {
    const laborHeaderIndex = laborHeaderCandidates[0].index;
    const endCandidates = [
      paintHeaderIndex > laborHeaderIndex ? paintHeaderIndex : Infinity,
      eindCalcIdxAll > laborHeaderIndex ? eindCalcIdxAll : Infinity,
      laborHeaderIndex + 10000
    ];
    const laborEndIdx = Math.min(...endCandidates, rawText.length);
    const laborBlock = rawText.slice(laborHeaderIndex, laborEndIdx);
    const lLines = laborBlock.split(/\r?\n/);

    let currentLaborItem: CalculatieRegel | null = null;
    const flushLaborItem = () => {
      if (currentLaborItem) {
        regels.push(currentLaborItem);
        currentLaborItem = null;
      }
    };
    const isPageNoise = (txt: string) =>
      /SPECIFICATIE\s+HERSTELWERKZAAMHEDEN|TARIEF\/KL|ARB\.?\s*POS\.?\s*NR|^CODE-NR\s+LOON|SYSTEEM\s+AUDATEX|^Pagina\s+\d+\s+van\s+\d+|^--\s*\d+\s+of\s+\d+\s*--|S\s*C\s*H\s*A\s*D\s*E\s*-\s*C\s*A\s*L\s*C|TIJDBASIS\s+\d+\s+AE|BLAD\s+\d+|SCHADENET|AUTOSCHADE|^[_=]{4,}|^TEL:\s*|^EMAIL:|^IBAN:|^\d{6,}$/i.test(
        txt.trim()
      );

    for (const lLine of lLines) {
      const trimmedLine = lLine.trim();
      if (!trimmedLine || isPageNoise(trimmedLine) || trimmedLine.startsWith('---') || /^[_-]{3,}/.test(trimmedLine)) {
        flushLaborItem();
        continue;
      }

      const klMatch = lLine.match(/\s+([12345])\s+([0-9]+(?:[.,][0-9]+)?)\*?\s+([0-9]{1,3}(?:\s[0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})\s*$/);
      const noKlMatch = !klMatch
        ? lLine.match(/\s+([0-9]+(?:[.,][0-9]+)?)\*?\s+([0-9]{1,3}(?:\s[0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})\s*$/)
        : null;
      const endMatch = klMatch || noKlMatch;
      if (endMatch) {
        const beforeEnd = lLine.slice(0, lLine.length - endMatch[0].length).trim();
        const firstSpace = beforeEnd.search(/\s{2,}/);
        let posNr = '';
        let omschrijving = '';

        const cleanAudatexDesc = (s: string) => s.replace(/([A-Za-z]{3,})-\s+([A-Za-z]{2,})/g, '$1$2').trim();

        if (firstSpace !== -1) {
          posNr = beforeEnd.slice(0, firstSpace).replace(/\)+$/, '').trim();
          omschrijving = cleanAudatexDesc(beforeEnd.slice(firstSpace));
        } else {
          const mPos = beforeEnd.match(/^((?:\d{2}\s+\d{2}\s+\d{2,4}[A-Z0-9\)]*)|(?:[0-9]{2,}[A-Z0-9\)]*)|GN)\s+(.+)$/);
          if (mPos) {
            posNr = mPos[1].replace(/\)+$/, '').trim();
            omschrijving = cleanAudatexDesc(mPos[2]);
          } else {
            omschrijving = cleanAudatexDesc(beforeEnd);
          }
        }

        // Negeer niet-relevante regels (bv. kopteksten/adressen die per ongeluk op getal eindigen)
        if (!omschrijving || !/[A-Za-z]{2,}/.test(omschrijving) || (!klMatch && !posNr)) {
          flushLaborItem();
          continue;
        }

        flushLaborItem();

        const kl = klMatch ? parseInt(klMatch[1], 10) : 3;
        const ae = parseDutchNumber(klMatch ? klMatch[2] : noKlMatch![1]);
        const bedrag = parseDutchNumber(klMatch ? klMatch[3] : noKlMatch![2]);

        const isFoutgeheugen = isFoutgeheugenPost(omschrijving, posNr);
        const rawSectie = categorizeSector(omschrijving, posNr);
        const isOverige = !isFoutgeheugen && (rawSectie === 'overig' || isOverigeKeuzeHandeling(omschrijving, posNr));
        const sectie: SectieType = isFoutgeheugen ? 'voorzijde' : rawSectie;

        let bewerking: BewerkingType = 'DIV';
        const upper = omschrijving.toUpperCase();
        if (upper.includes('HERSTELLEN') || upper.includes('RICHTEN') || upper.includes('PLAATWERK')) {
          bewerking = 'HERST';
        } else if (
          upper.includes('UIT-/INBOUWEN') ||
          upper.includes('UIT-/INB') ||
          upper.includes('UIT-/IN') ||
          upper.includes('UIT/IN') ||
          upper.includes('UITBOUWEN') ||
          upper.includes('INBOUWEN') ||
          upper.includes('D+M') ||
          upper.includes('DE/MONTEREN') ||
          upper.includes('CONTROLEREN') ||
          upper.includes('AFSTELLEN')
        ) {
          bewerking = 'DM';
        } else if (upper.includes('VERNIEUWEN') || upper.includes('VERVANGEN')) {
          bewerking = 'VERN';
        }

        currentLaborItem = {
          id: `regel-arb-${regelsIndex++}`,
          code: posNr,
          omschrijving,
          sectie,
          isEenmaligePost: isFoutgeheugen || undefined,
          isOverigeHandeling: isOverige || undefined,
          bewerking,
          itemType: 'arbeid',
          onderdeelPrijs: 0,
          arbeidPlaatwerkAE: bewerking === 'HERST' ? ae : 0,
          arbeidDemontageAE: bewerking !== 'HERST' ? ae : 0,
          spuittijdAE: 0,
          arbeidPlaatwerkUren: bewerking === 'HERST' ? ae / 10 : 0,
          arbeidDemontageUren: bewerking !== 'HERST' ? ae / 10 : 0,
          spuittijdUren: 0,
          arbeidsloonBedrag: bedrag,
          klasse: kl
        };
      } else if (
        currentLaborItem &&
        (lLine.match(/^\s{5,}/) ||
          trimmedLine.startsWith('(') ||
          trimmedLine.startsWith('OMVAT'))
      ) {
        if (
          trimmedLine &&
          !isPageNoise(trimmedLine) &&
          !/A\.A\.S\.|AUTOSCHADE|RODEN|LEEUWARDEN|CEINTUURBAAN|JUPITERWEG|BLAD\s+\d+/i.test(trimmedLine)
        ) {
          currentLaborItem.omschrijving = (currentLaborItem.omschrijving + ' ' + trimmedLine).replace(/([A-Za-z]{3,})-\s+([A-Za-z]{2,})/g, '$1$2').trim();
        }
      }
    }
    flushLaborItem();
  }

  // TABEL 3: S P U I T W E R K
  if (paintBlock) {
    const spLines = paintBlock.split(/\r?\n/);

    for (const spLine of spLines) {
      if (spLine.includes('SPUITTIJD') || spLine.includes('VOORBER') || spLine.includes('TOTAAL') || spLine.includes('SPUITLOON') || spLine.includes('SPUIT-MATERIAALKOSTEN')) {
        continue;
      }

      // Ondersteunt o.a.:
      // - 2-koloms herstelspuitwerk: "0281 BUMPER V HERSTELSP. KUNSTSTOF 10 30*" -> spuitAE = 10 (eerste getal!)
      // - 1-koloms: "0283 BUMPER V SPUITEN NA VERN. SV1 14", "0471 MOTORKAP SPUITEN NA VERN. 13.0", "0471 TIJDTOESLAG KRASVASTE LAK 5*"
      const mTwo =
        spLine.match(/^\s*([0-9]{4})\s+(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+([0-9]+(?:[.,][0-9]+)?\*)\s*$/) ||
        spLine.match(/^\s*([0-9]{4})\s+(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s{2,}([0-9]+(?:[.,][0-9]+)?)\*?\s*$/);
      const mOne = !mTwo
        ? spLine.match(/^\s*([0-9]{4})\s+(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\*?\s*$/)
        : null;
      const m = mTwo || mOne;
      if (m) {
        const code = m[1];
        const omschrijving = m[2].trim().replace(/\s{2,}/g, ' — ');
        const spuitAE = parseDutchNumber(m[3]);
        const upperOmsch = omschrijving.toUpperCase();

        // Extract spuitfase
        let spuitFase = '';
        const faseMatch = upperOmsch.match(/\b(SV1|SV2|SV3|SV4|SH1|SH|SV|LB|LS|NL)\b/);
        if (faseMatch) {
          spuitFase = faseMatch[1];
        } else if (upperOmsch.includes('KRASVASTE LAK')) {
          spuitFase = 'NL';
        } else if (upperOmsch.includes('UITSPUITEN')) {
          spuitFase = 'LB';
        } else if (upperOmsch.includes('DEKLAAG')) {
          spuitFase = 'S';
        } else if (upperOmsch.includes('SPOT')) {
          spuitFase = 'LS';
        } else if (upperOmsch.includes('HERST')) {
          spuitFase = 'SH';
        } else if (upperOmsch.includes('VERN')) {
          spuitFase = 'SV';
        }

        // Indien omschrijving onduidelijk is, erven we de zone uit een eerder onderdeel/arbeidspost met dezelfde code
        let sectie = categorizeSector(omschrijving, code);
        if (sectie === 'overig') {
          const prevSameCode = regels.find(r => r.code === code && r.sectie !== 'overig');
          if (prevSameCode) sectie = prevSameCode.sectie;
        }

        const bewerking: BewerkingType =
          upperOmsch.includes('UITSPUITEN') ? 'UITSP' :
          upperOmsch.includes('SPOT') ? 'LS' :
          upperOmsch.includes('HERST') ? 'SPH' : 'SP';

        const materiaalSoort = detectMateriaalSoort(omschrijving, spuitFase);

        regels.push({
          id: `regel-spuit-${regelsIndex++}`,
          code,
          omschrijving: `Spuiten: ${omschrijving}`,
          sectie,
          bewerking,
          itemType: 'spuitwerk',
          spuitFase,
          materiaalSoort,
          onderdeelPrijs: 0,
          arbeidPlaatwerkAE: 0,
          arbeidDemontageAE: 0,
          spuittijdAE: spuitAE,
          arbeidPlaatwerkUren: 0,
          arbeidDemontageUren: 0,
          spuittijdUren: spuitAE / 10,
          arbeidsloonBedrag: Math.round(spuitAE * spuitTariefPerAE * 100) / 100
        });
      }
    }
  }

  // Context-bewuste V-vs-A herindeling wanneer Voorzijde & Achterzijde op dezelfde flank (alleen L of alleen R) voorkomen
  const reconciledRegels = reconcileFrontRearZones(regels);
  if (reconciledRegels !== regels) {
    regels.splice(0, regels.length, ...reconciledRegels);
  }

  // BIJKOMENDE KOSTEN (TZ 60-74: Anti-roestbehandeling, Bescherming holle ruimte, Uitlijnen, Transport, etc.)
  const bijkomendIdx = rawText.search(/^\s*B\s*I\s*J\s*K\s*O\s*M\s*E\s*N\s*D\s*E\s+K\s*O\s*S\s*T\s*E\s*N\s*$/im);
  const bijkomendeOmschrijvingen: string[] = [];
  if (bijkomendIdx !== -1) {
    const endBijk = rawText.indexOf('TOTAALBEDRAG', bijkomendIdx);
    const bijkBlock = rawText.slice(bijkomendIdx, endBijk !== -1 ? endBijk : bijkomendIdx + 500);
    const bLines = bijkBlock.split(/\r?\n/);

    // Check of plaatwerk/roestbehandeling eenduidig bij één voertuigzone hoort
    const metalRepairZones = VOERTUIG_ZONES.filter(z =>
      regels.some(
        r => r.sectie === z && (r.bewerking === 'HERST' || (r.itemType === 'spuitwerk' && r.materiaalSoort === 'metaal'))
      )
    );

    for (const bLine of bLines) {
      const bm = bLine.match(/^\s+([A-Z][A-Z0-9\s\-\/]+?)\s+([0-9]{1,3}(?:\s[0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})\s*$/i);
      if (bm && !/BIJKOMENDE\s+KOSTEN/i.test(bm[1])) {
        const oms = bm[1].trim();
        const bedrag = parseDutchNumber(bm[2]);
        bijkomendeOmschrijvingen.push(oms);
        const isFoutgeheugen = isFoutgeheugenPost(oms);
        const rawSectie = categorizeSector(oms);
        let bijkSectie: SectieType = rawSectie;

        if (isFoutgeheugen) {
          bijkSectie = 'voorzijde';
        } else if (rawSectie === 'overig' && oms.toUpperCase().includes('ROEST')) {
          bijkSectie = metalRepairZones.length === 1 ? metalRepairZones[0] : 'overig';
        }

        const isOverige = !isFoutgeheugen && (bijkSectie === 'overig' || isOverigeKeuzeHandeling(oms));

        regels.push({
          id: `regel-bijk-${regelsIndex++}`,
          code: oms.toUpperCase().includes('ROEST') ? 'TZ 70' : oms.toUpperCase().includes('UITLIJN') ? 'TZ 74' : 'TZ 60+',
          omschrijving: `${oms} (Bijkomende kosten)`,
          sectie: bijkSectie,
          isEenmaligePost: isFoutgeheugen || undefined,
          isOverigeHandeling: isOverige || undefined,
          bewerking: 'DIV',
          itemType: 'bijkomend',
          onderdeelPrijs: bedrag,
          arbeidPlaatwerkAE: 0,
          arbeidDemontageAE: 0,
          spuittijdAE: 0,
          arbeidPlaatwerkUren: 0,
          arbeidDemontageUren: 0,
          spuittijdUren: 0
        });
      }
    }
  }

  // Fallback indien geen enkele regel herkend werd
  if (regels.length === 0) {
    return null;
  }

  const { schade1Zone, schade2Zone } = detectDefaultSchadeZones(regels);
  const s1Label = ZONE_LABELS[schade1Zone];
  const s2Label = ZONE_LABELS[schade2Zone];
  const populatedZoneCount = VOERTUIG_ZONES.filter(z => regels.some(r => r.sectie === z)).length;

  // 6. Solera Richtlijn Tekstzone 143 / 95 Aanbeveling
  const advies =
    populatedZoneCount <= 1
      ? `Enkelvoudige calculatie (${s1Label}): alle posities en de volledige materiaalconstante (€ ${materiaalconstante.toFixed(2)}) zijn 100% toegewezen aan ${s1Label}.`
      : `Conform Solera AZT-richtlijn voor meerdere schades: De hoofdmateriaalconstante (€ ${materiaalconstante.toFixed(2)}) is toegewezen aan ${s1Label} (Schade 1) conform de actieve verdeelmethode. Bij twee separate calculaties die in één spuitgang worden hersteld, voorkomt Tekstzone 143 (-€ ${materiaalconstante.toFixed(2)}) op ${s2Label} (Schade 2) dubbele vergoeding; bij één complete calculatie kan Tekstzone 95 worden ingezet.`;
  const invoerTekst143 =
    populatedZoneCount <= 1
      ? `Geen TZ 143 aftrek nodig (enkelvoudige calculatie: ${s1Label}, kenteken ${kenteken})`
      : `TZ 143 (${s2Label}): -${materiaalconstante.toFixed(2)} EUR (Aftrek AZT materiaalconstante gecombineerde spuitgang met ${s1Label}, kenteken ${kenteken})`;

  const spuitMateriaalTotaal = audatexEindcalculatie?.spuitmateriaalNetto || 0;
  const spuitTijdSom = spuitLoonTotaalAE || regels.filter(r => r.itemType === 'spuitwerk').reduce((s, r) => s + (r.spuittijdAE || 0), 0);

  return {
    meta: {
      kenteken,
      merkModel,
      chassisnummer,
      calculatienummer,
      dossiernummer,
      datumCalculatie,
      datumSchade,
      expertHersteller,
      laksoort,
      kleurcode: 'Standaard lak',
      kilometerstand,
      bouwjaar,
      usCodes: usCodes.length > 0 ? usCodes : undefined,
      actieveTekstzones: actieveTekstzones.length > 0 ? actieveTekstzones : undefined
    },
    tarieven: {
      plaatwerktarief: uurtarief,
      demontagetarief: uurtarief,
      spuittarief: spuitUurtarief,
      spuitmateriaaltarief: 49.50,
      materiaalconstante,
      kleinMateriaalPerc,
      milieutoeslag: milieuNetto,
      btwPercentage,
      tariefPerAE,
      milieuTariefPerAE,
      onderdelenKortingPerc,
      bijkomendeKosten: bijkomendNetto,
      bijkomendeKostenOmschrijving: bijkomendeOmschrijvingen.join(', ') || 'Bijkomende kosten',
      spuitmateriaalTotaal: spuitMateriaalTotaal,
      spuittijdTotaalAE: spuitTijdSom
    },
    materiaalconstanteMethode: 'proportioneel_spuittijd',
    schade1Zone,
    schade2Zone,
    soleraAanbeveling: {
      titel: 'Solera Richtlijn Meerdere Schades (Tekstzone 143 / TZ 95)',
      tekstzone: 'TZ 143',
      advies,
      invoerTekst143
    },
    audatexEindcalculatie,
    regels: applySchade1Selection(regels, schade1Zone, schade2Zone)
  };
}
