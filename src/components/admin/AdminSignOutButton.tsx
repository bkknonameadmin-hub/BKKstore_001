"use client";
import { signOut } from "next-auth/react";

export default function AdminSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex-1 text-center px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200"
    >
      로그아웃
    </button>
  );
}
