"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) {
    return null;
  }

  const isWeekPage = pathname === "/week";
  const isListsPage = pathname?.startsWith("/lists");

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Personal Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, {session.user.name || session.user.email}!
        </p>
      </div>
      <div className="flex items-center gap-3">
        {!isWeekPage && pathname !== "/" && (
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-semibold"
          >
            📅 Today
          </Link>
        )}
        {pathname === "/" && (
          <Link
            href="/week"
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-semibold"
          >
            📅 Week View
          </Link>
        )}
        {isWeekPage && (
          <Link
            href="/"
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-semibold"
          >
            📅 Today
          </Link>
        )}
        {!isListsPage && (
          <Link
            href="/lists"
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-semibold"
          >
            📋 Lists
          </Link>
        )}
        {isListsPage && (
          <Link
            href="/lists"
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-semibold"
          >
            📋 Lists
          </Link>
        )}
        <button
          onClick={() => signOut()}
          className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-full hover:border-red-500 hover:text-red-600 transition-colors font-semibold"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
