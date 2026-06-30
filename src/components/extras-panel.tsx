type ExtrasPanelProps = {
  extras: Record<string, string> | null | undefined;
};

export function ExtrasPanel({ extras }: ExtrasPanelProps) {
  if (!extras || Object.keys(extras).length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 mt-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Datos adicionales importados
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {Object.entries(extras).map(([key, val]) => (
          <div key={key} className="flex flex-col">
            <span className="text-xs text-slate-400">{key}</span>
            <span className="text-sm text-slate-700">{val || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
