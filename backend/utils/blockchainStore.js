"use strict";

const fs = require("fs");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");
const blockchainPath = path.join(dataDirectory, "blockchain.json");
const fingerprintPath = path.join(dataDirectory, "chain_fingerprint.txt");

function createEmptyBlockchain() {
  return {
    chain: [],
  };
}

function ensureDataDirectory() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, {
      recursive: true,
    });
  }
}

function ensureBlockchainFile() {
  ensureDataDirectory();

  if (!fs.existsSync(blockchainPath)) {
    fs.writeFileSync(
      blockchainPath,
      JSON.stringify(createEmptyBlockchain(), null, 2),
      "utf8"
    );
  }
}

function readBlockchain() {
  ensureBlockchainFile();

  const rawData = fs.readFileSync(blockchainPath, "utf8");

  if (!rawData.trim()) {
    throw new Error("blockchain.json is empty.");
  }

  let blockchain;

  try {
    blockchain = JSON.parse(rawData);
  } catch {
    throw new Error("blockchain.json contains invalid JSON.");
  }

  if (Array.isArray(blockchain)) {
    blockchain = {
      chain: blockchain,
    };
  }

  if (!blockchain || !Array.isArray(blockchain.chain)) {
    throw new Error(
      'Invalid blockchain format. Expected { "chain": [] }.'
    );
  }

  return blockchain;
}

function writeBlockchain(blockchain) {
  if (!blockchain || !Array.isArray(blockchain.chain)) {
    throw new Error("Cannot save invalid blockchain data.");
  }

  ensureDataDirectory();

  const temporaryPath = `${blockchainPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(blockchain, null, 2),
    "utf8"
  );

  fs.renameSync(temporaryPath, blockchainPath);
}

function readFingerprint() {
  ensureDataDirectory();

  if (!fs.existsSync(fingerprintPath)) {
    return null;
  }

  const fingerprint = fs.readFileSync(fingerprintPath, "utf8").trim();

  return fingerprint || null;
}

function writeFingerprint(fingerprint) {
  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    throw new Error("Cannot save an empty chain fingerprint.");
  }

  ensureDataDirectory();

  const temporaryPath = `${fingerprintPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    fingerprint.trim().toLowerCase(),
    "utf8"
  );

  fs.renameSync(temporaryPath, fingerprintPath);
}

function deleteFingerprint() {
  if (fs.existsSync(fingerprintPath)) {
    fs.unlinkSync(fingerprintPath);
  }
}

module.exports = {
  blockchainPath,
  fingerprintPath,
  readBlockchain,
  writeBlockchain,
  readFingerprint,
  writeFingerprint,
  deleteFingerprint,
};
