type KpiCardProps = {
  label: string;
  valor: string | number;
  sub?: string;
  color?: string;
  iconBg?: string;
  emoji?: string;
};

export function KpiCard({ label, valor, sub, color = "bg-blue-500", iconBg = "bg-blue-50", emoji }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900 leading-tight">{valor}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center text-xl`}>
          {emoji}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color} rounded-b-2xl`} />
    </div>
  );
}
