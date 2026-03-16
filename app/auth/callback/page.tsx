import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Card, buttonClasses } from "@/components/ui";

export default function AuthCallbackPage() {
  return (
    <AppShell
      title="Almost there"
      subtitle="This page sends you back to your diary after sign-in."
      showFab={false}
    >
      <Card className="space-y-4">
        <p className="text-sm leading-6 text-cocoa">
          If you land here during sign-in, you can head back to your diary and keep going.
        </p>
        <Link href="/settings" className={buttonClasses("primary", "w-full")}>
          Back to settings
        </Link>
      </Card>
    </AppShell>
  );
}
