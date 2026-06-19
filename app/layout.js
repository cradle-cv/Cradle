import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AutoCheckIn from "@/components/AutoCheckIn";
import PetWrapper from "@/components/PetWrapper";
import PWARegister from "@/components/PWARegister";
import InAppBrowserHint from "@/components/InAppBrowserHint";
import { LanguageProvider } from "@/components/i18n/LanguageContext";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata = {
  title: "Cradle 摇篮",
  description: "一个慢的、克制的艺术社区。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cradle",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180-apple.png", sizes: "180x180", type: "image/png" },
    ],
  },
};
export const viewport = {
  themeColor: "#C0A57C",
};
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* ★ 首屏语言标记:在 React 之前同步读取 localStorage,尽早把 <html lang> 设好,缩短简→繁可见延迟 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('cradle_lang');if(!l){var n=(navigator.language||'').toLowerCase();l=(n.indexOf('tw')>-1||n.indexOf('hk')>-1||n.indexOf('hant')>-1)?'t':'s';}document.documentElement.lang=l==='t'?'zh-Hant':'zh-Hans';document.documentElement.setAttribute('data-lang',l);}catch(e){}})();`,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Liu+Jian+Mao+Cao&family=Lora:ital,wght@0,400;0,700;1,400&family=Ma+Shan+Zheng&family=Montserrat:wght@300;400;500;600&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:wght@300;400;500;600&family=Raleway:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500&family=ZCOOL+KuaiLe&family=ZCOOL+XiaoWei&family=Zhi+Mang+Xing&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: '"Noto Serif SC", "Source Han Serif SC", "思源宋体", serif' }}
      >
        <LanguageProvider>
          {/* ★ 内置浏览器提示(微信/小红书等) */}
          <InAppBrowserHint />
          <AutoCheckIn />
          {children}
          <PetWrapper />
          {/* ★ Service Worker 注册(无 UI) */}
          <PWARegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
