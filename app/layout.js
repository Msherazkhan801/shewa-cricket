import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(site),
  title: "Shewa Super League — Live Score",
  description: "Shewa Super League ka live cricket score, ball by ball.",
  openGraph: {
    title: "Shewa Super League — Live Score",
    description: "Live score, ball by ball. Link kholein aur score dekhte rahein.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
};

export const viewport = { themeColor: "#0c3b2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
