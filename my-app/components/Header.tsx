"use client";

import Link from "next/link";
import { BarChart3, User, Shield, Home, Target } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "text-blue-400 font-bold"
      : "text-gray-100 hover:text-blue-400";
  };

  return (
    <header className="bg-gray-800 text-gray-100 shadow-lg border-b-2 border-blue-500">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">StatsX</span>
          </Link>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link
                  href="/"
                  className={`flex items-center space-x-1 transition-colors ${isActive(
                    "/"
                  )}`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/defense-analysis"
                  className={`flex items-center space-x-1 transition-colors ${isActive(
                    "/defense-analysis"
                  )}`}
                >
                  <Shield className="w-5 h-5" />
                  <span>Defense</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/player-stats"
                  className={`flex items-center space-x-1 transition-colors ${isActive(
                    "/player-stats"
                  )}`}
                >
                  <User className="w-5 h-5" />
                  <span>Players</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/player-projections"
                  className={`flex items-center space-x-1 transition-colors ${isActive(
                    "/player-projections"
                  )}`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Projections</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/matchup-analysis"
                  className={`flex items-center space-x-1 transition-colors ${isActive(
                    "/matchup-analysis"
                  )}`}
                >
                  <Target className="w-5 h-5" />
                  <span>Matchup</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
