"use client";
import { signOut } from "next-auth/react";

export default function HeaderSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="hover:text-brand-600"
    >
      로그아웃
    </button>
  );
}
