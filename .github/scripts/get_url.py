#!/usr/bin/env python3
import json, sys

with open('/tmp/endpoints.json') as f:
    content = f.read()

print("RAW JSON:", content, file=sys.stderr)

try:
    rows = json.loads(content)
    if rows:
        print("KEYS:", list(rows[0].keys()), file=sys.stderr)
        for row in rows:
            for key, val in row.items():
                if val and ('url' in key.lower() or 'endpoint' in key.lower() or 'host' in key.lower()):
                    print(f"FOUND {key}={val}", file=sys.stderr)
                    print(val)
                    sys.exit(0)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)