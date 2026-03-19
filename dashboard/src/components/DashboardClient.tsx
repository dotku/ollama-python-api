"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import {
  StatusCard,
  Stat,
  StatSm,
  Badge,
  ProgressBar,
} from "./StatusCard";
import { UsageTable } from "./UsageTable";
import { ApiKeyManager } from "./ApiKeyManager";

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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            Ollama API Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitoring for your self-hosted Ollama API
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-3">
          {isLoading ? null : user ? (
            <>
              <span className="text-sm text-slate-400">{user.email}</span>
              <a
                href="/auth/logout"
                className="text-sm text-slate-500 hover:text-slate-300"
              >
                Sign out
              </a>
            </>
          ) : (
            <a
              href="/auth/login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500"
            >
              Sign in
            </a>
          )}
        </div>
      </div>

      {lastUpdate && (
        <p className="text-xs text-slate-600 text-right mb-4">
          Last updated: {lastUpdate} (auto-refresh 5s)
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatusCard title="Ollama Status">
          {status?.ollama ? (
            <>
              <Badge variant={status.ollama.online ? "green" : "red"}>
                {status.ollama.online ? "Online" : "Offline"}
              </Badge>
              <div className="mt-3 flex flex-wrap gap-1">
                {status.ollama.models.length > 0 ? (
                  status.ollama.models.map((m) => (
                    <span
                      key={m.name}
                      className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-md text-xs"
                    >
                      {m.name} ({m.size_gb}GB)
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    No models loaded
                  </span>
                )}
              </div>
            </>
          ) : (
            <Badge variant="yellow">Connecting...</Badge>
          )}
        </StatusCard>

        <StatusCard title="Memory">
          <Stat value={status?.system ? `${status.system.ram_percent}%` : "-"} />
          <StatSm>
            {status?.system
              ? `${status.system.ram_used_gb} / ${status.system.ram_total_gb} GB`
              : ""}
          </StatSm>
          <ProgressBar percent={status?.system?.ram_percent || 0} />
        </StatusCard>

        <StatusCard title="CPU">
          <Stat value={status?.system ? `${status.system.cpu_percent}%` : "-"} />
          <ProgressBar percent={status?.system?.cpu_percent || 0} />
        </StatusCard>

        <StatusCard title="Server Uptime">
          <Stat value={status?.server?.uptime_human || "-"} />
        </StatusCard>

        <StatusCard title="Total Requests">
          <Stat value={status?.usage?.total_requests ?? "-"} />
          <StatSm>
            {status?.usage
              ? `${status.usage.active_anonymous_ips} anon IPs · ${status.usage.unique_members} members`
              : ""}
          </StatSm>
        </StatusCard>

        <StatusCard title="Rate Limits">
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-slate-400">Anonymous:</span>{" "}
              <span className="text-slate-200">
                {status?.usage?.anon_rate_limit || "-"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Member:</span>{" "}
              <span className="text-slate-200">
                {status?.usage?.member_rate_limit || "-"}
              </span>
            </div>
          </div>
        </StatusCard>
      </div>

      {user && (
        <div className="mb-6">
          <ApiKeyManager />
        </div>
      )}

      <UsageTable log={log} />
    </div>
  );
}
