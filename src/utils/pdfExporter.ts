import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DossierMeta,
  MateriaalconstanteMethode,
  RdwVoertuigData,
  SectieTotalen,
  Tarieven,
  VoertuigZone,
  ZONE_LABELS
} from '../types/audatex';
import { formatAE, formatEuro } from './calculator';

export interface PdfExportOptions {
  meta: DossierMeta;
  tarieven: Tarieven;
  zones: Record<VoertuigZone, SectieTotalen>;
  actieveZones: VoertuigZone[];
  overig: SectieTotalen;
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
  methode: MateriaalconstanteMethode;
  schade1Zone?: VoertuigZone;
  schade2Zone?: VoertuigZone;
  eenmaligePosten?: string[];
  rdw?: RdwVoertuigData;
}

const METHODE_LABELS: Record<MateriaalconstanteMethode, string> = {
  solera_tz143: 'Solera Richtlijn (TZ 143)',
  proportioneel_spuittijd: 'Proportioneel per materiaalsoort (AE)',
  fifty_fifty: '50 / 50 Gelijkmatige Verdeling',
  beide_volledig: 'Beide Volledige Constante'
};

export function exportFinancieelRapportPdf(options: PdfExportOptions): void {
  const {
    meta,
    tarieven,
    zones,
    actieveZones,
    overig,
    totaal,
    soleraInfo,
    methode,
    schade1Zone = 'voorzijde',
    schade2Zone,
    eenmaligePosten = [],
    rdw
  } = options;

  const resolvedS2: VoertuigZone =
    schade2Zone && schade2Zone !== schade1Zone
      ? schade2Zone
      : schade1Zone === 'voorzijde'
      ? 'achterzijde'
      : 'voorzijde';

  const displayZones = actieveZones.length > 0 ? actieveZones : [schade1Zone, resolvedS2];
  const hasOverig = overig.totaalBruto > 0 || overig.itemsCount > 0;
  const totalDataCols = displayZones.length + (hasOverig ? 1 : 0);

  const doc = new jsPDF({
    orientation: totalDataCols >= 4 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const schade1Label = `${ZONE_LABELS[schade1Zone]} (Schade 1)`;

  const getZoneColHeader = (z: VoertuigZone) => {
    if (z === schade1Zone) return `${ZONE_LABELS[z]} (Schade 1)`;
    if (z === resolvedS2) return `${ZONE_LABELS[z]} (Schade 2)`;
    return ZONE_LABELS[z];
  };

  // Colors (Clean White Corporate Palette)
  const slate900: [number, number, number] = [15, 23, 42];
  const slate700: [number, number, number] = [51, 65, 85];
  const slate500: [number, number, number] = [100, 116, 139];
  const slate200: [number, number, number] = [226, 232, 240];
  const slate100: [number, number, number] = [241, 245, 249];
  const slate50: [number, number, number] = [248, 250, 252];
  const blue700: [number, number, number] = [29, 78, 216];
  const blue50: [number, number, number] = [239, 246, 255];
  const indigo700: [number, number, number] = [67, 56, 202];
  const amber800: [number, number, number] = [146, 64, 14];
  const amber50: [number, number, number] = [255, 251, 235];

  // Top accent line
  doc.setFillColor(...blue700);
  doc.rect(0, 0, pageWidth, 2.2, 'F');

  // Header Left: Corporate Split-Calculation Vector Logo + Title
  const logoX = marginX;
  const logoY = 8.2;
  const logoSize = 9.5;
  doc.setFillColor(...blue50);
  doc.setDrawColor(...blue700);
  doc.setLineWidth(0.35);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 1.1, 1.1, 'FD');
  doc.setFillColor(...blue700);
  doc.rect(logoX + 1.8, logoY + 1.6, 5.9, 1.2, 'F');
  doc.setFillColor(...slate500);
  doc.rect(logoX + 1.8, logoY + 3.8, 3.6, 0.7, 'F');
  doc.rect(logoX + 1.8, logoY + 5.2, 4.2, 0.7, 'F');
  doc.rect(logoX + 1.8, logoY + 6.7, 5.9, 0.8, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.1);
  doc.line(logoX + 0.8, logoY + logoSize - 0.8, logoX + logoSize - 0.8, logoY + 0.8);
  doc.setDrawColor(...slate900);
  doc.setLineWidth(0.55);
  doc.line(logoX + 1.0, logoY + logoSize - 1.0, logoX + logoSize - 1.0, logoY + 1.0);

  const titleX = marginX + logoSize + 3;
  let y = 12.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(...slate900);
  doc.text('FINANCIEEL SPLITSINGSRAPPORT', titleX, y);

  y += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...slate500);
  doc.text('Solera Audatex & AZT Schadecalculatie • 1 AE = 6 min (10 AE = 1 uur)', titleX, y);

  // Header Right: Authentic Dutch License Plate + Dossier Ref
  const plateW = 41;
  const plateH = 9.2;
  const plateX = pageWidth - marginX - plateW;
  const plateY = 8.6;

  doc.setFillColor(244, 184, 0);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.42);
  doc.roundedRect(plateX, plateY, plateW, plateH, 1.2, 1.2, 'FD');

  doc.setDrawColor(180, 130, 0);
  doc.setLineWidth(0.15);
  doc.roundedRect(plateX + 0.45, plateY + 0.45, plateW - 0.9, plateH - 0.9, 0.9, 0.9, 'D');

  doc.setFillColor(0, 51, 153);
  doc.roundedRect(plateX + 0.25, plateY + 0.25, 5.8, plateH - 0.5, 0.9, 0.9, 'F');
  doc.rect(plateX + 3.2, plateY + 0.25, 2.85, plateH - 0.5, 'F');

  const starCenterX = plateX + 3.15;
  const starCenterY = plateY + 3.1;
  doc.setFillColor(255, 218, 68);
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    doc.circle(starCenterX + 1.45 * Math.sin(a), starCenterY - 1.45 * Math.cos(a), 0.19, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(255, 255, 255);
  doc.text('NL', plateX + 3.15, plateY + 7.4, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.setTextColor(15, 20, 30);
  doc.text(meta.kenteken || 'ONBEKEND', plateX + 6.0 + (plateW - 6.0) / 2, plateY + 6.2, {
    align: 'center'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate500);
  doc.text(`Calculatie: ${meta.calculatienummer}  |  Datum: ${meta.datumCalculatie}`, pageWidth - marginX, plateY + plateH + 4.5, {
    align: 'right'
  });

  // Divider line
  y = 25;
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);

  // Metadata / Voertuiggegevens Corporate Box
  y += 4;
  const boxHeight = rdw?.gevonden ? 28 : 22;
  doc.setFillColor(...slate50);
  doc.setDrawColor(...slate200);
  doc.roundedRect(marginX, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

  const col1X = marginX + 3.5;
  const col2X = marginX + contentWidth * 0.36;
  const col3X = marginX + contentWidth * 0.70;

  const drawField = (label: string, value: string, x: number, fy: number, maxW: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...slate500);
    doc.text(label.toUpperCase(), x, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...slate900);
    const trimmed = doc.splitTextToSize(value || '-', maxW)[0];
    doc.text(trimmed, x, fy + 3.6);
  };

  drawField('Voertuig (Merk / Type)', meta.merkModel, col1X, y + 4.5, contentWidth * 0.32);
  drawField('Chassisnummer (VIN)', meta.chassisnummer || 'N/A', col2X, y + 4.5, contentWidth * 0.31);
  drawField('Dossiernummer', meta.dossiernummer || meta.calculatienummer, col3X, y + 4.5, contentWidth * 0.27);

  drawField('Hersteller / Expert', meta.expertHersteller || '-', col1X, y + 13.5, contentWidth * 0.32);
  drawField('Laksoort / Kleur', `${meta.laksoort}${meta.kleurcode ? ` (${meta.kleurcode})` : ''}`, col2X, y + 13.5, contentWidth * 0.31);
  drawField('Verdeelmethode AZT', METHODE_LABELS[methode], col3X, y + 13.5, contentWidth * 0.27);

  if (rdw?.gevonden) {
    const rdwLineY = y + 22.5;
    doc.setDrawColor(...slate200);
    doc.line(marginX + 3, rdwLineY - 2.5, pageWidth - marginX - 3, rdwLineY - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate700);
    const dagwaardeTxt = rdw.indicatieveDagwaarde
      ? `Indicatieve dagwaarde: ${formatEuro(rdw.indicatieveDagwaarde.geschat)} (${formatEuro(rdw.indicatieveDagwaarde.laag)} – ${formatEuro(rdw.indicatieveDagwaarde.hoog)})`
      : '';
    const rdwSummary = [
      rdw.datumEersteToelating ? `1e toelating: ${rdw.datumEersteToelating}` : '',
      rdw.brandstof ? `Brandstof: ${rdw.brandstof}` : '',
      rdw.catalogusprijs ? `Catalogusprijs: ${formatEuro(rdw.catalogusprijs)}` : '',
      dagwaardeTxt
    ]
      .filter(Boolean)
      .join('   •   ');
    doc.text(rdwSummary, col1X, rdwLineY + 1.5);
  }

  y += boxHeight + 6;

  // Section Header: Financieel Overzicht
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...slate900);
  doc.text(
    `SPECIFICATIE & UITSPLITSING (${displayZones.map(z => ZONE_LABELS[z].toUpperCase()).join(' / ')})`,
    marginX,
    y
  );
  y += 2.5;

  // Build Table Columns & Body dynamically
  const cols: SectieTotalen[] = [
    ...displayZones.map(z => zones[z]),
    ...(hasOverig ? [overig] : [])
  ];

  const headRow = [
    'Kostenpost / Omschrijving',
    ...displayZones.map(getZoneColHeader),
    ...(hasOverig ? ['Overig'] : []),
    'Totaal Calculatie'
  ];

  const mkRow = (label: string, getCell: (sec: SectieTotalen) => string) => [
    label,
    ...cols.map((sec) => getCell(sec)),
    getCell(totaal)
  ];

  const rows: any[] = [
    mkRow(
      `Spuittijd (AE) @ ${formatEuro(tarieven.spuittarief / 10)}/AE`,
      (sec) => `${formatAE(sec.spuittijdAE, false)} (${formatEuro(sec.bedragSpuitarbeid)})`
    ),
    mkRow(
      `Plaatwerk arbeid (AE) @ ${formatEuro(tarieven.plaatwerktarief / 10)}/AE`,
      (sec) => `${formatAE(sec.arbeidPlaatwerkAE, false)} (${formatEuro(sec.bedragPlaatwerk)})`
    ),
    mkRow(
      `De/montage arbeid (AE) @ ${formatEuro(tarieven.demontagetarief / 10)}/AE`,
      (sec) => `${formatAE(sec.arbeidDemontageAE, false)} (${formatEuro(sec.bedragDemontage)})`
    ),
    mkRow(
      `Totaal Arbeidsloon (${formatAE(totaal.arbeidTotaalAE, true)})`,
      (sec) => formatEuro(sec.bedragTotaalArbeid)
    ),
    mkRow(
      `Nieuwe Onderdelen${tarieven.onderdelenKortingPerc ? ` (na ${tarieven.onderdelenKortingPerc}% korting)` : ''}`,
      (sec) => formatEuro(sec.bedragOnderdelen)
    ),
    mkRow(
      'Lakmateriaal basis (AZT formule)',
      (sec) => formatEuro(sec.bedragSpuitmateriaalBasis)
    ),
    mkRow(
      'AZT Materiaalconstante (TZ 51 / TZ 143)',
      (sec) => {
        if (
          methode === 'solera_tz143' &&
          sec.sectie === resolvedS2 &&
          sec.bedragMateriaalconstante === 0 &&
          soleraInfo.constanteSchade1 > 0
        ) {
          return `${formatEuro(0)} (-${formatEuro(soleraInfo.constanteSchade1)} TZ 143)`;
        }
        return formatEuro(sec.bedragMateriaalconstante);
      }
    ),
    mkRow(
      'Totaal Spuitmateriaal (Basis + Constante)',
      (sec) => formatEuro(sec.bedragSpuitmateriaalTotaal)
    )
  ];

  if ((totaal.bedragBijkomend ?? 0) > 0) {
    rows.push(
      mkRow(
        `Bijkomende kosten (${tarieven.bijkomendeKostenOmschrijving || 'Anti-roestbehandeling'})`,
        (sec) => ((sec.bedragBijkomend ?? 0) > 0 ? formatEuro(sec.bedragBijkomend!) : '-')
      )
    );
  }

  rows.push(
    mkRow(
      `Klein materiaal (${tarieven.kleinMateriaalPerc}%) & Milieutoeslag`,
      (sec) => formatEuro(sec.bedragKleinMateriaal + sec.bedragMilieu)
    ),
    mkRow(
      'SUBTOTAAL NETTO (Excl. BTW)',
      (sec) => formatEuro(sec.subtotaalNetto)
    ),
    mkRow(
      `BTW (${tarieven.btwPercentage}%)`,
      (sec) => formatEuro(sec.btwBedrag)
    ),
    mkRow(
      'TOTAAL SCHADEBEDRAG (INCL. BTW)',
      (sec) =>
        sec.sectie === 'totaal'
          ? `${formatEuro(sec.totaalBruto)} (100%)`
          : `${formatEuro(sec.totaalBruto)} (${sec.percentageVanTotaal}%)`
    )
  );

  const arbeidSubIdx = 3;
  const matConstIdx = 6;
  const matSubIdx = 7;
  const nettoIdx = rows.length - 3;
  const totaalIdx = rows.length - 1;

  // Dynamic column widths summing exactly to contentWidth
  const labelColW = Math.max(46, Math.min(66, contentWidth * 0.30));
  const totalColW = Math.max(30, Math.min(40, contentWidth * 0.19));
  const remainingW = contentWidth - labelColW - totalColW;
  const perDataColW = remainingW / Math.max(1, cols.length);

  const columnStyles: Record<number, any> = {
    0: { cellWidth: labelColW, halign: 'left' }
  };
  for (let i = 1; i <= cols.length; i++) {
    columnStyles[i] = { cellWidth: perDataColW, halign: 'right' };
  }
  columnStyles[cols.length + 1] = { cellWidth: totalColW, halign: 'right', fontStyle: 'bold' };

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [headRow],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: totalDataCols >= 4 ? 7.4 : 8,
      cellPadding: totalDataCols >= 4 ? 2.0 : 2.3,
      lineColor: slate200,
      lineWidth: 0.2,
      textColor: slate900
    },
    headStyles: {
      fillColor: slate100,
      textColor: slate900,
      fontStyle: 'bold',
      fontSize: totalDataCols >= 4 ? 7.0 : 7.5,
      halign: 'right'
    },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 0) {
        data.cell.styles.halign = 'left';
      }
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.fillColor = blue50;
        data.cell.styles.textColor = blue700;
      }
      if (data.section === 'head' && data.column.index === 2) {
        data.cell.styles.fillColor = [238, 242, 255];
        data.cell.styles.textColor = indigo700;
      }
      if (data.section === 'body') {
        const idx = data.row.index;
        if (idx === arbeidSubIdx || idx === matSubIdx) {
          data.cell.styles.fillColor = slate50;
          data.cell.styles.fontStyle = 'bold';
        } else if (idx === matConstIdx) {
          data.cell.styles.fillColor = amber50;
          if (data.column.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = amber800;
          }
        } else if (idx === nettoIdx) {
          data.cell.styles.fillColor = slate100;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.4;
        } else if (idx === totaalIdx) {
          data.cell.styles.fillColor = slate900;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.6;
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 190;
  let curY = finalY;

  const eenmaligTxt = eenmaligePosten.length > 0
    ? ` Eenmalige diagnose-/voertuigposten (${eenmaligePosten.join(', ')}) zijn 1x toegewezen aan ${schade1Label}.`
    : ` Primaire schade: ${schade1Label}.`;
  const adviesLines = doc.splitTextToSize(`${soleraInfo.advies}${eenmaligTxt}`, contentWidth - 8);
  const invoerLines = doc.splitTextToSize(soleraInfo.invoerTekst143, contentWidth - 10);
  const complianceHeight = 14 + adviesLines.length * 3.8 + invoerLines.length * 3.8;

  if (curY + complianceHeight + 32 > pageHeight - 15) {
    doc.addPage();
    curY = 16;
  }

  doc.setFillColor(...amber50);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, curY, contentWidth, complianceHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...amber800);
  doc.text('SOLERA AUDATEX KENNISBANK VERANTWOORDING (TZ 51 / TZ 143 / TZ 95)', marginX + 4, curY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...slate700);
  doc.text(adviesLines, marginX + 4, curY + 10);

  const tzBoxY = curY + 10 + adviesLines.length * 3.8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(marginX + 4, tzBoxY, contentWidth - 8, invoerLines.length * 3.8 + 3, 1, 1, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...slate900);
  doc.text(invoerLines, marginX + 6, tzBoxY + 4);

  curY += complianceHeight + 10;

  if (curY + 28 > pageHeight - 15) {
    doc.addPage();
    curY = 16;
  }

  // Signature Blocks
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.3);
  doc.line(marginX, curY, pageWidth - marginX, curY);
  curY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slate700);
  doc.text('Voor akkoord Schadehersteller / Calculateur:', marginX, curY);
  doc.text('Voor akkoord Schade-expert / Verzekeraar:', marginX + contentWidth / 2 + 6, curY);

  curY += 15;
  doc.setDrawColor(...slate500);
  doc.line(marginX, curY, marginX + 68, curY);
  doc.line(marginX + contentWidth / 2 + 6, curY, marginX + contentWidth / 2 + 74, curY);

  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slate500);
  doc.text('Naam & Datum:', marginX, curY);
  doc.text('Naam & Datum:', marginX + contentWidth / 2 + 6, curY);

  // Page Footers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...slate200);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate500);
    doc.text(
      'Solera Audatex Schadecalculatie Splitter • 1 AE = 6 min (10 AE = 1 uur)',
      marginX,
      pageHeight - 7.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate700);
    doc.text(
      `Developed by Danny Radjkoemar   |   Pagina ${p} van ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7.5,
      { align: 'right' }
    );
  }

  const safePlate = (meta.kenteken || 'dossier').replace(/[^A-Za-z0-9-]/g, '');
  const safeCalc = (meta.calculatienummer || 'rapport').replace(/[^A-Za-z0-9-]/g, '');
  doc.save(`Audatex_Splitsingsrapport_${safePlate}_${safeCalc}.pdf`);
}
