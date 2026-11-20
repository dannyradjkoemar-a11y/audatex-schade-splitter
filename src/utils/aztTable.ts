/**
 * Solera AZT NL I/2013 Voorbereidingstijden, Extra Bewerkingen, Codekaart (apr 2024)
 * en officiële Solera Audatex richtlijnen (2022 - 2026)
 */

export type Laksysteem = '2-lagen' | '1-laags' | '3-lagen' | '4-lagen';
export type Materiaalsoort = 'metaal' | 'kunststof';
export type SituatieMontage = 
  | 'aan_voertuig_zonder_voorspuiten'
  | 'aan_voertuig_met_voorspuiten'
  | 'uitgebouwd';

export interface AztVoorbereidingRegel {
  laksysteem: '2-lagen' | '1-laags';
  materiaalsoort: Materiaalsoort;
  situatie: SituatieMontage;
  standaardAE: number;
  binnendeelAE: number;
}

// Officiële Solera AZT NL I/2013 voorbereidingstijden tabel
export const AZT_VOORBEREIDINGSTIJDEN: AztVoorbereidingRegel[] = [
  // 2-lagen laksysteem (basis voor 2-lagen, 3-lagen en 4-lagen in NL)
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'metaal',
    situatie: 'aan_voertuig_zonder_voorspuiten',
    standaardAE: 23,
    binnendeelAE: 13
  },
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'metaal',
    situatie: 'aan_voertuig_met_voorspuiten',
    standaardAE: 27,
    binnendeelAE: 13
  },
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'metaal',
    situatie: 'uitgebouwd',
    standaardAE: 11,
    binnendeelAE: 11
  },
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'kunststof',
    situatie: 'aan_voertuig_zonder_voorspuiten',
    standaardAE: 23,
    binnendeelAE: 13
  },
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'kunststof',
    situatie: 'aan_voertuig_met_voorspuiten',
    standaardAE: 27,
    binnendeelAE: 17
  },
  {
    laksysteem: '2-lagen',
    materiaalsoort: 'kunststof',
    situatie: 'uitgebouwd',
    standaardAE: 14,
    binnendeelAE: 11
  },

  // 1-laags laksysteem
  {
    laksysteem: '1-laags',
    materiaalsoort: 'metaal',
    situatie: 'aan_voertuig_zonder_voorspuiten',
    standaardAE: 17,
    binnendeelAE: 8
  },
  {
    laksysteem: '1-laags',
    materiaalsoort: 'metaal',
    situatie: 'aan_voertuig_met_voorspuiten',
    standaardAE: 19,
    binnendeelAE: 8
  },
  {
    laksysteem: '1-laags',
    materiaalsoort: 'metaal',
    situatie: 'uitgebouwd',
    standaardAE: 7,
    binnendeelAE: 7
  },
  {
    laksysteem: '1-laags',
    materiaalsoort: 'kunststof',
    situatie: 'aan_voertuig_zonder_voorspuiten',
    standaardAE: 17,
    binnendeelAE: 8
  },
  {
    laksysteem: '1-laags',
    materiaalsoort: 'kunststof',
    situatie: 'aan_voertuig_met_voorspuiten',
    standaardAE: 19,
    binnendeelAE: 10
  },
  {
    laksysteem: '1-laags',
    materiaalsoort: 'kunststof',
    situatie: 'uitgebouwd',
    standaardAE: 10,
    binnendeelAE: 7
  }
];

// Toeslag gecombineerde spuitgang tweede materiaalsoort / Spot Repair (AZT NL I/2013)
export const TWEEDE_MATERIAALSOORT_TOESLAG: Record<'2-lagen' | '1-laags', {
  standaard: number;
  sv1OfBinnendeel: number;
  spotRepair: number;
}> = {
  '2-lagen': {
    standaard: 8, // + 8 AE (SV, SH, SH1 / SV2/3/4, SH)
    sv1OfBinnendeel: 5, // + 5 AE (SV1, S / Binnendeel)
    spotRepair: 5 // + 5 AE naast uitgebouwde delen
  },
  '1-laags': {
    standaard: 6, // + 6 AE
    sv1OfBinnendeel: 3, // + 3 AE
    spotRepair: 4
  }
};

