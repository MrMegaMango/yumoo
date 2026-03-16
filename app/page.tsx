import Link from "next/link";

import { Card, buttonClasses } from "@/components/ui";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-between px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium text-cocoa">Yumoo</p>
          <h1 className="mt-3 max-w-sm text-5xl font-semibold leading-[1.02] text-ink">
            A food diary that feels more like a sticker book than a tracker.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-cocoa">
            Log a meal in a few seconds, watch the calendar fill up, and turn the month into a
            little recap worth sharing.
          </p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(145deg,#FFF6EF_0%,#FFE5D1_100%)] p-5">
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-[20px] border border-white/70 shadow-card"
                  style={{
                    backgroundImage:
                      index % 3 === 0
                        ? "linear-gradient(145deg,#FFE5CC,#F6BA9E,#8F6F63)"
                        : index % 3 === 1
                          ? "linear-gradient(145deg,#FFF0C9,#F4D781,#7A8B53)"
                          : "linear-gradient(145deg,#FDD7D2,#F3AAA7,#8A6A82)"
                  }}
                />
              ))}
            </div>
            <div className="mt-5 rounded-[24px] bg-white/80 p-4 text-sm leading-6 text-cocoa">
              Private by default. Cute on purpose. The calendar is the main event.
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-3 pb-10">
        <Link href="/calendar" className={buttonClasses("primary", "w-full")}>
          Start my diary
        </Link>
        <Link href="/entry/new" className={buttonClasses("secondary", "w-full")}>
          Add a first meal
        </Link>
        <p className="px-2 text-center text-sm leading-6 text-cocoa">
          Start with one meal now and decide later if you want to save your diary across devices.
        </p>
      </section>
    </main>
  );
}
