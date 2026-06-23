# Shared edge reverse proxy

The **single** process on the VPS that binds ports **80/443**. It terminates TLS
for every site on the host and reverse-proxies each domain to the right app over
the host loopback (`127.0.0.1:<port>`).

## Why this exists

The host runs several independent `docker compose` projects (`afro-miaam`,
`jt-alwm`, `pce`). Each used to ship its **own** Caddy, and only one process can
bind `0.0.0.0:80`/`443` at a time. The three proxies fought for the ports, so
only one site was reachable at any moment — the intermittent-outage bug, and the
reason for the `fuser -k 80/tcp && docker compose up` ritual.

The fix: **one** edge owns 80/443 and routes by `Host` header. Every app stops
running its own proxy and publishes only `127.0.0.1:<unique-port>`.

| Site       | App loopback port | Status            |
|------------|-------------------|-------------------|
| afro-miaam | `127.0.0.1:3000`  | wired (active)    |
| jt-alwm    | `127.0.0.1:3001`  | template in Caddyfile |
| pce        | `127.0.0.1:3002`  | template in Caddyfile |

Host network mode is used on purpose: the edge reaches apps via loopback, so it
never touches the Docker bridge — sidestepping the embedded-DNS / overlapping
-subnet failures that caused the earlier `fix(network)` churn.

---

## One-time migration (from the current per-project-proxy setup)

Run on the VPS, as the deploy user. **Order matters.**

### 1. Update the afro-miaam stack and remove its proxy

```bash
cd /opt/afro-miaam
git pull --ff-only          # brings in the profile'd caddy + named uploads vol

# Stop & remove the old per-project Caddy (it must release 80/443).
docker compose stop caddy 2>/dev/null || true
docker compose rm -f caddy 2>/dev/null || true
```

### 2. Migrate the uploads volume data (only if you had uploads before)

The uploads volume now has an explicit name `afro_miaam_uploads`. If you were
running with the old default name, copy the data once so menu images survive:

```bash
docker volume ls | grep uploads          # find the OLD name, e.g. afro-miaam_uploads
docker volume create afro_miaam_uploads
# Replace <OLD> with the name you found above:
docker run --rm -v <OLD>:/from -v afro_miaam_uploads:/to alpine \
  sh -c 'cp -a /from/. /to/'
```

If this is a fresh install with no uploads yet, skip this step — the named
volume is created automatically.

### 3. Bring the app up on loopback only

```bash
cd /opt/afro-miaam
docker compose up -d         # postgres + app (no caddy); app on 127.0.0.1:3000
curl -fsS http://127.0.0.1:3000/api/health   # -> {"ok":true,...}
```

### 4. Open the firewall and start the edge

```bash
# Allow the public HTTP(S) ports (once).
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp

cd /opt/afro-miaam/edge
docker compose up -d
docker compose logs -f caddy      # watch ACME issue the cert, Ctrl-C when done
```

### 5. Verify afromiaam.com end-to-end

```bash
curl -I https://afromiaam.com                 # 200, HSTS header present
curl -I https://afromiaam.com/uploads/<some-existing-image>  # 200 from file_server
```

### 6. Fold in the other two sites

For **jt-alwm** and **pce**, in each project:
1. Remove its own Caddy/proxy (`docker compose stop/rm` the proxy service).
2. Publish its app on a unique loopback port (`127.0.0.1:3001` / `127.0.0.1:3002`).
3. Uncomment + edit the matching block in `./Caddyfile` (set the real domain).
4. Reload the edge with **zero downtime**:
   ```bash
   cd /opt/afro-miaam/edge
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

---

## Day-to-day

- **Add / change a site**: edit `Caddyfile`, then
  `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.
- **Certs** live in the `caddy_data` volume (one place for all domains). Never
  delete it casually — re-issuing many certs can hit Let's Encrypt rate limits.
- **Logs**: `docker compose exec caddy ls /var/log/caddy` (per-site JSON logs).
- The app deploy pipeline (`.github/workflows/deploy.yml`) only rolls the
  `afro-miaam` app container; it never touches this edge. The edge keeps serving
  (502 briefly) during an app redeploy and recovers automatically.

## Rollback to single-site (e.g. dev or a dedicated box)

If a host ever runs only afro-miaam, you can skip the edge entirely and use the
built-in single-site proxy instead:

```bash
cd /opt/afro-miaam
docker compose --profile standalone up -d   # brings back the per-project caddy
```
Do **not** run both the edge and the standalone caddy on the same host.
