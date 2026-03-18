import type { Metadata } from "next";
import "./globals.css";
import { getRequestLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n/i18n-provider";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: translate(locale, "meta.title"),
    description: translate(locale, "meta.description"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
