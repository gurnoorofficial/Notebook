import { keccak256, toUtf8Bytes, verifyMessage } from "ethers";

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

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

function calculateBlockHash(block) {
  const blockData = { ...block };

  delete blockData.hash;

  const canonicalBlock = canonicalJson(blockData);

  return keccak256(toUtf8Bytes(canonicalBlock)).slice(2);
}

function verifyBlockSignature(block) {
  if (
    typeof block.message !== "string" ||
    typeof block.signature !== "string" ||
    typeof block.eth_address !== "string"
  ) {
    return { valid: false };
  }

  try {
    const recoveredAddress = verifyMessage(block.message, block.signature);

    return { valid: recoveredAddress.toLowerCase() === block.eth_address.toLowerCase() };
  } catch {
    return { valid: false };
  }
}

/**
 * Recomputes hash + previous-hash linkage + signature validity for each block,
 * client-side, using the exact same canonicalization the backend uses. Returns
 * a Map keyed by block index so callers can look up per-entry status without
 * re-deriving the whole chain.
 */
export function verifyChain(blocks) {
  const sorted = [...blocks].sort((a, b) => a.index - b.index);
  const results = new Map();

  for (let i = 0; i < sorted.length; i += 1) {
    const block = sorted[i];
    const expectedPreviousHash = i === 0 ? GENESIS_PREVIOUS_HASH : sorted[i - 1].hash;

    const linkValid = block.previous_hash === expectedPreviousHash;
    const hashValid = block.hash === calculateBlockHash(block);
    const signatureValid = verifyBlockSignature(block).valid;

    results.set(block.index, {
      valid: linkValid && hashValid && signatureValid,
      linkValid,
      hashValid,
      signatureValid,
    });
  }

  return results;
}
