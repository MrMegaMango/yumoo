import Link from "next/link";

import { buttonClasses } from "@/components/ui";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-between px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
      {/* Hero */}
      <section className="space-y-8">
        <div>
          <p className="text-sm font-medium text-cocoa">Yumoo</p>
          <h1 className="mt-4 max-w-[340px] text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink">
            A food diary that feels more like a sticker book than a tracker.
          </h1>
          <p className="mt-5 max-w-xs text-[15px] leading-7 text-cocoa">
            Log a meal in a few seconds, watch the calendar fill up, and turn the month into a
            little recap worth sharing.
          </p>
        </div>

        {/* Sticker-book illustration */}
        <div className="-mx-6 flex items-center justify-center [perspective:800px]">
          <img
            src="/hero-sticker-book.png"
            alt="A sticker-book style food diary illustration"
            className="w-[110%] max-w-[440px] animate-hero-float drop-shadow-[0_20px_40px_rgba(107,88,78,0.2)]"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 space-y-3 pb-10">
        <Link href="/entry/new" className={buttonClasses("primary", "w-full")}>
          Snap today's meal 📸
        </Link>
        <p className="px-2 text-center text-[13px] leading-6 text-cocoa">
          Start with one meal now and decide later if you want to save your diary across devices.
        </p>
      </section>
    </main>
  );
}
