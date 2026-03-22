import { NextResponse } from "next/server";

import { getSupabaseServerClient, getSupabaseServerClientForUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const accessToken = getBearerToken(request);
  const supabase = getSupabaseServerClient();

  if (!accessToken || !supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.json({ error: "Session could not be verified." }, { status: 401 });
  }

  const userId = data.user.id;
  const userClient = getSupabaseServerClientForUser(accessToken);

  if (!userClient) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: code, error: rpcError } = await userClient.rpc(
    "get_or_create_referral_code",
    { target_user_id: userId }
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ code });
}
