"use client";

import { useTranslations } from "next-intl";

interface LogEntry {
  time: string;
  user: string;
  endpoint: string;
  model: string;
  duration_ms: number;
  client_ip: string;
}

export function UsageTable({ log }: { log: LogEntry[] }) {
  const t = useTranslations("usage");

  return (
    <div className="bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-700">
      <h2 className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 mb-3">
        {t("title")}
      </h2>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                {t("time")}
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                {t("user")}
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                {t("endpoint")}
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                {t("model")}
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                {t("duration")}
              </th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  {t("noRequests")}
                </td>
              </tr>
            ) : (
              log.map((entry, i) => (
                <tr key={i}>
                  <td className="p-2 border-b border-slate-800">
                    {new Date(entry.time).toLocaleTimeString()}
                  </td>
                  <td className="p-2 border-b border-slate-800">{entry.user}</td>
                  <td className="p-2 border-b border-slate-800">{entry.endpoint}</td>
                  <td className="p-2 border-b border-slate-800">{entry.model || "-"}</td>
                  <td className="p-2 border-b border-slate-800">{entry.duration_ms}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {log.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500">
            {t("noRequests")}
          </p>
        ) : (
          log.map((entry, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-300">
                  {entry.endpoint}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(entry.time).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">{entry.model || "-"}</span>
                <span className="text-slate-500">{entry.duration_ms}ms</span>
              </div>
              <div className="text-[10px] text-slate-600 truncate">{entry.user}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
