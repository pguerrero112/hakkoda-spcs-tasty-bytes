#!/usr/bin/env python3
import sys, os

# Try JSON first
try:
    import json
    with open('/tmp/endpoints.json') as f:
        content = f.read().strip()
    print(f"JSON content: {content[:200]}", file=sys.stderr)
    if content and content != '[]':
        rows = json.loads(content)
        if rows:
            print(f"Keys: {list(rows[0].keys())}", file=sys.stderr)
            for row in rows:
                for key, val in row.items():
                    if val and any(x in key.lower() for x in ['url', 'host', 'ingress', 'endpoint']):
                        print(f"Found {key}={val}", file=sys.stderr)
                        print(val)
                        sys.exit(0)
except Exception as e:
    print(f"JSON error: {e}", file=sys.stderr)

# Try CSV
try:
    with open('/tmp/endpoints.csv') as f:
        lines = f.readlines()
    print(f"CSV lines: {lines}", file=sys.stderr)
    for line in lines[1:]:  # skip header
        parts = [p.strip() for p in line.split(',')]
        for part in parts:
            if '.snowflakecomputing.app' in part:
                print(part.strip('"'))
                sys.exit(0)
except Exception as e:
    print(f"CSV error: {e}", file=sys.stderr)

print("Could not extract URL", file=sys.stderr)