// Extra voorbereidingswaarden bij hoofdbewerking (AZT NL I/2013)
export const AZT_VOORBEREIDING_EXTRA_WAARDEN = [
  { omschrijving: '2-kleuren spuiten', eenLaagsAE: 1, tweeLagenAE: 1 },
  { omschrijving: 'Lak aanmaken t.b.v. 2-kleuren spuiten', eenLaagsAE: 2, tweeLagenAE: 3 },
  { omschrijving: 'Proefstaal spuiten t.b.v. 2-kleuren spuiten', eenLaagsAE: 2, tweeLagenAE: 3 },
  { omschrijving: 'Afplakwerkzaamheden aan kunststofdeel', eenLaagsAE: 2, tweeLagenAE: 2 },
  { omschrijving: 'Oppervlakte bewerkingstijd per Spot Repair (LS)', eenLaagsAE: 9, tweeLagenAE: 9 }
];

// Solera AZT Extra Bewerkingen (Werkblad toepassing extra bewerkingen AZT 2025/2026)
export const AZT_EXTRA_BEWERKINGEN = [
  {
    code: 'S 9958',
    omschrijving: 'Afplakwerkzaamheden Kunststof aanbouwdeel',
    standaardAE: 2,
    toelichting: '2 AE per kunststofdeel bij gedeeltelijk spuiten (bijv. deel van bumper), anders gekleurde lijsten, op-/aangebouwde delen (spiegels) of ingebouwde kunststof-carrosseriedelen.'
  },
  {
    code: 'S 9972',
    omschrijving: 'Afplakwerkzaamheden Ruiten',
    standaardAE: 2,
    toelichting: '2 AE per gelijmde ruit (rubber/rand afplakken). Bij meerdere gelijmde ruiten telkens met 2 AE ophogen.'
  },
  {
    code: 'S 9959',
    omschrijving: 'Extra Proefstaal spuiten',
    standaardAE: 3,
    toelichting: 'Bij afwijkende/lastige kleuren (wit-parelmoer, rode mica, 3-/4-laags), 2e carrosseriekleur of matte lakgradatie.'
  },
  {
    code: 'S 9960',
    omschrijving: 'Extra Kleur mengen',
    standaardAE: 3,
    toelichting: 'Als een 2e kleur wordt aangemaakt (bijv. afwijkend dak zoals Mini/Fiat 500, zwart matte grille of velgschade).'
  }
];

export const EXTRA_SPUITBEWERKINGEN = AZT_EXTRA_BEWERKINGEN;

// Kunststof spuitfasen AZT (bron: AZT spuitmateriaal 2026 pagina 3)
export const AZT_SPUITFASEN_KUNSTSTOF = [
  {
    code: 'SV1',
    fase: 'Nieuw spuiten',
    aanlevering: 'Nieuw deel is gegrond, of nieuw deel is niet gegrond (ruw, enkel hechtlaag)',
    werkzaamheden: 'Kleur-/blanke lak aanbrengen, of 1-K hechtmiddel en kleurlak nat-in-nat aanbrengen.'
  },
  {
    code: 'SV2',
    fase: 'Nieuw spuiten',
    aanlevering: 'Nieuw deel is niet gegrond (kan gestructureerd zijn), dekking onvoldoende of voorgeschreven grijstint ondergrond',
    werkzaamheden: '1-K hechtmiddel + vuller/grondlakvuller en kleurlak (nat-in-nat, zonder schuren).'
  },
  {
    code: 'SV3',
    fase: 'Nieuw spuiten',
    aanlevering: 'Nieuw deel is niet gegrond en niet gestructureerd',
    werkzaamheden: '1-K hechtmiddel + vuller/grondlakvuller, drogen en schuren, daarna kleurlak aanbrengen.'
  },
  {
    code: 'SV4',
    fase: 'Nieuw spuiten',
    aanlevering: 'Nieuw deel is PUR / zacht schuim',
    werkzaamheden: 'Uitgebreide reiniging, poriën vullen, hoge elastificatie, 1-K hechtmiddel + vuller, drogen/schuren, kleurlak.'
  },
  {
    code: 'S',
    fase: 'Deklaag spuiten',
    aanlevering: 'Kleine oppervlaktebeschadigingen of overspuiten in een andere kleur (reeds gespoten kunststofdeel)',
    werkzaamheden: 'Oude laklaag schuren, kleurlak + blanke lak aanbrengen.'
  },
  {
    code: 'SH',
    fase: 'Herstelspuiten',
    aanlevering: 'Krassen/schaafplekken (< 1 mm diep), max 2 dm² (kleine delen) tot max 15% oppervlak (grote delen zoals bumper). Let op: SH1 bestaat NIET voor kunststof!',
    werkzaamheden: 'Schadegebied schuren, 1-K hechtmiddel, mesplamuur + schuren, grondlakvuller, drogen/schuren, kleurlak.'
  }
];

