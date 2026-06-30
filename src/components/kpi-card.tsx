type KpiCardProps = {
  label: string;
  valor: string | number;
  sub?: string;
  color?: string;
  emoji?: string;
};

export function KpiCard({ label, valor, sub, color = "bg-blue-500", emoji }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-base mb-3`}>
        {emoji}
      </div>
      <p className="text-2xl font-bold text-slate-900">{valor}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
