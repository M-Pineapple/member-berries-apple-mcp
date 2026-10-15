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
