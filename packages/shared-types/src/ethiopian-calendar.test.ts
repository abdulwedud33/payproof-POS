import { describe, it, expect } from 'vitest';
import {
  toEthiopianDate,
  formatEthiopianDate,
  toGregorianDate,
  gregorianToJdn,
  jdnToEthiopian,
  ethiopianToJdn,
  ETHIOPIAN_MONTHS,
} from './ethiopian-calendar.js';

describe('Ethiopian Calendar Engine', () => {
  it('converts current known date (2026-11-22 G.C. -> Hidar 13, 2019 E.C.)', () => {
    const eth = toEthiopianDate('2026-11-22T12:00:00Z');
    expect(eth.year).toBe(2019);
    expect(eth.month).toBe(3); // Hidar / ኅዳር
    expect(eth.day).toBe(13);
    expect(eth.monthName.en).toBe('Hidar');
    expect(eth.monthName.am).toBe('ኅዳር');
    expect(eth.monthName.om).toBe('Sadaasa');
  });

  it('converts Ethiopian New Year (Enkutatash: 2024-09-11 G.C. -> Meskerem 1, 2017 E.C.)', () => {
    const eth = toEthiopianDate(new Date(2024, 8, 11)); // Month is 0-indexed in JS (8 = September)
    expect(eth.year).toBe(2017);
    expect(eth.month).toBe(1); // Meskerem
    expect(eth.day).toBe(1);
    expect(eth.monthName.en).toBe('Meskerem');
    expect(eth.monthName.am).toBe('መስከረም');
    expect(eth.monthName.om).toBe('Fulbaana');
  });

  it('handles Pagume 6 on Ethiopian leap years (2023-09-11 G.C. -> Pagume 6, 2015 E.C.)', () => {
    const eth = toEthiopianDate(new Date(2023, 8, 11));
    expect(eth.year).toBe(2015);
    expect(eth.month).toBe(13); // Pagume
    expect(eth.day).toBe(6);
    expect(eth.monthName.en).toBe('Pagume');
    expect(eth.monthName.am).toBe('ጳጉሜ');
    expect(eth.monthName.om).toBe('Qaammee');
  });

  it('formats dates in English, Amharic, and Afaan Oromoo correctly', () => {
    const testDate = new Date(2026, 10, 22); // Nov 22, 2026

    // Full formats
    expect(formatEthiopianDate(testDate, 'en')).toBe('Hidar 13, 2019 E.C.');
    expect(formatEthiopianDate(testDate, 'am')).toBe('ኅዳር 13, 2019 ዓ.ም.');
    expect(formatEthiopianDate(testDate, 'om')).toBe('Sadaasa 13, 2019 E.C.');

    // Short formats
    expect(formatEthiopianDate(testDate, 'en', { short: true })).toBe('13/03/2019 E.C.');
    expect(formatEthiopianDate(testDate, 'am', { short: true })).toBe('13/03/2019 ዓ.ም.');
    expect(formatEthiopianDate(testDate, 'om', { short: true, includeEra: false })).toBe(
      '13/03/2019'
    );
  });

  it('performs exact roundtrip conversions between Gregorian and Ethiopian dates', () => {
    // Test conversion from Ethiopian back to Gregorian
    const greg = toGregorianDate(2019, 3, 13);
    expect(greg.getFullYear()).toBe(2026);
    expect(greg.getMonth()).toBe(10); // November (0-indexed)
    expect(greg.getDate()).toBe(22);

    const newYearGreg = toGregorianDate(2017, 1, 1);
    expect(newYearGreg.getFullYear()).toBe(2024);
    expect(newYearGreg.getMonth()).toBe(8); // September
    expect(newYearGreg.getDate()).toBe(11);
  });

  it('maintains mathematical bijection over 1,000 consecutive days', () => {
    for (let jdn = 2460000; jdn <= 2461000; jdn++) {
      const eth = jdnToEthiopian(jdn);
      const backJdn = ethiopianToJdn(eth.year, eth.month, eth.day);
      expect(backJdn).toBe(jdn);
    }
  });

  it('verifies all 13 Ethiopian month names exist in all 3 languages', () => {
    expect(ETHIOPIAN_MONTHS).toHaveLength(13);
    for (const m of ETHIOPIAN_MONTHS) {
      expect(m.en.length).toBeGreaterThan(0);
      expect(m.am.length).toBeGreaterThan(0);
      expect(m.om.length).toBeGreaterThan(0);
    }
  });
});
