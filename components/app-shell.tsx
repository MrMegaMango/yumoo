import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { InstallBanner } from "@/components/install-banner";
import { buttonClasses } from "@/components/ui";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showFab?: boolean;
  fabHref?: string;
  showInstallBanner?: boolean;
  headerTrailing?: ReactNode;
};

export function AppShell({
  title,
  subtitle,
  children,
  showFab = true,
  fabHref = "/entry/new",
  showInstallBanner = true,
  headerTrailing
}: AppShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-[430px] flex-col px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="font-headline text-lg font-bold tracking-wide text-ink transition hover:text-cocoa">Yumoo</Link>
          <h1 className="mt-1 text-3xl font-semibold leading-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-xs text-sm leading-6 text-cocoa">{subtitle}</p> : null}
        </div>
        {headerTrailing}
      </header>

      {showInstallBanner ? <InstallBanner /> : null}

      <main className="flex-1 space-y-5 pb-8">{children}</main>

      {showFab ? (
        <Link
          href={fabHref}
          className={buttonClasses(
            "primary",
            "fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 shadow-lift"
          )}
        >
          + Add a meal
        </Link>
      ) : null}

      <BottomNav />
    </div>
  );
}
