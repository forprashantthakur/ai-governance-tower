import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, LINKEDIN_URL } from "@/lib/site";

// The landing page is served at "/" for visitors without a session
// (see middleware), so "/" is its canonical address.
export const metadata: Metadata = {
  title: { absolute: `${SITE_TAGLINE} | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
    title: SITE_TAGLINE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_TAGLINE, description: SITE_DESCRIPTION },
};

// Structured data so search engines understand who the company is and what
// the product is. Prices mirror the pricing section on the landing page.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: [LINKEDIN_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "AI governance, risk and compliance",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: [
        { "@type": "Offer", name: "Trial", price: "0", priceCurrency: "INR", description: "14-day free trial, no card required" },
        { "@type": "Offer", name: "Starter", price: "14999", priceCurrency: "INR", description: "Per month, including GST" },
        { "@type": "Offer", name: "Professional", price: "44999", priceCurrency: "INR", description: "Per month, including GST" },
      ],
    },
  ],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
