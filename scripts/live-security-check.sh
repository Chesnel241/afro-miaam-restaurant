#!/usr/bin/env bash
# =============================================================================
# Afro Miaam — Live (non-destructive) production security check
# =============================================================================
# Usage:   bash scripts/live-security-check.sh [https://afromiaam.com]
#
# SAFE BY DESIGN: read-only HTTP(S) probes only. No order creation, no auth
# brute-force, no fuzzing, no load. Just verifies that the defenses present in
# the source code are actually live in production (headers, CSP, TLS, cookies,
# exposed files, redirects, the /__/auth proxy).
# =============================================================================
set -u
BASE="${1:-https://afromiaam.com}"
HOST="$(printf '%s' "$BASE" | sed -E 's#^https?://##; s#/.*$##')"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
CURL=(curl -sS -m 25 -A "$UA")

pass(){ printf "  \033[32m✓ PASS\033[0m  %s\n" "$1"; }
warn(){ printf "  \033[33m⚠ WARN\033[0m  %s\n" "$1"; }
fail(){ printf "  \033[31m✗ FAIL\033[0m  %s\n" "$1"; }
info(){ printf "  \033[36mℹ INFO\033[0m  %s\n" "$1"; }
hdr(){  printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

HEADERS="$("${CURL[@]}" -D - -o /dev/null "$BASE/" 2>/dev/null)"
get(){ printf '%s' "$HEADERS" | grep -i "^$1:" | head -1 | sed 's/\r//' | cut -d' ' -f2-; }

echo "Target: $BASE   ($(date -u +%FT%TZ))"

hdr "1. Transport / HTTP→HTTPS redirect"
HTTP_CODE="$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "http://$HOST/" 2>/dev/null)"
HTTP_LOC="$(curl -sS -m 20 -D - -o /dev/null "http://$HOST/" 2>/dev/null | grep -i '^location:' | sed 's/\r//')"
case "$HTTP_CODE" in 30*) pass "HTTP redirects ($HTTP_CODE) -> ${HTTP_LOC#*: }";; *) warn "HTTP returned $HTTP_CODE (expected 301/308 to https)";; esac

hdr "2. Security headers"
HSTS="$(get strict-transport-security)"; [ -n "$HSTS" ] && { printf '%s' "$HSTS" | grep -qi 'preload' && printf '%s' "$HSTS" | grep -qi 'includesubdomains' && pass "HSTS: $HSTS" || warn "HSTS present but weak: $HSTS"; } || fail "HSTS missing"
XFO="$(get x-frame-options)"; [ -n "$XFO" ] && pass "X-Frame-Options: $XFO" || warn "X-Frame-Options missing (rely on CSP frame-ancestors)"
XCTO="$(get x-content-type-options)"; printf '%s' "$XCTO" | grep -qi nosniff && pass "X-Content-Type-Options: nosniff" || fail "X-Content-Type-Options missing"
REFP="$(get referrer-policy)"; [ -n "$REFP" ] && pass "Referrer-Policy: $REFP" || warn "Referrer-Policy missing"
PP="$(get permissions-policy)"; [ -n "$PP" ] && pass "Permissions-Policy present" || warn "Permissions-Policy missing"
PBH="$(get x-powered-by)"; [ -n "$PBH" ] && warn "X-Powered-By leaked: $PBH" || pass "X-Powered-By not exposed"

hdr "3. Content-Security-Policy"
CSP="$(get content-security-policy)"
if [ -z "$CSP" ]; then fail "CSP header MISSING in production"; else
  pass "CSP present"
  printf '%s' "$CSP" | grep -q "nonce-" && pass "  script-src uses a nonce" || warn "  no nonce in CSP"
  printf '%s' "$CSP" | grep -q "'unsafe-eval'" && fail "  'unsafe-eval' present in CSP" || pass "  no 'unsafe-eval'"
  printf '%s' "$CSP" | grep -q "object-src 'none'" && pass "  object-src 'none'" || warn "  object-src not locked to 'none'"
  printf '%s' "$CSP" | grep -q "frame-ancestors 'none'" && pass "  frame-ancestors 'none'" || warn "  frame-ancestors not 'none'"
  printf '%s' "$CSP" | grep -Eq "script-src[^;]*'unsafe-inline'" && warn "  script-src allows 'unsafe-inline'" || pass "  script-src has no 'unsafe-inline'"
  printf '%s' "$CSP" | grep -q "strict-dynamic" && pass "  uses 'strict-dynamic' (host gadgets neutralised)" || info "  consider 'strict-dynamic' (Client-F1)"
