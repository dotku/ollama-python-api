"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useTranslations } from "next-intl";
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
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-50 truncate">
              {t("dashboard.title")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="shrink-0 ml-2">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? null : user ? (
              <>
                <span className="text-xs sm:text-sm text-slate-400 truncate max-w-45 sm:max-w-none">
                  {user.email}
                </span>
                <a
                  href="/auth/logout"
                  className="text-xs sm:text-sm text-slate-500 hover:text-slate-300 whitespace-nowrap"
                >
                  {t("nav.signOut")}
                </a>
              </>
            ) : (
              <a
                href="/auth/login"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm hover:bg-indigo-500"
              >
                {t("nav.signIn")}
              </a>
            )}
          </div>
          {lastUpdate && (
            <p className="text-[10px] sm:text-xs text-slate-600 whitespace-nowrap">
              {t("dashboard.lastUpdated", { time: lastUpdate })}
            </p>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <StatusCard title={t("status.ollamaStatus")} className="col-span-2 lg:col-span-1">
          {status?.ollama ? (
            <>
              <Badge variant={status.ollama.online ? "green" : "red"}>
                {status.ollama.online ? t("status.online") : t("status.offline")}
              </Badge>
              <div className="mt-3 flex flex-wrap gap-1">
                {status.ollama.models.length > 0 ? (
                  status.ollama.models.map((m) => (
                    <span
                      key={m.name}
                      className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-md text-[10px] sm:text-xs"
                    >
                      {m.name} ({m.size_gb}GB)
                    </span>
                  ))
                ) : (
                  <span className="text-xs sm:text-sm text-slate-500">
                    {t("status.noModels")}
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
          <div className="space-y-1">
            <div className="text-xs sm:text-sm">
              <span className="text-slate-400">{t("status.anonymous")}:</span>{" "}
              <span className="text-slate-200">
                {status?.usage?.anon_rate_limit || "-"}
              </span>
            </div>
            <div className="text-xs sm:text-sm">
              <span className="text-slate-400">{t("status.member")}:</span>{" "}
              <span className="text-slate-200">
                {status?.usage?.member_rate_limit || "-"}
              </span>
            </div>
          </div>
        </StatusCard>
      </div>

      {/* API Keys */}
      {user && (
        <div className="mb-4 sm:mb-6">
          <ApiKeyManager />
        </div>
      )}

      {/* Usage Log */}
      <UsageTable log={log} />
    </div>
  );
}