// Metalen delen spuitfasen AZT & Overdrachtsconditie
export const AZT_SPUITFASEN_METAAL = [
  {
    code: 'SV',
    omschrijving: 'Spuiten na vernieuwen (staal of aluminium)',
    toelichting: 'Gelast of geschroefd nieuw deel (incl. binnenzijde indien nodig). Bij nieuw gelaste delen is de lasnaadomgeving tot 10 cm (handbreedte) inbegrepen. Inclusief eventuele anti-steenslaglaag onder de kleurlak (bijv. hele dorpel).'
  },
  {
    code: 'S',
    omschrijving: 'Deklaag spuiten (100% van het oppervlak)',
    toelichting: 'Gehele paneel voorzien van nieuwe kleur-/blanke laklaag zonder plamuurwerk (lichte beschadigingen niet door de kleurlaag, of tussenliggend deel bij uitspuiten).'
  },
  {
    code: 'SH',
    omschrijving: 'Spuiten na herstellen (≤ 50% plamuur-/hersteloppervlak)',
    toelichting: 'Plaatwerker levert spuitklaar af (geen haakse slijper, max korrel P120). Spuiter voltooit in max. 3 fasen plamuur/vuller. Bij anti-steenslaglaag onder kleurlak: verwijderen apart als hersteltijd (H) opnemen!'
  },
  {
    code: 'SH1',
    omschrijving: 'Spuiten na herstellen (> 50% plamuur-/hersteloppervlak)',
    toelichting: 'Alleen toepasbaar op metalen plaatwerkdelen (niet op kunststof). Ook vereist bij herstel van volledige dorpel met nieuwe anti-steenslaglaag onder kleurlak.'
  }
];

// US-codes Spuitmethodiek bij geschroefde delen (Class 3.32)
export const AZT_US_SPUITMETHODIEK = [
  {
    usCode: 'Y8',
    titel: 'Alleen uitgebouwd spuiten',
    positieVoertuig: 'Voertuig NIET in spuitcabine',
    toelichting: 'Alle gespoten delen worden gedemonteerd op standaard gespoten (bijv. alleen bumpers of los spatscherm).',
    voorbereiding2Lagen: 'Metaal 11 AE • Kunststof 14 AE'
  },
  {
    usCode: 'Y7',
    titel: 'Uitgebouwd voorspuiten / afspuiten i.c.m. voertuig',
    positieVoertuig: 'Voertuig IN spuitcabine',
    toelichting: 'Carrosseriedelen worden uitgebouwd voorgespoten en aan het voertuig afgespoten, óf uitgebouwde delen worden gecombineerd met spuiten aan het voertuig.',
    voorbereiding2Lagen: 'Metaal 27 AE • Kunststof 27 AE'
  },
  {
    usCode: 'GEEN',
    titel: 'Alleen aan het voertuig spuiten',
    positieVoertuig: 'Voertuig IN spuitcabine',
    toelichting: 'Alle gespoten delen zitten gemonteerd aan de carrosserie. NB: Bij combinatie van carrosserie- en aanbouwdelen zijn de carrosseriedelen bepalend!',
    voorbereiding2Lagen: 'Metaal 23 AE • Kunststof 23 AE'
  }
];

