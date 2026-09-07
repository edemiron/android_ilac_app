import {
  type DateParts,
  clampInt,
  compareParts,
  daysInMonth,
  isValidParts,
  partsToIso,
} from './dateParts';

export type WheelColumnId = 'day' | 'month' | 'year';

/** KAPALI, sıralı aralık. min <= max invariantı makeDateRange ile zorlanır. */
export interface DateRange {
  readonly min: DateParts;
  readonly max: DateParts;
}

export const ABSOLUTE_MAX_YEAR = 2100;
export const MAX_AGE_YEARS = 125;

/** min > max ise null döner — sessizce takas ETMEZ. */
export function makeDateRange(min: DateParts, max: DateParts): DateRange | null {
  if (!isValidParts(min) || !isValidParts(max)) return null;
  if (compareParts(min, max) > 0) return null;
  return { min, max };
}

function buildContiguous(from: number, to: number): readonly number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v++) out.push(v);
  return Object.freeze(out);
}

export function buildYearValues(range: DateRange): readonly number[] {
  return buildContiguous(range.min.year, range.max.year);
}

export const MONTH_VALUES: readonly number[] = buildContiguous(1, 12);
export const DAY_VALUES: readonly number[] = buildContiguous(1, 31);

export function isMonthSelectable(year: number, month: number, range: DateRange): boolean {
  const lo: DateParts = { year, month, day: 1 };
  const hi: DateParts = { year, month, day: daysInMonth(year, month) };
  return compareParts(hi, range.min) >= 0 && compareParts(lo, range.max) <= 0;
}

export function isDaySelectable(
  year: number,
  month: number,
  day: number,
  range: DateRange
): boolean {
  if (day > daysInMonth(year, month)) return false;
  const p: DateParts = { year, month, day };
  return compareParts(p, range.min) >= 0 && compareParts(p, range.max) <= 0;
}

export interface EnabledSpan {
  readonly first: number; // indeks (değer değil)
  readonly last: number; // indeks, kapalı
}

export function yearEnabledSpan(range: DateRange): EnabledSpan {
  const len = range.max.year - range.min.year + 1;
  return { first: 0, last: len - 1 };
}

export function monthEnabledSpan(year: number, range: DateRange): EnabledSpan {
  const first = year === range.min.year ? range.min.month : 1;
  const last = year === range.max.year ? range.max.month : 12;
  return { first: first - 1, last: last - 1 };
}

export function dayEnabledSpan(year: number, month: number, range: DateRange): EnabledSpan {
  const calendarMax = daysInMonth(year, month);
  const atMin = year === range.min.year && month === range.min.month;
  const atMax = year === range.max.year && month === range.max.month;
  const firstValue = atMin ? range.min.day : 1;
  const lastValue = Math.min(calendarMax, atMax ? range.max.day : calendarMax);
  return { first: firstValue - 1, last: Math.max(lastValue, firstValue) - 1 };
}

export const MONTH_LABELS_TR: readonly string[] = Object.freeze([
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
]);

export const MONTH_LABELS_EN: readonly string[] = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

export const MONTH_LABELS_TR_FULL: readonly string[] = Object.freeze([
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]);

export const MONTH_LABELS_EN_FULL: readonly string[] = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

const labelCache = new Map<number, readonly string[]>();
export function numericLabels(count: number, pad = false): readonly string[] {
  const key = count * 2 + (pad ? 1 : 0);
  const hit = labelCache.get(key);
  if (hit) return hit;
  const built: string[] = [];
  for (let i = 1; i <= count; i++) built.push(pad ? String(i).padStart(2, '0') : String(i));
  const frozen = Object.freeze(built);
  labelCache.set(key, frozen);
  return frozen;
}

export interface WheelDateState {
  readonly parts: DateParts;
  readonly lastExplicitDay: number;
}

export type WheelDateAction =
  | { readonly type: 'setDay'; readonly day: number }
  | { readonly type: 'setMonth'; readonly month: number }
  | { readonly type: 'setYear'; readonly year: number }
  | { readonly type: 'step'; readonly column: WheelColumnId; readonly delta: 1 | -1 }
  | { readonly type: 'reset'; readonly parts: DateParts };

