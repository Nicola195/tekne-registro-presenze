import { jsPDF } from 'jspdf';
import { dateIT, todayISO } from './model';
import { ENTE, LOGO_RATIO } from './branding';
import { LOGO_FLAT } from './logo-flat';

export type Cell = string | number | null;
export type Align = 'left' | 'center' | 'right';

export interface Col {
  label: string;
  width: number; // larghezza relativa
  align?: Align;
  emphasis?: boolean; // colonna in risalto (es. Ore totali)
}

/** Una sezione = una tabella che inizia su una nuova pagina. */
export interface Section {
  title: string;
  subtitle?: string;
  cols: Col[];
  rows: Cell[][];
  groupCol?: number; // colonna le cui celle uguali consecutive vengono unite (es. Data)
  totalRows?: Cell[][];
  summary?: [string, string][]; // riquadro dei totali sotto la tabella
  legend?: string; // legenda a piè di pagina
  soggetto?: string; // sostituisce il nominativo in intestazione per questa sezione
  intro?: [string, string][]; // riquadro anagrafico mostrato prima della tabella
}

export interface HeaderMeta {
  center?: string; // testo centrato sotto "CENTRO ... ANNO" (es. "Settembre 2026")
  left?: [string, string]; // [etichetta, valore] a sinistra (es. ["Registro ore lavorate", "TATULLI Ilaria"])
  right?: [string, string]; // [etichetta, valore] a destra (es. ["Periodo", "Settembre 2026"])
}

export interface Report {
  file: string;
  titolo?: string; // titolo grande (facoltativo); se assente non viene mostrato
  anno: string;
  meta?: HeaderMeta; // riga informativa fra i due separatori
  sections: Section[];
}

type RGB = [number, number, number];
const TEAL: RGB = [4, 94, 102];
const TEAL_DARK: RGB = [3, 71, 77];
const YELLOW: RGB = [250, 190, 53];
const ORANGE: RGB = [226, 116, 27];
const TEXT: RGB = [29, 43, 45];
const MUTED: RGB = [98, 115, 111];
const GRID: RGB = [214, 219, 205];
const ZEBRA: RGB = [247, 248, 243];
const TOTAL_BG: RGB = [255, 245, 214];
const EMPH_BG: RGB = [255, 236, 179];

const PW = 210;
const PH = 297;
const M = 12;
const BOTTOM = PH - 18; // spazio riservato a legenda e piè di pagina
const FS = 8.5;
const PAD = 1.4;
const LHF = 1.25;
const PT = 0.3528; // mm per punto

const fmtNum = (h: number) => h.toLocaleString('it-IT', { maximumFractionDigits: 2 });
const txt = (c: Cell | undefined) => (c === null || c === undefined ? '' : typeof c === 'number' ? fmtNum(c) : String(c));

