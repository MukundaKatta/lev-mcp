# lev-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/lev-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/lev-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

MCP server: string-distance metrics. One call returns Levenshtein,
Damerau-Levenshtein, Jaro, Jaro-Winkler, and a normalized similarity score.
No external deps.

## Tool

### `distance`

```json
{ "a": "kitten", "b": "sitting" }
```

→

```json
{
  "a": "kitten", "b": "sitting",
  "levenshtein": 3,
  "damerau_levenshtein": 3,
  "jaro": 0.7460,
  "jaro_winkler": 0.7460,
  "similarity": 0.5714
}
```

Damerau-Levenshtein additionally allows adjacent-character transposition as
a single edit — useful for typo detection (`abcd` ↔ `acbd` is 1 Damerau edit,
2 Levenshtein edits).

## Configure

```json
{ "mcpServers": { "lev": { "command": "npx", "args": ["-y", "@mukundakatta/lev-mcp"] } } }
```

## License

MIT.
