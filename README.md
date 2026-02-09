# @lxgicstudios/ai-readme

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/ai-readme)](https://www.npmjs.com/package/@lxgicstudios/ai-readme)
[![npm downloads](https://img.shields.io/npm/dm/@lxgicstudios/ai-readme)](https://www.npmjs.com/package/@lxgicstudios/ai-readme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

> Generate professional README.md files from codebase analysis. Zero dependencies.

## Features

- Scans `package.json`, detects frameworks, and analyzes your `src/` structure
- Outputs badges, install instructions, usage, API docs, and contributing section
- Two styles: `minimal` for quick docs, `detailed` for full documentation
- Update mode preserves your custom sections (won't overwrite manual edits)
- JSON export for CI/CD pipelines
- Zero external dependencies - uses only Node.js builtins
- Colorful terminal output

## Installation

Run directly with npx:

```bash
npx @lxgicstudios/ai-readme
```

Or install globally:

```bash
npm install -g @lxgicstudios/ai-readme
```

## Usage

```bash
ai-readme [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <path>` | Target directory to analyze | Current directory |
| `--style <mode>` | Output style: `minimal` or `detailed` | `detailed` |
| `--output <file>` | Output file path | `README.md` |
| `--update` | Preserve custom sections in existing README | `false` |
| `--json` | Output analysis as JSON instead of markdown | `false` |
| `--dry-run` | Preview output without writing to disk | `false` |
| `--help` | Show help message | |

### Examples

```bash
# Generate README in current directory
npx @lxgicstudios/ai-readme

# Minimal style with custom output path
npx @lxgicstudios/ai-readme --style minimal --output DOCS.md

# Update existing README, keep custom sections
npx @lxgicstudios/ai-readme --update

# Preview what it'd generate (no file written)
npx @lxgicstudios/ai-readme --dry-run

# Export analysis as JSON
npx @lxgicstudios/ai-readme --json
```

### Custom Sections

When using `--update`, ai-readme preserves any sections wrapped in custom markers:

```markdown
<!-- custom: my-section -->
Your custom content here that won't be overwritten.
<!-- /custom -->
```

## What It Detects

- **Frameworks:** React, Next.js, Vue, Nuxt, Svelte, Angular, Express, Fastify, Hono, and more
- **Languages:** TypeScript, JavaScript, Python, Rust, Go, Ruby, Java, CSS, SCSS
- **Project config:** bin entries, scripts, engines, keywords, dependencies
- **Structure:** src/ file tree, entry points, CLI definitions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/cool-feature`)
3. Commit your changes (`git commit -m 'feat: add cool feature'`)
4. Push to the branch (`git push origin feature/cool-feature`)
5. Open a Pull Request

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Built by **[LXGIC Studios](https://lxgicstudios.com)**

[GitHub](https://github.com/lxgicstudios/ai-readme) | [Twitter](https://x.com/lxgicstudios)
