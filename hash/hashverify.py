#!/usr/bin/env python3
"""
Verify a notebook block's hash.

Recomputes the block hash the same way backend/services/blockchainService.js
does (drop "hash", recursively sort keys, compact JSON, escape non-ASCII,
Keccak-256) and compares it against the "hash" field stored in the block.

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


def read_json_input() -> str:
    path_input = input(
        "Enter path to a .txt file with the block JSON, "
        "or press Enter to paste the JSON directly: "
    ).strip()

    if path_input:
        if not os.path.isfile(path_input):
            sys.exit(f"File not found: {path_input}")

        with open(path_input, "r", encoding="utf-8") as handle:
            return handle.read()

    print("Paste the block JSON below, then press Enter on a blank line (or Ctrl+D) when done:")

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


def verify_block(block: dict, label: str) -> bool:
    expected_hash = str(block.get("hash", "")).strip()
    actual_hash = calculate_block_hash(block)
    matched = expected_hash.lower() == actual_hash.lower()

    print(f"\n{label}")
    print(f"  Expected hash: {expected_hash or '(missing)'}")
    print(f"  Actual hash:   {actual_hash}")
    print(f"  Result:        {'MATCH ✓' if matched else 'MISMATCH ✗'}")

    return matched


def main():
    raw = read_json_input()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        sys.exit(f"Invalid JSON: {error}")

    if isinstance(data, list):
        results = [
            verify_block(block, f"Block #{block.get('index', index)}")
            for index, block in enumerate(data)
        ]

        print(f"\n{sum(results)}/{len(results)} blocks verified successfully.")

        if not all(results):
            sys.exit(1)
    elif isinstance(data, dict):
        if not verify_block(data, f"Block #{data.get('index', '?')}"):
            sys.exit(1)
    else:
        sys.exit("Input must be a block object or a list of blocks.")


if __name__ == "__main__":
    main()
