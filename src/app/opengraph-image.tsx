import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// Share image used when the site is linked on LinkedIn, X, Slack, WhatsApp, etc.
export const alt =
  "AI Governance Control Tower: AI governance platform for ISO 42001, DPDP, RBI FREE-AI and the EU AI Act";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#0b0e28",
          padding: "56px 72px",
          gap: 56,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={380} height={300} alt="" style={{ objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 54, fontWeight: 700, color: "#ffffff", lineHeight: 1.15 }}>
            Govern every AI model and agent in one place
          </div>
          <div style={{ fontSize: 28, color: "#9fb4d9", marginTop: 24, lineHeight: 1.4 }}>
            AI inventory, risk scoring, approvals and audit evidence
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            {["ISO 42001", "DPDP", "RBI FREE-AI", "EU AI Act"].map((t) => (
              <div
                key={t}
                style={{
                  fontSize: 24,
                  color: "#60a5fa",
                  border: "2px solid #2563eb",
                  borderRadius: 999,
                  padding: "6px 18px",
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, color: "#ffffff", marginTop: 36, opacity: 0.8 }}>aigovernancetower.com</div>
        </div>
      </div>
    ),
    size
  );
}
