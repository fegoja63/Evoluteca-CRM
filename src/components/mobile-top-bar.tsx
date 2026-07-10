"use client";

import { useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import { Sidebar } from "./sidebar";

export function MobileTopBar({ tenantNombre }: { tenantNombre: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Barra superior móvil */}
      <div className="flex items-center gap-3 bg-brand-950 px-4 py-3 text-white sticky top-0 z-30">
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-brand-200 hover:text-white"
          aria-label="Abrir menú"
        >
          <IconMenu2 size={22} stroke={1.75} />
        </button>
        <img src="/Logo Evoluteca.png" alt="Evoluteca" className="h-5 w-auto object-contain" />
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
