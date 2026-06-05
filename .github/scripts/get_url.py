#!/usr/bin/env python3
import json, sys
with open('/tmp/endpoints.json') as f:
    rows = json.load(f)
for row in rows:
    v = row.get('ingress_url') or row.get('INGRESS_URL') or ''
    if v:
        print(v)
        break