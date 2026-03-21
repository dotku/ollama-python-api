"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useTranslations, useLocale } from "next-intl";
import {
  StatusCard,
  Stat,
  StatSm,
  Badge,
  ProgressBar,
} from "./StatusCard";
import { UsageTable } from "./UsageTable";
import { ApiKeyManager } from "./ApiKeyManager";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavBar } from "./NavBar";

interface StatusData {
  server?: { uptime_human: string };
  system?: {
    ram_total_gb: number;
    ram_used_gb: number;
    ram_percent: number;
    cpu_percent: number;
  };
  ollama?: {
    online: boolean;
    models: { name: string; size_gb: number }[];
  };
  api_url?: string;
  usage?: {
    total_requests: number;
    unique_members: number;
    active_anonymous_ips: number;
    anon_rate_limit: string;
    member_rate_limit: string;
  };
}

interface LogEntry {
  time: string;
  user: string;
  endpoint: string;
  model: string;
  duration_ms: number;
  client_ip: string;
}

export function DashboardClient() {
  const { user, isLoading } = useUser();
  const t = useTranslations();
  const locale = useLocale();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const [statusRes, usageRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/usage?limit=30"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (usageRes.ok) {
        const data = await usageRes.json();
        setLog(data.log);
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      // silently retry on next interval
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sticky nav */}
      <NavBar active="dashboard" />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-6 sm:pt-5 sm:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-50">
              {t("dashboard.title")}
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 hidden sm:block">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdate && (
              <span className="text-[10px] text-slate-600 hidden sm:inline">
                {t("dashboard.lastUpdated", { time: lastUpdate })}
              </span>
            )}
            {isLoading ? null : user ? (
              <>
                <span className="text-[11px] text-slate-400 truncate max-w-24 sm:max-w-none hidden sm:inline">
                  {user.email}
                </span>
                <a
                  href="/auth/logout"
                  className="text-[11px] sm:text-xs text-slate-500 hover:text-slate-300"
                >
                  {t("nav.signOut")}
                </a>
              </>
            ) : (
              <a
                href="/auth/login"
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-500"
              >
                {t("nav.signIn")}
              </a>
            )}
          </div>
        </div>

        {/* Status Cards — 2 col mobile, 3 col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          <StatusCard title={t("status.ollamaStatus")} className="col-span-2 lg:col-span-1">
            {status?.ollama ? (
              <>
                <Badge variant={status.ollama.online ? "green" : "red"}>
                  {status.ollama.online ? t("status.online") : t("status.offline")}
                </Badge>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {status.ollama.models.length > 0 ? (
                    status.ollama.models.slice(0, 6).map((m) => (
                      <span
                        key={m.name}
                        className="bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]"
                      >
                        {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      {t("status.noModels")}
                    </span>
                  )}
                  {(status.ollama.models.length > 6) && (
                    <span className="text-[10px] text-slate-500">
                      +{status.ollama.models.length - 6}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <Badge variant="yellow">{t("status.connecting")}</Badge>
            )}
          </StatusCard>

          <StatusCard title={t("status.memory")}>
            <Stat value={status?.system ? `${status.system.ram_percent}%` : "-"} />
            <StatSm>
              {status?.system
                ? `${status.system.ram_used_gb} / ${status.system.ram_total_gb} GB`
                : ""}
            </StatSm>
            <ProgressBar percent={status?.system?.ram_percent || 0} />
          </StatusCard>

          <StatusCard title={t("status.cpu")}>
            <Stat value={status?.system ? `${status.system.cpu_percent}%` : "-"} />
            <ProgressBar percent={status?.system?.cpu_percent || 0} />
          </StatusCard>

          <StatusCard title={t("status.uptime")}>
            <Stat value={status?.server?.uptime_human || "-"} />
          </StatusCard>

          <StatusCard title={t("status.totalRequests")}>
            <Stat value={status?.usage?.total_requests ?? "-"} />
            <StatSm>
              {status?.usage
                ? `${t("status.anonIps", { count: status.usage.active_anonymous_ips })} · ${t("status.members", { count: status.usage.unique_members })}`
                : ""}
            </StatSm>
          </StatusCard>

          <StatusCard title={t("status.rateLimits")}>
            <div className="space-y-0.5">
              <div className="text-[11px] sm:text-sm">
                <span className="text-slate-400">{t("status.anonymous")}:</span>{" "}
                <span className="text-slate-200">
                  {status?.usage?.anon_rate_limit || "-"}
                </span>
              </div>
              <div className="text-[11px] sm:text-sm">
                <span className="text-slate-400">{t("status.member")}:</span>{" "}
                <span className="text-slate-200">
                  {status?.usage?.member_rate_limit || "-"}
                </span>
              </div>
            </div>
          </StatusCard>
        </div>

        {/* API Endpoint */}
        <ApiEndpoint apiUrl={status?.api_url} />

        {/* API Keys */}
        {user && (
          <div className="mb-4 sm:mb-6">
            <ApiKeyManager />
          </div>
        )}

        {/* Usage Log */}
        <UsageTable log={log} />
      </main>
    </div>
  );
}

function ApiEndpoint({ apiUrl: apiUrlProp }: { apiUrl?: string }) {
  const t = useTranslations("status");
  const [copied, setCopied] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  useEffect(() => {
    setApiUrl(apiUrlProp || window.location.origin);
  }, [apiUrlProp]);

  const endpoints = [
    { method: "POST", path: "/chat", desc: "Chat (JSON)" },
    { method: "POST", path: "/chat/stream", desc: "Chat (Stream)" },
    { method: "GET", path: "/api/status", desc: "Server Status" },
  ];

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3.5 sm:p-5 border border-slate-700 mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400">
          {t("apiEndpoint")}
        </h2>
        {copied && (
          <span className="text-[10px] text-emerald-400 animate-pulse">{t("copied")}</span>
        )}
      </div>

      <div className="space-y-1.5">
        {endpoints.map((ep) => {
          const fullUrl = `${apiUrl}${ep.path}`;
          return (
            <button
              key={ep.path}
              className="w-full flex items-center gap-1.5 sm:gap-2 bg-slate-900 rounded-lg p-2 sm:p-2.5 text-left active:bg-slate-800 transition-colors"
              onClick={() => copyUrl(fullUrl)}
            >
              <span
                className={`text-[9px] sm:text-[10px] font-mono font-bold px-1 sm:px-1.5 py-0.5 rounded shrink-0 ${
                  ep.method === "POST"
                    ? "bg-indigo-950 text-indigo-400"
                    : "bg-emerald-950 text-emerald-400"
                }`}
              >
                {ep.method}
              </span>
              <code className="text-[11px] sm:text-sm text-slate-300 truncate flex-1 font-mono">
                {fullUrl}
              </code>
              <span className="text-[10px] text-slate-600 hidden sm:inline shrink-0">
                {ep.desc}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 p-2 sm:p-2.5 bg-slate-900 rounded-lg">
        <p className="text-[10px] text-slate-500 mb-0.5">Example:</p>
        <code className="text-[10px] sm:text-xs text-slate-400 break-all font-mono leading-relaxed">
          curl -X POST &quot;{apiUrl}/chat&quot; -H &quot;Content-Type: application/json&quot; -d
          &#123;&quot;message&quot;:&quot;hello&quot;&#125;
        </code>
      </div>
    </div>
  );
}