export const AZT_CARROSSERIE_VS_AANBOUW = {
  carrosseriedelen: [
    'Spatschermen', 'Motorkap', 'Dak', 'Portieren', 'Dorpels',
    'Achterzijpanelen', 'Stijlen', 'Achtertussenpanelen', 'Achterklep'
  ],
  aanbouwdelen: [
    'Bumpers', 'Grille', 'Tankklep / oplaadklep', 'Spoilers',
    'Dorpelverbreders', 'Stootlijsten', 'Sierlijsten', 'Portiergrepen',
    'Buitenspiegels', 'Velgen'
  ],
  tankklepRegel: 'Wordt een tank-/oplaadklep aan het voertuig meegespoten met het omliggende zijpaneel/spatscherm, dan is opgeven van het omliggende deel voldoende. Wordt de klep los gespoten, dan spuiten apart opgeven naast vernieuwen / uit- en inbouwen.'
};

// 3-lagen en 4-lagen laksysteem (US-codes Z6, Y9)
export const AZT_MEERLAGEN_LAKSYSTEMEN = [
  {
    usCode: 'Z6',
    type: '3-lagen lak (mica / parelmoer / gekleurde blanke lak)',
    voorbereidingExtra: '+1 AE Voorbereiding meerlagen + Materiaalconstante meerlagen (ca. € 20,60 naast metaal)',
    methoden: [
      { code: 'WW', naam: 'Nat-in-Nat (standaard in Qapter)', toepassing: 'Voorkleur + kleurlaag of 2 blanke laklagen nat-in-nat gespoten.' },
      { code: 'DP', naam: 'Drogen / Schuren', toepassing: 'Voorkleur of eerste blanke laklaag eerst drogen en schuren voor volgende laag.' }
    ]
  },
  {
    usCode: 'Y9',
    type: '4-lagen lak (metallic / mica met voorkleur en 2 blanke lagen)',
    voorbereidingExtra: '+1 AE Voorbereiding meerlagen + Materiaalconstante meerlagen',
    methoden: [
      { code: 'WW', naam: 'Nat-in-Nat (standaard in Qapter)', toepassing: 'Alle 4 lagen in één nat-in-nat proces.' },
      { code: 'PP', naam: 'Gedeeltelijk Nat-in-Nat & Drogen/Schuren', toepassing: 'Óf voorkleur drogen/schuren + blanke lagen nat-in-nat, óf eerste blanke laag drogen/schuren.' },
      { code: 'DP', naam: 'Volledig Drogen / Schuren', toepassing: 'Zowel voorkleur als eerste blanke laklaag afzonderlijk drogen en schuren.' }
    ]
  }
];

// Krasvaste lak (Nano lak - US code Z1 / Mutatiecode NL)
export const AZT_KRASVASTE_LAK = {
  usCode: 'Z1',
  mutatieCode: 'NL',
  voorwaarde: 'Alleen voor metalen plaatwerkdelen (niet voor kunststof bumpers/stootlijsten), bij minimaal 2-lagen laksysteem en spuitcodes S, SH of SH1.',
  standaardToeslagLiggendAE: 3, // Motorkap, dak, achterklep/kofferdeksel
  standaardToeslagStaandAE: 1, // Spatscherm, portier, achterzijpaneel
  opmerking: 'In Qapter aanpasbaar via mutatiecode NL (wordt op de calculatie getoond als bv. "TIJDTOESLAG KRASVASTE LAK 5*").'
};

// Bewerkingscode LB: Uitspuiten vs S (Deklaag)
export const AZT_UITSPUITEN_LB = {
  tweeLaags: 'Bij 2-lagen laksysteem maakt AZT geen onderscheid tussen uitspuiten en deklaag: gebruik altijd bewerkingscode "S".',
  meerLaags: 'Bij 3- en 4-lagen laksysteem (Z6/Y9) wordt het eindpunt van de uitspuitzone (ca. 50% oppervlak) met code "LB" opgegeven; een volledig mee te spuiten tussenliggend deel (bijv. achterportier tussen nieuw voorportier en achterscherm) krijgt code "S".',
  berekeningsbasis: 'De spuittijd- en materiaalvergoeding van LB komt overeen met deklaag spuiten (S) van een 2-lagen-systeem.'
};

