"use strict";

const { keccak256, toUtf8Bytes } = require("ethers");

function combineHashes(left, right) {
  return keccak256(toUtf8Bytes(left + right)).slice(2);
}

function buildMerkleRoot(hashes) {
  if (!Array.isArray(hashes) || hashes.length === 0) {
    return null;
  }

  let level = hashes.slice();

  while (level.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];

      nextLevel.push(combineHashes(left, right));
    }

    level = nextLevel;
  }

  return level[0];
}

module.exports = {
  buildMerkleRoot,
};
