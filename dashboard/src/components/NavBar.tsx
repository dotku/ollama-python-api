"use client";

import { useTranslations, useLocale } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

const links = [
  { key: "dashboard", href: "" },
  { key: "chat", href: "/chat" },
  { key: "docs", href: "/docs" },
] as const;

export function NavBar({ active }: { active: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <nav className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-11 sm:h-12 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <a
              key={link.key}
              href={`/${locale}${link.href}`}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                active === link.key
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 active:bg-slate-700/50"
              }`}
            >
              {t(link.key)}
            </a>
          ))}
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
