import Link from "next/link";

import { buttonClasses } from "@/components/ui";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col justify-between px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      {/* Hero */}
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0">
          <p className="font-headline text-lg font-bold tracking-wide text-ink">Yumoo</p>
          <h1 className="mt-4 max-w-[340px] text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ink">
            A Scrapbook For How Life Tastes Today
          </h1>
          <p className="mt-5 max-w-xs text-[15px] leading-7 text-cocoa">
            Link your daily food to your inner mood.
            <br />
            A quiet echo of how today felt.
          </p>
        </div>

        {/* Sticker-book illustration */}
        <div className="-mx-6 flex min-h-0 flex-1 items-center justify-center">
          <img
            src="/hero-sticker-book.png"
            alt="A scrapbook style food diary illustration"
            className="max-h-full w-[110%] max-w-[440px] object-contain animate-hero-float drop-shadow-[0_12px_28px_rgba(107,88,78,0.15)]"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="space-y-3 pb-2">
        <p className="text-center text-[13px] leading-6 text-cocoa">
          your story starts with one bite
        </p>
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
