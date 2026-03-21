"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, User } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { Spinner } from "../../components/ui/spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <Spinner />
      </div>
    );
  }

  const navItems = [
    { href: "/trips", label: "Trips", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
        <div className="mx-4 mb-4 bg-[#1A1A2E] rounded-3xl shadow-float flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex-1 tap-highlight-none">
                <div className={`flex flex-col items-center gap-1 py-2.5 px-4 rounded-2xl transition-all duration-200 ${
                  isActive ? "bg-[#FF6B35]" : "hover:bg-white/5"
                }`}>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? "text-white" : "text-white/40"}
                  />
                  <span className={`text-[10px] font-semibold tracking-wide ${
                    isActive ? "text-white" : "text-white/40"
                  }`}>
                    {item.label.toUpperCase()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
