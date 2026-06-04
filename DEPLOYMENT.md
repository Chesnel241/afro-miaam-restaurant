# Afro Miaam — Deployment Runbook

Production deployment of the Afro Miaam Next.js 15 app on a **single Hetzner VPS**,
fully self-hosted: **PostgreSQL + local image storage**. No Firebase, no Vercel.

The stack runs as three Docker Compose services:

| Service    | Image                | Exposure        | Purpose                                            |
|------------|----------------------|-----------------|----------------------------------------------------|
| `postgres` | `postgres:16-alpine` | internal only   | App database; runs `migrations/001_init.sql` on first boot |
| `app`      | built from Dockerfile| internal only   | Next.js standalone server (non-root), writes uploads volume |
| `caddy`    | `caddy:2-alpine`     | `80`,`443` (+udp) | TLS edge, reverse proxy, static file server for `/uploads/*` |

Public traffic only ever reaches **Caddy**. The app and database are never
published to the host.

```
Internet ──► Caddy (80/443) ──► app:3000 (reverse_proxy)
                  │
                  └──► /srv/uploads (file_server, read-only)  ◄── shared volume ──► app:/app/uploads
                                                                        │
                                                              postgres:5432 (internal)
```

---

## 1. Provision the Hetzner VPS (Ubuntu 24.04)

1. Create a Hetzner Cloud server: **Ubuntu 24.04**, a CX22 (or larger) is plenty.
   Add your SSH public key during creation so root login is key-based from the start.
2. Note the public IPv4 address — you will need it for DNS and GitHub secrets.

SSH in as root for the initial hardening:

```bash
ssh root@<VPS_IP>
```

### Create a non-root deploy user

```bash
adduser --gecos "" deploy
usermod -aG sudo deploy

# Give the deploy user your SSH key.
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

> Generate a **dedicated** SSH keypair for CI (`ssh-keygen -t ed25519 -C "github-ci"`)
> and append its public key to `/home/deploy/.ssh/authorized_keys`. The matching
> private key becomes the `HETZNER_SSH_KEY` GitHub secret (see §5).

### Harden sshd

Edit `/etc/ssh/sshd_config` (or drop a file in `/etc/ssh/sshd_config.d/`) and set:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Then restart SSH and confirm you can still log in as `deploy` in a **new** session
before closing the current one:

```bash
systemctl restart ssh
# In a new terminal: ssh deploy@<VPS_IP>
```

From here on, work as `deploy` and use `sudo`.

---

## 2. Firewall (UFW) + fail2ban

Allow only SSH, HTTP, HTTPS (and HTTP/3 over UDP). **Never** expose Postgres (5432)
or the app port (3000).

```bash
sudo apt update
sudo apt install -y ufw fail2ban

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH (use your custom port if you changed it)
sudo ufw allow 80/tcp        # HTTP (ACME + redirect)
sudo ufw allow 443/tcp       # HTTPS
sudo ufw allow 443/udp       # HTTP/3 (QUIC)
sudo ufw enable
sudo ufw status verbose
```

fail2ban ships with a sensible `sshd` jail enabled by default. Verify:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

> Docker can bypass UFW by writing its own iptables rules. Because **only Caddy
> publishes ports** (and only 80/443), and postgres/app have no `ports:` mapping,
> there is nothing for Docker to expose. Do not add `ports:` to the app or db.

---

## 3. Install Docker

Use Docker's official repository (includes the Compose v2 plugin):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let the deploy user run docker without sudo (log out / back in to apply).
sudo usermod -aG docker deploy
newgrp docker

docker --version && docker compose version
```

---

## 4. Clone the repo and create `.env`

```bash
sudo mkdir -p /opt/afro-miaam
sudo chown deploy:deploy /opt/afro-miaam
git clone https://github.com/Chesnel241/afro-miaam-restaurant.git /opt/afro-miaam
cd /opt/afro-miaam

cp .env.example .env
chmod 600 .env
```

### Generate secrets

```bash
# Each command prints a 64-char hex secret — paste into the matching .env value.
openssl rand -hex 32   # -> AUTH_JWT_SECRET
openssl rand -hex 32   # -> POSTGRES_PASSWORD  (also update it inside DATABASE_URL)
openssl rand -hex 32   # -> MAINTENANCE_BYPASS_KEY
```

