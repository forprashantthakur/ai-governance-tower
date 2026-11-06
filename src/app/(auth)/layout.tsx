import type { Metadata } from "next";

// Sign-in, password and invite pages have no search value; keep them out of results.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
