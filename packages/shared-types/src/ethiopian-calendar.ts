/**
 * Ethiopian Calendar (ዓመተ ምሕረት / E.C.) conversion and formatting engine.
 *
 * Implements the standard astronomical Julian Day Number (JDN) offset algorithm:
 * - Epoch: JDN 1,723,856 (August 29, 8 CE Julian).
 * - 12 months of 30 days each + 13th month (Pagume) of 5 days (6 in leap years).
 * - Leap year occurs when (ethiopianYear % 4 === 3).
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: {
    en: string;
    am: string;
    om: string;
  };
  era: {
    en: string;
    am: string;
    om: string;
  };
}

export const ETHIOPIAN_MONTHS: Array<{
  en: string;
  am: string;
  om: string;
}> = [
  { en: 'Meskerem', am: 'መስከረም', om: 'Fulbaana' },
  { en: 'Tikimt', am: 'ጥቅምት', om: 'Onkololeessa' },
  { en: 'Hidar', am: 'ኅዳር', om: 'Sadaasa' },
  { en: 'Tahsas', am: 'ታኅሣሥ', om: 'Muddee' },
  { en: 'Tir', am: 'ጥር', om: 'Amajjii' },
  { en: 'Yakatit', am: 'የካቲት', om: 'Guraandhala' },
  { en: 'Magabit', am: 'መጋቢት', om: 'Bitooteessa' },
  { en: 'Miyazya', am: 'ሚያዝያ', om: 'Ebla' },
  { en: 'Ginbot', am: 'ግንቦት', om: 'Caamsaa' },
  { en: 'Sene', am: 'ሰኔ', om: 'Waxabajjii' },
  { en: 'Hamle', am: 'ሐምሌ', om: 'Adooleessa' },
  { en: 'Nehase', am: 'ነሐሴ', om: 'Hagayya' },
  { en: 'Pagume', am: 'ጳጉሜ', om: 'Qaammee' },
];

export const ETHIOPIAN_ERA = {
  en: 'E.C.',
  am: 'ዓ.ም.',
  om: 'E.C.',
};

/**
 * Converts Gregorian year, month (1-12), and day to Julian Day Number (JDN).
 */
export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Converts Julian Day Number (JDN) to Gregorian date { year, month, day }.
 */
export function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  return { year, month, day };
}

/**
 * Converts Julian Day Number (JDN) to Ethiopian date.
 */
export function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/**
 * Converts Ethiopian year, month (1-13), day to Julian Day Number (JDN).
 */
export function ethiopianToJdn(year: number, month: number, day: number): number {
  return 1723856 + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

/**
 * Converts any standard Date, ISO date string, or timestamp into an EthiopianDate object.
 */
export function toEthiopianDate(input: Date | string | number): EthiopianDate {
  const date = typeof input === 'object' ? input : new Date(input);
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { year, month, day } = jdnToEthiopian(jdn);
  const monthInfo = ETHIOPIAN_MONTHS[month - 1] ?? {
    en: 'Unknown',
    am: 'ያልታወቀ',
    om: 'Kan Hinbeekamne',
  };

  return {
    year,
    month,
    day,
    monthName: monthInfo,
    era: ETHIOPIAN_ERA,
  };
}

/**
 * Converts Ethiopian year, month, and day to a JavaScript Date in Gregorian calendar.
 */
export function toGregorianDate(year: number, month: number, day: number): Date {
  const jdn = ethiopianToJdn(year, month, day);
  const greg = jdnToGregorian(jdn);
  return new Date(greg.year, greg.month - 1, greg.day);
}

/**
 * Formats a date into a localized Ethiopian calendar string.
 *
 * @param input - Date, ISO string, or timestamp
 * @param lang - 'en' | 'am' | 'om' (defaults to 'en')
 * @param options - Formatting options
 * @returns Formatted Ethiopian date string, e.g. "ኅዳር 13, 2019 ዓ.ም." or "13/03/2019 ዓ.ም."
 */
export function formatEthiopianDate(
  input: Date | string | number,
  lang: 'en' | 'am' | 'om' = 'en',
  options: { short?: boolean; includeEra?: boolean } = {}
): string {
  const eth = toEthiopianDate(input);
  const era = eth.era[lang] ?? eth.era.en;
  const includeEra = options.includeEra !== false;

  if (options.short) {
    const padMonth = String(eth.month).padStart(2, '0');
    const padDay = String(eth.day).padStart(2, '0');
    return includeEra
      ? `${padDay}/${padMonth}/${eth.year} ${era}`
      : `${padDay}/${padMonth}/${eth.year}`;
  }

  const monthName = eth.monthName[lang] ?? eth.monthName.en;
  return includeEra
    ? `${monthName} ${eth.day}, ${eth.year} ${era}`
    : `${monthName} ${eth.day}, ${eth.year}`;
}
