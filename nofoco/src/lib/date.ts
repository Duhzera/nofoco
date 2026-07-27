/**
 * Datas do diário — chave `YYYY-MM-DD` em horário **local**.
 *
 * Nada aqui usa `toISOString()`: ele converte para UTC e, no Brasil (UTC-3),
 * qualquer registro feito depois das 21h cairia no dia seguinte. A chave é montada
 * a partir dos componentes locais justamente para o dia bater com o relógio da pessoa.
 *
 * Também não usamos `toLocaleDateString` para nomes: o Hermes sai sem ICU completo
 * em alguns builds Android e o mês volta em inglês. As tabelas abaixo são explícitas.
 */

export type DayKey = string; // 'YYYY-MM-DD'

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const WEEKDAYS = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

/** Inicial do dia da semana para a tira do diário (índice = `getDay()`). */
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function dateKey(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): DayKey {
  return dateKey(new Date());
}

/** Meia-noite local do dia indicado. */
export function parseKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function isToday(key: DayKey): boolean {
  return key === todayKey();
}

export function isFuture(key: DayKey): boolean {
  return key > todayKey(); // formato ISO ordena como texto
}

/** Segunda-feira da semana daquele dia (a tira do diário vai de segunda a domingo). */
export function startOfWeek(key: DayKey): DayKey {
  const d = parseKey(key);
  const shift = (d.getDay() + 6) % 7; // domingo(0) vira 6
  d.setDate(d.getDate() - shift);
  return dateKey(d);
}

/** Os sete dias da semana daquele dia, de segunda a domingo. */
export function weekDays(key: DayKey): DayKey[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekdayInitial(key: DayKey): string {
  return WEEKDAY_INITIALS[parseKey(key).getDay()];
}

export function dayNumber(key: DayKey): number {
  return parseKey(key).getDate();
}

/** "Hoje, 23 de julho" · "Ontem, 22 de julho" · "quinta-feira, 17 de julho" */
export function formatDayTitle(key: DayKey): string {
  const d = parseKey(key);
  const label = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  const today = todayKey();

  if (key === today) return `Hoje, ${label}`;
  if (key === addDays(today, -1)) return `Ontem, ${label}`;
  if (key === addDays(today, 1)) return `Amanhã, ${label}`;
  return `${WEEKDAYS[d.getDay()]}, ${label}`;
}

/** "23/07" — curto, para eixo de gráfico. */
export function formatDayMonth(key: DayKey): string {
  const d = parseKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "3 de dezembro de 2026" — com ano, para datas distantes (previsões). */
export function formatFullDate(key: DayKey): string {
  const d = parseKey(key);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "16 – 22 de maio" (mesmo mês) ou "28 abr – 4 mai" (meses diferentes). */
export function formatRange(startKey: DayKey, endKey: DayKey): string {
  const a = parseKey(startKey);
  const b = parseKey(endKey);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${b.getDate()} de ${MONTHS[b.getMonth()]}`;
  }
  return `${a.getDate()} de ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} de ${MONTHS[b.getMonth()].slice(0, 3)}`;
}

/** "Julho" ou "Jun — Jul" quando a semana atravessa dois meses. */
export function formatWeekRange(key: DayKey): string {
  const days = weekDays(key);
  const first = parseKey(days[0]);
  const last = parseKey(days[6]);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (first.getMonth() === last.getMonth()) return cap(MONTHS[first.getMonth()]);
  return `${cap(MONTHS[first.getMonth()]).slice(0, 3)} — ${cap(MONTHS[last.getMonth()]).slice(0, 3)}`;
}
