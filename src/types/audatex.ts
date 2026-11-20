export interface TekstzoneItem {
  code: string;
  waarde: string;
  omschrijving?: string;
}

export interface DossierMeta {
  kenteken: string;
  merkModel: string;
  chassisnummer: string;
  calculatienummer: string;
  dossiernummer: string;
  datumCalculatie: string;
  datumSchade: string;
  expertHersteller: string;
  opdrachtgever?: string;
  laksoort: string;
  kleurcode: string;
  kilometerstand?: number;
  bouwjaar?: number;
  usCodes?: string[];
  actieveTekstzones?: TekstzoneItem[];
}

export interface Tarieven {
  plaatwerktarief: number; // bijv. € 88.10 / uur
  demontagetarief: number; // bijv. € 88.10 / uur
  spuittarief: number; // bijv. € 88.10 / uur
  spuitmateriaaltarief: number; // bijv. € 48.00 per spuituur of index
  materiaalconstante: number; // Standaard Solera AZT: bijv. € 56.80 of € 33.60
  kleinMateriaalPerc: number; // bijv. 2% over onderdelen of arbeid
  milieutoeslag: number; // bijv. € 41.40
  btwPercentage: number; // 21%

  // Officiële Audatex tariefelementen
  tariefPerAE?: number; // bijv. € 8.81 / AE
  milieuTariefPerAE?: number; // bijv. € 0.23 / AE
  onderdelenKortingPerc?: number; // bijv. 7.00%
  bijkomendeKosten?: number; // bijv. € 12.50
  bijkomendeKostenOmschrijving?: string; // bijv. 'Anti-roestbehandeling'
  spuitmateriaalTotaal?: number; // bijv. € 617.72
  spuittijdTotaalAE?: number; // bijv. 70 AE
}

export type VoertuigZone =
  | 'voorzijde'
  | 'achterzijde'
  | 'linkerzijde'
  | 'rechterzijde'
  | 'bovenzijde'
  | 'onderzijde';

export type SectieType = VoertuigZone | 'overig';

export type Schade1Zone = VoertuigZone;

export const VOERTUIG_ZONES: VoertuigZone[] = [
  'voorzijde',
  'achterzijde',
  'linkerzijde',
  'rechterzijde',
  'bovenzijde',
  'onderzijde'
];

export const ZONE_LABELS: Record<SectieType, string> = {
  voorzijde: 'Voorzijde',
  achterzijde: 'Achterzijde',
  linkerzijde: 'Linkerzijde',
  rechterzijde: 'Rechterzijde',
  bovenzijde: 'Bovenzijde',
  onderzijde: 'Onderzijde',
  overig: 'Overig'
};

export const ZONE_SHORT_LABELS: Record<SectieType, string> = {
  voorzijde: 'Voor',
  achterzijde: 'Achter',
  linkerzijde: 'Links',
  rechterzijde: 'Rechts',
  bovenzijde: 'Boven',
  onderzijde: 'Onder',
  overig: 'Overig'
};

export type BewerkingType = 
  | 'VERN' // Vernieuwen / vervangen onderdeel
  | 'HERST' // In stand zetten / uitdeuken / plaatwerk
  | 'DM' // De/monteren
  | 'SP' // Spuiten nieuwdeel
  | 'SPH' // Spuiten hersteldeel
  | 'UITSP' // Uitspuiten aangrenzend deel (LB / S)
  | 'LS' // Spot-Repair
  | 'DIV'; // Overig / diversen

