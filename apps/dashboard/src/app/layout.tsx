import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Receptionist Platform",
  description: "Multi-tenant AI Receptionist dashboard.",
};

// Placeholder root layout created during project scaffolding (M1).
// Real layout (navigation, tenant context provider, design system
// integration) is implemented starting with the tenancy/auth milestone.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
