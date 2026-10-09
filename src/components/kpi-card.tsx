import type { Icon } from "@tabler/icons-react";

type KpiCardProps = {
  label: string;
  valor: string | number;
  sub?: string;
  color?: string;
  iconBg?: string;
  iconColor?: string;
  icon?: Icon;
};

export function KpiCard({ label, valor, sub, color = "bg-brand-500", iconBg, iconColor, icon: Icono }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[110px] relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight break-words">{valor}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${iconBg ?? "bg-brand-50"} rounded-xl flex items-center justify-center`}>
          {Icono && <Icono size={20} stroke={1.75} className={iconColor ?? "text-brand-600"} />}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color} rounded-b-2xl`} />
    </div>
  );
}
