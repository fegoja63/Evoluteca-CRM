"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

export function MobileTopBar({ tenantNombre }: { tenantNombre: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Barra superior móvil */}
      <div className="flex items-center gap-3 bg-blue-950 px-4 py-3 text-white sticky top-0 z-30">
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col gap-1 p-1"
          aria-label="Abrir menú"
        >
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
          <span className="block w-5 h-0.5 bg-white" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-xs font-bold">E</div>
          <span className="text-sm font-semibold">Evoluteca CRM</span>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar tenantNombre={tenantNombre} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
