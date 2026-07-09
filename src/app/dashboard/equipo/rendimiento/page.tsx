"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RendimientoPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/equipo"); }, [router]);
  return null;
}
