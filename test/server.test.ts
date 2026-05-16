import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  levenshtein,
  damerauLevenshtein,
  jaro,
  jaroWinkler,
  similarity,
  allMetrics,
} from '../src/server.js';

test('levenshtein basic', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(levenshtein('abc', ''), 3);
  assert.equal(levenshtein('abc', 'abc'), 0);
});

test('damerau-levenshtein catches transposition', () => {
  // "abcd" → "acbd" is one Damerau edit (transpose b/c) but two Levenshtein edits.
  assert.equal(damerauLevenshtein('abcd', 'acbd'), 1);
  assert.equal(levenshtein('abcd', 'acbd'), 2);
});

test('jaro distance', () => {
  // MARTHA vs MARHTA: known reference Jaro = 0.9444...
  assert.ok(Math.abs(jaro('MARTHA', 'MARHTA') - 0.9444) < 0.001);
  assert.equal(jaro('abc', 'abc'), 1);
  assert.equal(jaro('', 'abc'), 0);
});

test('jaro-winkler boosts shared prefixes', () => {
  // Two strings with identical 4-char prefix get a higher score than plain Jaro.
  const j = jaro('DWAYNE', 'DUANE');
  const jw = jaroWinkler('DWAYNE', 'DUANE');
  assert.ok(jw >= j);
});

test('similarity is 1 for equal strings', () => {
  assert.equal(similarity('abc', 'abc'), 1);
  assert.equal(similarity('', ''), 1);
});

test('similarity is 0 when fully different', () => {
  assert.equal(similarity('abc', 'xyz'), 0);
});

test('allMetrics returns all five fields', () => {
  const r = allMetrics('foo', 'bar');
  assert.equal(typeof r.levenshtein, 'number');
  assert.equal(typeof r.damerau_levenshtein, 'number');
  assert.equal(typeof r.jaro, 'number');
  assert.equal(typeof r.jaro_winkler, 'number');
  assert.equal(typeof r.similarity, 'number');
});
