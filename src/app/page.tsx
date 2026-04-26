"use client";

import Link from "next/link";

export default function Counter() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <Link href={'/auth'}>Login Page</Link>
    </div>
  );
}