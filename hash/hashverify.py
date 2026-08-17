#!/usr/bin/env python3
"""
Verify a Notebook blockchain.json (or a single block / bare block array)
offline, independent of the running app.

Input: either a path to a blockchain.json file, or the JSON pasted directly
(the full { "chain": [...] } export, a bare [block, ...] array, or a single
block object all work).

For every block this recomputes the hash the same way
backend/services/blockchainService.js does (drop "hash", recursively sort
keys, compact JSON, escape non-ASCII, Keccak-256) and compares it against
the block's own "hash" field, and checks that "previous_hash" correctly
links to the prior block's hash.

Run directly with python3:
    python3 hash/hashverify.py
"""

import json
import os
import sys

try:
    from Crypto.Hash import keccak
except ImportError:
    try:
        from Cryptodome.Hash import keccak
    except ImportError:
        sys.exit(
            "Missing dependency 'pycryptodome'.\n"
            "Install it with: sudo apt install python3-pycryptodome\n"
            "or: pip install --user --break-system-packages pycryptodome"
        )

GENESIS_PREVIOUS_HASH = "0" * 64


def sort_json_value(value):
    if isinstance(value, list):
        return [sort_json_value(item) for item in value]

    if isinstance(value, dict):
        return {key: sort_json_value(value[key]) for key in sorted(value.keys())}

    return value


def canonical_json(value):
    sorted_value = sort_json_value(value)
    return json.dumps(sorted_value, separators=(",", ":"), ensure_ascii=True)


def keccak256_hex(data: bytes) -> str:
    return keccak.new(digest_bits=256, data=data).hexdigest()


def calculate_block_hash(block: dict) -> str:
    block_data = dict(block)
    block_data.pop("hash", None)
    canonical = canonical_json(block_data)
    return keccak256_hex(canonical.encode("utf-8"))


def strip_hex_prefix(value: str) -> str:
    return value[2:] if value[:2].lower() == "0x" else value


def read_json_input() -> str:
    path_input = input(
        "Enter path to blockchain.json, or press Enter to paste the JSON directly: "
    ).strip()

    if path_input:
        if not os.path.isfile(path_input):
            sys.exit(f"File not found: {path_input}")

        with open(path_input, "r", encoding="utf-8") as handle:
            return handle.read()

    print("Paste the JSON below, then press Enter on a blank line (or Ctrl+D) when done:")

    lines = []

    while True:
        try:
            line = input()
        except EOFError:
            break

        if line.strip() == "" and lines:
            break

        lines.append(line)

    return "\n".join(lines)


def extract_blocks(data):
    if isinstance(data, dict) and isinstance(data.get("chain"), list):
        return data["chain"]

    if isinstance(data, list):
        return data

    if isinstance(data, dict) and "hash" in data:
        return [data]

    sys.exit(
        "Could not find a block to verify. Expected a blockchain.json "
        '(an object with a "chain" array), a bare array of blocks, or a '
        "single block object."
    )


def verify_block(block: dict, previous_block) -> bool:
    index = block.get("index", "?")
    expected_hash = str(block.get("hash", "")).strip()
    actual_hash = calculate_block_hash(block)
    expected_hash_normalized = strip_hex_prefix(expected_hash) if expected_hash else expected_hash
    hash_matches = expected_hash_normalized.lower() == actual_hash.lower()

    print(f"\nBlock #{index}")
    print(f"  Expected hash: {expected_hash or '(missing)'}")
    print(f"  Actual hash:   0x{actual_hash}")
    print(f"  Hash:          {'MATCH ✓' if hash_matches else 'MISMATCH ✗'}")

    previous_hash = str(block.get("previous_hash", "")).strip()
    previous_hash_normalized = strip_hex_prefix(previous_hash)

    if previous_block is None:
        link_matches = previous_hash_normalized.lower() == GENESIS_PREVIOUS_HASH
        print(f"  Chain link:    {'MATCH (genesis) ✓' if link_matches else 'MISMATCH ✗'}")
    else:
        expected_previous_hash = strip_hex_prefix(str(previous_block.get("hash", "")).strip())
        link_matches = previous_hash_normalized.lower() == expected_previous_hash.lower()
        print(f"  Chain link:    {'MATCH ✓' if link_matches else 'MISMATCH ✗'}")

    return hash_matches and link_matches


def main():
    raw = read_json_input()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        sys.exit(f"Invalid JSON: {error}")

    blocks = extract_blocks(data)

    if not blocks:
        sys.exit("No blocks found to verify.")

    results = []
    previous_block = None

    for block in blocks:
        results.append(verify_block(block, previous_block))
        previous_block = block

    passed = sum(results)
    print(f"\n{passed}/{len(results)} blocks verified successfully.")

    if not all(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
