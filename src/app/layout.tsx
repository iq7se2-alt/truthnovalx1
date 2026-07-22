import type { Metadata } from "next";
import {
  Cairo,
  Noto_Naskh_Arabic,
  Amiri,
  Noto_Kufi_Arabic,
  Reem_Kufi,
  Scheherazade_New,
  Lateef,
  Marhey,
  Lemonada,
  Tajawal,
  Almarai,
  Aref_Ruqaa,
  Mirza,
  Harmattan,
  Mada,
  Jomhuria,
  Rakkas,
  Baloo_Bhaijaan_2,
  El_Messiri,
  Changa,
  Katibeh,
  Lalezar,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { ThemeProvider } from "@/components/site/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import { CrystalBall } from "@/components/site/crystal-ball";
import { SmoothScrollProvider } from "@/components/site/smooth-scroll-provider";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "600", "700", "800"] });
const naskh = Noto_Naskh_Arabic({ variable: "--font-naskh", subsets: ["arabic"], display: "swap", weight: ["400", "500", "600", "700"] });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const kufi = Noto_Kufi_Arabic({ variable: "--font-kufi", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const reem = Reem_Kufi({ variable: "--font-reem", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const scheherazade = Scheherazade_New({ variable: "--font-scheherazade", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const lateef = Lateef({ variable: "--font-lateef", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const marhey = Marhey({ variable: "--font-marhey", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const lemonada = Lemonada({ variable: "--font-lemonada", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const tajawal = Tajawal({ variable: "--font-tajawal", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "500", "700"] });
const almarai = Almarai({ variable: "--font-almarai", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const aref = Aref_Ruqaa({ variable: "--font-aref", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const mirza = Mirza({ variable: "--font-mirza", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const harmattan = Harmattan({ variable: "--font-harmattan", subsets: ["arabic"], display: "swap", weight: ["400", "700"] });
const mada = Mada({ variable: "--font-mada", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const jomhuria = Jomhuria({ variable: "--font-jomhuria", subsets: ["arabic", "latin"], display: "swap", weight: ["400"] });
const rakkas = Rakkas({ variable: "--font-rakkas", subsets: ["arabic", "latin"], display: "swap", weight: ["400"] });
const baloo = Baloo_Bhaijaan_2({ variable: "--font-baloo", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const elMessiri = El_Messiri({ variable: "--font-elmessiri", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const changa = Changa({ variable: "--font-changa", subsets: ["arabic", "latin"], display: "swap", weight: ["400", "700"] });
const katibeh = Katibeh({ variable: "--font-katibeh", subsets: ["arabic", "latin"], display: "swap", weight: ["400"] });
const lalezar = Lalezar({ variable: "--font-lalezar", subsets: ["arabic", "latin"], display: "swap", weight: ["400"] });

export const metadata: Metadata = {
  title: "سيد الحقيقة | Lord of the Truth",
  description:
    "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!",
  keywords: ["سيد الحقيقة", "رواية", "Lord of the Truth", "روايات عربية", "ويب نوفل"],
  authors: [{ name: "Lord of the Truth" }],
  openGraph: {
    title: "سيد الحقيقة | Lord of the Truth",
    description:
      "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!",
    type: "website",
    locale: "ar",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${naskh.variable} ${amiri.variable} ${kufi.variable} ${reem.variable} ${scheherazade.variable} ${lateef.variable} ${marhey.variable} ${lemonada.variable} ${tajawal.variable} ${almarai.variable} ${aref.variable} ${mirza.variable} ${harmattan.variable} ${mada.variable} ${jomhuria.variable} ${rakkas.variable} ${baloo.variable} ${elMessiri.variable} ${changa.variable} ${katibeh.variable} ${lalezar.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <SmoothScrollProvider>
              <Navbar />
              <main className="flex-1 flex flex-col pt-16">{children}</main>
              <SiteFooter />
              <CrystalBall />
              <Toaster />
            </SmoothScrollProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
