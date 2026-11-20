import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseLib = require('pdf-parse');

import { lookupRdwVehicle, formatDutchPlate } from './src/utils/rdwService.ts';
import { runMarketComparison } from './server/marketScraper.ts';
import {
  parseAudatexReport,
  categorizeSector,
  isFoutgeheugenPost,
  isOverigeKeuzeHandeling,
  applySchade1Selection,
  detectDefaultSchadeZones
} from './src/utils/audatexParser.ts';
import { ZONE_LABELS } from './src/types/audatex.ts';

const execFileAsync = promisify(execFile);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Fallback heuristic parser for text when Gemini is not called
async function parseAudatexTextFallback(rawText: string) {
  // Probeer eerst de officiële Audatex Solera parser
  const officialReport = parseAudatexReport(rawText);
  if (officialReport && officialReport.regels.length > 0) {
    return officialReport;
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let kenteken = 'ONBEKEND';
  let merkModel = 'Voertuig volgens calculatie';
  let calculatienummer = 'ADX-' + Math.floor(100000 + Math.random() * 900000);
  let dossiernummer = 'DOS-' + Math.floor(10000 + Math.random() * 90000);
  let datumCalculatie = new Date().toLocaleDateString('nl-NL');
  let expertHersteller = 'Solera Audatex Schadehersteller';
  let laksoort = 'Metallic / 2-Laags (AZT code LB)';
  let kleurcode = 'Standaard lak';
  let kilometerstand: number | undefined;
  let bouwjaar: number | undefined;

  let plaatwerktarief = 88.50;
  let demontagetarief = 82.00;
  let spuittarief = 94.00;
  let spuitmateriaaltarief = 49.50;
  let materiaalconstante = 33.60;
  let kleinMateriaalPerc = 2.0;
  let milieutoeslag = 18.50;

  // Search explicit or implicit Dutch license plates in the text
  const plateLineMatch = rawText.match(/kenteken[:\s]+([A-Z0-9-]+)/i);
  if (plateLineMatch) {
    kenteken = plateLineMatch[1].trim();
  } else {
    // Look for Dutch license plate pattern like XX-99-XX, 99-XXX-9, V-05-RHN, etc.
    const patternMatch = rawText.match(/\b([0-9A-Z]{1,3}-[0-9A-Z]{1,3}-[0-9A-Z]{1,3})\b/i);
    if (patternMatch) {
      kenteken = patternMatch[1].trim();
    }
  }

  const regels: any[] = [];
  let idx = 1;

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Detect vehicle / meta
    if (lower.includes('voertuig:') || lower.includes('merk/type:') || lower.includes('model:')) {
      const parts = line.split(/:\s*/);
      if (parts[1]) merkModel = parts[1].trim();
    }
    if (lower.includes('calculatie:') || lower.includes('calculatienummer:')) {
      const match = line.match(/calculatie(?:nummer)?[:\s]+([A-Z0-9-]+)/i);
      if (match) calculatienummer = match[1].trim();
    }
    if (lower.includes('dossier:') || lower.includes('dossiernummer:')) {
      const match = line.match(/dossier(?:nummer)?[:\s]+([A-Z0-9-]+)/i);
      if (match) dossiernummer = match[1].trim();
    }
    if (lower.includes('materiaalconstante') || lower.includes('tz 51') || lower.includes('constante')) {
      const match = line.match(/(\d+[.,]\d+)/);
      if (match) materiaalconstante = parseFloat(match[1].replace(',', '.'));
    }
    if (lower.includes('kilometerstand') || lower.includes('km-stand')) {
      const match = line.match(/[:\s]+([0-9][0-9.\s]{1,9})\s*(?:km)?/i);
      if (match) {
        const parsedKm = parseInt(match[1].replace(/[^0-9]/g, ''), 10);
        if (!Number.isNaN(parsedKm) && parsedKm <= 2000000) kilometerstand = parsedKm;
      }
    }
    if (lower.includes('afgifte deel 1') || lower.includes('bouwjaar')) {
      const match = line.match(/([12][09][0-9]{2})/);
      if (match) bouwjaar = parseInt(match[1], 10);
    }

    // Detect line items with numbers
    // e.g.: 001 0101 VERN Voorbumperbekleding vernieuwen 0.00 1.40 1.80 485.00
    // or parts / labor
    const lineItemMatch = line.match(/^(\d{1,4})?\s*([0-9]{3,4})?\s*(VERN|I\.ST|D\+M|SP|HERST|DM)?\s+(.+?)(?:\s+(\d+[.,]\d{1,2}))?(?:\s+(\d+[.,]\d{1,2}))?(?:\s+(\d+[.,]\d{1,2}))?(?:\s+(\d+[.,]\d{1,2}))?$/i);
    
    if (lineItemMatch && lineItemMatch[4] && lineItemMatch[4].length > 3 && !lower.includes('tarieven') && !lower.includes('omschrijving')) {
      const code = lineItemMatch[2] || '0' + idx;
      const bewerkingRaw = (lineItemMatch[3] || '').toUpperCase();
      const omschrijving = lineItemMatch[4].trim();
      
      const nums = [lineItemMatch[5], lineItemMatch[6], lineItemMatch[7], lineItemMatch[8]]
        .filter(Boolean)
        .map(n => parseFloat(n!.replace(',', '.')));

      let arbeidPlaatwerk = 0;
      let arbeidDemontage = 0;
      let spuittijd = 0;
      let deelPrijs = 0;

      if (nums.length === 4) {
        arbeidPlaatwerk = nums[0];
        arbeidDemontage = nums[1];
        spuittijd = nums[2];
        deelPrijs = nums[3];
      } else if (nums.length === 3) {
        arbeidDemontage = nums[0];
        spuittijd = nums[1];
        deelPrijs = nums[2];
      } else if (nums.length === 2) {
        spuittijd = nums[0];
        deelPrijs = nums[1];
      } else if (nums.length === 1) {
        if (nums[0] > 30) deelPrijs = nums[0];
        else spuittijd = nums[0];
      }

      let bewerking: 'VERN' | 'HERST' | 'DM' | 'SP' | 'SPH' | 'UITSP' | 'LS' | 'DIV' = 'DIV';
      if (bewerkingRaw.includes('VERN')) bewerking = 'VERN';
      else if (bewerkingRaw.includes('ST') || bewerkingRaw.includes('HERST')) bewerking = 'HERST';
      else if (bewerkingRaw.includes('D+M') || bewerkingRaw.includes('DM')) bewerking = 'DM';
      else if (bewerkingRaw.includes('LS')) bewerking = 'LS';
      else if (bewerkingRaw.includes('LB') || bewerkingRaw.includes('UITSP')) bewerking = 'UITSP';
      else if (bewerkingRaw.includes('SH')) bewerking = 'SPH';
      else if (bewerkingRaw.includes('SP')) bewerking = 'SP';
      else if (deelPrijs > 0) bewerking = 'VERN';
      else if (spuittijd > 0) bewerking = 'SP';

      // Audatex eenheden normalisatie: 1 AE = 6 min, 10 AE = 1 uur
      const spuitAE = spuittijd >= 10 ? spuittijd : Math.round(spuittijd * 10);
      const plaatAE = arbeidPlaatwerk >= 10 ? arbeidPlaatwerk : Math.round(arbeidPlaatwerk * 10);
      const demAE = arbeidDemontage >= 10 ? arbeidDemontage : Math.round(arbeidDemontage * 10);

      const isFoutgeheugen = isFoutgeheugenPost(omschrijving, code);
      const rawSectie = categorizeSector(omschrijving, code);
      const isOverig = !isFoutgeheugen && (rawSectie === 'overig' || isOverigeKeuzeHandeling(omschrijving, code));

      regels.push({
        id: 'regel-' + idx,
        code,
        omschrijving,
        sectie: isFoutgeheugen ? 'voorzijde' : rawSectie,
        isEenmaligePost: isFoutgeheugen || undefined,
        isOverigeHandeling: isOverig || undefined,
        bewerking,
        onderdeelPrijs: deelPrijs,
        arbeidPlaatwerkAE: plaatAE,
        arbeidDemontageAE: demAE,
        spuittijdAE: spuitAE,
        arbeidPlaatwerkUren: plaatAE / 10,
        arbeidDemontageUren: demAE / 10,
        spuittijdUren: spuitAE / 10
      });
      idx++;
    }
  }

  if (regels.length === 0) {
    return null;
  }

  // Format plate if recognized
  if (kenteken && kenteken !== 'ONBEKEND') {
    kenteken = formatDutchPlate(kenteken);
  }

  const { schade1Zone, schade2Zone } = detectDefaultSchadeZones(regels);
  const s1Label = ZONE_LABELS[schade1Zone];
  const s2Label = ZONE_LABELS[schade2Zone];

  return {
    meta: {
      kenteken,
      merkModel,
      chassisnummer: 'N/A',
      calculatienummer,
      dossiernummer,
      datumCalculatie,
      datumSchade: datumCalculatie,
      expertHersteller,
      opdrachtgever: 'Schadeverzekeraar / Leasemaatschappij',
      laksoort,
      kleurcode,
      kilometerstand,
      bouwjaar
    },
    tarieven: {
      plaatwerktarief,
      demontagetarief,
      spuittarief,
      spuitmateriaaltarief,
      materiaalconstante,
      kleinMateriaalPerc,
      milieutoeslag,
      btwPercentage: 21.0
    },
    materiaalconstanteMethode: 'solera_tz143',
    schade1Zone,
    schade2Zone,
    soleraAanbeveling: {
      titel: 'Solera Audatex Richtlijn Tekstzone 143',
      tekstzone: 'TZ 143',
      advies: `Volledige materiaalconstante (€ ${materiaalconstante.toFixed(2)}) toegekend aan ${s1Label} (Schade 1). Voor ${s2Label} (Schade 2) dient Tekstzone 143 als aftrek (-${materiaalconstante.toFixed(2)}) te worden toegepast om dubbele vergoeding te voorkomen.`,
      invoerTekst143: `TZ 143 (${s2Label}): -${materiaalconstante.toFixed(2)} EUR (Aftrek AZT materiaalconstante ivm gecombineerde spuitdoorgang met ${s1Label}, dossier ${kenteken})`
    },
    regels: applySchade1Selection(regels, schade1Zone, schade2Zone)
  };
}

