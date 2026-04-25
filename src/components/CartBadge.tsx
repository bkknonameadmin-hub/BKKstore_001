"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

export default function CartBadge() {
  const count = useCart((s) => s.totalCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-accent-500 text-white text-[11px]">
      {count}
    </span>
  );
}
