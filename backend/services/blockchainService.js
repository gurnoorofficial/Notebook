"use strict";

const { verifyMessage, keccak256, toUtf8Bytes } = require("ethers");

const {
  readBlockchain,
  writeBlockchain,
  readFingerprint,
  writeFingerprint,
} = require("../utils/blockchainStore");

const { buildMerkleRoot } = require("./merkleTree");

const CURRENT_SCHEMA_VERSION = "2.0";

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

function stripHexPrefix(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

function withHexPrefix(value) {
  return "0x" + stripHexPrefix(value);
}

function extractSignatureValue(signature) {
  if (typeof signature === "string") {
    return signature;
  }

  if (signature && typeof signature === "object" && typeof signature.value === "string") {
    return signature.value;
  }

  return null;
}

function normalizeMessage(message) {
  if (typeof message !== "string") {
    return "";
  }

  return message
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value !== null && typeof value === "object") {
    const sortedObject = {};

    for (const key of Object.keys(value).sort()) {
      sortedObject[key] = sortJsonValue(value[key]);
    }

    return sortedObject;
  }

  return value;
}

function escapeNonAsciiCharacters(text) {
  return text.replace(/[^\x00-\x7F]/gu, (character) => {
    const codePoint = character.codePointAt(0);

    if (codePoint <= 0xffff) {
      return "\\u" + codePoint.toString(16).padStart(4, "0");
    }

    const adjusted = codePoint - 0x10000;
    const highSurrogate = 0xd800 + (adjusted >> 10);
    const lowSurrogate = 0xdc00 + (adjusted & 0x3ff);

    return (
      "\\u" +
      highSurrogate.toString(16).padStart(4, "0") +
      "\\u" +
      lowSurrogate.toString(16).padStart(4, "0")
    );
  });
}

function canonicalJson(value) {
  const sortedValue = sortJsonValue(value);
  const compactJson = JSON.stringify(sortedValue);

  return escapeNonAsciiCharacters(compactJson);
}

function getBlockDataForHash(block) {
  const blockData = {
    ...block,
  };

  delete blockData.hash;

  return blockData;
}

function calculateBlockHash(block) {
  const blockData = getBlockDataForHash(block);
  const canonicalBlock = canonicalJson(blockData);

  return keccak256(toUtf8Bytes(canonicalBlock)).slice(2);
}

function getLatestStoredHash(blockchain) {
  if (!blockchain || !Array.isArray(blockchain.chain) || blockchain.chain.length === 0) {
    return null;
  }

  const latestBlock = blockchain.chain[blockchain.chain.length - 1];

  if (!latestBlock || typeof latestBlock.hash !== "string" || !latestBlock.hash.trim()) {
    return null;
  }

  return latestBlock.hash.trim().toLowerCase();
}

function verifyStoredFingerprint(blockchain) {
  if (blockchain.chain.length === 0) {
    return {
      valid: true,
      created: false,
      fingerprint: null,
    };
  }

  const currentFingerprint = getLatestStoredHash(blockchain);

  if (!currentFingerprint) {
    return {
      valid: false,
      created: false,
      error: "Latest block hash is missing.",
    };
  }

  const storedFingerprint = readFingerprint();

  if (!storedFingerprint) {
    writeFingerprint(currentFingerprint);

    return {
      valid: true,
      created: true,
      fingerprint: currentFingerprint,
    };
  }

  if (storedFingerprint.toLowerCase() !== currentFingerprint.toLowerCase()) {
    return {
      valid: false,
      created: false,
      storedFingerprint,
      currentFingerprint,
    };
  }

  return {
    valid: true,
    created: false,
    fingerprint: currentFingerprint,
  };
}

function verifyBlockSignature(block) {
  const signatureValue = extractSignatureValue(block.signature);

  if (
    typeof block.message !== "string" ||
    typeof signatureValue !== "string" ||
    typeof block.eth_address !== "string"
  ) {
    return {
      valid: false,
      error: "Missing message, signature or Ethereum address.",
    };
  }

  try {
    const recoveredAddress = verifyMessage(block.message, signatureValue);

    const valid = recoveredAddress.toLowerCase() === block.eth_address.toLowerCase();

    return {
      valid,
      recoveredAddress,
      error: valid ? null : "Recovered Ethereum address does not match.",
    };
  } catch {
    return {
      valid: false,
      error: "Ethereum signature is invalid.",
    };
  }
}