// API endpoint for Audatex damage calculation analysis
app.post('/api/analyze-audatex', async (req, res) => {
  let extractedText: string = req.body?.text || '';
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    let text = extractedText;

    if (!text && !fileBase64) {
      return res.status(400).json({ error: 'Geen calculatietekst of documentbestand aangeleverd.' });
    }

    // 1. Decodeer txt-bestanden of extraheer tekst uit digitale PDF-calculaties
    if (!text && fileBase64 && (mimeType?.includes('text') || fileName?.toLowerCase().endsWith('.txt'))) {
      try {
        text = Buffer.from(fileBase64, 'base64').toString('utf-8');
        extractedText = text;
      } catch (e) {
        console.warn('Kon base64 tekstbestand niet decoderen:', e);
      }
    } else if (!text && fileBase64 && (mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf'))) {
      let parser: any = null;
      try {
        const pdfBuf = Buffer.from(fileBase64, 'base64');
        if (typeof pdfParseLib === 'function') {
          const parsedPdf = await pdfParseLib(pdfBuf);
          text = parsedPdf?.text || '';
        } else if (pdfParseLib?.PDFParse) {
          parser = new pdfParseLib.PDFParse({ data: pdfBuf });
          const parsedPdf = await parser.getText();
          text = parsedPdf?.text || '';
        }
        extractedText = text;
      } catch (e) {
        console.warn('Kon tekst niet direct uit PDF extraheren (val terug op beeldherkenning):', e);
      } finally {
        if (parser && typeof parser.destroy === 'function') {
          await parser.destroy().catch(() => {});
        }
      }
    }

    // 2. Snelle deterministische Solera Audatex parser voor officiële calculaties
    if (text) {
      const parsedOfficial = parseAudatexReport(text);
      if (parsedOfficial && parsedOfficial.regels && parsedOfficial.regels.length > 0) {
        console.log(`Audatex calculatie succesvol verwerkt via Solera Engine voor kenteken: ${parsedOfficial.meta.kenteken}`);
        return res.json({ result: parsedOfficial, source: 'solera_audatex_engine' });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is niet ingesteld. Lokale heuristische parser wordt gebruikt.');
      if (text) {
        const fallbackResult = await parseAudatexTextFallback(text);
        if (fallbackResult) {
          return res.json({ result: fallbackResult, source: 'fallback_parser' });
        }
      }
      return res.status(503).json({
        error: 'Document kon niet worden verwerkt. Gebruik de tekstondersteuning of selecteer een van de dossiers.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `Je bent een gespecialiseerde expert in Solera Audatex autoschade-calculaties en de AZT-spuitmethode in Nederland (NL I/2013 t/m 2026 richtlijnen).
Jouw taak is om het aangeleverde Audatex calculatierapport (PDF, afbeelding of tekst) nauwkeurig te lezen, analyseren en te structureren voor een automatische splitsing over de 6 voertuigzones:
1) VOORZIJDE (voorbumper, motorkap, koplampen, koeler/condensor/grille, frontpaneel, voorruit, radar V)
2) ACHTERZIJDE (achterbumper, achterklep/kofferdeksel, achterlichten, achterpaneel, achterruit, diffusor, trekhaak, PDC achter)
3) LINKERZIJDE (portieren L, buitenspiegel L, dorpel L, zijpaneel/flank L, achterscherm L, stijl A/B/C L)
4) RECHTERZIJDE (portieren R, buitenspiegel R, dorpel R, zijpaneel/flank R, achterscherm R, stijl A/B/C R)
5) BOVENZIJDE (dakplaat, dakpaneel, panoramadak, schuifdak, daklijst, dakrail, hemelbekleding, dakantenne)
6) ONDERZIJDE (bodemplaat, subframe, uitlaat, motorbeschermplaat, draagarm, wielophanging, stuurhuis, carter, brandstoftank)
7) OVERIG (algemene diagnose/foutgeheugen, uitlijnen, proefrit, tijdtoeslag hoofdbewerking, wassen/reinigen)

