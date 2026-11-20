import type { MarktVergelijkingResultaat } from '../types/audatex';

export function getApiBase(): string {
  const envBase =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_API_BASE) ||
    '';
  return String(envBase).trim().replace(/\/+$/, '');
}

export function apiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function buildStaticMarktFallback(params: {
  merkModel: string;
  bouwjaar: number;
  kilometerstand: number;
  kenteken?: string;
  brandstof?: string;
  catalogusprijs?: number;
  datumEersteToelating?: string;
}): MarktVergelijkingResultaat {
  const currentYear = new Date().getFullYear();
  const bouwjaar = Math.max(1985, Math.min(currentYear + 1, Math.round(params.bouwjaar || currentYear - 3)));
  const kilometerstand = Math.max(0, Math.round(params.kilometerstand || 0));

  const cleaned = (params.merkModel || 'Auto').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const make = parts[0] || 'Auto';
  const shortModel = parts.slice(1).join(' ') || cleaned;
  const makeSlug = make.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const modelSlug = shortModel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const queryText = `${make} ${shortModel}`.trim();

  const bouwjaarMin = Math.max(1985, bouwjaar - 1);
  const bouwjaarMax = Math.min(currentYear + 1, bouwjaar + 1);
  const kmTolerance = Math.max(20000, Math.round(kilometerstand * 0.35));
  const kmMin = Math.max(0, kilometerstand - kmTolerance);
  const kmMax = kilometerstand + kmTolerance;

  const now = new Date();
  let ageMonths = Math.max(6, (now.getFullYear() - bouwjaar) * 12 + (now.getMonth() + 1 - 6));
  if (params.datumEersteToelating) {
    const m = params.datumEersteToelating.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (m) {
      const regDate = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      const months = Math.round((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
      if (months >= 1 && months <= 600) ageMonths = months;
    }
  }

  const fuelLower = (params.brandstof || '').toLowerCase();
  let normKmPerJaar = 15000;
  if (fuelLower.includes('diesel')) normKmPerJaar = 22500;
  else if (fuelLower.includes('elektr') && !fuelLower.includes('benz')) normKmPerJaar = 17500;
  const verwachteNormKm = Math.max(2500, Math.round((ageMonths / 12) * normKmPerJaar));
  const kmAfwijking = kilometerstand - verwachteNormKm;

  const units10k = kmAfwijking / 10000;
  let kmCorrectiePerc = 0;
  if (units10k < 0) {
    kmCorrectiePerc = Math.min(8.0, Math.abs(units10k) * (ageMonths <= 36 ? 2.5 : 2.0));
  } else if (units10k > 0) {
    const factor = ageMonths <= 36 ? 3.8 : ageMonths <= 84 ? 3.0 : 2.2;
    kmCorrectiePerc = -Math.min(28.0, units10k * factor);
  }
  kmCorrectiePerc = Math.round(kmCorrectiePerc * 10) / 10;

  const cat = params.catalogusprijs && params.catalogusprijs > 0 ? params.catalogusprijs : 28500;
  let resFactor = 0.78;
  if (ageMonths <= 12) resFactor = 0.80;
  else if (ageMonths <= 24) resFactor = 0.67;
  else if (ageMonths <= 36) resFactor = 0.56;
  else if (ageMonths <= 48) resFactor = 0.47;
  else if (ageMonths <= 60) resFactor = 0.39;
  else if (ageMonths <= 84) resFactor = 0.29;
  else if (ageMonths <= 120) resFactor = 0.19;
  else resFactor = Math.max(0.08, 0.19 - ((ageMonths - 120) / 60) * 0.09);

  const verkoopDealerBovag = Math.max(1250, Math.round((cat * resFactor * (1 + kmCorrectiePerc / 100)) / 50) * 50);
  const verkoopParticulier = Math.max(1000, Math.round((verkoopDealerBovag * 0.89) / 50) * 50);
  const inruilwaarde = Math.max(800, Math.round((verkoopDealerBovag * 0.81) / 50) * 50);
  const vervangingswaardeTotalLoss = Math.max(1150, Math.round((verkoopDealerBovag * 0.96) / 50) * 50);
  const basisVoorCorrectie = verkoopDealerBovag / (1 + kmCorrectiePerc / 100);
  const kmCorrectieBedrag = Math.round((verkoopDealerBovag - basisVoorCorrectie) / 10) * 10;

  const mpSearchUrl = `https://www.marktplaats.nl/l/auto-s/${makeSlug}/q/${encodeURIComponent(shortModel)}/#f:constructionYearFrom:${bouwjaarMin},constructionYearTo:${bouwjaarMax},mileageFrom:${kmMin},mileageTo:${kmMax}`;
  const as24Url = `https://www.autoscout24.nl/lst/${makeSlug}/${modelSlug}?fregfrom=${bouwjaarMin}&fregto=${bouwjaarMax}&kmfrom=${kmMin}&kmto=${kmMax}&cy=NL&atype=C`;
  const gaspedaalUrl = `https://www.gaspedaal.nl/${makeSlug}/${modelSlug}?bmin=${bouwjaarMin}&bmax=${bouwjaarMax}&kmin=${kmMin}&kmax=${kmMax}`;
  const autotrackUrl = `https://www.autotrack.nl/aanbod?zoekopdracht=${encodeURIComponent(queryText)}&bouwjaar-van=${bouwjaarMin}&bouwjaar-tot=${bouwjaarMax}&kilometerstand-van=${kmMin}&kilometerstand-tot=${kmMax}`;

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
      brandstof: params.brandstof,
      kenteken: params.kenteken,
      catalogusprijs: params.catalogusprijs
    },
    bronnenStatus: [
      { bron: 'Marktplaats', methode: 'zoeklink_only', status: 'beperkt', aantalGevonden: 0, zoekUrl: mpSearchUrl },
      { bron: 'AutoScout24', methode: 'zoeklink_only', status: 'beperkt', aantalGevonden: 0, zoekUrl: as24Url },
      { bron: 'Gaspedaal', methode: 'zoeklink_only', status: 'ok', aantalGevonden: 0, zoekUrl: gaspedaalUrl },
      { bron: 'AutoTrack', methode: 'zoeklink_only', status: 'ok', aantalGevonden: 0, zoekUrl: autotrackUrl }
    ],
    statistieken: {
      aantalVergelijkbaar: 0,
      laagsteVraagprijs: 0,
      mediaanVraagprijs: 0,
      gemiddeldeVraagprijs: 0,
      hoogsteVraagprijs: 0,
      gemiddeldeKmStand: kilometerstand,
      expertVervangingswaarde: vervangingswaardeTotalLoss
    },
    advertenties: [],
    anwbKoerslijst: {
      bronType: 'model_berekening',
      voertuigOmschrijving: cleaned,
      kenteken: params.kenteken,
      bouwjaar,
      leeftijdJaren: Math.round((ageMonths / 12) * 10) / 10,
      kilometerstand,
      normKmPerJaar,
      verwachteNormKm,
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
        `Indicatief berekend via cataloguswaarde, leeftijd (~${(ageMonths / 12).toFixed(1)} jaar) en ANWB-jaarnorm (${normKmPerJaar.toLocaleString('nl-NL')} km/jr). Op statische GitHub Pages zonder gekoppelde Node-backend (VITE_API_BASE) worden directe ANWB Koerslijst-API en Marktplaats/AutoScout24-scraping door browser-CORS geblokkeerd; gebruik wel de vooraf ingevulde portaal-links of koppel een Node-backend via VITE_API_BASE.`,
      koerslijstUrl: 'https://www.anwb.nl/auto/koerslijst'
    },
    gegenereerdOp: new Date().toISOString()
  };
}
