import {
  Session, Operator, Nominativo, Period, TariffaVoce, perName, daysBetween, weekday, dateIT, fascia, isConc, isLavoro, round2, parseISO, opName,
  attivitaLabel, pad, weekStart, fmtH, fmtEuro, importoSessione, nomeCompleto, genitoriLabel,
} from './model';
import { Cell, Col, Section, saveReport } from './report-pdf';
import { annoEducativo } from './branding';

const fmtNum = (h: number) => h.toLocaleString('it-IT', { maximumFractionDigits: 2 });
const ddmm = (iso: string) => {
  const d = parseISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
const dataG = (iso: string) => `${weekday(iso)} ${ddmm(iso)}`;
const byTime = (a: Session, b: Session) => a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99');
const tagExtra = (s: Session, n: string) => (s.extraNames?.includes(n) ? ' (extra)' : '');
const noteTerapia = (s: Session) => [attivitaLabel(s), s.note || ''].filter(Boolean).join(' - ');
const sumH = (l: Session[]) => round2(l.reduce((a, s) => a + s.hours, 0));

export const describeIndiv = (list: Session[]) =>
  list.map((s) => `${s.names[0]}${tagExtra(s, s.names[0])} (${fmtNum(s.hours)} h)`).join('; ');
export const describeConc = (list: Session[]) =>
  list.map((s) => `${fmtNum(s.hours)} h: ${s.names.map((n) => n + tagExtra(s, n)).join(' + ')}${s.start ? ` [${fascia(s)}]` : ''}`).join(' | ');
export const describeExtra = (s: Session, ops: Operator[]) =>
  s.extraNames?.length ? `${s.extraNames.join(', ')}${s.coverOf ? ` - copertura di ${opName(ops, s.coverOf)}` : ' - extra'}` : '';

/** Settimane (lun-dom) del periodo, limitate alle date del periodo. */
function weeks(p: Period) {
  const out: { start: string; days: string[] }[] = [];
  daysBetween(p.from, p.to).forEach((d) => {
    const ws = weekStart(d);
    const last = out[out.length - 1];
    if (last && last.start === ws) last.days.push(d);
    else out.push({ start: ws, days: [d] });
  });
  return out;
}
const weekLabel = (days: string[]) => `dal ${dateIT(days[0])} al ${dateIT(days[days.length - 1])}`;

const anno = (p: Period) => annoEducativo(p.to);
const ensure = (os: Session[]) => {
  if (!os.length) throw new Error('Nessuna ora registrata nel periodo selezionato.');
};

// ---------- Registro ore lavorate ----------

export async function exportRegistro(sessions: Session[], op: Operator, operators: Operator[], p: Period) {
  const os = sessions.filter((s) => s.operatorId === op.id && isLavoro(s) && s.date >= p.from && s.date <= p.to).sort(byTime);
  ensure(os);
  const showExtra = os.some((s) => s.extraNames?.length);
  const cols: Col[] = [
    { label: 'Data', width: 13, align: 'center' },
    { label: 'Fascia oraria', width: 14, align: 'center' },
    { label: 'Ore', width: 7, align: 'center' },
    { label: 'Nominativi', width: showExtra ? 32 : 40 },
    { label: 'Note / Terapia', width: showExtra ? 19 : 24 },
    ...(showExtra ? [{ label: 'Extra / copertura', width: 18 }] : []),
  ];
  const total = sumH(os);
  const ws = weeks(p)
    .map((w) => ({ ...w, list: os.filter((s) => w.days.includes(s.date)) }))
    .filter((w) => w.list.length);

  const sections: Section[] = ws.map((w, i) => {
    const days = new Set(w.list.map((s) => s.date)).size;
    const summary: [string, string][] = [[`Totale ore settimana (${days} ${days === 1 ? 'giorno' : 'giorni'})`, fmtH(sumH(w.list))]];
    if (i === ws.length - 1) summary.push(['Totale ore del periodo', fmtH(total)]);
    return {
      title: weekLabel(w.days),
      subtitle: `Settimana ${i + 1} di ${ws.length}`,
      cols,
      rows: w.list.map((s): Cell[] => [
        dataG(s.date), fascia(s) || '—', s.hours, s.names.join(' + '), noteTerapia(s),
        ...(showExtra ? [describeExtra(s, operators)] : []),
      ]),
      groupCol: 0,
      summary,
    };
  });

  await saveReport({ file: `Registro ore lavorate - ${op.name} - ${p.fileLabel}`, anno: anno(p), meta: { left: ['Registro ore lavorate', op.name], right: ['Periodo', p.label] }, sections });
}

// ---------- Ore per nominativo ----------

export async function exportOrePerNominativo(sessions: Session[], op: Operator, nominativi: Nominativo[], p: Period, tariffe?: TariffaVoce[]) {
  const os = sessions.filter((s) => s.operatorId === op.id && isLavoro(s) && s.date >= p.from && s.date <= p.to);
  ensure(os);
  const order = Array.from(new Set([...nominativi.map((n) => n.name), ...os.flatMap((s) => s.names)]));
  const rows = perName(os, order).filter((r) => r.hours > 0).sort((a, b) => a.name.localeCompare(b.name));
  const showExtra = rows.some((r) => r.extraHours > 0);
  const showImporti = !!tariffe;
  const importoNome = (nome: string) => round2(os.filter((s) => s.names.includes(nome)).reduce((a, s) => a + importoSessione(s, tariffe || []), 0));
  const sum = (f: (r: (typeof rows)[number]) => number) => round2(rows.reduce((a, r) => a + f(r), 0));
  const importoTot = round2(rows.reduce((a, r) => a + importoNome(r.name), 0));

  const riepilogo: Section = {
    title: '',
    cols: [
      { label: 'Nominativo', width: 30 },
      { label: 'ORE TOTALI', width: 18, align: 'center', emphasis: true },
      { label: 'di cui individuali', width: 14, align: 'center' },
      { label: 'di cui in contemporanea', width: 16, align: 'center' },
      ...(showExtra ? [{ label: 'di cui extra / coperture', width: 16, align: 'center' as const }] : []),
      { label: 'Giorni di presenza', width: 12, align: 'center' },
      ...(showImporti ? [{ label: 'Importo', width: 15, align: 'right' as const }] : []),
    ],
    rows: rows.map((r) => [r.name, r.hours, r.indivHours || null, r.concHours || null, ...(showExtra ? [r.extraHours || null] : []), r.days, ...(showImporti ? [fmtEuro(importoNome(r.name))] : [])]),
    totalRows: [['TOTALE', sum((r) => r.hours), sum((r) => r.indivHours), sum((r) => r.concHours), ...(showExtra ? [sum((r) => r.extraHours)] : []), null, ...(showImporti ? [fmtEuro(importoTot)] : [])]],
    summary: showImporti
      ? [['Ore lavorate dall\'operatrice', fmtH(sumH(os))], ['Importo totale', fmtEuro(importoTot)]]
      : [['Ore lavorate dall\'operatrice', fmtH(sumH(os))]],
  };

  const ws = weeks(p).filter((w) => os.some((s) => w.days.includes(s.date)));
  const griglie: Section[] = ws.map((w, i) => {
    const inWeek = rows
      .map((r) => ({ r, tot: round2(w.days.reduce((a, d) => a + (r.byDay[d] || 0), 0)) }))
      .filter((x) => x.tot > 0);
    const dayTot = (d: string) => round2(inWeek.reduce((a, x) => a + (x.r.byDay[d] || 0), 0));
    return {
      title: `Ore per giorno · Settimana ${i + 1} di ${ws.length}`,
      subtitle: weekLabel(w.days),
      cols: [
        { label: 'Nominativo', width: 24 },
        ...w.days.map((d) => ({ label: `${weekday(d)}\n${ddmm(d)}`, width: 9, align: 'center' as const })),
        { label: 'Totale settimana', width: 12, align: 'center', emphasis: true },
      ],
      rows: inWeek.map((x) => [x.r.name, ...w.days.map((d) => x.r.byDay[d] ?? null), x.tot]),
      totalRows: [['TOTALE', ...w.days.map((d) => dayTot(d) || null), round2(inWeek.reduce((a, x) => a + x.tot, 0))]],
    };
  });

  await saveReport({ file: `Ore per nominativo - ${op.name} - ${p.fileLabel}`, anno: anno(p), meta: { left: ['Riepilogo ore', op.name], right: ['Periodo', p.label] }, sections: [riepilogo, ...griglie] });
}

// ---------- Report per famiglia (da consegnare ai genitori) ----------
// Riservatezza: non riporta i nomi degli altri bambini (contemporaneità = "Microgruppo")
// né le annotazioni libere; include le ore di tutte le operatrici; nessun ruolo operatore.

/** Nominativi con ore nel periodo (tutte le operatrici), in ordine alfabetico. */
export const nominativiNelPeriodo = (sessions: Session[], p: Period) =>
  Array.from(new Set(sessions.filter((s) => s.date >= p.from && s.date <= p.to).flatMap((s) => s.names))).sort((a, b) => a.localeCompare(b));

export const oreFamiglia = (sessions: Session[], nome: string, p: Period) =>
  sumH(sessions.filter((s) => s.names.includes(nome) && s.date >= p.from && s.date <= p.to));

function famigliaSection(sessions: Session[], operators: Operator[], nominativi: Nominativo[], nome: string, p: Period, tariffe: TariffaVoce[]): Section | null {
  const list = sessions.filter((s) => s.names.includes(nome) && s.date >= p.from && s.date <= p.to).sort(byTime);
  if (!list.length) return null;
  const anag = nominativi.find((n) => n.name === nome);
  const natoA = anag?.dataNascita
    ? dateIT(anag.dataNascita) + (anag.luogoNascita ? ` a ${anag.luogoNascita}` : '')
    : (anag?.luogoNascita ? anag.luogoNascita : '');
  const intro: [string, string][] = [
    ['Utente', nomeCompleto(anag) || nome],
    ['Nato/a il', natoA],
    ['Codice fiscale', anag?.codiceFiscale || ''],
    ['Indirizzo', anag?.indirizzo || ''],
    ['Terapia / motivazione', anag?.terapia || ''],
    ['Genitori / tutori', genitoriLabel(anag) || ''],
    ['Telefono', anag?.telefono || ''],
  ];
  const importoTot = round2(list.reduce((a, s) => a + importoSessione(s, tariffe), 0));
  return {
    title: '',
    intro,
    cols: [
      { label: 'Data', width: 13, align: 'center' },
      { label: 'Fascia oraria', width: 14, align: 'center' },
      { label: 'Ore', width: 7, align: 'center' },
      { label: 'Modalità', width: 15, align: 'center' },
      { label: 'Attività', width: 23 },
      { label: 'Operatrice', width: 21 },
      { label: 'Importo', width: 14, align: 'right' },
    ],
    rows: list.map((s): Cell[] => [
      dataG(s.date), fascia(s) || '—', s.hours, isConc(s) ? 'Microgruppo' : 'Individuale', attivitaLabel(s) || '—', opName(operators, s.operatorId), fmtEuro(importoSessione(s, tariffe)),
    ]),
    groupCol: 0,
    summary: [
      ['Ore individuali', fmtH(sumH(list.filter((s) => !isConc(s))))],
      ['Ore in microgruppo', fmtH(sumH(list.filter(isConc)))],
      ['Totale ore', fmtH(sumH(list))],
      ['Importo totale', fmtEuro(importoTot)],
    ],
  };
}

const famReport = (p: Period) => ({ titolo: 'RIEPILOGO ORE MENSILI', anno: annoEducativo(p.to), meta: { center: p.mese || p.label } });

export async function exportFamiglia(sessions: Session[], operators: Operator[], nominativi: Nominativo[], nome: string, p: Period, tariffe: TariffaVoce[]) {
  const sec = famigliaSection(sessions, operators, nominativi, nome, p, tariffe);
  if (!sec) throw new Error(`Nessuna ora registrata per ${nome} nel periodo selezionato.`);
  await saveReport({ file: `Riepilogo ore - ${nome} - ${p.fileLabel}`, ...famReport(p), sections: [sec] });
}

export async function exportTutteFamiglie(sessions: Session[], operators: Operator[], nominativi: Nominativo[], p: Period, tariffe: TariffaVoce[]) {
  const sections = nominativiNelPeriodo(sessions, p)
    .map((n) => famigliaSection(sessions, operators, nominativi, n, p, tariffe))
    .filter((s): s is Section => !!s);
  if (!sections.length) throw new Error('Nessuna ora registrata nel periodo selezionato.');
  await saveReport({ file: `Riepilogo ore famiglie - ${p.fileLabel}`, ...famReport(p), sections });
}