export function createWheelDateReducer(range: DateRange) {
  function resolveDay(year: number, month: number, preferredDay: number): number {
    const span = dayEnabledSpan(year, month, range);
    return clampInt(preferredDay, span.first + 1, span.last + 1);
  }

  return function wheelDateReducer(state: WheelDateState, action: WheelDateAction): WheelDateState {
    switch (action.type) {
      case 'setDay': {
        const span = dayEnabledSpan(state.parts.year, state.parts.month, range);
        const day = clampInt(action.day, span.first + 1, span.last + 1);
        return { parts: { ...state.parts, day }, lastExplicitDay: day };
      }

      case 'setMonth': {
        const monthSpan = monthEnabledSpan(state.parts.year, range);
        const month = clampInt(action.month, monthSpan.first + 1, monthSpan.last + 1);
        const day = resolveDay(state.parts.year, month, state.lastExplicitDay);
        return { parts: { ...state.parts, month, day }, lastExplicitDay: state.lastExplicitDay };
      }

      case 'setYear': {
        const year = clampInt(action.year, range.min.year, range.max.year);
        const day = resolveDay(year, state.parts.month, state.lastExplicitDay);
        return { parts: { ...state.parts, year, day }, lastExplicitDay: state.lastExplicitDay };
      }

      case 'step': {
        switch (action.column) {
          case 'year':
            return wheelDateReducer(state, {
              type: 'setYear',
              year: state.parts.year + action.delta,
            });
          case 'month':
            return wheelDateReducer(state, {
              type: 'setMonth',
              month: state.parts.month + action.delta,
            });
          case 'day':
            return wheelDateReducer(state, {
              type: 'setDay',
              day: state.parts.day + action.delta,
            });
          // WheelColumnId bugün 'year' | 'month' | 'day' — bu dal erişilemez.
          // Ama olmadan `case 'step'` bloğu dönüşsüz tamamlanabiliyor ve
          // kontrol `case 'reset'`'e DÜŞÜYORDU: orada `action.parts` bir
          // step aksiyonunda tanımsız olduğu için `action.parts.year`
          // TypeError fırlatırdı. Yeni bir kolon eklenirse sessizce yanlış
          // dala düşmek yerine durum değişmeden kalır.
          default:
            return state;
        }
      }

      case 'reset': {
        const day = resolveDay(action.parts.year, action.parts.month, action.parts.day);
        return { parts: { ...action.parts, day }, lastExplicitDay: action.parts.day };
      }
    }
  };
}

export interface WheelColumnModel {
  readonly id: WheelColumnId;
  readonly labels: readonly string[];
  readonly firstEnabled: number;
  readonly lastEnabled: number;
  readonly selectedIndex: number;
  readonly accessibilityValue: string;
}

const yearLabelCache = new Map<string, readonly string[]>();
export function yearLabels(range: DateRange): readonly string[] {
  const key = `${range.min.year}-${range.max.year}`;
  const hit = yearLabelCache.get(key);
  if (hit) return hit;
  const built = buildYearValues(range).map(String);
  const frozen = Object.freeze(built);
  yearLabelCache.set(key, frozen);
  return frozen;
}

export function buildColumns(
  state: WheelDateState,
  range: DateRange,
  isTr: boolean
): readonly [WheelColumnModel, WheelColumnModel, WheelColumnModel] {
  const { year, month, day } = state.parts;
  const ySpan = yearEnabledSpan(range);
  const mSpan = monthEnabledSpan(year, range);
  const dSpan = dayEnabledSpan(year, month, range);

  const monthLabels = isTr ? MONTH_LABELS_TR : MONTH_LABELS_EN;

  return [
    {
      id: 'day',
      labels: numericLabels(31),
      firstEnabled: dSpan.first,
      lastEnabled: dSpan.last,
      selectedIndex: day - 1,
      accessibilityValue: String(day),
    },
    {
      id: 'month',
      labels: monthLabels,
      firstEnabled: mSpan.first,
      lastEnabled: mSpan.last,
      selectedIndex: month - 1,
      accessibilityValue: monthLabels[month - 1],
    },
    {
      id: 'year',
      labels: yearLabels(range),
      firstEnabled: ySpan.first,
      lastEnabled: ySpan.last,
      selectedIndex: year - range.min.year,
      accessibilityValue: String(year),
    },
  ];
}

export type WheelDateValidation =
  | {
      readonly ok: true;
      readonly iso: string;
      readonly parts: DateParts;
      readonly age: number | null;
    }
  | {
      readonly ok: false;
      readonly code: WheelDateErrorCode;
      readonly messageTr: string;
      readonly messageEn: string;
    };

export type WheelDateErrorCode = 'INVALID_PARTS' | 'OUT_OF_RANGE' | 'FUTURE_DATE';

export function ageFromParts(birth: DateParts, today: DateParts): number | null {
  if (compareParts(birth, today) > 0) return null;
  let age = today.year - birth.year;
  const hadBirthdayThisYear =
    today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  if (!hadBirthdayThisYear) age -= 1;
  return age >= 0 && age <= MAX_AGE_YEARS ? age : null;
}

export function validateParts(parts: DateParts, range: DateRange): WheelDateValidation {
  if (!isValidParts(parts)) {
    return {
      ok: false,
      code: 'INVALID_PARTS',
      messageTr: 'Geçersiz takvim tarihi',
      messageEn: 'Invalid calendar date',
    };
  }
  if (compareParts(parts, range.min) < 0 || compareParts(parts, range.max) > 0) {
    return {
      ok: false,
      code: 'OUT_OF_RANGE',
      messageTr: 'Tarih izin verilen aralık dışında',
      messageEn: 'Date is outside allowed range',
    };
  }
  return {
    ok: true,
    iso: partsToIso(parts),
    parts,
    age: ageFromParts(parts, range.max),
  };
}

export function shiftYears(parts: DateParts, n: number): DateParts {
  const targetYear = parts.year + n;
  const day = clampInt(parts.day, 1, daysInMonth(targetYear, parts.month));
  return { year: targetYear, month: parts.month, day };
}
