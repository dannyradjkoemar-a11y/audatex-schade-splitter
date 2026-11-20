import type {
  AnwbKoerslijstIndicatie,
  MarktAdvertentie,
  MarktBronStatus,
  MarktVergelijkingResultaat
} from '../src/types/audatex.ts';

export interface MarktZoekInput {
  merk?: string;
  model?: string;
  merkModel?: string;
  bouwjaar: number;
  kilometerstand: number;
  brandstof?: string;
  transmissie?: string;
  kenteken?: string;
  catalogusprijs?: number;
  datumEersteToelating?: string;
}

const KNOWN_MAKES = [
  'ALFA ROMEO',
  'ASTON MARTIN',
  'AUDI',
  'BMW',
  'BYD',
  'CHEVROLET',
  'CHRYSLER',
  'CITROEN',
  'CUPRA',
  'DACIA',
  'DAIHATSU',
  'DODGE',
  'DS',
  'FIAT',
  'FORD',
  'HONDA',
  'HYUNDAI',
  'JAGUAR',
  'JEEP',
  'KIA',
  'LANCIA',
  'LAND ROVER',
  'LEXUS',
  'LYNK & CO',
  'MAZDA',
  'MERCEDES-BENZ',
  'MERCEDES',
  'MG',
  'MINI',
  'MITSUBISHI',
  'NISSAN',
  'OPEL',
  'PEUGEOT',
  'POLESTAR',
  'PORSCHE',
  'RENAULT',
  'SAAB',
  'SEAT',
  'SKODA',
  'SMART',
  'SUBARU',
  'SUZUKI',
  'TESLA',
  'TOYOTA',
  'VOLKSWAGEN',
  'VOLVO',
  'VW'
];

