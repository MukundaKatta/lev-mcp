#!/usr/bin/env node
/**
 * lev MCP server. One tool: `distance`.
 *
 * Compute string-distance metrics: Levenshtein (insert/delete/sub),
 * Damerau-Levenshtein (also adjacent transposes), Jaro, Jaro-Winkler,
 * and a normalized similarity score in [0, 1].
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const VERSION = '0.1.0';

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  // Two-row DP for O(min(m,n)) space.
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  // Full matrix needed for transposition lookup.
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array<boolean>(a.length).fill(false);
  const bMatch = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatch[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatch[i] = true;
      bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const m = matches;
  return (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;
}

export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * p * (1 - j);
}

/** Levenshtein-derived normalized similarity in [0, 1]. */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

export interface DistanceResult {
  a: string;
  b: string;
  levenshtein: number;
  damerau_levenshtein: number;
  jaro: number;
  jaro_winkler: number;
  similarity: number;
}

export function allMetrics(a: string, b: string): DistanceResult {
  return {
    a,
    b,
    levenshtein: levenshtein(a, b),
    damerau_levenshtein: damerauLevenshtein(a, b),
    jaro: round(jaro(a, b)),
    jaro_winkler: round(jaroWinkler(a, b)),
    similarity: round(similarity(a, b)),
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * Dispatch a `distance` tool call. Validates that `a` and `b` are strings and
 * returns a structured result (or an error result for invalid input).
 */
export function callDistance(args: unknown): ToolResult {
  const params = (args ?? {}) as Record<string, unknown>;
  if (typeof params.a !== 'string' || typeof params.b !== 'string') {
    return errorResult('distance requires string arguments "a" and "b"');
  }
  return jsonResult(allMetrics(params.a, params.b));
}

const server = new Server({ name: 'lev', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'distance',
    description:
      'Compute string-distance metrics between two strings: Levenshtein, Damerau-Levenshtein, Jaro, Jaro-Winkler, and similarity in [0,1].',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name !== 'distance') return errorResult('unknown tool: ' + name);
    return callDistance(args);
  } catch (err) {
    return errorResult('lev failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`lev MCP server v${VERSION} ready on stdio\n`);
}
