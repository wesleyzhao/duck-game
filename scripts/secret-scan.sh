#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---staged}"

REGEX_PCRE='(sk-ant-[A-Za-z0-9_-]{10,}|sk_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{22,}|AIza[0-9A-Za-z\-_]{35}|xox[baprs]-[0-9A-Za-z-]{10,48}|-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----)'
REGEX_ERE='(sk-ant-[A-Za-z0-9_-]{10,}|sk_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|github_pat_[A-Za-z0-9_]{22,}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[0-9A-Za-z-]{10,48}|-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----)'

have_rg=false
if command -v rg >/dev/null 2>&1; then
  have_rg=true
fi

scan_stdin() {
  if $have_rg; then
    rg --pcre2 -n "$REGEX_PCRE" -
  else
    grep -nE "$REGEX_ERE"
  fi
}

scan_staged() {
  local found=0
  while IFS= read -r -d '' file; do
    if ! git show ":$file" >/dev/null 2>&1; then
      continue
    fi
    if git show ":$file" | scan_stdin; then
      echo "Potential secret found in staged file: $file" >&2
      found=1
    fi
  done < <(git diff --cached --name-only -z --diff-filter=ACMR)

  if [ "$found" -ne 0 ]; then
    echo "Commit blocked. Remove secrets or rotate keys before committing." >&2
    return 1
  fi
}

scan_history() {
  local matches
  matches=$(git grep -n -E "$REGEX_ERE" $(git rev-list --all) || true)
  if [ -n "$matches" ]; then
    echo "$matches" >&2
    echo "Potential secrets found in git history. Rotate keys and rewrite history." >&2
    return 1
  fi
}

case "$MODE" in
  --staged)
    scan_staged
    ;;
  --history)
    scan_history
    ;;
  *)
    echo "Usage: $0 [--staged|--history]" >&2
    exit 2
    ;;
esac