const ANWB_API_BASE = 'https://api.anwb.nl/car-information/backend-application/';
const ANWB_HEADERS = {
  'x-anwb-caller-id': 'car/cost-calculator-web',
  'x-auto-kosten-tool-id': '1db3d877-e4d3-4a55-b551-d2a49fb7df34',
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => {
      if (['bmw', 'vw', 'ds', 'mg', 'byd'].includes(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

export function normalizeVehicleSearchCriteria(input: MarktZoekInput) {
  const rawFull = (input.merkModel || [input.merk, input.model].filter(Boolean).join(' ') || '').trim();
  const upperFull = rawFull.toUpperCase();

  let make = (input.merk || '').trim();
  if (!make) {
    const matchedMake = KNOWN_MAKES.find(m => upperFull.startsWith(m + ' ') || upperFull === m);
    make = matchedMake || upperFull.split(/\s+/)[0] || 'Auto';
  }
  if (make.toUpperCase() === 'VW') make = 'Volkswagen';
  if (make.toUpperCase() === 'MERCEDES') make = 'Mercedes-Benz';
  const cleanMake = toTitleCase(make);

  let rawModel = (input.model || rawFull).trim();
  const makeRegex = new RegExp(`^${cleanMake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
  rawModel = rawModel.replace(makeRegex, '').trim();
  const compactMakeRegex = new RegExp(`^${cleanMake.replace(/[^a-z0-9]/gi, '')}`, 'i');
  if (compactMakeRegex.test(rawModel)) {
    rawModel = rawModel.replace(compactMakeRegex, '').trim();
  }
  const noParens = rawModel.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const beforeSlash = noParens.split('/')[0].trim();
  const shortModel =
    beforeSlash
      .replace(/\b\d\.\d\b/g, ' ')
      .replace(/\b(TSI|TDI|TFSI|CDI|PHEV|EV|E-CVT|CVT|AUT|DSG|PRIME-LINE|CENTRE-LINE|EXCLUSIVE-LINE|LOUNGE|POP|SPORT)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim() || beforeSlash || rawModel;

  const trimHint = noParens !== shortModel ? noParens : '';
  const modelTokens = shortModel
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(t => t.length >= 1);

  return {
    make: cleanMake,
    shortModel,
    trimHint,
    modelTokens
  };
}

function slugifyForUrl(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isListingModelMatch(
  titel: string,
  attrModel: string | undefined,
  make: string,
  shortModel: string,
  modelTokens: string[]
): boolean {
  const hay = `${titel} ${attrModel || ''}`.toLowerCase();
  const makeLower = make.toLowerCase();

  if (makeLower && !hay.includes(makeLower) && makeLower !== 'volkswagen') {
    return false;
  }
  if (makeLower === 'volkswagen' && !hay.includes('volkswagen') && !/\bvw\b/.test(hay)) {
    return false;
  }

  if (makeLower === 'mazda' && modelTokens.includes('2') && !shortModel.toLowerCase().includes('cx')) {
    if (/\b(cx-?\d+|mx-?\d+|mazda\s*[356]\b|mazda[356]\b)\b/i.test(hay)) {
      return false;
    }
  }
  if (makeLower === 'fiat' && modelTokens.includes('500') && !shortModel.toLowerCase().includes('500x') && !shortModel.toLowerCase().includes('500l')) {
    if (/\b500\s*[xl]\b/i.test(hay)) {
      return false;
    }
  }

  const primaryToken = modelTokens[0] || '';
  if (!primaryToken) return true;

  if (attrModel) {
    const attrClean = attrModel.toLowerCase();
    if (attrClean === shortModel.toLowerCase() || attrClean === primaryToken) {
      return true;
    }
  }

  const compactPattern = new RegExp(`\\b${slugifyForUrl(make).replace(/-/g, '')}?${primaryToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const bmwSerieMatch = shortModel.toLowerCase().match(/^([1-8])-?serie$/);
  const bmwBadgePattern = bmwSerieMatch
    ? new RegExp(`\\b${bmwSerieMatch[1]}[0-9]{2}[a-z]{0,2}\\b`, 'i')
    : null;
  const tokenMatch = modelTokens.every(tok => {
    if (/^\d+$/.test(tok)) {
      return new RegExp(`(?:^|[^0-9])${tok}(?:[^0-9]|$)`).test(hay);
    }
    return hay.includes(tok);
  });

  return tokenMatch || compactPattern.test(hay) || (bmwBadgePattern ? bmwBadgePattern.test(hay) : false);
}

function computeMatchScore(
  item: {
    titel: string;
    bouwjaar?: number;
    kilometerstand?: number;
    brandstof?: string;
  },
  criteria: {
    bouwjaar: number;
    kilometerstand: number;
    brandstof?: string;
    trimHint?: string;
  }
): number {
  let score = 60;

  if (item.bouwjaar) {
    const yearDiff = Math.abs(item.bouwjaar - criteria.bouwjaar);
    if (yearDiff === 0) score += 20;
    else if (yearDiff === 1) score += 12;
    else score += Math.max(0, 8 - yearDiff * 3);
  }

  if (item.kilometerstand !== undefined && criteria.kilometerstand > 0) {
    const kmDiff = Math.abs(item.kilometerstand - criteria.kilometerstand);
    const ratio = kmDiff / Math.max(15000, criteria.kilometerstand);
    if (ratio <= 0.15) score += 15;
    else if (ratio <= 0.35) score += 10;
    else if (ratio <= 0.6) score += 5;
  }

  if (criteria.brandstof && item.brandstof) {
    const cFuel = criteria.brandstof.toLowerCase();
    const iFuel = item.brandstof.toLowerCase();
    if (
      (cFuel.includes('hybr') && iFuel.includes('hybr')) ||
      (cFuel.includes('elektr') && iFuel.includes('elektr')) ||
      (cFuel.includes('diesel') && iFuel.includes('diesel')) ||
      (cFuel.includes('benz') && iFuel.includes('benz'))
    ) {
      score += 5;
    }
  }

  if (criteria.trimHint) {
    const hintTokens = criteria.trimHint
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);
    const titleLower = item.titel.toLowerCase();
    if (hintTokens.some(t => titleLower.includes(t))) {
      score += 5;
    }
  }

  return Math.max(25, Math.min(100, score));
}

function buildSearchUrls(
  make: string,
  shortModel: string,
  bouwjaarMin: number,
  bouwjaarMax: number,
  kmMin: number,
  kmMax: number
) {
  const q = `${make} ${shortModel}`.trim();
  const makeSlug = slugifyForUrl(make);
  const modelSlug = slugifyForUrl(shortModel.split(/\s+/)[0] || shortModel);
  const fullModelSlug = slugifyForUrl(shortModel);

  const marktplaatsUrl =
    `https://www.marktplaats.nl/l/auto-s/#q:${encodeURIComponent(q)}` +
    `|constructionYearFrom:${bouwjaarMin}|constructionYearTo:${bouwjaarMax}` +
    `|mileageFrom:${kmMin}|mileageTo:${kmMax}`;

  const autoscout24Url =
    `https://www.autoscout24.nl/lst/${makeSlug}/${fullModelSlug}` +
    `?fregfrom=${bouwjaarMin}&fregto=${bouwjaarMax}&kmfrom=${kmMin}&kmto=${kmMax}&cy=NL&ustate=N%2CU`;

  const gaspedaalUrl =
    `https://www.gaspedaal.nl/${makeSlug}/${fullModelSlug}` +
    `?bmin=${bouwjaarMin}&bmax=${bouwjaarMax}&kmmin=${kmMin}&kmmax=${kmMax}`;

  const autotrackUrl =
    `https://www.autotrack.nl/aanbod?merk=${encodeURIComponent(makeSlug)}` +
    `&model=${encodeURIComponent(modelSlug)}&bouwjaarVan=${bouwjaarMin}&bouwjaarTot=${bouwjaarMax}` +
    `&kilometerstandVan=${kmMin}&kilometerstandTot=${kmMax}`;

  return {
    marktplaatsUrl,
    autoscout24Url,
    gaspedaalUrl,
    autotrackUrl,
    anwbUrl: 'https://www.anwb.nl/auto/koerslijst'
  };
}

async function scrapeMarktplaats(params: {
  make: string;
  shortModel: string;
  modelTokens: string[];
  trimHint: string;
  bouwjaar: number;
  bouwjaarMin: number;
  bouwjaarMax: number;
  kilometerstand: number;
  kmMin: number;
  kmMax: number;
  brandstof?: string;
  zoekUrl: string;
}): Promise<{ items: MarktAdvertentie[]; status: MarktBronStatus }> {
  const fetchQuery = async (queryStr: string) => {
    const apiUrl =
      `https://www.marktplaats.nl/lrp/api/search?l1CategoryId=91` +
      `&query=${encodeURIComponent(queryStr)}` +
      `&limit=30` +
      `&attributeRanges[]=constructionYear:${params.bouwjaarMin}:${params.bouwjaarMax}` +
      `&attributeRanges[]=mileage:${params.kmMin}:${params.kmMax}`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'nl-NL,nl;q=0.9'
      },
      signal: AbortSignal.timeout(5500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  try {
    let mpJson = await fetchQuery(`"${params.make} ${params.shortModel}"`);
    let rawListings: any[] = mpJson?.listings || [];

    if (rawListings.length < 4) {
      const broader = await fetchQuery(`${params.make} ${params.shortModel}`);
      const seen = new Set(rawListings.map((l: any) => l.itemId || l.vipUrl));
      for (const l of broader?.listings || []) {
        const key = l.itemId || l.vipUrl;
        if (!seen.has(key)) rawListings.push(l);
      }
    }

    const items: MarktAdvertentie[] = [];
    for (const l of rawListings) {
      const vipUrl = String(l.vipUrl || '');
      if (!vipUrl || vipUrl.includes('auto-inkoop')) continue;
      const priceCents = Number(l.priceInfo?.priceCents || 0);
      const priceEuro = Math.round(priceCents / 100);
      const titel = String(l.title || '').trim();
      if (!titel || priceEuro < 1200) continue;
      if (/\b(motorschade|motor niet goed|schadeauto|met schade|total\s*loss|sloopauto|voor onderdelen|niet rijdend)\b/i.test(titel)) continue;
      if (priceEuro < 1500 && /\b(lease|p\/m|per maand)\b/i.test(titel)) continue;
      if (['SEE_DESCRIPTION', 'RESERVED', 'FREE'].includes(String(l.priceInfo?.priceType || ''))) continue;

      const attrs: Array<{ key: string; value: string }> = l.attributes || [];
      const getAttr = (k: string) => attrs.find(a => a.key === k)?.value;

      const attrModel = getAttr('model');
      if (!isListingModelMatch(titel, attrModel, params.make, params.shortModel, params.modelTokens)) {
        continue;
      }

      const yrRaw = getAttr('constructionYear');
      const kmRaw = getAttr('mileage');
      const bouwjaar = yrRaw ? parseInt(yrRaw.replace(/[^0-9]/g, ''), 10) : undefined;
      const km = kmRaw ? parseInt(kmRaw.replace(/[^0-9]/g, ''), 10) : undefined;
      const brandstof = getAttr('fuel');
      const transmissie = getAttr('transmission');
      const plaats = l.location?.cityName || undefined;
      const afbeeldingUrl = l.pictures?.[0]?.mediumUrl || undefined;

      items.push({
        id: `mp-${l.itemId || items.length + 1}`,
        bron: 'Marktplaats',
        titel,
        vraagprijs: priceEuro,
        bouwjaar: bouwjaar && !Number.isNaN(bouwjaar) ? bouwjaar : undefined,
        kilometerstand: km !== undefined && !Number.isNaN(km) ? km : undefined,
        brandstof,
        transmissie,
        plaats,
        url: vipUrl.startsWith('http') ? vipUrl : `https://www.marktplaats.nl${vipUrl}`,
        afbeeldingUrl,
        matchScore: computeMatchScore(
          { titel, bouwjaar, kilometerstand: km, brandstof },
          {
            bouwjaar: params.bouwjaar,
            kilometerstand: params.kilometerstand,
            brandstof: params.brandstof,
            trimHint: params.trimHint
          }
        )
      });
    }

    return {
      items,
      status: {
        bron: 'Marktplaats',
        methode: 'live_scraper',
        status: 'ok',
        aantalGevonden: items.length,
        zoekUrl: params.zoekUrl
      }
    };
  } catch (err: any) {
    return {
      items: [],
      status: {
        bron: 'Marktplaats',
        methode: 'live_scraper',
        status: 'fout',
        aantalGevonden: 0,
        zoekUrl: params.zoekUrl,
        bericht: err?.message || 'Niet bereikbaar'
      }
    };
  }
}

async function scrapeAutoScout24(params: {
  make: string;
  shortModel: string;
  modelTokens: string[];
  trimHint: string;
  bouwjaar: number;
  bouwjaarMin: number;
  bouwjaarMax: number;
  kilometerstand: number;
  kmMin: number;
  kmMax: number;
  brandstof?: string;
  zoekUrl: string;
}): Promise<{ items: MarktAdvertentie[]; status: MarktBronStatus }> {
  const makeSlug = slugifyForUrl(params.make);
  const fullModelSlug = slugifyForUrl(params.shortModel);
  const firstTokenSlug = slugifyForUrl(params.modelTokens[0] || params.shortModel);

  const tryUrls = [
    `https://www.autoscout24.nl/lst/${makeSlug}/${fullModelSlug}?fregfrom=${params.bouwjaarMin}&fregto=${params.bouwjaarMax}&kmfrom=${params.kmMin}&kmto=${params.kmMax}&cy=NL&ustate=N%2CU`,
    ...(firstTokenSlug !== fullModelSlug
      ? [
          `https://www.autoscout24.nl/lst/${makeSlug}/${firstTokenSlug}?fregfrom=${params.bouwjaarMin}&fregto=${params.bouwjaarMax}&kmfrom=${params.kmMin}&kmto=${params.kmMax}&cy=NL&ustate=N%2CU`
        ]
      : []),
    `https://www.autoscout24.nl/lst/${makeSlug}?fregfrom=${params.bouwjaarMin}&fregto=${params.bouwjaarMax}&kmfrom=${params.kmMin}&kmto=${params.kmMax}&cy=NL&ustate=N%2CU&search=${encodeURIComponent(params.shortModel)}`
  ];

  let resolvedSearchUrl = params.zoekUrl;
  try {
    let rawListings: any[] = [];

    for (const url of tryUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept-Language': 'nl-NL,nl;q=0.9'
          },
          signal: AbortSignal.timeout(5500)
        });
        if (!res.ok) continue;
        const html = await res.text();
        const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!ndMatch) continue;
        const parsed = JSON.parse(ndMatch[1]);
        const listings = parsed?.props?.pageProps?.listings;
        if (Array.isArray(listings) && listings.length > 0) {
          rawListings = listings;
          resolvedSearchUrl = url;
          break;
        }
      } catch {
        // try next URL variant
      }
    }

    const items: MarktAdvertentie[] = [];
    for (const a of rawListings) {
      const priceEuro = Number(a.price?.priceRaw || a.tracking?.price || 0);
      if (!priceEuro || priceEuro < 1200) continue;

      const makeTitle = a.vehicle?.make || params.make;
      const modelTitle = a.vehicle?.model || a.vehicle?.modelGroup || '';
      const version = a.vehicle?.modelVersionInput || a.vehicle?.subtitle || '';
      const titel = `${makeTitle} ${modelTitle} ${version}`.replace(/\s+/g, ' ').trim();

      if (/\b(motorschade|motor niet goed|schadeauto|met schade|total\s*loss|sloopauto|voor onderdelen|niet rijdend)\b/i.test(titel)) continue;
      if (!isListingModelMatch(titel, modelTitle, params.make, params.shortModel, params.modelTokens)) {
        continue;
      }
      if (priceEuro < 1500 && /\b(lease|p\/m|per maand)\b/i.test(titel)) continue;

      const firstReg = String(a.tracking?.firstRegistration || '');
      const yrMatch = firstReg.match(/([12][09][0-9]{2})/);
      const bouwjaar = yrMatch ? parseInt(yrMatch[1], 10) : undefined;
      const kmRaw = a.tracking?.mileage || a.vehicle?.mileageInKm;
      const km = kmRaw ? parseInt(String(kmRaw).replace(/[^0-9]/g, ''), 10) : undefined;
      const brandstof = a.vehicle?.fuel || undefined;
      const transmissie = a.vehicle?.transmission || undefined;
      const plaats = a.location?.city ? toTitleCase(String(a.location.city)) : undefined;
      const listingUrl = String(a.url || '');
      if (!listingUrl) continue;

      items.push({
        id: `as24-${a.id || items.length + 1}`,
        bron: 'AutoScout24',
        titel,
        vraagprijs: priceEuro,
        bouwjaar,
        kilometerstand: km !== undefined && !Number.isNaN(km) ? km : undefined,
        brandstof,
        transmissie,
        plaats,
        url: listingUrl.startsWith('http') ? listingUrl : `https://www.autoscout24.nl${listingUrl}`,
        afbeeldingUrl: a.images?.[0] || undefined,
        matchScore: computeMatchScore(
          { titel, bouwjaar, kilometerstand: km, brandstof },
          {
            bouwjaar: params.bouwjaar,
            kilometerstand: params.kilometerstand,
            brandstof: params.brandstof,
            trimHint: params.trimHint
          }
        )
      });
    }

    return {
      items,
      status: {
        bron: 'AutoScout24',
        methode: 'live_scraper',
        status: items.length > 0 ? 'ok' : 'beperkt',
        aantalGevonden: items.length,
        zoekUrl: resolvedSearchUrl
      }
    };
  } catch (err: any) {
    return {
      items: [],
      status: {
        bron: 'AutoScout24',
        methode: 'live_scraper',
        status: 'fout',
        aantalGevonden: 0,
        zoekUrl: resolvedSearchUrl,
        bericht: err?.message || 'Niet bereikbaar'
      }
    };
  }
}

interface OfficialAnwbFetchResult {
  success: boolean;
  configName?: string;
  plate?: string;
  month?: number;
  year?: number;
  newPrice?: number;
  optionsPrice?: number;
  odometerJudgementNL?: string;
  odometerJudgementReasonNL?: string;
  isImported?: boolean;
  lists?: Array<{ categoryNumber: number; name: string; amount: number }>;
  normLists?: Array<{ categoryNumber: number; name: string; amount: number }>;
  pdfUrl?: string;
}

async function fetchOfficialAnwbKoerslijst(params: {
  kenteken?: string;
  merkModel?: string;
  bouwjaar: number;
  kilometerstand: number;
  verwachteNormKm: number;
  catalogusprijs?: number;
}): Promise<OfficialAnwbFetchResult> {
  const cleanPlate = (params.kenteken || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!cleanPlate || cleanPlate === 'ONBEKEND' || cleanPlate.length < 5 || cleanPlate.length > 8) {
    return { success: false };
  }

  try {
    const lpRes = await fetch(
      `${ANWB_API_BASE}api/v0/licensePlate/${encodeURIComponent(cleanPlate)}`,
      { headers: ANWB_HEADERS, signal: AbortSignal.timeout(5000) }
    );
    if (!lpRes.ok) return { success: false };
    const candidates: any[] = await lpRes.json();
    if (!Array.isArray(candidates) || candidates.length === 0) return { success: false };

    // Choose best matching configuration when multiple configurations exist for a plate
    const hintTokens = (params.merkModel || '')
      .toUpperCase()
      .split(/[\s/()-]+/)
      .filter(t => t.length >= 2);
    const ranked = [...candidates].sort((a, b) => {
      const aName = `${a?.brand?.name || ''} ${a?.model?.name || ''} ${a?.configuration?.name || ''}`.toUpperCase();
      const bName = `${b?.brand?.name || ''} ${b?.model?.name || ''} ${b?.configuration?.name || ''}`.toUpperCase();
      const score = (name: string) => hintTokens.reduce((s, tok) => s + (name.includes(tok) ? 1 : 0), 0);
      return score(bName) - score(aName);
    });
    const chosen = ranked[0];
    const configId = chosen?.configuration?.id;
    if (!configId) return { success: false };

    const adm = chosen?.history?.firstInternationalAdmission || chosen?.history?.firstRegistrationInNl || '';
    const mParts = adm.match(/(\d{2})\/(\d{4})/);
    const month = mParts ? parseInt(mParts[1], 10) : 6;
    const year = mParts ? parseInt(mParts[2], 10) : params.bouwjaar;
    const newPrice = Math.round(Number(chosen?.costs?.originalListPrice || params.catalogusprijs || 0));
    const optionsPrice = chosen?.costs?.optionsPrice !== null && chosen?.costs?.optionsPrice !== undefined
      ? Math.round(Number(chosen.costs.optionsPrice))
      : undefined;

    const buildParams = (mileageVal: number) => {
      const qs = new URLSearchParams({
        licensePlateMonth: String(month),
        licensePlateYear: String(year),
        mileage: String(Math.max(0, Math.round(mileageVal))),
        newPrice: String(newPrice),
        licensePlate: cleanPlate
      });
      if (optionsPrice !== undefined) {
        qs.set('optionsPrice', String(optionsPrice));
      }
      return qs;
    };

    const actualQs = buildParams(params.kilometerstand);
    const actualUrl = `${ANWB_API_BASE}api/v0/configuration/${encodeURIComponent(configId)}/ratelist?${actualQs.toString()}`;

    const shouldCompareNorm = Math.abs(params.kilometerstand - params.verwachteNormKm) >= 1000;
    const normQs = buildParams(params.verwachteNormKm);
    const normUrl = `${ANWB_API_BASE}api/v0/configuration/${encodeURIComponent(configId)}/ratelist?${normQs.toString()}`;

    const [actualRes, normRes] = await Promise.all([
      fetch(actualUrl, { headers: ANWB_HEADERS, signal: AbortSignal.timeout(5500) }),
      shouldCompareNorm
        ? fetch(normUrl, { headers: ANWB_HEADERS, signal: AbortSignal.timeout(5500) }).catch(() => null)
        : Promise.resolve(null)
    ]);

    if (!actualRes.ok) return { success: false };
    const actualJson: any = await actualRes.json();
    const lists = Array.isArray(actualJson?.lists) ? actualJson.lists : [];
    if (lists.length === 0) return { success: false };

    let normLists: any[] | undefined;
    if (normRes && normRes.ok) {
      const normJson: any = await normRes.json().catch(() => null);
      if (Array.isArray(normJson?.lists) && normJson.lists.length > 0) {
        normLists = normJson.lists;
      }
    }

    const pdfQs = new URLSearchParams({
      configurationId: configId,
      licensePlate: cleanPlate,
      licensePlateMonth: String(month),
      licensePlateYear: String(year),
      mileage: String(Math.max(0, Math.round(params.kilometerstand))),
      newPrice: String(newPrice),
      optionsPrice: String(optionsPrice ?? 0)
    });

    return {
      success: true,
      configName: `${chosen?.brand?.name || ''} ${chosen?.configuration?.name || ''}`.trim(),
      plate: cleanPlate,
      month,
      year,
      newPrice,
      optionsPrice,
      odometerJudgementNL: chosen?.history?.odometerJudgementNL || undefined,
      odometerJudgementReasonNL: chosen?.history?.odometerJudgementReasonNL || undefined,
      isImported: Boolean(chosen?.history?.isImported),
      lists,
      normLists,
      pdfUrl: `/api/anwb-koerslijst-pdf?${pdfQs.toString()}`
    };
  } catch {
    return { success: false };
  }
}

function getMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function filterPriceOutliers(items: MarktAdvertentie[]): MarktAdvertentie[] {
  if (items.length < 5) return items;
  const prices = items.map(i => i.vraagprijs).sort((a, b) => a - b);
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = Math.max(2000, q3 - q1);
  const lowBound = Math.max(1200, q1 - 1.5 * iqr);
  const highBound = q3 + 1.8 * iqr;
  return items.filter(i => i.vraagprijs >= lowBound && i.vraagprijs <= highBound);
}

function buildAnwbKoerslijstResult(params: {
  voertuigOmschrijving: string;
  kenteken?: string;
  bouwjaar: number;
  kilometerstand: number;
  brandstof?: string;
  catalogusprijs?: number;
  datumEersteToelating?: string;
  normKmPerJaar: number;
  verwachteNormKm: number;
  ageMonths: number;
  marketMedianPrice: number;
  marketAvgKm: number;
  officialAnwb: OfficialAnwbFetchResult;
}): AnwbKoerslijstIndicatie {
  const leeftijdJaren = Math.round((params.ageMonths / 12) * 10) / 10;
  const kmAfwijking = params.kilometerstand - params.verwachteNormKm;

  if (params.officialAnwb.success && params.officialAnwb.lists) {
    const findCat = (list: Array<{ categoryNumber: number; amount: number }>, catNum: number) =>
      list.find(x => x.categoryNumber === catNum)?.amount;

    const lists = params.officialAnwb.lists;
    const bovag = findCat(lists, 2) || findCat(lists, 8) || 0;
    const merkdealer = findCat(lists, 12) || findCat(lists, 9) || bovag;
    const totalLoss = findCat(lists, 7) || bovag;
    const particulier = findCat(lists, 6) || findCat(lists, 14) || Math.round(bovag * 0.89);
    const inruil = findCat(lists, 4) || Math.round(bovag * 0.80);
    const rijklaar = findCat(lists, 13) || totalLoss;
    const veiling = findCat(lists, 3);

    // Bereken exacte km-impact op basis van ANWB-opvraging bij werkelijke km vs norm-km
    let kmCorrectieBedrag = 0;
    let kmCorrectiePerc = 0;
    if (params.officialAnwb.normLists && totalLoss > 0) {
      const normTotalLoss = findCat(params.officialAnwb.normLists, 7) || findCat(params.officialAnwb.normLists, 2) || 0;
      if (normTotalLoss > 0) {
        kmCorrectieBedrag = Math.round(totalLoss - normTotalLoss);
        kmCorrectiePerc = Math.round(((kmCorrectieBedrag / normTotalLoss) * 100) * 10) / 10;
      }
    }

    const richtingTekst =
      kmCorrectieBedrag > 0
        ? `een opwaardering van +€ ${kmCorrectieBedrag.toLocaleString('nl-NL')} (+${kmCorrectiePerc}%) t.o.v. de ANWB-jaarnorm`
        : kmCorrectieBedrag < 0
        ? `een afwaardering van -€ ${Math.abs(kmCorrectieBedrag).toLocaleString('nl-NL')} (${kmCorrectiePerc}%) t.o.v. de ANWB-jaarnorm`
        : 'geen km-afwijkingscorrectie t.o.v. de ANWB-jaarnorm';

    const tellerNote = params.officialAnwb.odometerJudgementNL
      ? ` Tellerstand-oordeel RDW/ANWB: "${params.officialAnwb.odometerJudgementNL}".`
      : '';

    return {
      bronType: 'anwb_live_api',
      voertuigOmschrijving: params.voertuigOmschrijving,
      anwbConfiguratieNaam: params.officialAnwb.configName,
      kenteken: params.officialAnwb.plate,
      tellerstandOordeel: params.officialAnwb.odometerJudgementNL,
      bouwjaar: params.officialAnwb.year || params.bouwjaar,
      leeftijdJaren,
      kilometerstand: params.kilometerstand,
      normKmPerJaar: params.normKmPerJaar,
      verwachteNormKm: params.verwachteNormKm,
      kmAfwijking,
      kmCorrectiePerc,
      kmCorrectieBedrag,
      nieuwwaarde: params.officialAnwb.newPrice || params.catalogusprijs,
      optiePrijs: params.officialAnwb.optionsPrice,
      waarden: {
        vervangingswaardeTotalLoss: totalLoss,
        verkoopMerkdealer: merkdealer,
        verkoopDealerBovag: bovag,
        verkoopParticulier: particulier,
        inruilwaarde: inruil,
        rijklaarPrijs: rijklaar,
        veilingprijs: veiling,
        verzekeringsDagwaarde: totalLoss
      },
      toelichting:
        `Rechtstreeks opgehaald uit de officiële ANWB Koerslijst voor kenteken ${params.officialAnwb.plate} (${params.officialAnwb.configName}) bij ${params.kilometerstand.toLocaleString('nl-NL')} km. ` +
        `De ANWB-jaarnorm voor dit type bedraagt ${params.normKmPerJaar.toLocaleString('nl-NL')} km/jr (~${params.verwachteNormKm.toLocaleString('nl-NL')} km verwacht); bij uw tellerstand past ANWB ${richtingTekst} toe.${tellerNote}`,
      koerslijstUrl: 'https://www.anwb.nl/auto/koerslijst',
      anwbPdfUrl: params.officialAnwb.pdfUrl
    };
  }

  // Fallback modelberekening wanneer kenteken ontbreekt of niet in ANWB Koerslijst voorkomt
  const units10k = kmAfwijking / 10000;
  let kmCorrectiePerc = 0;
  if (units10k < 0) {
    kmCorrectiePerc = Math.min(8.0, Math.abs(units10k) * (params.ageMonths <= 36 ? 2.5 : 2.0));
  } else if (units10k > 0) {
    const factor = params.ageMonths <= 36 ? 3.8 : params.ageMonths <= 84 ? 3.0 : 2.2;
    kmCorrectiePerc = -Math.min(28.0, units10k * factor);
  }
  kmCorrectiePerc = Math.round(kmCorrectiePerc * 10) / 10;

  let basisDealerPrijs = params.marketMedianPrice;
  if (basisDealerPrijs > 0 && params.marketAvgKm > 0) {
    const kmDeltaVsMarket10k = (params.kilometerstand - params.marketAvgKm) / 10000;
    const marketKmAdjFactor = 1 - Math.max(-0.15, Math.min(0.18, kmDeltaVsMarket10k * 0.028));
    basisDealerPrijs = Math.round((basisDealerPrijs * marketKmAdjFactor) / 50) * 50;
  } else {
    const cat = params.catalogusprijs && params.catalogusprijs > 0 ? params.catalogusprijs : 28500;
    let resFactor = 0.78;
    if (params.ageMonths <= 12) resFactor = 0.80;
    else if (params.ageMonths <= 24) resFactor = 0.67;
    else if (params.ageMonths <= 36) resFactor = 0.56;
    else if (params.ageMonths <= 48) resFactor = 0.47;
    else if (params.ageMonths <= 60) resFactor = 0.39;
    else if (params.ageMonths <= 84) resFactor = 0.29;
    else if (params.ageMonths <= 120) resFactor = 0.19;
    else resFactor = Math.max(0.08, 0.19 - ((params.ageMonths - 120) / 60) * 0.09);
    basisDealerPrijs = Math.max(1500, Math.round((cat * resFactor * (1 + kmCorrectiePerc / 100)) / 50) * 50);
  }

  const verkoopDealerBovag = Math.max(1250, Math.round(basisDealerPrijs / 50) * 50);
  const verkoopParticulier = Math.max(1000, Math.round((verkoopDealerBovag * 0.89) / 50) * 50);
  const inruilwaarde = Math.max(800, Math.round((verkoopDealerBovag * 0.81) / 50) * 50);
  const vervangingswaardeTotalLoss = Math.max(1150, Math.round((verkoopDealerBovag * 0.96) / 50) * 50);

  const basisVoorCorrectie = verkoopDealerBovag / (1 + kmCorrectiePerc / 100);
  const kmCorrectieBedrag = Math.round((verkoopDealerBovag - basisVoorCorrectie) / 10) * 10;

  return {
    bronType: 'model_berekening',
    voertuigOmschrijving: params.voertuigOmschrijving,
    kenteken: params.kenteken,
    bouwjaar: params.bouwjaar,
    leeftijdJaren,
    kilometerstand: params.kilometerstand,
    normKmPerJaar: params.normKmPerJaar,
    verwachteNormKm: params.verwachteNormKm,
    kmAfwijking,
    kmCorrectiePerc,
    kmCorrectieBedrag,
    nieuwwaarde: params.catalogusprijs,
    waarden: {
      vervangingswaardeTotalLoss,
      verkoopDealerBovag,
      verkoopParticulier,
      inruilwaarde,
      verzekeringsDagwaarde: vervangingswaardeTotalLoss
    },
    toelichting:
      `Indicatief berekend via marktmediaan, leeftijd (~${leeftijdJaren} jaar) en ANWB-jaarnorm (${params.normKmPerJaar.toLocaleString('nl-NL')} km/jaar). Vul een geldig Nederlands kenteken in voor directe koppeling met de ANWB Koerslijst.`,
    koerslijstUrl: 'https://www.anwb.nl/auto/koerslijst'
  };
}

export async function runMarketComparison(input: MarktZoekInput): Promise<MarktVergelijkingResultaat> {
  const currentYear = new Date().getFullYear();
  const bouwjaar = Math.max(1985, Math.min(currentYear + 1, Math.round(input.bouwjaar || currentYear - 3)));
  const kilometerstand = Math.max(0, Math.min(1500000, Math.round(input.kilometerstand || 0)));

  const { make, shortModel, trimHint, modelTokens } = normalizeVehicleSearchCriteria(input);
  const bouwjaarMin = Math.max(1985, bouwjaar - 1);
  const bouwjaarMax = Math.min(currentYear + 1, bouwjaar + 1);
  const kmTolerance = Math.max(20000, Math.round(kilometerstand * 0.35));
  const kmMin = Math.max(0, kilometerstand - kmTolerance);
  const kmMax = kilometerstand + kmTolerance;

  const now = new Date();
  let ageMonths = Math.max(6, (now.getFullYear() - bouwjaar) * 12 + (now.getMonth() + 1 - 6));
  if (input.datumEersteToelating) {
    const parts = input.datumEersteToelating.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (parts) {
      const regDate = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
      const months = Math.round((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
      if (months >= 1 && months <= 600) ageMonths = months;
    }
  }
  const fuelLower = (input.brandstof || '').toLowerCase();
  let normKmPerJaar = 15000;
  if (fuelLower.includes('diesel')) normKmPerJaar = 22500;
  else if (fuelLower.includes('elektr') && !fuelLower.includes('benz')) normKmPerJaar = 17500;
  const verwachteNormKm = Math.max(2500, Math.round((ageMonths / 12) * normKmPerJaar));

  const urls = buildSearchUrls(make, shortModel, bouwjaarMin, bouwjaarMax, kmMin, kmMax);

  const [mpRes, as24Res, officialAnwb] = await Promise.all([
    scrapeMarktplaats({
      make,
      shortModel,
      modelTokens,
      trimHint,
      bouwjaar,
      bouwjaarMin,
      bouwjaarMax,
      kilometerstand,
      kmMin,
      kmMax,
      brandstof: input.brandstof,
      zoekUrl: urls.marktplaatsUrl
    }),
    scrapeAutoScout24({
      make,
      shortModel,
      modelTokens,
      trimHint,
      bouwjaar,
      bouwjaarMin,
      bouwjaarMax,
      kilometerstand,
      kmMin,
      kmMax,
      brandstof: input.brandstof,
      zoekUrl: urls.autoscout24Url
    }),
    fetchOfficialAnwbKoerslijst({
      kenteken: input.kenteken,
      merkModel: input.merkModel || `${make} ${shortModel}`,
      bouwjaar,
      kilometerstand,
      verwachteNormKm,
      catalogusprijs: input.catalogusprijs
    })
  ]);

  const combinedRaw = [...mpRes.items, ...as24Res.items];
  const deduped: MarktAdvertentie[] = [];
  const seenKeys = new Set<string>();
  for (const item of combinedRaw) {
    const key = `${item.bron}:${item.vraagprijs}:${item.kilometerstand || 0}:${item.titel.slice(0, 24).toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(item);
    }
  }

  const cleaned = filterPriceOutliers(deduped).sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const kmDiffA = a.kilometerstand !== undefined ? Math.abs(a.kilometerstand - kilometerstand) : 999999;
    const kmDiffB = b.kilometerstand !== undefined ? Math.abs(b.kilometerstand - kilometerstand) : 999999;
    return kmDiffA - kmDiffB;
  });

  const topListings = cleaned.slice(0, 30);
  const prices = topListings.map(i => i.vraagprijs);
  const kms = topListings.map(i => i.kilometerstand).filter((k): k is number => k !== undefined && k > 0);

  const laagsteVraagprijs = prices.length > 0 ? Math.min(...prices) : 0;
  const hoogsteVraagprijs = prices.length > 0 ? Math.max(...prices) : 0;
  const mediaanVraagprijs = getMedian(prices);
  const gemiddeldeVraagprijs =
    prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
  const gemiddeldeKmStand =
    kms.length > 0 ? Math.round(kms.reduce((s, k) => s + k, 0) / kms.length) : kilometerstand;

  const anwbKoerslijst = buildAnwbKoerslijstResult({
    voertuigOmschrijving: `${make} ${trimHint || shortModel}`.trim(),
    kenteken: input.kenteken,
    bouwjaar,
    kilometerstand,
    brandstof: input.brandstof,
    catalogusprijs: input.catalogusprijs,
    datumEersteToelating: input.datumEersteToelating,
    normKmPerJaar,
    verwachteNormKm,
    ageMonths,
    marketMedianPrice: mediaanVraagprijs || gemiddeldeVraagprijs,
    marketAvgKm: gemiddeldeKmStand,
    officialAnwb
  });

  // Expert vervangingswaarde: official ANWB total-loss vervangingswaarde indien beschikbaar, anders km-gecorrigeerde marktmediaan
  let expertVervangingswaarde = anwbKoerslijst.waarden.vervangingswaardeTotalLoss;
  if (anwbKoerslijst.bronType !== 'anwb_live_api' && mediaanVraagprijs > 0 && kms.length > 0) {
    const kmDelta10k = (kilometerstand - gemiddeldeKmStand) / 10000;
    const factor = 1 - Math.max(-0.15, Math.min(0.18, kmDelta10k * 0.028));
    expertVervangingswaarde = Math.round((mediaanVraagprijs * factor) / 50) * 50;
  }

  const bronnenStatus: MarktBronStatus[] = [
    mpRes.status,
    as24Res.status,
    {
      bron: 'Gaspedaal',
      methode: 'zoeklink_only',
      status: 'ok',
      aantalGevonden: 0,
      zoekUrl: urls.gaspedaalUrl,
      bericht: 'Direct zoeken via vooraf ingevulde Gaspedaal-link'
    },
    {
      bron: 'AutoTrack',
      methode: 'zoeklink_only',
      status: 'ok',
      aantalGevonden: 0,
      zoekUrl: urls.autotrackUrl,
      bericht: 'Direct zoeken via vooraf ingevulde AutoTrack-link'
    }
  ];

  return {
    zoekCriteria: {
      merk: make,
      model: shortModel,
      bouwjaar,
      bouwjaarMin,
      bouwjaarMax,
      kilometerstand,
      kmMin,
      kmMax,
      brandstof: input.brandstof,
      transmissie: input.transmissie,
      kenteken: input.kenteken,
      catalogusprijs: input.catalogusprijs
    },
    bronnenStatus,
    statistieken: {
      aantalVergelijkbaar: topListings.length,
      laagsteVraagprijs,
      mediaanVraagprijs,
      gemiddeldeVraagprijs,
      hoogsteVraagprijs,
      gemiddeldeKmStand,
      expertVervangingswaarde
    },
    advertenties: topListings,
    anwbKoerslijst,
    gegenereerdOp: new Date().toISOString()
  };
}
