"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  const switchLocale = (newLocale: string) => {
    // Replace current locale prefix in pathname
    const segments = pathname.split("/");
    if (routing.locales.includes(segments[1] as "en" | "zh")) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join("/"));
  };

  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            locale === l
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
