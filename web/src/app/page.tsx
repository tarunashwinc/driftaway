"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/authStore";
import { Spinner } from "../components/ui/spinner";

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/trips");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <Spinner />
    </div>
  );
}
