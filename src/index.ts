#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

// ── ANSI Colors ──
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
};

const BANNER = `
${c.cyan}${c.bold}  ╔═══════════════════════════════════╗
  ║         ai-readme v1.0.0          ║
  ║   README generator from codebase  ║
  ╚═══════════════════════════════════╝${c.reset}
`;

const HELP = `
${BANNER}
${c.bold}USAGE${c.reset}
  ${c.green}npx @lxgicstudios/ai-readme${c.reset} [options]

${c.bold}DESCRIPTION${c.reset}
  Scans your project directory and generates a professional README.md.
  Detects frameworks, reads package.json, analyzes src/ structure,
  and outputs badges, install instructions, usage, API docs, and more.

${c.bold}OPTIONS${c.reset}
  ${c.yellow}--dir <path>${c.reset}        Target directory (default: current dir)
  ${c.yellow}--style <mode>${c.reset}      Output style: ${c.cyan}minimal${c.reset} | ${c.cyan}detailed${c.reset} (default: detailed)
  ${c.yellow}--output <file>${c.reset}     Output file path (default: README.md)
  ${c.yellow}--update${c.reset}            Preserve custom sections in existing README
  ${c.yellow}--json${c.reset}              Output analysis as JSON instead of markdown
  ${c.yellow}--dry-run${c.reset}           Preview without writing to disk
  ${c.yellow}--help${c.reset}              Show this help message

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Generate README in current directory${c.reset}
  ${c.green}npx @lxgicstudios/ai-readme${c.reset}

  ${c.dim}# Minimal style, custom output${c.reset}
  ${c.green}npx @lxgicstudios/ai-readme --style minimal --output DOCS.md${c.reset}

  ${c.dim}# Update existing README, keep custom sections${c.reset}
  ${c.green}npx @lxgicstudios/ai-readme --update${c.reset}

  ${c.dim}# Preview as JSON${c.reset}
  ${c.green}npx @lxgicstudios/ai-readme --json --dry-run${c.reset}
`;

// ── Arg Parsing ──
interface Args {
  dir: string;
  style: "minimal" | "detailed";
  output: string;
  update: boolean;
  json: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    dir: process.cwd(),
    style: "detailed",
    output: "README.md",
    update: false,
    json: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--update":
        args.update = true;
        break;
      case "--dir":
        args.dir = argv[++i] || process.cwd();
        break;
      case "--style":
        {
          const val = argv[++i];
          if (val === "minimal" || val === "detailed") args.style = val;
        }
        break;
      case "--output":
        args.output = argv[++i] || "README.md";
        break;
    }
  }
  return args;
}

// ── Project Analysis ──
interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  author: string;
  homepage: string;
  repository: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  frameworks: string[];
  languages: string[];
  hasTypescript: boolean;
  hasSrc: boolean;
  srcFiles: string[];
  entryPoint: string;
  bin: Record<string, string>;
  engines: Record<string, string>;
  keywords: string[];
}

function detectFrameworks(deps: string[], devDeps: string[]): string[] {
  const all = [...deps, ...devDeps];
  const frameworks: string[] = [];
  const checks: [string, string][] = [
    ["react", "React"],
    ["next", "Next.js"],
    ["vue", "Vue.js"],
    ["nuxt", "Nuxt"],
    ["svelte", "Svelte"],
    ["@angular/core", "Angular"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["koa", "Koa"],
    ["hono", "Hono"],
    ["electron", "Electron"],
    ["tailwindcss", "Tailwind CSS"],
    ["prisma", "Prisma"],
    ["drizzle-orm", "Drizzle"],
    ["jest", "Jest"],
    ["vitest", "Vitest"],
    ["mocha", "Mocha"],
    ["webpack", "Webpack"],
    ["vite", "Vite"],
    ["esbuild", "esbuild"],
    ["rollup", "Rollup"],
  ];

  for (const [pkg, name] of checks) {
    if (all.includes(pkg)) frameworks.push(name);
  }
  return frameworks;
}

function detectLanguages(dir: string): string[] {
  const langs = new Set<string>();
  const exts: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".rb": "Ruby",
    ".java": "Java",
    ".css": "CSS",
    ".scss": "SCSS",
    ".html": "HTML",
  };

  function scan(d: string, depth: number) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist") continue;
        if (e.isDirectory()) {
          scan(path.join(d, e.name), depth + 1);
        } else {
          const ext = path.extname(e.name);
          if (exts[ext]) langs.add(exts[ext]);
        }
      }
    } catch {
      // skip unreadable
    }
  }

  scan(dir, 0);
  return [...langs];
}

