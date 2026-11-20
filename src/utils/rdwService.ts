import { RdwVoertuigData } from '../types/audatex';

/**
 * Formatteert een Nederlands kenteken naar het officiële streepjespatroon (sidecodes 1 t/m 14)
 */
export function formatDutchPlate(input: string): string {
  if (!input) return '';
  const clean = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length !== 6) return input.toUpperCase();

  // Sidecode 1: XX-99-99
  if (/^[A-Z]{2}[0-9]{2}[0-9]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 2: 99-99-XX
  if (/^[0-9]{2}[0-9]{2}[A-Z]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 3: 99-XX-99
  if (/^[0-9]{2}[A-Z]{2}[0-9]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 4: XX-99-XX
  if (/^[A-Z]{2}[0-9]{2}[A-Z]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 5: XX-XX-99
  if (/^[A-Z]{2}[A-Z]{2}[0-9]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 6: 99-XX-XX
  if (/^[0-9]{2}[A-Z]{2}[A-Z]{2}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 7: 99-XXX-9
  if (/^[0-9]{2}[A-Z]{3}[0-9]{1}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 6)}`;
  // Sidecode 8: 9-XXX-99
  if (/^[0-9]{1}[A-Z]{3}[0-9]{2}$/.test(clean)) return `${clean.slice(0, 1)}-${clean.slice(1, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 9: XX-999-X
  if (/^[A-Z]{2}[0-9]{3}[A-Z]{1}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 6)}`;
  // Sidecode 10: X-999-XX
  if (/^[A-Z]{1}[0-9]{3}[A-Z]{2}$/.test(clean)) return `${clean.slice(0, 1)}-${clean.slice(1, 4)}-${clean.slice(4, 6)}`;
  // Sidecode 11: XXX-99-X
  if (/^[A-Z]{3}[0-9]{2}[A-Z]{1}$/.test(clean)) return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 6)}`;
  // Sidecode 12: X-99-XXX
  if (/^[A-Z]{1}[0-9]{2}[A-Z]{3}$/.test(clean)) return `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3, 6)}`;
  // Sidecode 13: 9-XX-999
  if (/^[0-9]{1}[A-Z]{2}[0-9]{3}$/.test(clean)) return `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3, 6)}`;
  // Sidecode 14: 999-XX-9
  if (/^[0-9]{3}[A-Z]{2}[0-9]{1}$/.test(clean)) return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 6)}`;

  return clean;
}

/**
 * Berekent de indicatieve dagwaarde conform de Nederlandse auto-expertisesystematiek
 * (NIVRE / Bovag / Belastingdienst afschrijvingstabel) op basis van catalogusprijs en leeftijd.
 */
export function calculateIndicativeDagwaarde(
  catalogusprijs: number, 
  datumEersteToelating?: string
): RdwVoertuigData['indicatieveDagwaarde'] {
  let year = new Date().getFullYear();
  let month = 1;
  let day = 1;

  if (datumEersteToelating) {
    const cleanDate = datumEersteToelating.replace(/[^0-9]/g, '');
    if (cleanDate.length >= 8) {
      year = parseInt(cleanDate.substring(0, 4), 10);
      month = parseInt(cleanDate.substring(4, 6), 10);
      day = parseInt(cleanDate.substring(6, 8), 10);
    } else if (cleanDate.length === 4) {
      year = parseInt(cleanDate, 10);
    }
  }

  const toelating = new Date(year, Math.max(0, month - 1), day);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - toelating.getTime());
  const ageMonths = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));

  // Als catalogusprijs ontbreekt (bijv. import of oud), hanteer een realistische schatting
  const hasOfficialCatalogusprijs = catalogusprijs > 0;
  const basePrice = hasOfficialCatalogusprijs ? catalogusprijs : 32500;

  // Standaard Nederlandse NIVRE/Bovag afschrijvingscurve
  let residualFactor = 1.0;
  if (ageMonths <= 1) {
    residualFactor = 0.88;
  } else if (ageMonths <= 12) {
    residualFactor = 0.88 - ((ageMonths - 1) / 11) * (0.88 - 0.74);
  } else if (ageMonths <= 24) {
    residualFactor = 0.74 - ((ageMonths - 12) / 12) * (0.74 - 0.61);
  } else if (ageMonths <= 36) {
    residualFactor = 0.61 - ((ageMonths - 24) / 12) * (0.61 - 0.50);
  } else if (ageMonths <= 48) {
    residualFactor = 0.50 - ((ageMonths - 36) / 12) * (0.50 - 0.41);
  } else if (ageMonths <= 60) {
    residualFactor = 0.41 - ((ageMonths - 48) / 12) * (0.41 - 0.33);
  } else if (ageMonths <= 72) {
    residualFactor = 0.33 - ((ageMonths - 60) / 12) * (0.33 - 0.27);
  } else if (ageMonths <= 96) {
    residualFactor = 0.27 - ((ageMonths - 72) / 24) * (0.27 - 0.18);
  } else if (ageMonths <= 120) {
    residualFactor = 0.18 - ((ageMonths - 96) / 24) * (0.18 - 0.13);
  } else {
    residualFactor = Math.max(0.08, 0.13 - ((ageMonths - 120) / 48) * 0.05);
  }

  const geschat = Math.max(1250, Math.round((basePrice * residualFactor) / 50) * 50);
  const laag = Math.max(1000, Math.round((geschat * 0.92) / 50) * 50);
  const hoog = Math.round((geschat * 1.08) / 50) * 50;
  const afschrijvingsPercentage = Math.round((1 - (geschat / basePrice)) * 100);

  return {
    geschat,
    laag,
    hoog,
    afschrijvingsPercentage,
    leeftijdInMaanden: ageMonths,
    methode: hasOfficialCatalogusprijs
      ? `RDW Catalogusprijs € ${catalogusprijs.toLocaleString('nl-NL')} • Afschrijving ${afschrijvingsPercentage}% (${ageMonths} maanden)`
      : `Indicatief berekend op basis van bouwjaar ${year}`
  };
}

/**
 * Haalt RDW Open Data op voor een kenteken en berekent de dagwaarde
 */
export async function lookupRdwVehicle(rawKenteken: string): Promise<RdwVoertuigData | null> {
  if (!rawKenteken) return null;
  const clean = rawKenteken.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 5 || clean.length > 8) return null;

  try {
    // 1. Hoofdgegevens voertuig met strikte timeout (3.5s) zodat het nooit blijft hangen
    const rdwUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${encodeURIComponent(clean)}`;
    const res = await fetch(rdwUrl, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;

    const list: any[] = await res.json();
    if (!list || list.length === 0) {
      return {
        kenteken: clean,
        geformatteerdKenteken: formatDutchPlate(clean),
        gevonden: false,
        indicatieveDagwaarde: calculateIndicativeDagwaarde(0)
      };
    }

    const data = list[0];
    const catalogusprijs = parseFloat(data.catalogusprijs) || 0;
    const datumEersteToelating = data.datum_eerste_toelating || '';
    
    // Format toelating date: 20240325 -> 25-03-2024
    let formattedToelating = datumEersteToelating;
    let bouwjaar: number | undefined;
    if (datumEersteToelating.length === 8) {
      bouwjaar = parseInt(datumEersteToelating.substring(0, 4), 10);
      formattedToelating = `${datumEersteToelating.substring(6, 8)}-${datumEersteToelating.substring(4, 6)}-${datumEersteToelating.substring(0, 4)}`;
    }

    // Format APK date: 20270325 -> 25-03-2027
    const vervaldatumApk = data.vervaldatum_apk || '';
    let formattedApk = vervaldatumApk;
    let apkGeldig = true;
    if (vervaldatumApk.length === 8) {
      formattedApk = `${vervaldatumApk.substring(6, 8)}-${vervaldatumApk.substring(4, 6)}-${vervaldatumApk.substring(0, 4)}`;
      const apkDate = new Date(
        parseInt(vervaldatumApk.substring(0, 4), 10),
        parseInt(vervaldatumApk.substring(4, 6), 10) - 1,
        parseInt(vervaldatumApk.substring(6, 8), 10)
      );
      apkGeldig = apkDate.getTime() > Date.now();
    }

    // 2. Brandstof ophalen met 2.5s timeout
    let brandstof = 'Onbekend';
    try {
      const fuelRes = await fetch(`https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(2500)
      });
      if (fuelRes.ok) {
        const fuelList: any[] = await fuelRes.json();
        if (fuelList && fuelList.length > 0) {
          brandstof = fuelList[0].brandstof_omschrijving || 'Onbekend';
        }
      }
    } catch {
      // Ignore fuel error
    }

    const indicatieveDagwaarde = calculateIndicativeDagwaarde(catalogusprijs, datumEersteToelating);

    return {
      kenteken: clean,
      geformatteerdKenteken: formatDutchPlate(clean),
      gevonden: true,
      merk: data.merk || '',
      handelsbenaming: data.handelsbenaming || '',
      inrichting: data.inrichting || '',
      eersteKleur: data.eerste_kleur && data.eerste_kleur !== 'N.v.t.' ? data.eerste_kleur : undefined,
      brandstof,
      bouwjaar,
      datumEersteToelating: formattedToelating,
      vervaldatumApk: formattedApk,
      apkGeldig,
      wamVerzekerd: data.wam_verzekerd === 'Ja',
      catalogusprijs: catalogusprijs > 0 ? catalogusprijs : undefined,
      massaLedigVoertuig: parseFloat(data.massa_ledig_voertuig) || undefined,
      indicatieveDagwaarde
    };
  } catch (error) {
    console.error('Fout bij ophalen RDW gegevens:', error);
    return null;
  }
}