fi

hdr "4. Cookies (flags)"
SC="$(printf '%s' "$HEADERS" | grep -i '^set-cookie:' | sed 's/\r//')"
if [ -z "$SC" ]; then info "No cookies set on / (Firebase auth is client-side / IndexedDB)"; else
  printf '%s\n' "$SC" | while IFS= read -r c; do
    nm="$(printf '%s' "$c" | sed -E 's/^set-cookie:\s*([^=]+)=.*/\1/I')"
    flags=""; printf '%s' "$c" | grep -qi 'httponly' && flags="$flags HttpOnly"; printf '%s' "$c" | grep -qi 'secure' && flags="$flags Secure"; printf '%s' "$c" | grep -qi 'samesite' && flags="$flags SameSite"
    [ -n "$flags" ] && pass "cookie $nm:$flags" || warn "cookie $nm has no security flags"
  done
fi

hdr "5. Exposed sensitive files (should NOT be 200)"
for p in ".env" ".env.local" ".git/config" ".git/HEAD" "firebase-admin.json" "serviceAccount.json" "next.config.js" "package.json" ".well-known/security.txt"; do
  c="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/$p" 2>/dev/null)"
  if [ "$c" = "200" ]; then [ "$p" = ".well-known/security.txt" ] && info "/$p -> 200 (security.txt present, good practice)" || fail "/$p -> 200 (EXPOSED!)"; else
    [ "$p" = ".well-known/security.txt" ] && info "/$p -> $c (no security.txt; optional)" || pass "/$p -> $c (not exposed)"; fi
done

hdr "6. robots / sitemap"
for p in "robots.txt" "sitemap.xml"; do c="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/$p" 2>/dev/null)"; [ "$c" = "200" ] && pass "/$p -> 200" || warn "/$p -> $c"; done
RB="$("${CURL[@]}" "$BASE/robots.txt" 2>/dev/null)"; for d in "/admin" "/mon-compte" "/panier" "/login"; do printf '%s' "$RB" | grep -q "Disallow:.*$d" && pass "robots disallows $d" || info "robots does not list $d"; done

hdr "7. Auth helper proxy /__/auth/"
c="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE/__/auth/handler" 2>/dev/null)"; info "/__/auth/handler -> $c (proxied to firebaseapp.com; expect 200/302/400, NOT a 500/open redirect)"

hdr "8. API routes require auth (no token = 401/403, NOT 200)"
for ep in "/api/referrals"; do
  c="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$BASE$ep" 2>/dev/null)"
  case "$c" in 401|403) pass "GET $ep -> $c (auth required)";; 200) fail "GET $ep -> 200 WITHOUT a token (auth bypass?)";; *) info "GET $ep -> $c";; esac
done
# POST with empty body + no token: must be rejected (401/400/429), never 200.
for ep in "/api/review" "/api/reservation"; do
  c="$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{}' "$BASE$ep" 2>/dev/null)"
  case "$c" in 401|403|400|429) pass "POST $ep (no token) -> $c (rejected)";; 200) fail "POST $ep -> 200 with no token (CRITICAL)";; *) info "POST $ep -> $c";; esac
done

hdr "9. TLS certificate"
EXP="$(printf 'Q\n' | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
[ -n "$EXP" ] && info "Certificate notAfter: $EXP" || warn "Could not read certificate (openssl missing?)"

echo; echo "Done. Review WARN/FAIL lines above. This script is read-only and safe to re-run."