Then edit `.env` (`nano .env`) and fill in EVERY `CHANGEME`:

- **Database** — set `POSTGRES_PASSWORD`, and put the **same** password into
  `DATABASE_URL` (`postgresql://afro:<password>@postgres:5432/afromiaam`).
  `POSTGRES_USER`/`POSTGRES_DB` must match the `DATABASE_URL` user/db.
- **Auth** — `AUTH_JWT_SECRET`, plus `GOOGLE_OAUTH_CLIENT_ID` /
  `GOOGLE_OAUTH_CLIENT_SECRET` (see §10).
- **Email (Resend)** — `RESEND_API_KEY`; `EMAIL_FROM` and `RESTAURANT_EMAIL`
  are already sensible defaults.
- **reCAPTCHA** — `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` (see §11).
- **Maintenance** — `MAINTENANCE_BYPASS_KEY`.

> `DATABASE_URL` uses `postgres` (the compose service name) as the host because the
> app talks to the database over the internal Docker network.

---

## 5. GitHub secrets (CI/CD)

The workflow `.github/workflows/deploy.yml` builds the image, pushes it to GHCR,
then SSHes into the VPS to roll the `app` service forward. Set these repository
secrets under **Settings → Secrets and variables → Actions**:

| Secret             | Value                                                        |
|--------------------|-------------------------------------------------------------|
| `HETZNER_HOST`     | VPS public IPv4                                              |
| `HETZNER_USER`     | `deploy`                                                     |
| `HETZNER_SSH_KEY`  | the **private** key of the CI keypair (full PEM, incl. headers) |
| `HETZNER_SSH_PORT` | SSH port (`22` unless changed)                              |

`GITHUB_TOKEN` is provided automatically and is used to push/pull the image at
`ghcr.io/<owner>/<repo>`. Production deploys are gated on the `production`
GitHub **Environment** — create it (Settings → Environments) and optionally add
required reviewers.

> The image is private by default. The deploy step logs into GHCR on the VPS with
> `GITHUB_TOKEN`, so no extra registry credentials are needed on the server.

---

## 6. First deploy

On the VPS, in `/opt/afro-miaam`, bring up the full stack. On a brand-new
`pg_data` volume, Postgres automatically runs `migrations/001_init.sql` from
`/docker-entrypoint-initdb.d`.

```bash
docker compose up -d --build      # --build for the very first boot (no image in GHCR yet)
docker compose ps
docker compose logs -f postgres   # confirm "database system is ready" + migration ran
```

Verify the schema loaded:

```bash
docker compose exec postgres psql -U afro -d afromiaam -c '\dt'
```

> After the first deploy, subsequent deploys are fully automated: push to `main`
> → CI builds, pushes to GHCR, SSHes in, `docker compose pull app` +
> `up -d --no-deps app`, and waits for the container healthcheck.

---

## 7. Data migration (Firestore → PostgreSQL)

This is a **one-time** migration. The export runs where you have the Firebase
service account; the import runs against the VPS database.

### 7a. Export from Firestore (on a trusted machine with the service account)

```bash
# FIREBASE_SERVICE_ACCOUNT may be raw JSON or base64-encoded JSON.
FIREBASE_SERVICE_ACCOUNT='<service-account-json-or-base64>' \
  node scripts/export-firestore.mjs
# -> writes ./migration-data/<collection>.json
```

### 7b. Copy `migration-data/` to the VPS

```bash
scp -r migration-data deploy@<VPS_IP>:/opt/afro-miaam/
```

### 7c. Import into PostgreSQL

Run the importer from a host that can reach the database. Easiest is inside a
one-off container on the VPS that joins the compose network and reaches `postgres`:

```bash
cd /opt/afro-miaam
docker compose run --rm \
  -e DATABASE_URL="postgresql://afro:<password>@postgres:5432/afromiaam" \
  --entrypoint node app scripts/import-postgres.mjs
```

The importer is **idempotent** (`ON CONFLICT DO NOTHING`) and can be re-run safely.

> **Passwords are not migrated.** Firebase password hashes cannot be exported, so
> every migrated user's `password_hash` is `NULL`. Migrated users must use the
> **"forgot password"** flow to set a password before they can log in with
> email/password. (Google OAuth users can sign in immediately.)

---

## 8. Create the admin user

