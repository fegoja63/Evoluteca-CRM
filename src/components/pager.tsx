"use client";

export function Pager({
  page,
  take,
  total,
  onChange,
}: {
  page: number;
  take: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / take));
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm">
      <span className="text-slate-500">
        Página {page} de {totalPaginas} · {total} en total
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ← Anterior
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPaginas}
          className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