// Spot-Repair (Bewerkingscode LS)
export const AZT_SPOT_REPAIR = {
  code: 'LS',
  omschrijving: 'Lackieren Spot = Spot-Repair (max. werkoppervlak 6 dm² / A4-formaat, zonder uitspuiten aangrenzende delen)',
  geschiktVoor: '2-laags uni-, metallic- en mica-kleuren aan de rand of profilering van een deel.',
  nietInbegrepen: 'Uit- en inbouwen van onderdelen valt niet binnen de spot-repairtijd.',
  zones: [
    { zone: 'Zone A', delen: 'Motorkap, dak, kofferdeksel / achterklep', geschiktheid: 'Minder geschikt' },
    { zone: 'Zone B', delen: 'Bovenste helft van staande delen (spatschermen, portieren, zijpanelen, stijlen, grille)', geschiktheid: 'Beperkt geschikt' },
    { zone: 'Zone C', delen: 'Onderste helft van staande delen, bumpers, dorpels en binnendelen', geschiktheid: 'Geschikt zonder beperkingen' }
  ],
  calculatieWaarden: [
    { post: 'Voorbereiding Spot-repair', tijdAE: 5, materiaalEen: '€ 16,60', materiaalTwee: '€ 16,60' },
    { post: 'Kleurmengen (watergedragen lak)', tijdAE: 3, materiaalEen: '-', materiaalTwee: '-' },
    { post: 'Proefstaal (watergedragen lak)', tijdAE: 3, materiaalEen: '€ 1,70', materiaalTwee: '€ 1,70' },
    { post: 'Spot-repair per spot (1e / 2e spot)', tijdAE: 9, materiaalEen: '€ 2,53 (tot. 20 AE / € 20,83*)', materiaalTwee: '€ 5,06 (tot. 29 AE / € 23,36)' }
  ]
};

// Audatex Codekaart (Versie: april 2024)
export const AUDATEX_CODEKAART = {
  bijzondereBewerkingscodes: [
    { code: 'BV', omschrijving: 'Maakt van een V (Vernieuwen) een B (De/monteren)' },
    { code: 'CV', omschrijving: 'Maakt van een V een C (Reinigen/controleren)' },
    { code: 'HV', omschrijving: 'Maakt van een V een H (Herstellen)' },
    { code: 'SVV', omschrijving: 'Maakt van een V een S (Spuiten)' },
    { code: 'S0', omschrijving: 'Onderdrukken spuitwerk' },
    { code: 'SB', omschrijving: 'Spuitwerk nog bruikbaar' },
    { code: 'LB', omschrijving: 'Uitspuiten aangrenzend deel (gedeeltelijk spuiten bij 3-/4-lagen lak)' },
    { code: 'SH1', omschrijving: 'Spuiten na herstel > 50% plamuuroppervlak (niet voor kunststof AZT)' },
    { code: 'D', omschrijving: 'Uitdeuken Zonder Spuiten (UZS)' },
    { code: 'LS', omschrijving: 'Spot repair (max. 6 dm², zonder uitspuiten aangrenzende delen)' }
  ],
  mutatiecodes: [
    { code: 'MM / WM', omschrijving: 'Toeslag (%) / Aftrek (%) op onderdeel' },
    { code: 'PM / UM', omschrijving: 'Aftrek (%) / Toeslag (%) op onderdeel incl. extra onderdelen' },
    { code: 'VM / BM', omschrijving: 'Mutatie onderdeelprijs (€) / Onderdeelprijs mutatie met orig. prijs op controleblad' },
    { code: 'FO / PZ', omschrijving: 'Onderdeelprijs onderdrukken / Onderdeel zonder korting toeslag TZC 122' },
    { code: 'GM / HM / SM', omschrijving: 'Opgave (€) spuitmateriaal / reparatie / spuitloon (excl. mat. & VBT)' },
    { code: 'AM / QM / NL', omschrijving: 'AZT (TZ 51): Aftrek NVO spuitwerk (€), Mutatie oppervlakte (dm²), Extra AE krasvaste lak (AE)' }
  ],
  controlegegevens: [
    { code: 'O', omschrijving: 'Ontbrekende bewerking' },
    { code: 'EL', omschrijving: 'Geëlimineerde bewerking' },
    { code: 'DO', omschrijving: 'Dubbel opgevoerde bewerking' },
    { code: 'OB', omschrijving: 'Opgenomen bewerking (reeds in andere positie vervat)' },
    { code: 'E', omschrijving: 'Extra bewerking' }
  ],
  tekstzonecodes: [
    { code: '02', categorie: 'Reparatiekosten', omschrijving: 'Wijziging BTW (%)' },
    { code: '20 / 21', categorie: 'Onderdelen', omschrijving: 'Korting (%) / Toeslag (%) op totaalbedrag onderdelen' },
    { code: '26 / 28 / 93', categorie: 'Onderdelen', omschrijving: 'Kleinmateriaal ondergrens (€), % van onderdelenbedrag, bovengrens (€)' },
    { code: '51', categorie: 'Spuitmateriaal', omschrijving: 'AZT spuitsysteem (% materiaalindex, standaard 100% of bijv. 90%)' },
    { code: '70 / 71', categorie: 'Overige kosten', omschrijving: 'Anti-roestbehandeling (€) / Anti-roestbehandeling carrosserie (€)' },
    { code: '72 / 73 / 74', categorie: 'Overige kosten', omschrijving: 'Bescherming holle ruimte (€) / carrosserie (€) / Uitlijnen (€)' },
    { code: '90', categorie: 'Reparatiekosten', omschrijving: 'Begrotingskosten reparateur (AE)' },
    { code: '91', categorie: 'Reparatiekosten', omschrijving: 'Aftrek eigen risico (€)' },
    { code: '95', categorie: 'Reparatiekosten', omschrijving: 'Aftrek eerste schade (€) bij één complete Audatex-calculatie met meerdere schades' },
    { code: '123 / 124', categorie: 'Reparatiekosten', omschrijving: 'Milieutoeslag (€/AE): KL 1-4 arbeids-/spuitloon (123) of KL 5 UZS (124)' },
    { code: '143', categorie: 'Spuitloon', omschrijving: 'Aftrek/Toeslag spuitbedrag (€) bij separate calculaties die in één doorgang worden gespoten' }
  ]
};

