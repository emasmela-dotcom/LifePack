#!/bin/bash
set -e

ZIP_URL="https://www.life-pack365.com/lifepack-tools.zip"
DEST_DIR="$HOME/LifePack"

mkdir -p "$DEST_DIR"
ZIP_PATH="$DEST_DIR/lifepack-tools.zip"

echo "Downloading LifePack ZIP..."
curl -L "$ZIP_URL" -o "$ZIP_PATH"

echo "Extracting..."
unzip -o "$ZIP_PATH" -d "$DEST_DIR" >/dev/null

echo "Done. Opening your app..."
open "$DEST_DIR/index.html" || true
