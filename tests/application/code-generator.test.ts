import { describe, it, expect } from 'vitest';
import { CryptoCodeGenerator } from '../../src/application/code-generator.js';

describe('CryptoCodeGenerator', () => {
  it('generates valid six-digit codes', () => {
    const gen = new CryptoCodeGenerator();
    for (let i = 0; i < 50; i++) {
      expect(gen.generate().value).toMatch(/^\d{6}$/);
    }
  });
});
