"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const items = [
  { href: "/scrapbook", label: "Scrapbook", match: "/scrapbook" },
  { href: "/calendar", label: "Stacks", match: "/calendar" },
  { href: "/settings", label: "Settings", match: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-3 rounded-[28px] border border-white/80 bg-white/90 p-2 shadow-lift backdrop-blur">
        {items.map((item) => {
          const active = pathname.startsWith(item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-[20px] px-3 py-3 text-center text-sm font-medium transition",
                active ? "bg-ink text-white" : "text-cocoa hover:bg-cream"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

