"use client";

interface LogEntry {
  time: string;
  user: string;
  endpoint: string;
  model: string;
  duration_ms: number;
  client_ip: string;
}

export function UsageTable({ log }: { log: LogEntry[] }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3">
        Recent Requests
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                Time
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                User
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                Endpoint
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                Model
              </th>
              <th className="text-left p-2 text-slate-400 border-b border-slate-700 font-medium">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-slate-500"
                >
                  No requests yet
                </td>
              </tr>
            ) : (
              log.map((entry, i) => (
                <tr key={i}>
                  <td className="p-2 border-b border-slate-800">
                    {new Date(entry.time).toLocaleTimeString()}
                  </td>
                  <td className="p-2 border-b border-slate-800">
                    {entry.user}
                  </td>
                  <td className="p-2 border-b border-slate-800">
                    {entry.endpoint}
                  </td>
                  <td className="p-2 border-b border-slate-800">
                    {entry.model || "-"}
                  </td>
                  <td className="p-2 border-b border-slate-800">
                    {entry.duration_ms}ms
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
