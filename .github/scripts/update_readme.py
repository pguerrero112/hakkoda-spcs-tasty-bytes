#!/usr/bin/env python3
"""Update README.md with the current live app URL."""
import json
import re
import sys

url = sys.argv[1] if len(sys.argv) > 1 else ""

if not url:
    print("No URL provided, skipping README update")
    sys.exit(0)

full_url = f"https://{url}" if not url.startswith("http") else url

with open("README.md") as f:
    content = f.read()

if "> **Live app:**" in content:
    content = re.sub(r"> \*\*Live app:\*\*.*", f"> **Live app:** {full_url}", content)
else:
    content = content.replace(
        "# Tasty Bytes SPCS",
        f"# Tasty Bytes SPCS\n\n> **Live app:** {full_url}",
        1
    )

with open("README.md", "w") as f:
    f.write(content)

print(f"README updated with URL: {full_url}")