const fs = require("fs");
const path = require("path");

const target = path.join(
  process.cwd(),
  "node_modules",
  "brace-expansion",
  "dist",
  "commonjs",
  "index.js"
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");

if (source.includes("module.exports = compat")) {
  process.exit(0);
}

const patch = `\n\n// Compatibility shim for older CommonJS consumers (e.g. minimatch@3)
if (typeof module !== "undefined" && module.exports && typeof module.exports !== "function") {
  const compat = expand;
  compat.expand = expand;
  compat.EXPANSION_MAX = exports.EXPANSION_MAX;
  compat.EXPANSION_MAX_LENGTH = exports.EXPANSION_MAX_LENGTH;
  module.exports = compat;
}\n`;

fs.writeFileSync(target, source + patch, "utf8");
