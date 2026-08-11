"use strict";

// Golden-hash test: asserts calculateBlockHash() here matches the shared
// fixtures in hash/fixtures.json. The exact same fixtures are also checked
// against frontend/src/chainVerify.js and hash/hashverify.py — all three
// canonicalization implementations must agree byte-for-byte on the same
// input. Run with: node backend/services/blockchainService.hash.test.js

const assert = require("node:assert/strict");
const path = require("node:path");
const { calculateBlockHash } = require("./blockchainService");

const fixtures = require(path.join(__dirname, "..", "..", "hash", "fixtures.json"));

let passed = 0;

for (const { block, expected_hash } of fixtures) {
  const actual = calculateBlockHash(block);
  assert.equal(actual, expected_hash, `block #${block.index}: expected ${expected_hash}, got ${actual}`);
  passed += 1;
}

console.log(`backend blockchainService.js: ${passed}/${fixtures.length} fixtures matched.`);
