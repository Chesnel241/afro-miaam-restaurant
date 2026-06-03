/**
 * Email transport — Resend REST API via plain fetch (no npm dep).
 *
 * Sends transactional emails (verification, password reset, reservation
 * confirmation, restaurant alert). Each function is fire-and-forget from
 * the caller's perspective: errors are logged with console.warn but never
 * thrown, so a flaky email provider can't break a signup/login flow.
 *
 * Dev mode (no RESEND_API_KEY): the body is console.logged and the function
 * returns immediately. This keeps local dev working without external creds.
 *
 * All templates are in French and follow the Afro Miaam brand colors:
 *   primary green  #0a3b32
 *   accent orange  #ff6d3a
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Afro Miaam <commandes@afromiaam.fr>";
const FETCH_TIMEOUT_MS = 5000;

interface ResendPayload {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Internal helper. Logs in dev when no API key is configured, otherwise POSTs
 * to Resend with a hard 5s timeout. Never throws.
 */
async function sendMail(payload: ResendPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    console.log(
      `[email:dev] would send "${payload.subject}" to ${
        Array.isArray(payload.to) ? payload.to.join(", ") : payload.to
      } (no RESEND_API_KEY configured)`,
    );
    return;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, from }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[email] Resend HTTP ${res.status} for "${payload.subject}": ${body.slice(0, 200)}`,
      );
    }
  } catch (e) {
    console.warn(
      `[email] send failed for "${payload.subject}":`,
      e instanceof Error ? e.message : "unknown",
    );
  }
}

// ---------------------------------------------------------------------------
// Shared HTML chrome
// ---------------------------------------------------------------------------

const BRAND_GREEN = "#0a3b32";
const BRAND_ORANGE = "#ff6d3a";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, inner: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f3ef;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:${BRAND_GREEN};padding:24px 32px;color:#ffffff;">
                <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">Afro Miaam</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${inner}
              </td>
            </tr>
            <tr>
              <td style="background:#fafaf7;padding:20px 32px;font-size:12px;color:#6b6b6b;text-align:center;">
                Afro Miaam — Cuisine africaine moderne<br/>
                Cet email vous a été envoyé automatiquement. Merci de ne pas y répondre.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND_ORANGE};border-radius:6px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Public sender API
// ---------------------------------------------------------------------------

export async function sendEmailVerification(
  to: string,
  name: string,
  token: string,
  siteUrl: string,
): Promise<void> {
  const link = `${siteUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:${BRAND_GREEN};">Bienvenue ${escapeHtml(name)} !</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Merci de votre inscription chez Afro Miaam. Pour activer votre compte et
      commencer à commander, confirmez votre adresse email en cliquant sur le
      bouton ci-dessous.
    </p>
    ${button(link, "Confirmer mon email")}
    <p style="margin:16px 0 0;font-size:13px;color:#6b6b6b;line-height:1.5;">
      Ce lien expire dans 24 heures. Si le bouton ne fonctionne pas, copiez
      cette adresse dans votre navigateur :<br/>
      <span style="word-break:break-all;color:${BRAND_GREEN};">${escapeHtml(link)}</span>
    </p>
  `;
  await sendMail({
    to,
    subject: "Confirmez votre email — Afro Miaam",
    html: layout("Confirmez votre email", inner),
  });
}

export async function sendPasswordReset(
  to: string,
  name: string,
  token: string,
  siteUrl: string,
): Promise<void> {
  const link = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:${BRAND_GREEN};">Réinitialisation du mot de passe</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Bonjour ${escapeHtml(name)}, nous avons reçu une demande de
      réinitialisation du mot de passe associé à ce compte. Cliquez sur le
      bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>
    ${button(link, "Choisir un nouveau mot de passe")}
    <p style="margin:16px 0 0;font-size:13px;color:#6b6b6b;line-height:1.5;">
      Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette
      demande, vous pouvez ignorer cet email — votre mot de passe restera
      inchangé.
    </p>
  `;
  await sendMail({
    to,
    subject: "Réinitialiser votre mot de passe — Afro Miaam",
    html: layout("Réinitialiser votre mot de passe", inner),
  });
}

export async function sendReservationConfirmation(
  to: string,
  name: string,
  reference: string,
  total: number,
  date: string,
  slot: string,
): Promise<void> {
  const formattedTotal = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(total);
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:${BRAND_GREEN};">Réservation confirmée</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Merci ${escapeHtml(name)} ! Votre réservation a bien été enregistrée.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fafaf7;border-radius:8px;margin:16px 0;">
      <tr><td style="padding:12px 16px;font-size:14px;"><strong>Référence&nbsp;:</strong> ${escapeHtml(reference)}</td></tr>
      <tr><td style="padding:12px 16px;font-size:14px;border-top:1px solid #eceae3;"><strong>Date&nbsp;:</strong> ${escapeHtml(date)}</td></tr>
      <tr><td style="padding:12px 16px;font-size:14px;border-top:1px solid #eceae3;"><strong>Créneau&nbsp;:</strong> ${escapeHtml(slot)}</td></tr>
      <tr><td style="padding:12px 16px;font-size:14px;border-top:1px solid #eceae3;"><strong>Total&nbsp;:</strong> ${escapeHtml(formattedTotal)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.5;">
      Nous avons hâte de vous accueillir. À très vite !
    </p>
  `;
  await sendMail({
    to,
    subject: `Réservation confirmée — ${reference}`,
    html: layout("Réservation confirmée", inner),
  });
}

export async function sendReservationAlert(
  adminEmail: string,
  customerName: string,
  reference: string,
  total: number,
  items: Array<{ name: string; quantity: number }>,
): Promise<void> {
  const formattedTotal = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(total);
  const rows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-top:1px solid #eceae3;font-size:14px;">${escapeHtml(it.name)}</td>
          <td style="padding:8px 12px;border-top:1px solid #eceae3;font-size:14px;text-align:right;">×&nbsp;${it.quantity}</td>
        </tr>`,
    )
    .join("");
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:${BRAND_GREEN};">Nouvelle commande</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
      Nouvelle commande reçue de la part de <strong>${escapeHtml(customerName)}</strong>.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fafaf7;border-radius:8px;margin:16px 0;">
      <tr><td colspan="2" style="padding:12px 16px;font-size:14px;"><strong>Référence&nbsp;:</strong> ${escapeHtml(reference)}</td></tr>
      <tr><td colspan="2" style="padding:12px 16px;font-size:14px;border-top:1px solid #eceae3;"><strong>Total&nbsp;:</strong> ${escapeHtml(formattedTotal)}</td></tr>
      ${rows}
    </table>
  `;
  await sendMail({
    to: adminEmail,
    subject: `Nouvelle commande — ${reference}`,
    html: layout("Nouvelle commande", inner),
  });
}
