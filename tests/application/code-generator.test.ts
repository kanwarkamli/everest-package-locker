import { describe, it, expect } from 'vitest';
import {
  CryptoCodeGenerator,
  SequentialCodeGenerator,
} from '../../src/application/code-generator.js';

describe('CryptoCodeGenerator', () => {
  it('generates valid six-digit codes', () => {
    const gen = new CryptoCodeGenerator();
    for (let i = 0; i < 50; i++) {
      expect(gen.generate().value).toMatch(/^\d{6}$/);
    }
  });
});

describe('SequentialCodeGenerator', () => {
  it('generates predictable ascending codes for demos', () => {
    const gen = new SequentialCodeGenerator();
    expect(gen.generate().value).toBe('000001');
    expect(gen.generate().value).toBe('000002');
    expect(gen.generate().value).toBe('000003');
  });
});