Migrated users land with `role = 'customer'`. Promote your account to admin
directly in the database (the user must already exist — sign up or migrate first):

```bash
docker compose exec postgres psql -U afro -d afromiaam -c \
  "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
```

Confirm:

```bash
docker compose exec postgres psql -U afro -d afromiaam -c \
  "SELECT email, role FROM users WHERE role = 'admin';"
```

> Email is stored lowercased — use the lowercase form in the `WHERE` clause.

---

## 9. DNS cutover

Point the domain at the VPS. Caddy provisions TLS automatically via Let's Encrypt
once the A records resolve and ports 80/443 are reachable.

1. At your DNS provider, create/update:
   - `afromiaam.com`     → A → `<VPS_IP>`
   - `www.afromiaam.com` → A → `<VPS_IP>`
2. Set a **low TTL** (e.g. 300s) first so you can roll back quickly if needed.
3. Wait for propagation (`dig +short afromiaam.com`), then watch Caddy obtain certs:

```bash
docker compose logs -f caddy   # look for "certificate obtained successfully"
```

4. Once verified end-to-end, raise the TTL back to a normal value (e.g. 3600s).

> Caddy's ACME account and certificates live in the `caddy_data` volume — keep it.
> The ACME contact email is the `email` directive at the top of `Caddyfile`.

---

## 10. Google OAuth setup

In **Google Cloud Console → APIs & Services → Credentials**, create an OAuth 2.0
Client ID (type *Web application*):

- **Authorized JavaScript origins:** `https://afromiaam.com`
- **Authorized redirect URI:** `https://afromiaam.com/api/auth/oauth/google/callback`

Copy the Client ID / secret into `.env` as `GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET`, then restart the app:

```bash
docker compose up -d app
```

---

## 11. reCAPTCHA v3 keys

In the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin), register
a **v3** site:

- **Domains:** `afromiaam.com` (and `www.afromiaam.com`)

Put the keys in `.env`:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — public, embedded in the browser bundle.
- `RECAPTCHA_SECRET_KEY` — server-side only.

Restart the app to apply (`docker compose up -d app`).

> Because `NEXT_PUBLIC_*` values are inlined at **build** time, changing the site
> key requires a rebuilt image (push to `main`), not just a container restart.

---

## 12. Verification checklist

Run through these after cutover:

```bash
# Health endpoint (through Caddy / TLS).
curl -fsS https://afromiaam.com/api/health

# Security headers present (HSTS, nosniff, frame-deny, no Server header).
curl -sI https://afromiaam.com | grep -iE 'strict-transport|x-content-type|x-frame|referrer-policy|^server'

# Uploaded image served directly by Caddy with a long cache.
curl -sI https://afromiaam.com/uploads/<some-image>.jpg | grep -i cache-control
```

Functional smoke test (manual, in a browser):

- [ ] `https://afromiaam.com` loads with a valid certificate; `www` redirects/works.
- [ ] **Sign up** with email → receive verification email (Resend).
- [ ] **Log in** with email/password.
- [ ] **Google OAuth** sign-in works.
- [ ] **Place an order** end-to-end; restaurant notification email arrives.
- [ ] **Admin dashboard** reachable by the admin user only.
- [ ] **Image upload** from admin persists and is served at `/uploads/...`.
- [ ] reCAPTCHA v3 challenges pass on protected forms.
- [ ] HTTP → HTTPS redirect works; HTTP/3 (QUIC) negotiated.

---

## Operations cheat sheet

```bash
cd /opt/afro-miaam

docker compose ps                       # service + health status
docker compose logs -f app              # tail app logs
docker compose logs -f caddy            # TLS / proxy logs

# Manual app rollout (CI does this automatically on push to main):
docker compose pull app && docker compose up -d --no-deps app

# Database backup (run as a cron job; store off-box):
docker compose exec -T postgres pg_dump -U afro afromiaam | gzip > backup-$(date +%F).sql.gz

# Restore:
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U afro -d afromiaam

# Toggle maintenance mode: set MAINTENANCE_MODE=true in .env, then:
docker compose up -d app
```

> **Back up regularly:** the `pg_data` (database), `uploads` (menu images), and
> `caddy_data` (TLS certs/ACME account) volumes hold all stateful data. Snapshot
> the VPS and/or copy `pg_dump` output + the uploads volume off-box on a schedule.
