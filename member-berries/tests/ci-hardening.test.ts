import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const wf = readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8");

test("CI workflow sets a read-only token permission", () => {
  expect(wf).toMatch(/^permissions:\s*\n\s+contents:\s*read/m);
});

test("CI actions are pinned to full commit SHAs", () => {
  const uses = [...wf.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]);
  expect(uses.length).toBeGreaterThan(0);
  for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/);
});

const pub = readFileSync(join(import.meta.dir, "../../.github/workflows/publish.yml"), "utf8");
const pkg = JSON.parse(readFileSync(join(import.meta.dir, "../package.json"), "utf8"));

test("publish workflow uses OIDC, provenance and SHA-pinned actions", () => {
  expect(pub).toMatch(/^permissions:\s*\n\s+id-token:\s*write\s*\n\s+contents:\s*read/m);
  expect(pub).toContain("npm publish --provenance --access public");
  expect(pub).not.toContain("NPM_TOKEN");
  const uses = [...pub.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]);
  expect(uses.length).toBeGreaterThan(0);
  for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/);
});

test("package ships compiled JS for Node, not TypeScript", () => {
  expect(pkg.bin["member-berries-mcp"]).toBe("./dist/index.js");
  expect(pkg.main).toBe("./dist/index.js");
  expect(pkg.files).toContain("dist");
  expect(pkg.repository.url).toBe("git+https://github.com/M-Pineapple/member-berries-apple-mcp.git");
});
