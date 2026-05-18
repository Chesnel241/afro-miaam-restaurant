import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Afro Miaam — Cuisine afro gastronomique à Lyon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #1F3D2B 0%, #2A5239 50%, #1F3D2B 100%)",
          color: "#F4EDE4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#E85D2A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}
          >
            🍲
          </div>
          Afro Miaam
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "88px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#F4EDE4",
            }}
          >
            Ça mijote,
            <br />
            <span style={{ color: "#E85D2A" }}>ça régale.</span>
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 500,
              color: "rgba(244, 237, 228, 0.85)",
              maxWidth: "900px",
              lineHeight: 1.3,
            }}
          >
            Cuisine afro gastronomique à Lyon. Précommande 24h à l&apos;avance,
            retrait sur place ou livraison 3 €.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: "24px",
            color: "rgba(244, 237, 228, 0.7)",
          }}
        >
          <div>afromiaam.com</div>
          <div
            style={{
              padding: "12px 24px",
              borderRadius: "999px",
              border: "2px solid #E85D2A",
              color: "#E85D2A",
              fontWeight: 700,
            }}
          >
            315 rue Garibaldi · Lyon 7e
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
