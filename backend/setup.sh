#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
echo "Done. Activate with: source venv/bin/activate"
