#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="App"
WORKSPACE="$ROOT/ios/App/App.xcodeproj"
ARCHIVE_PATH="$ROOT/ios/build/Flagfield.xcarchive"
EXPORT_PATH="$ROOT/ios/build/export"
EXPORT_OPTIONS="$ROOT/ios/ExportOptions.plist"

echo "==> Angular + Capacitor sync (production-local)"
npm run cap:sync:release

echo "==> Xcode archive (Release, generic iOS)"
xcodebuild \
  -project "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  archive

echo "==> Export IPA for App Store Connect"
rm -rf "$EXPORT_PATH"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo ""
echo "Done. Upload via Transporter or:"
echo "  xcrun altool --upload-app -f \"$EXPORT_PATH/App.ipa\" -t ios --apiKey YOUR_KEY --apiIssuer YOUR_ISSUER"
echo "Or open Xcode: Window → Organizer → Distribute App"
