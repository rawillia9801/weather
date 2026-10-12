export type ReportMetric = { label: string; value: string };
export type WeatherReport = {
  title: string;
  subtitle: string;
  station: string;
  location: string;
  generatedAt: string;
  period: string;
  source: string;
  metrics: ReportMetric[];
  notes: string[];
  columns: string[];
  rows: string[][];
  chart?: { label: string; values: (number | null)[]; labels: string[]; unit: string };
};

type Page = { commands: string[]; pageNumber: number };

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 42;
const W = PAGE_W - MARGIN * 2;
const rgb = (r: number, g: number, b: number) => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
const NAVY = rgb(5, 27, 46);
const CYAN = rgb(0, 142, 188);
const MUTED = rgb(77, 101, 122);
const LINE = rgb(216, 226, 234);
const safe = (value: unknown) => String(value ?? 'Unavailable')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u00b0/g, ' deg')
  .replace(/\u2022/g, '-')
  .replace(/[\u00a0\t]/g, ' ')
  .normalize('NFKD').replace(/[^\x20-\x7e]/g, '?');
const escapePdf = (str: string) => safe(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const approximate = (str: string, size: number) => safe(str).length * size * 0.51;
const shorten = (str: string, width: number, size: number) => {
  let result = safe(str);
  while (result.length > 2 && approximate(result, size) > width) result = result.slice(0, -1);
  return result.length < safe(str).length ? result.slice(0, -2) + '..' : result;
};
const splitLines = (raw: string, width: number, size: number) => {
  const result: string[] = [];
  const text = safe(raw);
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) { result.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (approximate(candidate, size) <= width) { line = candidate; continue; }
      if (line) result.push(line);
      if (approximate(word, size) <= width) line = word;
      else {
        let remaining = word;
        while (remaining && approximate(remaining, size) > width) {
          const limit = Math.max(1, Math.floor(width / (size * .55)));
          result.push(remaining.slice(0, limit));
          remaining = remaining.slice(limit);
        }
        line = remaining;
      }
    }
    if (line) result.push(line);
  }
  return result;
};