export interface CalculatieRegel {
  id: string;
  code: string; // bijv. 0101, 0210, 1105
  omschrijving: string;
  sectie: SectieType;
  isEenmaligePost?: boolean; // Foutgeheugen / OBD uitlezen -> altijd automatisch 1x op Schade 1
  isOverigeHandeling?: boolean; // Overige/algemene handeling (bijv. uitlijnen, tijdtoeslag hoofdbewerking) -> per handeling kiesbaar Schade 1 of Schade 2
  overigeToewijzing?: 'schade1' | 'schade2'; // Gekozen toewijzing van een overige handeling
  bewerking: BewerkingType;
  itemType?: 'onderdeel' | 'arbeid' | 'spuitwerk' | 'bijkomend';
  spuitFase?: string; // bijv. SV1, SV2, SV3, SV4, SV, S, SH, SH1, LB, LS, NL
  materiaalSoort?: 'metaal' | 'kunststof';
  onderdeelPrijs: number;
  arbeidPlaatwerkAE?: number; // Arbeidseenheden (1 AE = 6 min, 10 AE = 1 uur)
  arbeidDemontageAE?: number;
  spuittijdAE?: number;
  arbeidPlaatwerkUren: number; // equivalent in uren (AE / 10)
  arbeidDemontageUren: number;
  spuittijdUren: number;
  arbeidsloonBedrag?: number;
  klasse?: number;
  spuitmateriaalBedrag?: number;
  artikelnummer?: string;
  opmerking?: string;
}

export type MateriaalconstanteMethode = 
  | 'solera_tz143' // Solera richtlijn: Volledig bij Schade 1, aftrek via TZ 143 bij Schade 2
  | 'proportioneel_spuittijd' // Verdeeld naar rato van spuittijd
  | 'fifty_fifty' // Gelijkmatig verdeeld over beide hoofddossiers
  | 'beide_volledig'; // Beide dossiers dragen de volle constante (waarschuwing voor expert)

export interface SectieTotalen {
  sectie: SectieType | 'totaal';
  label: string;
  itemsCount: number;
  
  // Arbeidseenheden (Audatex standaard: 10 AE = 1 uur)
  spuittijdAE: number;
  arbeidPlaatwerkAE: number;
  arbeidDemontageAE: number;
  arbeidTotaalAE: number;

  // Equivalenten in uren
  spuittijdUren: number;
  arbeidPlaatwerkUren: number;
  arbeidDemontageUren: number;
  arbeidTotaalUren: number;
  
  // Bedragen excl. btw
  bedragPlaatwerk: number;
  bedragDemontage: number;
  bedragSpuitarbeid: number;
  bedragTotaalArbeid: number;
  bedragOnderdelen: number; // Netto bedrag onderdelen
  bedragOnderdelenBruto?: number;
  kortingOnderdelen?: number;
  kleinMateriaalOnderdelen?: number;
  bedragBijkomend?: number; // bijv. Anti-roestbehandeling
  bedragSpuitmateriaalBasis: number;
  bedragMateriaalconstante: number;
  bedragSpuitmateriaalTotaal: number;
  bedragKleinMateriaal: number;
  bedragMilieu: number;
  
  subtotaalNetto: number;
  btwBedrag: number;
  totaalBruto: number;
  percentageVanTotaal: number;
}

export interface RdwVoertuigData {
  kenteken: string;
  geformatteerdKenteken: string;
  gevonden: boolean;
  merk?: string;
  handelsbenaming?: string;
  inrichting?: string;
  eersteKleur?: string;
  brandstof?: string;
  bouwjaar?: number;
  datumEersteToelating?: string;
  vervaldatumApk?: string;
  apkGeldig?: boolean;
  wamVerzekerd?: boolean;
  catalogusprijs?: number;
  massaLedigVoertuig?: number;
  
  // Dagwaarde indicatie
  indicatieveDagwaarde: {
    geschat: number;
    laag: number;
    hoog: number;
    afschrijvingsPercentage: number;
    leeftijdInMaanden: number;
    methode: string;
  };

  totaalLossRisico?: 'laag' | 'middel' | 'hoog' | 'economisch_totaal_verlies';
  schadePercentageVanDagwaarde?: number;
}

export interface SpuitMateriaalSplitPost {
  categorie: 'vern' | 'herst' | 'deklaag' | 'uitspuiten' | 'overig';
  omschrijving: string;
  bedragBruto: number;
  spuitFase?: string;
  materiaalSoort?: 'metaal' | 'kunststof';
}

