"use strict";

// Unit tests for buildMerkleRoot(). Run with: node backend/services/merkleTree.test.js

const assert = require("node:assert/strict");
const { keccak256, toUtf8Bytes } = require("ethers");
const { buildMerkleRoot } = require("./merkleTree");

function combine(left, right) {
  return keccak256(toUtf8Bytes(left + right)).slice(2);
}

// Empty chain (e.g. block #0) has no prior blocks to summarize.
assert.equal(buildMerkleRoot([]), null);

// A single prior block: the root is just that block's own hash.
assert.equal(buildMerkleRoot(["aaaa"]), "aaaa");

// Two prior blocks: root is the direct combination of both.
assert.equal(buildMerkleRoot(["aaaa", "bbbb"]), combine("aaaa", "bbbb"));

// Three prior blocks: odd one out gets paired with itself at that level.
const abcExpected = combine(combine("aaaa", "bbbb"), combine("cccc", "cccc"));
assert.equal(buildMerkleRoot(["aaaa", "bbbb", "cccc"]), abcExpected);

// Four prior blocks: a clean two-level tree.
const abcdExpected = combine(combine("aaaa", "bbbb"), combine("cccc", "dddd"));
assert.equal(buildMerkleRoot(["aaaa", "bbbb", "cccc", "dddd"]), abcdExpected);

console.log("merkleTree.js: 5/5 checks passed.");