export function downloadWeatherReportPdf(report: WeatherReport): void {
  const pages: Page[] = [];
  let page: Page;
  let y = PAGE_H - 45;
  const add = (command: string) => page.commands.push(command);
  const fill = (x: number, bottom: number, w: number, h: number, color: string) => add(`${color} rg ${x.toFixed(1)} ${bottom.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE) => add(`${color} RG 0.75 w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  const text = (value: string, x: number, baseline: number, size = 10, bold = false, color = NAVY) => {
    add(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(1)} ${baseline.toFixed(1)} Tm (${escapePdf(value)}) Tj ET`);
  };
  const newPage = () => {
    page = { commands: [], pageNumber: pages.length + 1 };
    pages.push(page);
    fill(0, PAGE_H - 13, PAGE_W, 13, CYAN);
    text('STALEY STREET WEATHER', MARGIN, PAGE_H - 46, 12, true);
    text(report.station + '  |  ' + report.location, MARGIN, PAGE_H - 63, 8, false, MUTED);
    line(MARGIN, PAGE_H - 74, PAGE_W - MARGIN, PAGE_H - 74);
    y = PAGE_H - 94;
  };
  const space = (amount: number) => { if (y - amount < 55) newPage(); };
  const para = (value: string, size = 9.2) => {
    for (const row of splitLines(value, W, size)) {
      space(14);
      if (row) text(row, MARGIN, y, size, false, NAVY);
      y -= row ? 13.5 : 6;
    }
  };
  const section = (heading: string) => {
    space(35);
    fill(MARGIN, y - 12, 4, 19, CYAN);
    text(heading.toUpperCase(), MARGIN + 12, y - 7, 10, true);
    y -= 29;
  };

  newPage();
  space(116);
  fill(MARGIN, y - 84, W, 98, NAVY);
  text(report.title.toUpperCase(), MARGIN + 18, y - 14, 18, true, rgb(255, 255, 255));
  text(shorten(report.subtitle, W - 35, 9.5), MARGIN + 18, y - 33, 9.5, false, rgb(182, 222, 237));
  text('REPORTING PERIOD  ' + shorten(report.period, W - 185, 8.5), MARGIN + 18, y - 54, 8.5, true, rgb(255, 255, 255));
  text('GENERATED  ' + safe(new Date(report.generatedAt).toLocaleString('en-US')), MARGIN + 18, y - 72, 7.5, false, rgb(197, 219, 231));
  y -= 106;

  if (report.metrics.length) {
    section('At a glance');
    const cols = Math.min(3, report.metrics.length);
    const cardW = (W - (cols - 1) * 9) / cols;
    for (let start = 0; start < report.metrics.length; start += cols) {
      space(66);
      report.metrics.slice(start, start + cols).forEach((metric, i) => {
        const x = MARGIN + i * (cardW + 9);
        fill(x, y - 48, cardW, 57, rgb(239, 246, 249));
        fill(x, y - 48, 3, 57, CYAN);
        text(shorten(metric.label.toUpperCase(), cardW - 19, 7), x + 10, y - 10, 7, true, MUTED);
        text(shorten(metric.value, cardW - 19, 16), x + 10, y - 31, 16, true, NAVY);
      });
      y -= 67;
    }
  }

  if (report.chart?.values.some(value => value !== null && Number.isFinite(value))) {
    section(report.chart.label);
    space(106);
    const x = MARGIN + 9;
    const chartW = W - 18;
    const chartH = 72;
    const vals = report.chart.values.filter((v): v is number => v !== null && Number.isFinite(v));
    const min = Math.min(0, ...vals);
    const max = Math.max(1, ...vals);
    const baseline = y - 83;
    line(x, baseline, x + chartW, baseline);
    report.chart.values.forEach((value, i) => {
      if (value == null || !Number.isFinite(value)) return;
      const cell = chartW / Math.max(1, report.chart!.values.length);
      const barH = Math.max(1.5, ((value - min) / Math.max(0.1, max - min)) * chartH);
      fill(x + cell * i + 4, baseline, Math.max(1, cell - 9), barH, CYAN);
      if (report.chart!.values.length <= 12) text(shorten(report.chart!.labels[i] || '', cell - 2, 7), x + i * cell + 4, baseline - 13, 7, false, MUTED);
    });
    y -= 118;
  }

  if (report.notes.length) {
    section('Summary and interpretation');
    for (const note of report.notes) {
      if (note.trim()) para(note);
      y -= 5;
    }
  }

  if (report.columns.length && report.rows.length) {
    section('Detailed readings');
    const cols = report.columns.length;
    const weights = report.columns.map((title) => Math.max(1, Math.min(2.0, title.length / 7)));
    const sum = weights.reduce((a, b) => a + b, 0);
    const sizes = weights.map(w => w / sum * W);
    const drawHead = () => {
      space(48);
      fill(MARGIN, y - 8, W, 27, NAVY);
      let x = MARGIN;
      report.columns.forEach((title, i) => {
        text(shorten(title.toUpperCase(), sizes[i] - 10, 7.2), x + 5, y + 1, 7.2, true, rgb(255, 255, 255));
        x += sizes[i];
      });
      y -= 28;
    };
    drawHead();
    report.rows.forEach((values, rowIndex) => {
      if (y < 84) { newPage(); drawHead(); }
      if (rowIndex % 2 === 0) fill(MARGIN, y - 13, W, 24, rgb(239, 246, 249));
      let x = MARGIN;
      for (let i = 0; i < cols; i++) {
        text(shorten(String(values[i] ?? '-'), sizes[i] - 10, 7.8), x + 5, y - 5, 7.8, i === 0, NAVY);
        x += sizes[i];
      }
      y -= 24;
    });
  }

  if (report.rows.length === 0 && report.columns.length) {
    section('Detailed readings');
    para('No verified observations were returned for this reporting period. No readings have been invented.');
  }

  section('Data provenance');
  para('Source: ' + report.source, 8.2);
  para('Reports are generated from the latest available observations and explicitly identified public archives. Missing observations are not estimated.', 8.2);

  pages.forEach((p, i) => {
    const footerY = 33;
    p.commands.push(`${LINE} RG 0.6 w ${MARGIN} 47 m ${PAGE_W - MARGIN} 47 l S`);
    const caption = `STALEY STREET WEATHER   |   ${safe(report.station)}   |   PAGE ${i + 1} OF ${pages.length}`;
    p.commands.push(`BT /F1 7 Tf ${MUTED} rg 1 0 0 1 ${MARGIN} ${footerY} Tm (${escapePdf(caption)}) Tj ET`);
  });

  const objects: string[] = [''];
  const addObject = (value: string) => { objects.push(value); return objects.length - 1; };
  const fontRegular = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesRef = addObject('');
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  const kids: string[] = [];
  pages.forEach((p) => {
    const stream = p.commands.join('\n') + '\n';
    const contentRef = addObject(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`);
    const pageRef = addObject(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentRef} 0 R >>`);
    kids.push(`${pageRef} 0 R`);
  });
  objects[pagesRef] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  const encoder = new TextEncoder();
  const pieces: Uint8Array[] = [];
  let offset = 0;
  const append = (str: string) => { const bytes = encoder.encode(str); pieces.push(bytes); offset += bytes.length; };
  append('%PDF-1.4\n%StaleyStreetWeather\n');
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = offset;
    append(`${i} 0 obj\n${objects[i]}\nendobj\n`);
  }
  const xref = offset;
  append(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < objects.length; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const buffer = new Uint8Array(offset);
  let position = 0;
  for (const chunk of pieces) { buffer.set(chunk, position); position += chunk.length; }
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `staley-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date(report.generatedAt).toISOString().slice(0, 10)}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
