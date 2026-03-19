"use client";

interface StatusCardProps {
  title: string;
  children: React.ReactNode;
}

export function StatusCard({ title, children }: StatusCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function Stat({ value }: { value: string | number }) {
  return (
    <div className="text-3xl font-bold text-slate-50">{value}</div>
  );
}

export function StatSm({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-500 mt-1">{children}</div>;
}

export function Badge({
  variant,
  children,
}: {
  variant: "green" | "red" | "yellow";
  children: React.ReactNode;
}) {
  const colors = {
    green: "bg-emerald-900 text-emerald-400",
    red: "bg-red-950 text-red-400",
    yellow: "bg-amber-950 text-amber-400",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent > 85
      ? "bg-red-500"
      : percent > 60
        ? "bg-amber-500"
        : "bg-cyan-400";
  return (
    <div className="bg-slate-700 rounded-md h-2 mt-2 overflow-hidden">
      <div
        className={`h-full rounded-md transition-all duration-500 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