function listSrcFiles(dir: string): string[] {
  const srcDir = path.join(dir, "src");
  const files: string[] = [];

  function scan(d: string, prefix: string) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) {
          scan(path.join(d, e.name), rel);
        } else {
          files.push(rel);
        }
      }
    } catch {
      // skip
    }
  }

  if (fs.existsSync(srcDir)) {
    scan(srcDir, "");
  }
  return files;
}

function analyzeProject(dir: string): ProjectInfo {
  const pkgPath = path.join(dir, "package.json");
  let pkg: Record<string, any> = {};

  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    } catch {
      // invalid json
    }
  }

  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  const repoUrl =
    typeof pkg.repository === "string"
      ? pkg.repository
      : typeof pkg.repository === "object"
        ? pkg.repository.url || ""
        : "";

  return {
    name: pkg.name || path.basename(dir),
    version: pkg.version || "0.0.0",
    description: pkg.description || "",
    license: pkg.license || "MIT",
    author: typeof pkg.author === "string" ? pkg.author : pkg.author?.name || "",
    homepage: pkg.homepage || "",
    repository: repoUrl.replace(/^git\+/, "").replace(/\.git$/, ""),
    scripts: pkg.scripts || {},
    dependencies: deps,
    devDependencies: devDeps,
    frameworks: detectFrameworks(deps, devDeps),
    languages: detectLanguages(dir),
    hasTypescript: fs.existsSync(path.join(dir, "tsconfig.json")),
    hasSrc: fs.existsSync(path.join(dir, "src")),
    srcFiles: listSrcFiles(dir),
    entryPoint: pkg.main || "index.js",
    bin: typeof pkg.bin === "string" ? { [pkg.name || "cli"]: pkg.bin } : pkg.bin || {},
    engines: pkg.engines || {},
    keywords: pkg.keywords || [],
  };
}

// ── README Generation ──
function generateBadges(info: ProjectInfo): string {
  const badges: string[] = [];
  const repoSlug = info.repository.replace("https://github.com/", "");

  if (info.name.startsWith("@")) {
    badges.push(`[![npm version](https://img.shields.io/npm/v/${info.name})](https://www.npmjs.com/package/${info.name})`);
    badges.push(`[![npm downloads](https://img.shields.io/npm/dm/${info.name})](https://www.npmjs.com/package/${info.name})`);
  }
  badges.push(`[![License: ${info.license}](https://img.shields.io/badge/License-${info.license}-yellow.svg)](LICENSE)`);

  if (repoSlug) {
    badges.push(`[![GitHub stars](https://img.shields.io/github/stars/${repoSlug})](https://github.com/${repoSlug})`);
  }

  if (info.hasTypescript) {
    badges.push(`[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)`);
  }

  if (info.engines.node) {
    badges.push(`[![Node.js](https://img.shields.io/badge/Node.js-${encodeURIComponent(info.engines.node)}-green.svg)](https://nodejs.org/)`);
  }

  return badges.join("\n");
}

function generateMinimal(info: ProjectInfo): string {
  const lines: string[] = [];
  lines.push(`# ${info.name}\n`);
  lines.push(generateBadges(info) + "\n");

  if (info.description) {
    lines.push(`${info.description}\n`);
  }

  lines.push("## Install\n");
  if (Object.keys(info.bin).length > 0) {
    lines.push("```bash");
    lines.push(`npx ${info.name}`);
    lines.push("```\n");
    lines.push("Or install globally:\n");
  }
  lines.push("```bash");
  lines.push(`npm install ${info.name}`);
  lines.push("```\n");

  if (info.scripts.dev || info.scripts.start) {
    lines.push("## Usage\n");
    lines.push("```bash");
    if (info.scripts.dev) lines.push("npm run dev");
    if (info.scripts.start) lines.push("npm start");
    lines.push("```\n");
  }

  lines.push("## License\n");
  lines.push(`${info.license}\n`);

  return lines.join("\n");
}

