// Golden-hash test: asserts calculateBlockHash() here matches the shared
// fixtures in hash/fixtures.json. The exact same fixtures are also checked
// against backend/services/blockchainService.js and hash/hashverify.py — all
// three canonicalization implementations must agree byte-for-byte on the
// same input. Run with: node frontend/src/chainVerify.hash.test.js

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calculateBlockHash } from "./chainVerify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, "..", "..", "hash", "fixtures.json");
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));

let passed = 0;

for (const { block, expected_hash: expectedHash } of fixtures) {
  const actual = calculateBlockHash(block);
  assert.equal(actual, expectedHash, `block #${block.index}: expected ${expectedHash}, got ${actual}`);
  passed += 1;
}

console.log(`frontend chainVerify.js: ${passed}/${fixtures.length} fixtures matched.`);
