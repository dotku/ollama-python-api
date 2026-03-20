"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NavBar } from "./NavBar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OllamaModel {
  name: string;
  size_gb: number;
}

export function ChatClient() {
  const { user, isLoading } = useUser();
  const t = useTranslations();
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available models
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        const m = data.ollama?.models || [];
        setModels(m);
        if (m.length > 0 && !selectedModel) {
          setSelectedModel(m[0].name);
        }
      })
      .catch(() => {});
  }, [selectedModel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, model: selectedModel }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error" }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err.detail || res.statusText}`,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + parsed.response,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err.message}`,
          };
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, selectedModel]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-slate-900">
      {/* Nav */}
      <NavBar active="chat" />

      {/* User bar — compact on mobile */}
      <div className="shrink-0 px-3 sm:px-6 py-1.5 sm:py-2 border-b border-slate-800 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] sm:text-xs text-slate-300 focus:outline-none focus:border-indigo-500 max-w-40 sm:max-w-none"
          >
            {models.length === 0 ? (
              <option>{t("chat.noModels")}</option>
            ) : (
              models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.size_gb}GB)
                </option>
              ))
            )}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[11px] text-slate-500 hover:text-slate-300 active:text-slate-200"
            >
              {t("chat.clearChat")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? null : user ? (
            <span className="text-[11px] text-slate-500 truncate max-w-28">
              {user.email}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">
              {t("chat.guest")}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 sm:py-24">
              <h2 className="text-base sm:text-xl text-slate-400 mb-1">
                {t("chat.title")}
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-600">
                {selectedModel || "..."}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-pre:text-[11px] sm:prose-pre:text-xs prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-code:text-[11px] sm:prose-code:text-xs text-[13px] sm:text-sm">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-slate-500 animate-pulse text-xs">
                        {t("chat.thinking")}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — safe area for mobile notch/home indicator */}
      <div className="shrink-0 border-t border-slate-700 bg-slate-800 px-3 sm:px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 sm:py-2.5 text-[13px] sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs sm:text-sm hover:bg-red-500 active:bg-red-700 shrink-0"
            >
              {t("chat.stop")}
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim() || models.length === 0}
              className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 shrink-0"
            >
              {t("chat.send")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
