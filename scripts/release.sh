#!/usr/bin/env bash
# Create a GitHub release from the changelogs: English section, German section and the support footer.
#
#   scripts/release.sh 2.3.1             # shows the notes and asks before creating the release
#   scripts/release.sh 2.3.1 --dry-run   # only prints the notes
#
# Needs the section "## <version> – <date>" in CHANGELOG.en.md and CHANGELOG.md, the same version in
# custom_components/proxon_modbus/manifest.json, and the commit pushed with green checks.
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:?usage: scripts/release.sh <version> [--dry-run]}"
dry="${2:-}"

section() { # file, version -> the section of that version without the next "## " heading
  awk -v v="## $2 " 'index($0, v) == 1 { on = 1; print; next } on && /^## / { exit } on { print }' "$1"
}

en="$(section CHANGELOG.en.md "$version")"
de="$(section CHANGELOG.md "$version")"
[ -n "$en" ] && [ -n "$de" ] || { echo "No section '## $version' in both changelogs." >&2; exit 1; }
grep -q "\"version\": \"$version\"" custom_components/proxon_modbus/manifest.json \
  || { echo "manifest.json is not on version $version." >&2; exit 1; }

notes="$(printf '# English\n\n%s\n\n# Deutsch\n\n%s\n%s\n' "$en" "$de" "$(cat .github/release-footer.md)")"

printf '%s\n' "$notes"
[ "$dry" = "--dry-run" ] && exit 0

[ -z "$(git status --porcelain)" ] || { echo "Uncommitted changes." >&2; exit 1; }
git fetch -q origin
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "HEAD is not origin/main: push first." >&2; exit 1; }
read -r -p "Create release v$version on $(git rev-parse --short HEAD)? [y/N] " answer
[ "$answer" = "y" ] || exit 1
gh release create "v$version" --target main --title "v$version" --notes "$notes"