export function writeReport(r: Report): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setLineHeightFactor(LHF);
  const legendOf: Record<number, string> = {};

  // ---------- Intestazione di pagina ----------
  const pageHeader = (_sec: Section): number => {
    let y = 8;
    const lh = 20;
    const lw = lh * LOGO_RATIO;
    doc.addImage(LOGO_FLAT, 'JPEG', (PW - lw) / 2, y, lw, lh);
    y += lh + 4;
    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(ENTE.nome, PW / 2, y, { align: 'center' });
    y += 4;
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(ENTE.sedeLegale, PW / 2, y, { align: 'center' });
    y += 3.4;
    doc.text(ENTE.sedeFisica, PW / 2, y, { align: 'center' });
    y += 3.4;
    doc.text(ENTE.piva, PW / 2, y, { align: 'center' });
    y += 3.5;
    // riga colorata
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(M, y, PW - M, y);
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.6);
    doc.line(M, y + 1, PW * 0.62, y + 1);
    doc.setDrawColor(...ORANGE);
    doc.line(PW * 0.62, y + 1, PW - M, y + 1);
    y += 7;
    // titolo grande (facoltativo)
    if (r.titolo) {
      doc.setTextColor(...TEXT);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.text(r.titolo, PW / 2, y, { align: 'center' });
      y += 5.5;
    }
    // CENTRO ... ANNO
    doc.setTextColor(...TEAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${ENTE.centro} ANNO ${r.anno}`, PW / 2, y, { align: 'center' });
    y += 5;
    // separatore 1
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y);
    y += 6;
    // riga informativa: centrata (es. mese) oppure sinistra/destra (soggetto · periodo)
    const meta = r.meta;
    if (meta?.center) {
      doc.setTextColor(...TEAL_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(meta.center, PW / 2, y, { align: 'center' });
    } else if (meta?.left || meta?.right) {
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      if (meta.left) {
        const lab = `${meta.left[0]}: `;
        doc.setFont('helvetica', 'bold');
        doc.text(lab, M, y);
        const lwL = doc.getTextWidth(lab);
        doc.setFont('helvetica', 'normal');
        doc.text(meta.left[1], M + lwL, y);
      }
      if (meta.right) {
        const val = meta.right[1];
        doc.setFont('helvetica', 'normal');
        const vw = doc.getTextWidth(val);
        doc.setFont('helvetica', 'bold');
        const lab = `${meta.right[0]}: `;
        const lwR = doc.getTextWidth(lab);
        doc.text(lab, PW - M - vw - lwR, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, PW - M, y, { align: 'right' });
      }
    }
    y += 3;
    // separatore 2
    doc.setDrawColor(...GRID);
    doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y);
    return y + 5;
  };

  r.sections.forEach((sec, si) => {
    if (si > 0) doc.addPage('a4', 'portrait');
    const totW = sec.cols.reduce((a, c) => a + c.width, 0) || 1;
    const cw = sec.cols.map((c) => (c.width / totW) * (PW - 2 * M));
    const cx = cw.map((_, i) => M + cw.slice(0, i).reduce((a, b) => a + b, 0));
    const g = sec.groupCol;
    let y = 0;

    const fsOf = (ci: number, header = false) => (sec.cols[ci]?.emphasis && !header ? FS + 1.5 : FS);
    const split = (s: string, ci: number, bold: boolean, header = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fsOf(ci, header));
      return doc.splitTextToSize(s, Math.max(2, cw[ci] - 2 * PAD)) as string[];
    };
    const blockH = (n: number, fs: number) => n * fs * PT * LHF;

    const cell = (ci: number, yy: number, h: number, lines: string[], o: { bold?: boolean; fill?: RGB; color?: RGB; header?: boolean }) => {
      const col = sec.cols[ci];
      const fs = fsOf(ci, o.header);
      const fill = o.fill || (col.emphasis && !o.header ? EMPH_BG : undefined);
      if (fill) {
        doc.setFillColor(...fill);
        doc.rect(cx[ci], yy, cw[ci], h, 'F');
      }
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.15);
      doc.rect(cx[ci], yy, cw[ci], h, 'S');
      doc.setFont('helvetica', o.bold || (col.emphasis && !o.header) ? 'bold' : 'normal');
      doc.setFontSize(fs);
      doc.setTextColor(...(o.color || TEXT));
      const al: Align = o.header ? 'center' : col.align || 'left';
      const x = al === 'center' ? cx[ci] + cw[ci] / 2 : al === 'right' ? cx[ci] + cw[ci] - PAD : cx[ci] + PAD;
      const ty = yy + (h - blockH(lines.length, fs)) / 2 + fs * PT * 0.9;
      doc.text(lines, x, ty, { align: al });
    };

    const tableHeader = () => {
      const ls = sec.cols.map((c, i) => split(c.label, i, true, true));
      const h = Math.max(...ls.map((l) => l.length)) * FS * PT * LHF + 2 * PAD;
      sec.cols.forEach((c, i) =>
        cell(i, y, h, ls[i], { bold: true, header: true, fill: c.emphasis ? YELLOW : TEAL, color: c.emphasis ? TEAL_DARK : [255, 255, 255] }),
      );
      y += h;
    };

    const startPage = (cont: boolean) => {
      y = pageHeader(sec);
      legendOf[doc.getCurrentPageInfo().pageNumber] = sec.legend || '';
      if (sec.title) {
        doc.setTextColor(...TEAL);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(sec.title + (cont ? ' (segue)' : ''), M, y);
        y += 4.5;
      }
      if (sec.subtitle) {
        doc.setTextColor(...MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(sec.subtitle, M, y);
        y += 4.5;
      }
      if (!cont && sec.intro?.length) {
        const pad = 3;
        const lh = 4.4;
        const bh = pad * 2 + sec.intro.length * lh;
        doc.setFillColor(255, 245, 214);
        doc.setDrawColor(...YELLOW);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, PW - 2 * M, bh, 2, 2, 'FD');
        let iy = y + pad + 3;
        doc.setFontSize(9);
        sec.intro.forEach(([k, v]) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...TEAL_DARK);
          doc.text(`${k}: `, M + 3, iy);
          const kw = doc.getTextWidth(`${k}: `);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...TEXT);
          doc.text(doc.splitTextToSize(v || '—', PW - 2 * M - 6 - kw) as string[], M + 3 + kw, iy);
          iy += lh;
        });
        y += bh + 4;
      }
      y += 0.5;
      tableHeader();
    };
    const newPage = () => {
      doc.addPage('a4', 'portrait');
      startPage(true);
    };

    startPage(false);

    // misura righe (escludendo la colonna raggruppata)
    const measured = sec.rows.map((row) => {
      const ls = sec.cols.map((_, i) => (i === g ? [] : split(txt(row[i]), i, false)));
      const h = Math.max(1, ...ls.map((l, i) => (i === g ? 0 : l.length))) * FS * PT * LHF + 2 * PAD;
      return { row, ls, h };
    });

    // gruppi di righe consecutive con lo stesso valore nella colonna raggruppata
    const groups: { label: string; items: typeof measured }[] = [];
    measured.forEach((m) => {
      const label = g === undefined ? '' : txt(m.row[g]);
      const last = groups[groups.length - 1];
      if (g !== undefined && last && last.label === label) last.items.push(m);
      else groups.push({ label, items: [m] });
    });

    groups.forEach((grp, gi) => {
      const fill = gi % 2 ? ZEBRA : undefined;
      const gl = g === undefined ? [] : split(grp.label, g, true);
      const rowsH = grp.items.reduce((a, m) => a + m.h, 0);
      const gh = g === undefined ? 0 : blockH(gl.length, FS) + 2 * PAD;
      if (gh > rowsH) grp.items[grp.items.length - 1].h += gh - rowsH;
      const H = Math.max(rowsH, gh);
      const freshAvail = BOTTOM - 80;
      if (y + H > BOTTOM && H <= freshAvail) newPage();
      if (y + H <= BOTTOM || g === undefined) {
        if (g !== undefined) cell(g, y, H, gl, { bold: true, fill });
        grp.items.forEach((m) => {
          if (g === undefined && y + m.h > BOTTOM) newPage();
          sec.cols.forEach((_, i) => i !== g && cell(i, y, m.h, m.ls[i], { fill }));
          y += m.h;
        });
      } else {
        // gruppo più alto di una pagina: riga per riga, ripetendo l'etichetta
        grp.items.forEach((m) => {
          if (y + m.h > BOTTOM) newPage();
          cell(g, y, m.h, gl, { bold: true, fill });
          sec.cols.forEach((_, i) => i !== g && cell(i, y, m.h, m.ls[i], { fill }));
          y += m.h;
        });
      }
    });

    (sec.totalRows || []).forEach((row) => {
      const ls = sec.cols.map((_, i) => split(txt(row[i]), i, true));
      const h = Math.max(1, ...ls.map((l) => l.length)) * FS * PT * LHF + 2 * PAD;
      if (y + h > BOTTOM) newPage();
      sec.cols.forEach((c, i) => cell(i, y, h, ls[i], { bold: true, fill: c.emphasis ? YELLOW : TOTAL_BG }));
      y += h;
    });

    if (sec.summary?.length) {
      y += 4;
      const bw = 95;
      const bh = 7.5;
      if (y + bh * sec.summary.length > BOTTOM) newPage();
      sec.summary.forEach(([label, value], i) => {
        const last = i === sec.summary!.length - 1 && sec.summary!.length > 1;
        doc.setFillColor(...(last ? YELLOW : TOTAL_BG));
        doc.setDrawColor(...(last ? YELLOW : GRID));
        doc.roundedRect(PW - M - bw, y, bw, bh, 1.5, 1.5, 'FD');
        doc.setTextColor(...TEAL_DARK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(label, PW - M - bw + 3, y + bh / 2 + 1.2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(value, PW - M - 3, y + bh / 2 + 1.4, { align: 'right' });
        y += bh + 1.5;
      });
    }
  });

  // ---------- Piè di pagina ----------
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    if (legendOf[i]) {
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.2);
      doc.line(M, PH - 14, PW - M, PH - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(legendOf[i], M, PH - 10.5);
    }
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`Generato il ${dateIT(todayISO())}`, M, PH - 6);
    doc.text(ENTE.nome, PW / 2, PH - 6, { align: 'center' });
    doc.text(`Pagina ${i} di ${n}`, PW - M, PH - 6, { align: 'right' });
  }
  return doc.output('blob');
}

export async function saveReport(r: Report) {
  // Download standard del browser (nessuna dipendenza esterna).
  const blob = writeReport(r);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.file}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
