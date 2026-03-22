import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({}, { status: 400 });
  }

  const { message, stack, location } = (body ?? {}) as Record<string, unknown>;

  console.error(
    "[client-error]",
    typeof location === "string" ? location : "",
    "\n",
    typeof message === "string" ? message : "(no message)",
    typeof stack === "string" ? `\n${stack}` : ""
  );

  return NextResponse.json({});
}