LET OP BIJ AUDATEX & SOLERA (CODEKAART APR 2024 & AZT):
- Tijdschaling: Audatex werkt met Arbeidseenheden (AE): 1 AE = 6 minuten, 10 AE = 1 uur (bv. 18 AE = 1,8 uur, 23 AE = 2,3 uur).
- Spuitfasen & Materiaalsoort: Kunststofdelen gebruiken SV1/SV2/SV3/SV4/S/SH (SH1 bestaat niet op kunststof). Metalen delen gebruiken SV/S/SH/SH1. Bij 3-/4-lagen (Z6/Y9) wordt uitspuiten met code LB aangeduid. Spot-Repair heet LS. Krasvaste lak (Z1/NL) voegt tijdtoeslag (+3 AE liggend / +1 AE staand) toe.
- Spuitmethodiek (US-codes): Y8 = alleen uitgebouwd spuiten (11 AE metaal / 14 AE kunststof); Y7 = uitgebouwd voorspuiten + aan voertuig afspuiten (27 AE); geen code = aan voertuig spuiten (23 AE).
- Tekstzonecodes: TZ 51 = materiaalindex % & AZT materiaalconstante (metaal/kunststof/meerlagen). TZ 143 = Aftrek spuitbedrag bij aparte calculaties. TZ 95 = Aftrek 1e schade bij één complete calculatie.
- Tarieven: Zoek het exacte AE-tarief of uurtarief en materiaalconstanten. Indien niet vermeld, hanteer realistische NL-tarieven (88.10–94.00/u, constante 33.60).
- Let op: L/R onderdelen die duidelijk bij voor- of achterbumper/koplamp/achterlicht horen (bv. 'Steun L bumper V' of 'Achterlicht R') blijven voorzijde of achterzijde!
- Verdeel ELKE calculatiepositie zuiver naar 'voorzijde', 'achterzijde', 'linkerzijde', 'rechterzijde', 'bovenzijde', 'onderzijde' of 'overig'.
- Bepaal bewerking: VERN, HERST, DM, SP (nieuw/deklaag S/SV/SV1-4), SPH (hersteldeel SH/SH1), UITSP (LB), LS (spot-repair), of DIV.
- Geef de uitvoer strikt als geldig JSON volgens het gevraagde schema.`;

    const payloadContents =
      fileBase64 && mimeType
        ? {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: fileBase64
                }
              },
              {
                text: 'Analyseer deze Solera Audatex calculatie. Haal alle voertuiggegevens, US-codes, tekstzones (TZ 51/95/143), tarieven, en alle calculatieposities (incl. spuitfasen SV/SV1-4/S/SH/SH1/LB/LS) op en classificeer elke positie als voorzijde, achterzijde, linkerzijde, rechterzijde, bovenzijde, onderzijde of overig.'
              }
            ]
          }
        : `Hier is de tekst van de Solera Audatex schadecalculatie:\n\n${text}\n\nHaal alle voertuiggegevens, US-codes, tarieven, materiaalconstante (TZ 51) en alle calculatieregels op en splits deze naar voorzijde, achterzijde, linkerzijde, rechterzijde, bovenzijde, onderzijde en overig.`;

    const callGenerate = (modelName: string) =>
      ai.models.generateContent({
        model: modelName,
        contents: payloadContents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              meta: {
                type: Type.OBJECT,
                properties: {
                  kenteken: { type: Type.STRING },
                  merkModel: { type: Type.STRING },
                  chassisnummer: { type: Type.STRING },
                  calculatienummer: { type: Type.STRING },
                  dossiernummer: { type: Type.STRING },
                  datumCalculatie: { type: Type.STRING },
                  datumSchade: { type: Type.STRING },
                  expertHersteller: { type: Type.STRING },
                  opdrachtgever: { type: Type.STRING },
                  laksoort: { type: Type.STRING },
                  kleurcode: { type: Type.STRING },
                  kilometerstand: { type: Type.INTEGER, description: 'Afgelezen kilometerstand op het Audatex-rapport (in km)' },
                  bouwjaar: { type: Type.INTEGER, description: 'Bouwjaar / jaar afgifte deel 1 (bijv. 2025)' }
                },
                required: ['kenteken', 'merkModel', 'calculatienummer']
              },
              tarieven: {
                type: Type.OBJECT,
                properties: {
                  plaatwerktarief: { type: Type.NUMBER },
                  demontagetarief: { type: Type.NUMBER },
                  spuittarief: { type: Type.NUMBER },
                  spuitmateriaaltarief: { type: Type.NUMBER },
                  materiaalconstante: { type: Type.NUMBER, description: 'AZT materiaalconstante bedrag Tekstzone 51, standaard 33.60' },
                  kleinMateriaalPerc: { type: Type.NUMBER },
                  milieutoeslag: { type: Type.NUMBER },
                  btwPercentage: { type: Type.NUMBER }
                },
                required: ['spuittarief', 'materiaalconstante']
              },
              regels: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    code: { type: Type.STRING },
                    omschrijving: { type: Type.STRING },
                    sectie: { 
                      type: Type.STRING, 
                      enum: ['voorzijde', 'achterzijde', 'linkerzijde', 'rechterzijde', 'bovenzijde', 'onderzijde', 'overig'],
                      description: 'Voertuigzone of overig'
                    },
                    bewerking: { 
                      type: Type.STRING, 
                      enum: ['VERN', 'HERST', 'DM', 'SP', 'SPH', 'UITSP', 'LS', 'DIV']
                    },
                    spuitFase: { type: Type.STRING, description: 'Optionele AZT spuitfase: SV, SV1..SV4, S, SH, SH1, LB, LS, NL' },
                    materiaalSoort: { type: Type.STRING, enum: ['metaal', 'kunststof'] },
                    onderdeelPrijs: { type: Type.NUMBER, description: 'Prijs van nieuw onderdeel excl btw' },
                    arbeidPlaatwerkAE: { type: Type.NUMBER, description: 'Plaatwerk in Arbeidseenheden (10 AE = 1 uur)' },
                    arbeidDemontageAE: { type: Type.NUMBER, description: 'De/montage in Arbeidseenheden' },
                    spuittijdAE: { type: Type.NUMBER, description: 'Spuittijd in Arbeidseenheden (10 AE = 1 uur)' },
                    arbeidPlaatwerkUren: { type: Type.NUMBER, description: 'Uren plaatwerk' },
                    arbeidDemontageUren: { type: Type.NUMBER, description: 'Uren de/montage' },
                    spuittijdUren: { type: Type.NUMBER, description: 'Spuittijd in uren' },
                    artikelnummer: { type: Type.STRING },
                    opmerking: { type: Type.STRING }
                  },
                  required: ['omschrijving', 'sectie', 'onderdeelPrijs']
                }
              }
            },
            required: ['meta', 'tarieven', 'regels']
          }
        }
      });

    // Timeout van maximaal 25 seconden per poging, met automatische fallback naar gemini-3.1-flash-lite bij 503-drukte
    const runWithTimeout = (modelName: string) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return Promise.race([
        callGenerate(modelName),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Documentverwerking time-out (overschrijding 25 seconden)')),
            25000
          );
        })
      ]).finally(() => {
        if (timer) clearTimeout(timer);
      });
    };

    let response: any;
    try {
      response = await runWithTimeout('gemini-4-hydrogen');
    } catch (firstErr: any) {
      const msg = String(firstErr?.message || firstErr || '');
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('NOT_FOUND')) {
        await new Promise(resolve => setTimeout(resolve, 600));
        response = await runWithTimeout('gemini-3.1-flash-lite');
      } else {
        throw firstErr;
      }
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Geen bruikbare gegevens uit document kunnen uitlezen.');
    }

    const parsedJson = JSON.parse(responseText);

    // Apply defaults & Solera Tekstzone 143 recommendation
    const matConstante = parsedJson.tarieven?.materiaalconstante || 33.60;
    const mappedRegels = (parsedJson.regels || []).map((r: any, i: number) => {
      const rawSpuit = Number(r.spuittijdAE !== undefined ? r.spuittijdAE : r.spuittijdUren) || 0;
      const spuitAE = r.spuittijdAE !== undefined ? Number(r.spuittijdAE) : (rawSpuit >= 10 ? rawSpuit : Math.round(rawSpuit * 10));

      const rawPlaat = Number(r.arbeidPlaatwerkAE !== undefined ? r.arbeidPlaatwerkAE : r.arbeidPlaatwerkUren) || 0;
      const plaatAE = r.arbeidPlaatwerkAE !== undefined ? Number(r.arbeidPlaatwerkAE) : (rawPlaat >= 10 ? rawPlaat : Math.round(rawPlaat * 10));

      const rawDem = Number(r.arbeidDemontageAE !== undefined ? r.arbeidDemontageAE : r.arbeidDemontageUren) || 0;
      const demAE = r.arbeidDemontageAE !== undefined ? Number(r.arbeidDemontageAE) : (rawDem >= 10 ? rawDem : Math.round(rawDem * 10));

      const isFoutgeheugen = isFoutgeheugenPost(r.omschrijving, r.code);
      const fallbackSectie = r.sectie || categorizeSector(r.omschrijving, r.code);
      const sectie = isFoutgeheugen ? 'voorzijde' : (isOverigeKeuzeHandeling(r.omschrijving, r.code) ? 'overig' : fallbackSectie);

      return {
        id: r.id || `regel-${i + 1}`,
        code: r.code || `${i + 1}`.padStart(4, '0'),
        omschrijving: r.omschrijving,
        sectie,
        isEenmaligePost: isFoutgeheugen || undefined,
        isOverigeHandeling: (!isFoutgeheugen && sectie === 'overig') || undefined,
        bewerking: r.bewerking || 'DIV',
        spuitFase: r.spuitFase || undefined,
        materiaalSoort: r.materiaalSoort || undefined,
        onderdeelPrijs: Number(r.onderdeelPrijs) || 0,
        arbeidPlaatwerkAE: plaatAE,
        arbeidDemontageAE: demAE,
        spuittijdAE: spuitAE,
        arbeidPlaatwerkUren: plaatAE / 10,
        arbeidDemontageUren: demAE / 10,
        spuittijdUren: spuitAE / 10,
        artikelnummer: r.artikelnummer,
        opmerking: r.opmerking
      };
    });

    const { schade1Zone, schade2Zone } = detectDefaultSchadeZones(mappedRegels);
    const s1Label = ZONE_LABELS[schade1Zone];
    const s2Label = ZONE_LABELS[schade2Zone];

    const finalResult = {
      meta: {
        kenteken: parsedJson.meta?.kenteken || 'ONBEKEND',
        merkModel: parsedJson.meta?.merkModel || 'Onbekend voertuig',
        chassisnummer: parsedJson.meta?.chassisnummer || 'N/A',
        calculatienummer: parsedJson.meta?.calculatienummer || 'ADX-' + Date.now().toString().slice(-6),
        dossiernummer: parsedJson.meta?.dossiernummer || 'DOS-' + Date.now().toString().slice(-5),
        datumCalculatie: parsedJson.meta?.datumCalculatie || new Date().toLocaleDateString('nl-NL'),
        datumSchade: parsedJson.meta?.datumSchade || new Date().toLocaleDateString('nl-NL'),
        expertHersteller: parsedJson.meta?.expertHersteller || 'Audatex Schade-expert',
        opdrachtgever: parsedJson.meta?.opdrachtgever || 'Verzekering / Lease',
        laksoort: parsedJson.meta?.laksoort || 'Metallic / 2-Laags (AZT code LB)',
        kleurcode: parsedJson.meta?.kleurcode || 'Standaard lak',
        kilometerstand:
          typeof parsedJson.meta?.kilometerstand === 'number' && parsedJson.meta.kilometerstand >= 0
            ? Math.round(parsedJson.meta.kilometerstand)
            : undefined,
        bouwjaar:
          typeof parsedJson.meta?.bouwjaar === 'number' && parsedJson.meta.bouwjaar >= 1980
            ? Math.round(parsedJson.meta.bouwjaar)
            : undefined
      },
      tarieven: {
        plaatwerktarief: parsedJson.tarieven?.plaatwerktarief || 88.50,
        demontagetarief: parsedJson.tarieven?.demontagetarief || 82.00,
        spuittarief: parsedJson.tarieven?.spuittarief || 94.00,
        spuitmateriaaltarief: parsedJson.tarieven?.spuitmateriaaltarief || 49.50,
        materiaalconstante: matConstante,
        kleinMateriaalPerc: parsedJson.tarieven?.kleinMateriaalPerc ?? 2.0,
        milieutoeslag: parsedJson.tarieven?.milieutoeslag ?? 18.50,
        btwPercentage: parsedJson.tarieven?.btwPercentage ?? 21.0
      },
      materiaalconstanteMethode: 'solera_tz143',
      schade1Zone,
      schade2Zone,
      soleraAanbeveling: {
        titel: 'Solera Richtlijn Meerdere Schades (Tekstzone 143)',
        tekstzone: 'TZ 143',
        advies: `Conform Solera AZT-kennisbank: De volledige materiaalconstante (€ ${matConstante.toFixed(2)}) is toegewezen aan ${s1Label} (Schade 1). Voor ${s2Label} (Schade 2) dient Tekstzone 143 met aftrek -€ ${matConstante.toFixed(2)} te worden opgevoerd ter voorkoming van dubbele vergoeding.`,
        invoerTekst143: `TZ 143 (${s2Label}): -${matConstante.toFixed(2)} EUR (Aftrek AZT materiaalconstante ivm gezamenlijke spuitgang met ${s1Label})`
      },
      regels: applySchade1Selection(mappedRegels, schade1Zone, schade2Zone)
    };

    // Format kenteken direct; RDW lookup gebeurt asynchroon op de achtergrond door de frontend
    if (finalResult.meta.kenteken && finalResult.meta.kenteken !== 'ONBEKEND') {
      finalResult.meta.kenteken = formatDutchPlate(finalResult.meta.kenteken);
    }

    return res.json({ result: finalResult, source: 'document_parser' });

  } catch (error: any) {
    console.error('Fout bij analyseren Audatex calculatie:', error);

    const candidateText = extractedText || req.body?.text;
    if (candidateText) {
      const fallback = await parseAudatexTextFallback(candidateText);
      if (fallback) {
        return res.json({ result: fallback, source: 'fallback_after_error', warning: error.message });
      }
    }

    const rawMsg = String(error?.message || error || '');
    let cleanDutchError = 'Er is een fout opgetreden bij het analyseren van het document.';
    if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
      cleanDutchError =
        'De documentherkenningsservice voor gescande PDF’s is tijdelijk overbelast (503). Probeer het over enkele seconden opnieuw of upload de digitale Audatex PDF/TXT-export.';
    } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      cleanDutchError =
        'De verwerkingslimiet is tijdelijk bereikt (429). Wacht even en probeer het opnieuw, of plak de Audatex-calculatietekst direct.';
    } else if (rawMsg.includes('time-out')) {
      cleanDutchError = rawMsg;
    } else if (rawMsg && !rawMsg.trim().startsWith('{')) {
      cleanDutchError = `${cleanDutchError} (${rawMsg})`;
    }

    return res.status(503).json({
      error: cleanDutchError
    });
  }
});

// Endpoint voor direct ophalen RDW-voertuiggegevens en dagwaarde op basis van kenteken
app.get('/api/rdw/:kenteken', async (req, res) => {
  try {
    const rawPlate = req.params.kenteken || '';
    const rdw = await lookupRdwVehicle(rawPlate);
    if (!rdw) {
      const clean = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return res.json({
        kenteken: clean,
        geformatteerdKenteken: formatDutchPlate(clean || rawPlate),
        gevonden: false
      });
    }
    return res.json(rdw);
  } catch (error: any) {
    return res.status(500).json({ error: 'Fout bij RDW ophalen: ' + (error.message || 'Onbekend') });
  }
});

// Endpoint voor live occasion-scraper (Marktplaats, AutoScout24, Gaspedaal/AutoTrack) & officiële ANWB Koerslijst API
app.post('/api/markt-vergelijking', async (req, res) => {
  try {
    const {
      merk,
      model,
      merkModel,
      bouwjaar,
      kilometerstand,
      brandstof,
      transmissie,
      kenteken,
      catalogusprijs,
      datumEersteToelating
    } = req.body || {};

    if (!merkModel && !merk && !model && !kenteken) {
      return res.status(400).json({ error: 'Geef minimaal kenteken of merk en model op voor marktvergelijking.' });
    }

    const parsedYear = Number(bouwjaar) || new Date().getFullYear() - 3;
    const parsedKm = Math.max(0, Number(kilometerstand) || 0);

    const result = await runMarketComparison({
      merk,
      model,
      merkModel,
      bouwjaar: parsedYear,
      kilometerstand: parsedKm,
      brandstof,
      transmissie,
      kenteken,
      catalogusprijs: catalogusprijs ? Number(catalogusprijs) : undefined,
      datumEersteToelating
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Fout bij marktvergelijking & ANWB koerslijst:', error);
    return res.status(500).json({
      error: 'Kon marktvergelijking niet ophalen: ' + (error?.message || 'Onbekende fout')
    });
  }
});

// Proxy voor het ophalen van de officiële ANWB Koerslijst PDF met de vereiste headers
app.get('/api/anwb-koerslijst-pdf', async (req, res) => {
  try {
    const {
      configurationId,
      licensePlate,
      licensePlateMonth,
      licensePlateYear,
      mileage,
      newPrice,
      optionsPrice
    } = req.query;

    if (!configurationId || !licensePlate) {
      return res.status(400).json({ error: 'Ontbrekende configuratie- of kentekengegevens voor ANWB PDF.' });
    }

    const qs = new URLSearchParams({
      configurationId: String(configurationId),
      licensePlate: String(licensePlate).replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      licensePlateMonth: String(licensePlateMonth || '6'),
      licensePlateYear: String(licensePlateYear || new Date().getFullYear() - 3),
      mileage: String(mileage || '0'),
      newPrice: String(newPrice || '0'),
      optionsPrice: String(optionsPrice || '0')
    });

    const anwbPdfEndpoint = `https://api.anwb.nl/car-information/backend-application/api/v0/rate-list/pdf?${qs.toString()}`;
    const pdfRes = await fetch(anwbPdfEndpoint, {
      headers: {
        'x-anwb-caller-id': 'car/cost-calculator-web',
        'x-auto-kosten-tool-id': '1db3d877-e4d3-4a55-b551-d2a49fb7df34',
        Accept: 'application/pdf'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!pdfRes.ok) {
      return res.status(pdfRes.status).json({ error: 'ANWB Koerslijst PDF kon niet worden gegenereerd.' });
    }

    const buf = Buffer.from(await pdfRes.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="ANWB-Koerslijst-${qs.get('licensePlate')}.pdf"`
    );
    return res.send(buf);
  } catch (error: any) {
    console.error('Fout bij ophalen ANWB PDF:', error);
    return res.status(502).json({ error: 'Kon ANWB Koerslijst PDF niet ophalen.' });
  }
});

// Helper om te controleren of een rebuild voor de singlefile HTML nodig is
function getLatestSourceMtimeMs(dir: string): number {
  let latest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, getLatestSourceMtimeMs(fullPath));
    } else {
      latest = Math.max(latest, fs.statSync(fullPath).mtimeMs);
    }
  }
  return latest;
}

let singlefileBuildPromise: Promise<void> | null = null;

// Endpoint om de volledige app als zelfstandig HTML-bestand te downloaden
app.get('/api/download-html', async (req, res) => {
  try {
    const outHtmlPath = path.resolve(__dirname, 'dist-html', 'index.html');
    const blueprintPath = path.resolve(__dirname, 'public/assets/aistudio/Technische_blauwdruk_van_moderne_sedan_846ffc14.png');
    const srcMtime = Math.max(
      getLatestSourceMtimeMs(path.resolve(__dirname, 'src')),
      fs.statSync(path.resolve(__dirname, 'index.html')).mtimeMs,
      fs.statSync(path.resolve(__dirname, 'vite.singlefile.config.ts')).mtimeMs,
      fs.existsSync(blueprintPath) ? fs.statSync(blueprintPath).mtimeMs : 0
    );
    const needsBuild =
      !fs.existsSync(outHtmlPath) ||
      fs.statSync(outHtmlPath).mtimeMs < srcMtime;

    if (needsBuild) {
      if (!singlefileBuildPromise) {
        singlefileBuildPromise = execFileAsync(
          path.resolve(__dirname, 'node_modules', '.bin', 'vite'),
          ['build', '--config', 'vite.singlefile.config.ts'],
          {
            cwd: __dirname,
            timeout: 60000,
            env: { ...process.env, NODE_ENV: 'production' }
          }
        ).then(() => undefined).finally(() => {
          singlefileBuildPromise = null;
        });
      }
      await singlefileBuildPromise;
    }

    if (!fs.existsSync(outHtmlPath)) {
      return res.status(500).json({ error: 'Standalone HTML-bestand kon niet worden opgebouwd.' });
    }

    const htmlBuffer = fs.readFileSync(outHtmlPath);

    if (req.query.prepare === '1') {
      return res.json({
        ready: true,
        filename: 'Audatex-Schade-Splitter.html',
        size: htmlBuffer.byteLength
      });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="Audatex-Schade-Splitter.html"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(htmlBuffer.byteLength));
    return res.send(htmlBuffer);
  } catch (error: any) {
    console.error('Fout bij genereren standalone HTML:', error);
    return res.status(500).json({ error: 'Fout bij genereren standalone HTML: ' + (error.message || 'Onbekend') });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup dev server / static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Audatex Schade Splitter draait op http://localhost:${PORT} (${isProd ? 'Productie' : 'Ontwikkeling'})`);
  });
}

startServer();
