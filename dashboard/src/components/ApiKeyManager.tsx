"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: number;
  key_preview: string;
  name: string;
  created_at: string;
  revoked: boolean;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    setLoading(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default" }),
    });
    if (res.ok) {
      const data = await res.json();
      setCreatedKey(data.key);
      setNewKeyName("");
      fetchKeys();
    }
    setLoading(false);
  };

  const revokeKey = async (keyId: number) => {
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    if (res.ok) {
      fetchKeys();
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-4">
        API Keys
      </h2>

      {createdKey && (
        <div className="mb-4 p-3 bg-emerald-950 border border-emerald-800 rounded-lg">
          <p className="text-sm text-emerald-400 mb-1">
            New API key created! Copy it now — it won&apos;t be shown again.
          </p>
          <code className="text-sm text-emerald-300 break-all">
            {createdKey}
          </code>
          <button
            className="ml-2 text-xs text-emerald-500 hover:text-emerald-400"
            onClick={() => {
              navigator.clipboard.writeText(createdKey);
            }}
          >
            Copy
          </button>
          <button
            className="ml-2 text-xs text-slate-500 hover:text-slate-400"
            onClick={() => setCreatedKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Key name (optional)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={createKey}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          Create Key
        </button>
      </div>

      <div className="space-y-2">
        {keys.length === 0 ? (
          <p className="text-sm text-slate-500">
            No API keys yet. Create one to get started.
          </p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                key.revoked ? "bg-slate-900 opacity-50" : "bg-slate-900"
              }`}
            >
              <div>
                <span className="text-sm font-medium">{key.name}</span>
                <span className="ml-2 text-xs text-slate-500 font-mono">
                  {key.key_preview}
                </span>
                <span className="ml-2 text-xs text-slate-600">
                  {new Date(key.created_at).toLocaleDateString()}
                </span>
                {key.revoked && (
                  <span className="ml-2 text-xs text-red-400">Revoked</span>
                )}
              </div>
              {!key.revoked && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Revoke
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-slate-900 rounded-lg">
        <p className="text-xs text-slate-500">
          Use your API key with the <code className="text-slate-400">x-api-key</code> header:
        </p>
        <code className="text-xs text-slate-400 mt-1 block">
          curl -H &quot;x-api-key: oa-...&quot; https://your-api/chat?q=hello
        </code>
      </div>
    </div>
  );
}