export interface AudatexEindcalculatieData {
  onderdelenNetto: number;
  arbeidNetto: number;
  bijkomendNetto: number;
  spuitwerkNetto: number;
  milieuNetto: number;
  totaalExclBtw: number;
  btwBedrag: number;
  totaalInclBtw: number;
  onderdelenBruto?: number;
  onderdelenKorting?: number;
  kleinMateriaal?: number;
  spuitarbeidNetto?: number;
  spuitmateriaalNetto?: number;
  // Gedetailleerde AZT Spuitwerk gegevens uit het rapport
  spuitTijdPaneelAE?: number;
  spuitVoorbereidingMetaalAE?: number;
  spuitVoorbereidingKunststofAE?: number;
  spuitVoorbereidingMeerlagenAE?: number;
  spuitLoonTotaalAE?: number;
  materiaalConstanteMetaal?: number;
  materiaalConstanteKunststof?: number;
  materiaalConstanteMeerlagen?: number;
  materiaalIndexPerc?: number;
  aftrekSpuitbedragTZ143?: number;
  aftrekEersteSchadeTZ95?: number;
  spuitMateriaalPosten?: SpuitMateriaalSplitPost[];
}

export interface AnalyseResultaat {
  meta: DossierMeta;
  tarieven: Tarieven;
  regels: CalculatieRegel[];
  schade1Zone?: VoertuigZone;
  schade2Zone?: VoertuigZone;
  materiaalconstanteMethode: MateriaalconstanteMethode;
  soleraAanbeveling: {
    titel: string;
    tekstzone: string;
    advies: string;
    invoerTekst143: string;
  };
  audatexEindcalculatie?: AudatexEindcalculatieData;
  rdw?: RdwVoertuigData;
  marktVergelijking?: MarktVergelijkingResultaat;
}

export interface MarktAdvertentie {
  id: string;
  bron: 'Marktplaats' | 'AutoScout24' | 'Gaspedaal' | 'AutoTrack';
  titel: string;
  vraagprijs: number;
  bouwjaar?: number;
  kilometerstand?: number;
  brandstof?: string;
  transmissie?: string;
  plaats?: string;
  url: string;
  afbeeldingUrl?: string;
  matchScore: number;
}

export interface AnwbKoerslijstIndicatie {
  bronType: 'anwb_live_api' | 'model_berekening';
  voertuigOmschrijving: string;
  anwbConfiguratieNaam?: string;
  kenteken?: string;
  tellerstandOordeel?: string;
  bouwjaar: number;
  leeftijdJaren: number;
  kilometerstand: number;
  normKmPerJaar: number;
  verwachteNormKm: number;
  kmAfwijking: number;
  kmCorrectiePerc: number;
  kmCorrectieBedrag: number;
  nieuwwaarde?: number;
  optiePrijs?: number;
  waarden: {
    vervangingswaardeTotalLoss: number;
    verkoopMerkdealer?: number;
    verkoopDealerBovag: number;
    verkoopParticulier: number;
    inruilwaarde: number;
    rijklaarPrijs?: number;
    veilingprijs?: number;
    verzekeringsDagwaarde: number;
  };
  toelichting: string;
  koerslijstUrl: string;
  anwbPdfUrl?: string;
  groundingBronnen?: Array<{ title: string; uri: string }>;
}

export interface MarktBronStatus {
  bron: 'Marktplaats' | 'AutoScout24' | 'Gaspedaal' | 'AutoTrack';
  methode: 'live_scraper' | 'google_grounding' | 'zoeklink_only';
  status: 'ok' | 'beperkt' | 'fout';
  aantalGevonden: number;
  zoekUrl: string;
  bericht?: string;
}

export interface MarktVergelijkingResultaat {
  zoekCriteria: {
    merk: string;
    model: string;
    bouwjaar: number;
    bouwjaarMin: number;
    bouwjaarMax: number;
    kilometerstand: number;
    kmMin: number;
    kmMax: number;
    brandstof?: string;
    transmissie?: string;
    kenteken?: string;
    catalogusprijs?: number;
  };
  bronnenStatus: MarktBronStatus[];
  statistieken: {
    aantalVergelijkbaar: number;
    laagsteVraagprijs: number;
    mediaanVraagprijs: number;
    gemiddeldeVraagprijs: number;
    hoogsteVraagprijs: number;
    gemiddeldeKmStand: number;
    expertVervangingswaarde: number;
  };
  advertenties: MarktAdvertentie[];
  anwbKoerslijst: AnwbKoerslijstIndicatie;
  gegenereerdOp: string;
}