function validateChain(blockchain, options = {}) {
  const { checkFingerprint = true } = options;

  if (!blockchain || !Array.isArray(blockchain.chain)) {
    return {
      valid: false,
      totalBlocks: 0,
      messages: ["Invalid notebook structure."],
    };
  }

  const messages = [];
  let valid = true;

  for (let index = 0; index < blockchain.chain.length; index += 1) {
    const block = blockchain.chain[index];

    if (!block || typeof block !== "object") {
      valid = false;
      messages.push(`Block #${index}: block is not an object.`);
      continue;
    }

    if (block.index !== index) {
      valid = false;
      messages.push(`Block #${index}: stored index does not match its chain position.`);
    }

    const expectedPreviousHash =
      index === 0 ? GENESIS_PREVIOUS_HASH : stripHexPrefix(blockchain.chain[index - 1].hash);

    const previousHashMatches = stripHexPrefix(block.previous_hash) === expectedPreviousHash;

    if (!previousHashMatches) {
      valid = false;
      messages.push(`Block #${index}: previous hash does not match.`);
    }

    const expectedCurrentHash = calculateBlockHash(block);
    const currentHashMatches = stripHexPrefix(block.hash) === expectedCurrentHash;

    if (!currentHashMatches) {
      valid = false;
      messages.push(`Block #${index}: current hash is invalid.`);
    }

    const signatureResult = verifyBlockSignature(block);

    if (!signatureResult.valid) {
      valid = false;
      messages.push(`Block #${index}: ${signatureResult.error}`);
    }

    let merkleRootValid = true;

    if (typeof block.merkle_root === "string") {
      const priorHashes = blockchain.chain
        .slice(0, index)
        .map((priorBlock) => stripHexPrefix(priorBlock.hash));
      const expectedMerkleRoot = buildMerkleRoot(priorHashes);

      merkleRootValid = stripHexPrefix(block.merkle_root) === expectedMerkleRoot;

      if (!merkleRootValid) {
        valid = false;
        messages.push(`Block #${index}: merkle_root does not match the blocks before it.`);
      }
    }

    if (
      block.index === index &&
      previousHashMatches &&
      currentHashMatches &&
      signatureResult.valid &&
      merkleRootValid
    ) {
      messages.push(`Block #${index}: valid.`);
    }
  }

  if (valid && checkFingerprint) {
    const fingerprintResult = verifyStoredFingerprint(blockchain);

    if (!fingerprintResult.valid) {
      valid = false;
      messages.push(
        "Chain fingerprint mismatch. The notebook file may have been replaced, rolled back or modified."
      );
    } else if (fingerprintResult.created) {
      messages.push("Chain fingerprint created from latest block Keccak-256 hash.");
    } else if (blockchain.chain.length > 0) {
      messages.push("Chain fingerprint matches latest block hash.");
    }
  }

  return {
    valid,
    totalBlocks: blockchain.chain.length,
    messages,
  };
}

function loadVerifiedBlockchain() {
  const blockchain = readBlockchain();
  const validation = validateChain(blockchain);

  if (!validation.valid) {
    throw new Error(`Notebook integrity check failed: ${validation.messages.join(" ")}`);
  }

  return blockchain;
}

function currentTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function addBlock({ message, signature }) {
  const normalizedMessage = normalizeMessage(message);

  const normalizedSignature = typeof signature === "string" ? signature.trim() : "";

  if (!normalizedMessage) {
    throw new Error("Message is required.");
  }

  if (!normalizedSignature) {
    throw new Error("Signature is required.");
  }

  let recoveredAddress;

  try {
    recoveredAddress = verifyMessage(normalizedMessage, normalizedSignature);
  } catch {
    throw new Error("Invalid Ethereum signature.");
  }

  const blockchain = loadVerifiedBlockchain();

  const previousHash =
    blockchain.chain.length === 0
      ? GENESIS_PREVIOUS_HASH
      : stripHexPrefix(blockchain.chain[blockchain.chain.length - 1].hash);

  const merkleRoot = buildMerkleRoot(
    blockchain.chain.map((block) => stripHexPrefix(block.hash))
  );

  const newBlock = {
    schema_version: CURRENT_SCHEMA_VERSION,
    index: blockchain.chain.length,
    previous_hash: withHexPrefix(previousHash),
    merkle_root: merkleRoot === null ? null : withHexPrefix(merkleRoot),
    message: normalizedMessage,
    message_encoding: "utf-8",
    eth_address: recoveredAddress.toLowerCase(),
    signature: {
      scheme: "secp256k1",
      value: normalizedSignature,
    },
    timestamp: currentTimestamp(),
  };

  newBlock.hash = withHexPrefix(calculateBlockHash(newBlock));

  blockchain.chain.push(newBlock);

  const validation = validateChain(blockchain, {
    checkFingerprint: false,
  });

  if (!validation.valid) {
    throw new Error(`New block validation failed: ${validation.messages.join(" ")}`);
  }

  writeBlockchain(blockchain);

  // Fingerprint is exactly the latest block's Keccak-256 hash.
  writeFingerprint(newBlock.hash);

  return newBlock;
}

function getChain() {
  return loadVerifiedBlockchain();
}

module.exports = {
  GENESIS_PREVIOUS_HASH,
  normalizeMessage,
  canonicalJson,
  calculateBlockHash,
  validateChain,
  loadVerifiedBlockchain,
  addBlock,
  getChain,
};