function generateDetailed(info: ProjectInfo): string {
  const lines: string[] = [];

  // Title and badges
  lines.push(`# ${info.name}\n`);
  lines.push(generateBadges(info) + "\n");

  if (info.description) {
    lines.push(`> ${info.description}\n`);
  }

  // Frameworks / Tech Stack
  if (info.frameworks.length > 0 || info.languages.length > 0) {
    lines.push("## Tech Stack\n");
    if (info.frameworks.length > 0) {
      lines.push(`**Frameworks:** ${info.frameworks.join(", ")}\n`);
    }
    if (info.languages.length > 0) {
      lines.push(`**Languages:** ${info.languages.join(", ")}\n`);
    }
  }

  // Features
  lines.push("## Features\n");
  if (Object.keys(info.bin).length > 0) lines.push("- CLI tool with npx support");
  if (info.hasTypescript) lines.push("- Written in TypeScript with full type safety");
  if (info.frameworks.length > 0) lines.push(`- Built with ${info.frameworks.join(", ")}`);
  if (info.dependencies.length === 0) lines.push("- Zero external dependencies");
  lines.push("");

  // Install
  lines.push("## Installation\n");
  if (Object.keys(info.bin).length > 0) {
    lines.push("Run directly with npx:\n");
    lines.push("```bash");
    lines.push(`npx ${info.name}`);
    lines.push("```\n");
    lines.push("Or install globally:\n");
    lines.push("```bash");
    lines.push(`npm install -g ${info.name}`);
    lines.push("```\n");
  } else {
    lines.push("```bash");
    lines.push(`npm install ${info.name}`);
    lines.push("```\n");
  }

  // Usage
  lines.push("## Usage\n");
  if (Object.keys(info.bin).length > 0) {
    const cmd = Object.keys(info.bin)[0];
    lines.push("```bash");
    lines.push(`${cmd} --help`);
    lines.push("```\n");
  }
  if (info.scripts.dev || info.scripts.start || info.scripts.build) {
    lines.push("### Development\n");
    lines.push("```bash");
    if (info.scripts.dev) lines.push(`npm run dev     # ${info.scripts.dev}`);
    if (info.scripts.build) lines.push(`npm run build   # ${info.scripts.build}`);
    if (info.scripts.start) lines.push(`npm start       # ${info.scripts.start}`);
    if (info.scripts.test) lines.push(`npm test        # ${info.scripts.test}`);
    lines.push("```\n");
  }

  // Project Structure
  if (info.srcFiles.length > 0) {
    lines.push("## Project Structure\n");
    lines.push("```");
    lines.push("src/");
    for (const f of info.srcFiles.slice(0, 20)) {
      const depth = f.split("/").length - 1;
      const indent = "  ".repeat(depth);
      const name = path.basename(f);
      lines.push(`${indent}${depth > 0 ? "├── " : "├── "}${name}`);
    }
    if (info.srcFiles.length > 20) {
      lines.push(`  ... and ${info.srcFiles.length - 20} more files`);
    }
    lines.push("```\n");
  }

  // API / Exports
  if (info.entryPoint && !Object.keys(info.bin).length) {
    lines.push("## API\n");
    lines.push("```typescript");
    lines.push(`import pkg from "${info.name}";`);
    lines.push("```\n");
  }

  // Dependencies
  if (info.dependencies.length > 0) {
    lines.push("## Dependencies\n");
    lines.push("| Package | Purpose |");
    lines.push("|---------|---------|");
    for (const dep of info.dependencies) {
      lines.push(`| \`${dep}\` | |`);
    }
    lines.push("");
  }

  // Scripts
  if (Object.keys(info.scripts).length > 0) {
    lines.push("## Scripts\n");
    lines.push("| Script | Command |");
    lines.push("|--------|---------|");
    for (const [name, cmd] of Object.entries(info.scripts)) {
      lines.push(`| \`npm run ${name}\` | \`${cmd}\` |`);
    }
    lines.push("");
  }

  // Contributing
  lines.push("## Contributing\n");
  lines.push("Contributions are welcome! Here's how to get started:\n");
  lines.push("1. Fork the repository");
  lines.push("2. Create your feature branch (`git checkout -b feature/amazing-feature`)");
  lines.push("3. Commit your changes (`git commit -m 'feat: add amazing feature'`)");
  lines.push("4. Push to the branch (`git push origin feature/amazing-feature`)");
  lines.push("5. Open a Pull Request\n");

  // License
  lines.push("## License\n");
  lines.push(`This project is licensed under the ${info.license} License. See the [LICENSE](LICENSE) file for details.\n`);

  // Author
  if (info.author) {
    lines.push("---\n");
    lines.push(`Built by **${info.author}**\n`);
  }

  return lines.join("\n");
}

