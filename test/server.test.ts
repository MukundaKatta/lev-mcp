import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  levenshtein,
  damerauLevenshtein,
  jaro,
  jaroWinkler,
  similarity,
  allMetrics,
  callDistance,
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

test('jaro-winkler matches the canonical MARTHA/MARHTA value', () => {
  // Reference Jaro-Winkler for MARTHA vs MARHTA is ~0.9611 (prefix MAR boosts Jaro).
  assert.ok(Math.abs(jaroWinkler('MARTHA', 'MARHTA') - 0.9611) < 0.001);
});

test('damerau-levenshtein handles empty inputs', () => {
  assert.equal(damerauLevenshtein('', ''), 0);
  assert.equal(damerauLevenshtein('', 'abc'), 3);
  assert.equal(damerauLevenshtein('abc', ''), 3);
});

test('callDistance returns metrics for valid string input', () => {
  const res = callDistance({ a: 'kitten', b: 'sitting' });
  assert.notEqual(res.isError, true);
  const parsed = JSON.parse(res.content[0].text);
  assert.equal(parsed.levenshtein, 3);
  assert.equal(parsed.a, 'kitten');
  assert.equal(parsed.b, 'sitting');
});

test('callDistance rejects missing arguments', () => {
  const res = callDistance({ a: 'abc' });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /requires string arguments/);
});

test('callDistance rejects non-string arguments', () => {
  const res = callDistance({ a: 5, b: 'abc' });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /requires string arguments/);
});

test('callDistance handles undefined args without throwing', () => {
  const res = callDistance(undefined);
  assert.equal(res.isError, true);
});
