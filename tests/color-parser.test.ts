import { describe, it, expect } from 'vitest';
import { parseColor } from '../src/features/color-role/parser.js';

describe('parseColor', () => {
  it('parses 6-digit hex with or without #', () => {
    expect(parseColor('#ff66cc')).toBe('ff66cc');
    expect(parseColor('FF66CC')).toBe('ff66cc');
  });

  it('expands 3-digit hex', () => {
    expect(parseColor('#f6c')).toBe('ff66cc');
    expect(parseColor('abc')).toBe('aabbcc');
  });

  it('parses rgb()', () => {
    expect(parseColor('rgb(255, 102, 204)')).toBe('ff66cc');
    expect(parseColor('RGB(0,0,0)')).toBe('000000');
  });

  it('parses space- or comma-separated triples', () => {
    expect(parseColor('255 102 204')).toBe('ff66cc');
    expect(parseColor('255,102,204')).toBe('ff66cc');
  });

  it('parses named colors', () => {
    expect(parseColor('pink')).toBe('ffc0cb');
    expect(parseColor('rebeccapurple')).toBe('663399');
  });

  it('rejects out-of-range and garbage', () => {
    expect(parseColor('rgb(300, 0, 0)')).toBeNull();
    expect(parseColor('notacolor')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('#gg0000')).toBeNull();
  });
});
