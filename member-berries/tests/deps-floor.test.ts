import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "../package.json"), "utf8"));
const lock = readFileSync(join(import.meta.dir, "../bun.lock"), "utf8");
const ver = (s: string) => s.replace(/^[^0-9]*/, "").split(".").map(Number);
const atLeast = (a: number[], b: number[]) => {
  for (let i = 0; i < b.length; i++) if ((a[i] ?? 0) !== b[i]) return (a[i] ?? 0) > b[i];
  return true;
};

test("MCP SDK floor excludes versions with known advisories", () => {
  expect(atLeast(ver(pkg.dependencies["@modelcontextprotocol/sdk"]), [1, 32, 1])).toBe(true);
});

test("lockfile resolves the MCP SDK at or above the floor", () => {
  const m = lock.match(/"@modelcontextprotocol\/sdk@([0-9.]+)"/);
  expect(m).not.toBeNull();
  expect(atLeast(ver(m![1]), [1, 32, 1])).toBe(true);
});

test("both LICENSE files keep the original author's copyright", () => {
  for (const p of ["../LICENSE", "../../LICENSE"]) {
    expect(readFileSync(join(import.meta.dir, p), "utf8")).toContain("Portions Copyright (c) 2024 Dhravya Shah");
  }
});