// ── Update Mode ──
function extractCustomSections(existing: string): Map<string, string> {
  const sections = new Map<string, string>();
  const customMarker = "<!-- custom:";
  const endMarker = "<!-- /custom -->";

  let pos = 0;
  while (pos < existing.length) {
    const start = existing.indexOf(customMarker, pos);
    if (start === -1) break;
    const nameEnd = existing.indexOf("-->", start);
    if (nameEnd === -1) break;
    const name = existing.slice(start + customMarker.length, nameEnd).trim();
    const end = existing.indexOf(endMarker, nameEnd);
    if (end === -1) break;
    sections.set(name, existing.slice(nameEnd + 3, end));
    pos = end + endMarker.length;
  }
  return sections;
}

function injectCustomSections(readme: string, sections: Map<string, string>): string {
  for (const [name, content] of sections) {
    const marker = `<!-- custom: ${name} -->`;
    const endMarker = "<!-- /custom -->";
    // Append custom sections before the License section
    const licenseIdx = readme.indexOf("## License");
    if (licenseIdx !== -1) {
      readme =
        readme.slice(0, licenseIdx) +
        `${marker}\n${content}${endMarker}\n\n` +
        readme.slice(licenseIdx);
    } else {
      readme += `\n${marker}\n${content}${endMarker}\n`;
    }
  }
  return readme;
}

// ── Main ──
function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  const targetDir = path.resolve(args.dir);

  if (!fs.existsSync(targetDir)) {
    console.error(`${c.red}${c.bold}Error:${c.reset} Directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log(BANNER);
  console.log(`${c.blue}Analyzing${c.reset} ${c.bold}${targetDir}${c.reset}...\n`);

  const info = analyzeProject(targetDir);

  // JSON output mode
  if (args.json) {
    const output = JSON.stringify(info, null, 2);
    if (args.dryRun) {
      console.log(output);
    } else {
      const outPath = path.join(targetDir, args.output.replace(/\.md$/, ".json"));
      fs.writeFileSync(outPath, output, "utf-8");
      console.log(`${c.green}${c.bold}Done!${c.reset} JSON written to ${c.cyan}${outPath}${c.reset}`);
    }
    process.exit(0);
  }

  // Generate README
  let readme =
    args.style === "minimal" ? generateMinimal(info) : generateDetailed(info);

  // Update mode: preserve custom sections
  const outPath = path.join(targetDir, args.output);
  if (args.update && fs.existsSync(outPath)) {
    console.log(`${c.yellow}Update mode:${c.reset} preserving custom sections...`);
    const existing = fs.readFileSync(outPath, "utf-8");
    const custom = extractCustomSections(existing);
    if (custom.size > 0) {
      console.log(`  Found ${c.cyan}${custom.size}${c.reset} custom section(s)`);
      readme = injectCustomSections(readme, custom);
    }
  }

  // Print analysis summary
  console.log(`${c.bold}Project:${c.reset}     ${c.green}${info.name}${c.reset} v${info.version}`);
  if (info.description) console.log(`${c.bold}Description:${c.reset} ${info.description}`);
  if (info.frameworks.length) console.log(`${c.bold}Frameworks:${c.reset}  ${c.magenta}${info.frameworks.join(", ")}${c.reset}`);
  if (info.languages.length) console.log(`${c.bold}Languages:${c.reset}   ${c.cyan}${info.languages.join(", ")}${c.reset}`);
  console.log(`${c.bold}Dependencies:${c.reset} ${info.dependencies.length} prod, ${info.devDependencies.length} dev`);
  console.log(`${c.bold}Source files:${c.reset} ${info.srcFiles.length} in src/`);
  console.log(`${c.bold}Style:${c.reset}       ${c.yellow}${args.style}${c.reset}`);
  console.log("");

  if (args.dryRun) {
    console.log(`${c.yellow}${c.bold}DRY RUN${c.reset} - Preview:\n`);
    console.log(c.dim + "─".repeat(60) + c.reset);
    console.log(readme);
    console.log(c.dim + "─".repeat(60) + c.reset);
    console.log(`\n${c.yellow}No files written.${c.reset} Remove --dry-run to write.`);
  } else {
    fs.writeFileSync(outPath, readme, "utf-8");
    console.log(`${c.green}${c.bold}Done!${c.reset} README written to ${c.cyan}${outPath}${c.reset}`);
    console.log(`  ${c.dim}${readme.split("\n").length} lines, ${readme.length} bytes${c.reset}`);
  }
}

main();
