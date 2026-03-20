"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NavBar } from "./NavBar";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-950 rounded-lg p-2.5 sm:p-4 overflow-x-auto text-[11px] sm:text-sm text-slate-300 font-mono leading-relaxed">
      {children}
    </pre>
  );
}

function MethodBadge({ children, color }: { children: string; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-950 text-emerald-400",
    blue: "bg-indigo-950 text-indigo-400",
    red: "bg-red-950 text-red-400",
    gray: "bg-slate-700 text-slate-300",
  };
  return (
    <span
      className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${colors[color] || colors.gray}`}
    >
      {children}
    </span>
  );
}

function ParamRow({
  name,
  type,
  required,
  desc,
  reqLabel,
  optLabel,
}: {
  name: string;
  type: string;
  required: boolean;
  desc: string;
  reqLabel: string;
  optLabel: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-1.5 shrink-0 sm:w-40">
        <code className="text-[11px] sm:text-sm text-indigo-400">{name}</code>
        <span className="text-[10px] text-slate-500">{type}</span>
        <span
          className={`text-[9px] sm:text-[10px] ${required ? "text-red-400" : "text-slate-600"}`}
        >
          {required ? reqLabel : optLabel}
        </span>
      </div>
      <span className="text-[11px] sm:text-sm text-slate-400">{desc}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm sm:text-base font-semibold text-slate-100 mb-2">
      {children}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 mb-1">
      {children}
    </p>
  );
}

export function DocsClient() {
  const t = useTranslations();
  const [API_URL, setApiUrl] = useState("");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setApiUrl(data.api_url || window.location.origin);
      })
      .catch(() => {
        setApiUrl(window.location.origin);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar active="docs" />

      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-8 sm:pt-6 sm:pb-12">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <h1 className="text-lg sm:text-2xl font-semibold text-slate-50">
            {t("docs.title")}
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5">
            {t("docs.subtitle")}
          </p>
        </div>

        <div className="space-y-5 sm:space-y-8">
          {/* Base URL */}
          <section>
            <SectionTitle>{t("docs.baseUrl")}</SectionTitle>
            <CodeBlock>{API_URL}</CodeBlock>
          </section>

          {/* Authentication */}
          <section>
            <SectionTitle>{t("docs.authentication")}</SectionTitle>
            <p className="text-[11px] sm:text-sm text-slate-400 mb-3">
              {t("docs.authDesc")}
            </p>
            <div className="space-y-1.5 mb-3">
              <div className="bg-slate-800 rounded-lg p-2.5 sm:p-3 border border-slate-700 flex items-start gap-2">
                <MethodBadge color="gray">Anon</MethodBadge>
                <span className="text-[11px] sm:text-sm text-slate-300">
                  {t("docs.authAnon", { limit: "10 req/min" })}
                </span>
              </div>
              <div className="bg-slate-800 rounded-lg p-2.5 sm:p-3 border border-slate-700 flex items-start gap-2">
                <MethodBadge color="blue">Member</MethodBadge>
                <span className="text-[11px] sm:text-sm text-slate-300">
                  {t("docs.authMember", { limit: "30 req/min" })}
                </span>
              </div>
            </div>
            <CodeBlock>
              {`# Via X-API-Key header
curl -H "X-API-Key: oa-..." ${API_URL}/chat

# Via Authorization Bearer header
curl -H "Authorization: Bearer oa-..." ${API_URL}/chat`}
            </CodeBlock>
          </section>

          {/* POST /chat */}
          <section>
            <SectionTitle>
              <span className="flex items-center gap-2 flex-wrap">
                <MethodBadge color="blue">POST</MethodBadge>
                <span>/chat</span>
                <span className="text-xs text-slate-500 font-normal">
                  — {t("docs.chatEndpoint")}
                </span>
              </span>
            </SectionTitle>
            <Label>{t("docs.parameters")}</Label>
            <div className="bg-slate-800 rounded-lg p-2.5 sm:p-3 border border-slate-700 mb-3">
              <ParamRow
                name="message"
                type="string"
                required
                desc="The prompt to send to the model"
                reqLabel={t("docs.required")}
                optLabel={t("docs.optional")}
              />
              <ParamRow
                name="model"
                type="string"
                required={false}
                desc='Model name (default: "smollm:latest")'
                reqLabel={t("docs.required")}
                optLabel={t("docs.optional")}
              />
            </div>
            <Label>{t("docs.request")}</Label>
            <CodeBlock>
              {`curl -X POST "${API_URL}/chat" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: oa-your-key" \\
  -d '{
    "message": "What is machine learning?",
    "model": "smollm:latest"
  }'`}
            </CodeBlock>
            <Label>{t("docs.response")}</Label>
            <CodeBlock>
              {`{
  "user": "user_abc123",
  "tier": "member",
  "response": {
    "model": "smollm:latest",
    "response": "Machine learning is...",
    "done": true
  }
}`}
            </CodeBlock>
          </section>

          {/* POST /chat/stream */}
          <section>
            <SectionTitle>
              <span className="flex items-center gap-2 flex-wrap">
                <MethodBadge color="blue">POST</MethodBadge>
                <span>/chat/stream</span>
                <span className="text-xs text-slate-500 font-normal">
                  — {t("docs.chatStreamEndpoint")}
                </span>
              </span>
            </SectionTitle>
            <p className="text-[11px] sm:text-sm text-slate-400 mb-3">
              Same parameters as /chat. Returns newline-delimited JSON.
            </p>
            <Label>{t("docs.request")}</Label>
            <CodeBlock>
              {`curl -X POST "${API_URL}/chat/stream" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello", "model": "smollm:latest"}'`}
            </CodeBlock>
            <Label>{t("docs.response")}</Label>
            <CodeBlock>
              {`{"model":"smollm:latest","response":"Hello","done":false}
{"model":"smollm:latest","response":"!","done":false}
{"model":"smollm:latest","response":"","done":true}`}
            </CodeBlock>
          </section>

          {/* GET /api/status */}
          <section>
            <SectionTitle>
              <span className="flex items-center gap-2 flex-wrap">
                <MethodBadge color="green">GET</MethodBadge>
                <span>/api/status</span>
                <span className="text-xs text-slate-500 font-normal">
                  — {t("docs.statusEndpoint")}
                </span>
              </span>
            </SectionTitle>
            <Label>{t("docs.request")}</Label>
            <CodeBlock>{`curl "${API_URL}/api/status"`}</CodeBlock>
            <Label>{t("docs.response")}</Label>
            <CodeBlock>
              {`{
  "server": { "uptime_seconds": 3600, "uptime_human": "1h 0m" },
  "system": {
    "ram_total_gb": 8.0, "ram_used_gb": 5.2,
    "ram_percent": 65.0, "cpu_percent": 12.5
  },
  "ollama": {
    "online": true,
    "models": [{ "name": "smollm:latest", "size_gb": 1.0 }]
  },
  "usage": {
    "total_requests": 142,
    "active_anonymous_ips": 3,
    "anon_rate_limit": "10 req / 60s",
    "member_rate_limit": "30 req / 60s"
  }
}`}
            </CodeBlock>
          </section>

          {/* GET /api/usage */}
          <section>
            <SectionTitle>
              <span className="flex items-center gap-2 flex-wrap">
                <MethodBadge color="green">GET</MethodBadge>
                <span>/api/usage</span>
                <span className="text-xs text-slate-500 font-normal">
                  — {t("docs.usageEndpoint")}
                </span>
              </span>
            </SectionTitle>
            <div className="bg-slate-800 rounded-lg p-2.5 sm:p-3 border border-slate-700 mb-3">
              <ParamRow
                name="limit"
                type="int"
                required={false}
                desc="Number of log entries (default: 50)"
                reqLabel={t("docs.required")}
                optLabel={t("docs.optional")}
              />
              <ParamRow
                name="user_id"
                type="string"
                required={false}
                desc="Filter by user ID"
                reqLabel={t("docs.required")}
                optLabel={t("docs.optional")}
              />
            </div>
            <CodeBlock>{`curl "${API_URL}/api/usage?limit=10"`}</CodeBlock>
          </section>

          {/* API Key Management */}
          <section>
            <SectionTitle>{t("docs.keysEndpoint")}</SectionTitle>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MethodBadge color="blue">POST</MethodBadge>
                  <span className="text-[11px] sm:text-sm text-slate-300">/api/keys — Create</span>
                </div>
                <CodeBlock>
                  {`curl -X POST "${API_URL}/api/keys?user_id=abc&name=MyKey"`}
                </CodeBlock>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MethodBadge color="green">GET</MethodBadge>
                  <span className="text-[11px] sm:text-sm text-slate-300">/api/keys — List</span>
                </div>
                <CodeBlock>{`curl "${API_URL}/api/keys?user_id=abc"`}</CodeBlock>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MethodBadge color="red">DELETE</MethodBadge>
                  <span className="text-[11px] sm:text-sm text-slate-300">/api/keys/:id — Revoke</span>
                </div>
                <CodeBlock>
                  {`curl -X DELETE "${API_URL}/api/keys/1?user_id=abc"`}
                </CodeBlock>
              </div>
            </div>
          </section>

          {/* Error Codes */}
          <section>
            <SectionTitle>{t("docs.errors")}</SectionTitle>
            <div className="space-y-1.5">
              {[
                ["401", "Invalid or revoked API key"],
                ["429", "Rate limit exceeded"],
                ["503", "Database not configured / Ollama offline"],
              ].map(([code, desc]) => (
                <div
                  key={code}
                  className="bg-slate-800 rounded-lg p-2.5 sm:p-3 border border-slate-700 flex items-center gap-2.5"
                >
                  <span className="font-mono text-[11px] sm:text-sm text-red-400 font-bold shrink-0 w-8">
                    {code}
                  </span>
                  <span className="text-[11px] sm:text-sm text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
