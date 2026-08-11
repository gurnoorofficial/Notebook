#!/usr/bin/env python3
"""
Golden-hash test: asserts calculate_block_hash() in hashverify.py matches
the shared fixtures in fixtures.json. The exact same fixtures are also
checked against backend/services/blockchainService.js and
frontend/src/chainVerify.js -- all three canonicalization implementations
must agree byte-for-byte on the same input.

Run with: python3 hash/test_fixtures.py
"""

import json
import os
import sys

from hashverify import calculate_block_hash

FIXTURES_PATH = os.path.join(os.path.dirname(__file__), "fixtures.json")


def main():
    with open(FIXTURES_PATH, "r", encoding="utf-8") as handle:
        fixtures = json.load(handle)

    failures = 0

    for fixture in fixtures:
        block = fixture["block"]
        expected_hash = fixture["expected_hash"]
        actual_hash = calculate_block_hash(block)

        if actual_hash.lower() != expected_hash.lower():
            failures += 1
            print(
                f"block #{block['index']}: MISMATCH "
                f"(expected {expected_hash}, got {actual_hash})"
            )

    passed = len(fixtures) - failures
    print(f"hash/hashverify.py: {passed}/{len(fixtures)} fixtures matched.")

    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
