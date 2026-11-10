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
  expect(atLeast(ver(pkg.dependencies["@modelcontextprotocol/sdk"]), [1, 32, 2])).toBe(true);
});

test("lockfile resolves the MCP SDK at or above the floor", () => {
  const m = lock.match(/"@modelcontextprotocol\/sdk@([0-9.]+)"/);
  expect(m).not.toBeNull();
  expect(atLeast(ver(m![1]), [1, 32, 2])).toBe(true);
});

const locked = (name: string) => {
  const m = lock.match(new RegExp(`"${name.replace("/", "\\/")}@([0-9.]+)"`));
  expect(m).not.toBeNull();
  return ver(m![1]);
};

test("zod floor is 4.6.6 or later (GHSA-mrhx-c7xc-m3w5)", () => {
  expect(atLeast(ver(pkg.dependencies.zod), [4, 6, 6])).toBe(true);
  expect(atLeast(locked("zod"), [4, 6, 6])).toBe(true);
});

test("lockfile resolves transitive packages above their advisories", () => {
  expect(atLeast(locked("body-parser"), [2, 4, 0])).toBe(true); // GHSA-27r3-jxmh-p828
  expect(atLeast(locked("fast-uri"), [3, 1, 9])).toBe(true); // GHSA-w74x-v6f9-j3xg and others
  expect(atLeast(locked("qs"), [6, 16, 1])).toBe(true); // GHSA-6pq8-jhm2-2vcw
});

test("package LICENSE and root THIRD_PARTY_NOTICES keep the original author's copyright", () => {
  expect(readFileSync(join(import.meta.dir, "../LICENSE"), "utf8")).toContain("Portions Copyright (c) 2024 Dhravya Shah");
  expect(readFileSync(join(import.meta.dir, "../../THIRD_PARTY_NOTICES.md"), "utf8")).toContain("Copyright (c) 2024 Dhravya Shah");
});