export interface AftrekSchadeInvoer {
  naam: string;
  materiaalsoort: Materiaalsoort;
  situatie: SituatieMontage;
  voorbereidingstijdAE: number;
  materiaalconstante: number;
}

export interface AftrekResultaat {
  aftrekVoorbereidingstijdAE: number;
  somVoorbereidingstijdAE: number;
  gecombineerdeVoorbereidingstijdAE: number;
  hoofdbewerkingAE: number;
  toeslagTweedeMateriaalAE: number;
  
  dubbeleMateriaalconstanteAftrek: number;
  heeftDubbeleConstante: boolean;
  toelichtingConstante: string;
  
  tariefPerAE: number;
  aftrekBedragVoorbereidingstijd: number;
  kortingPercentage: number;
  totaalAftrekBedragTZ143: number;
  
  stappen: string[];
  korteConclusie: string;
  tz95Opmerking: string;
}

/**
 * Berekent de exacte aftrek bij meerdere schades conform Solera AZT normen (TZ 143 & TZ 95).
 */
export function berekenMeerdereSchadesAftrek(
  schade1: AftrekSchadeInvoer,
  schade2: AftrekSchadeInvoer,
  tariefPerUur: number = 88.10,
  aePerUur: number = 10,
  kortingSpuitmateriaalPerc: number = 0,
  laksysteem: Laksysteem = '2-lagen',
  isKunststofSV1OfBinnendeel: boolean = false
): AftrekResultaat {
  const tariefPerAE = tariefPerUur / aePerUur;
  const baseLaksysteem: '2-lagen' | '1-laags' = laksysteem === '1-laags' ? '1-laags' : '2-lagen';
  const extraMeerlagenAE = (laksysteem === '3-lagen' || laksysteem === '4-lagen') ? 1 : 0;

  const somVoorbereidingstijdAE = schade1.voorbereidingstijdAE + schade2.voorbereidingstijdAE;

  // Bepaal hoofdbewerking (de grootste van de twee)
  const hoofdbewerkingAE = Math.max(schade1.voorbereidingstijdAE, schade2.voorbereidingstijdAE);
  let toeslagTweedeMateriaalAE = 0;
  let gecombineerdeVoorbereidingstijdAE = 0;

  const zelfdeMateriaal = schade1.materiaalsoort === schade2.materiaalsoort;

  if (zelfdeMateriaal) {
    // Indien beide schades van hetzelfde materiaal zijn (bijv. beide metaal of beide kunststof),
    // telt in één spuitgang slechts 1x de voorbereidingstijd van de hoofdbewerking!
    gecombineerdeVoorbereidingstijdAE = hoofdbewerkingAE;
    toeslagTweedeMateriaalAE = 0;
  } else {
    // Verschillende materiaalsoorten (bijv. metaal + kunststof):
    // Hoofdbewerking + toeslag tweede materiaalsoort volgens AZT NL I/2013
    // (8 AE standaard 2-lagen, 5 AE bij SV1 / binnendeel; 6 AE / 3 AE bij 1-laags)
    toeslagTweedeMateriaalAE = isKunststofSV1OfBinnendeel
      ? TWEEDE_MATERIAALSOORT_TOESLAG[baseLaksysteem].sv1OfBinnendeel
      : TWEEDE_MATERIAALSOORT_TOESLAG[baseLaksysteem].standaard;
    gecombineerdeVoorbereidingstijdAE = hoofdbewerkingAE + toeslagTweedeMateriaalAE;
  }

  // Aftrek voorbereidingstijd in AE
  const aftrekVoorbereidingstijdAE = Math.max(0, somVoorbereidingstijdAE - gecombineerdeVoorbereidingstijdAE);
  const aftrekBedragVoorbereidingstijd = aftrekVoorbereidingstijdAE * tariefPerAE;

  // Materiaalconstante controle:
  // Per materiaalsoort hoort slechts één materiaalconstante te worden gerekend.
  let dubbeleMateriaalconstanteAftrek = 0;
  let heeftDubbeleConstante = false;
  let toelichtingConstante = '';

  if (schade1.materiaalconstante > 0 && schade2.materiaalconstante > 0) {
    if (zelfdeMateriaal) {
      dubbeleMateriaalconstanteAftrek = Math.min(schade1.materiaalconstante, schade2.materiaalconstante);
      heeftDubbeleConstante = true;
      toelichtingConstante = `Beide calculaties bevatten een materiaalconstante voor ${schade1.materiaalsoort}. Omdat per materiaalsoort slechts één constante geldt, wordt de tweede constante (€ ${dubbeleMateriaalconstanteAftrek.toFixed(2)}) volledig in mindering gebracht.`;
    } else {
      dubbeleMateriaalconstanteAftrek = 0;
      heeftDubbeleConstante = false;
      toelichtingConstante = `Schade 1 betreft ${schade1.materiaalsoort} (€ ${schade1.materiaalconstante.toFixed(2)}) en Schade 2 betreft ${schade2.materiaalsoort} (€ ${schade2.materiaalconstante.toFixed(2)}). Per materiaalsoort geldt één eigen constante (of gecombineerde kunststofconstante bij 1 complete calculatie), dus geen dubbele constante van hetzelfde materiaal.`;
    }
  } else if (schade1.materiaalconstante > 0 && schade2.materiaalconstante === 0) {
    heeftDubbeleConstante = false;
    toelichtingConstante = 'Schade 2 heeft reeds geen materiaalconstante.';
  }

  // Toepassen korting / materiaalindex op spuitmateriaal indien van toepassing
  const gecorrigeerdeConstanteAftrek = dubbeleMateriaalconstanteAftrek * (1 - (kortingSpuitmateriaalPerc / 100));

  // Totaal af te trekken bedrag bij Tekstzone 143:
  const totaalAftrekBedragTZ143 = aftrekBedragVoorbereidingstijd + gecorrigeerdeConstanteAftrek;

  // Genereer de stapsgewijze rekensom
  const stappen: string[] = [
    `1. Gevonden voorbereidingstijd: ${schade1.materiaalsoort} ${schade1.voorbereidingstijdAE} AE (${schade1.naam}), ${schade2.materiaalsoort} ${schade2.voorbereidingstijdAE} AE (${schade2.naam}). Som losse calculaties: ${somVoorbereidingstijdAE} AE.`,
    zelfdeMateriaal
      ? `2. Bij één gecombineerde spuitgang met dezelfde materiaalsoort (${schade1.materiaalsoort}) telt slechts de hoofdbewerking van ${hoofdbewerkingAE} AE.${extraMeerlagenAE ? ' (+1 AE meerlagenlak apart in de hoofdberekening)' : ''}`
      : `2. Bij één gecombineerde spuitgang telt: hoofdbewerking ${schade1.voorbereidingstijdAE >= schade2.voorbereidingstijdAE ? schade1.materiaalsoort : schade2.materiaalsoort} ${hoofdbewerkingAE} AE + tweede materiaal toeslag (${isKunststofSV1OfBinnendeel ? 'SV1/binnendeel' : 'standaard'}) ${toeslagTweedeMateriaalAE} AE = ${gecombineerdeVoorbereidingstijdAE} AE.`,
    `3. Aftrek voorbereidingstijd: ${somVoorbereidingstijdAE} AE − ${gecombineerdeVoorbereidingstijdAE} AE = ${aftrekVoorbereidingstijdAE} AE (€ ${aftrekBedragVoorbereidingstijd.toFixed(2)} bij € ${tariefPerUur.toFixed(2)}/uur = € ${tariefPerAE.toFixed(2)}/AE).`,
    `4. Materiaalconstante (TZ 51): ${schade1.materiaalsoort} € ${schade1.materiaalconstante.toFixed(2)} (${schade1.naam}), ${schade2.materiaalsoort} € ${schade2.materiaalconstante.toFixed(2)} (${schade2.naam}). ${toelichtingConstante}`
  ];

  let korteConclusie = '';
  if (aftrekVoorbereidingstijdAE > 0 && heeftDubbeleConstante) {
    korteConclusie = `Breng ${aftrekVoorbereidingstijdAE} AE voorbereidingstijd (€ ${aftrekBedragVoorbereidingstijd.toFixed(2)}) én € ${gecorrigeerdeConstanteAftrek.toFixed(2)} dubbele materiaalconstante in mindering via TZ 143 (-€ ${totaalAftrekBedragTZ143.toFixed(2)}).`;
  } else if (aftrekVoorbereidingstijdAE > 0) {
    korteConclusie = `Breng ${aftrekVoorbereidingstijdAE} AE voorbereidingstijd (€ ${aftrekBedragVoorbereidingstijd.toFixed(2)}) in mindering via TZ 143. Er is geen dubbele materiaalconstante van dezelfde materiaalsoort.`;
  } else if (heeftDubbeleConstante) {
    korteConclusie = `Breng € ${gecorrigeerdeConstanteAftrek.toFixed(2)} dubbele materiaalconstante in mindering via Tekstzone 143 (-€ ${totaalAftrekBedragTZ143.toFixed(2)}).`;
  } else {
    korteConclusie = 'Geen aftrek vereist.';
  }

  const tz95Opmerking = 'Alternatief volgens Solera (1 complete calculatie): Neem alle schades op in één Audatex-calculatie en breng het eindbedrag van de eerste schade in mindering met Tekstzone-code 95 ("Aftrek eerste schade"). Audatex berekent de gecombineerde voorbereidingstijd en materiaalconstante dan automatisch zonder dubbele vergoeding.';

  return {
    aftrekVoorbereidingstijdAE,
    somVoorbereidingstijdAE,
    gecombineerdeVoorbereidingstijdAE,
    hoofdbewerkingAE,
    toeslagTweedeMateriaalAE,
    dubbeleMateriaalconstanteAftrek: gecorrigeerdeConstanteAftrek,
    heeftDubbeleConstante,
    toelichtingConstante,
    tariefPerAE,
    aftrekBedragVoorbereidingstijd,
    kortingPercentage: kortingSpuitmateriaalPerc,
    totaalAftrekBedragTZ143,
    stappen,
    korteConclusie,
    tz95Opmerking
  };
}
