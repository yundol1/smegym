import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

interface FineRow {
  user_id: string;
  fine_amount: number;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get the authenticated user via session cookies
  const authSupabase = await createServerClient();
  const {
    data: { user: authUser },
  } = await authSupabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS and query ALL fines
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: allFines, error } = (await supabase
      .from("fines")
      .select("user_id, fine_amount")) as {
      data: FineRow[] | null;
      error: unknown;
    };

    if (error) throw error;
    if (!allFines || allFines.length === 0) {
      return NextResponse.json({
        myTotal: 0,
        avgTotal: 0,
        maxTotal: 0,
        minTotal: 0,
        percentile: 0,
        totalMembers: 0,
      });
    }

    // Aggregate totals per user
    const userTotals: Record<string, number> = {};
    for (const f of allFines) {
      userTotals[f.user_id] = (userTotals[f.user_id] ?? 0) + f.fine_amount;
    }

    const userIds = Object.keys(userTotals);
    const totals = Object.values(userTotals);
    const totalMembers = userIds.length;

    const myTotal = userTotals[authUser.id] ?? 0;
    const avgTotal = Math.round(totals.reduce((a, b) => a + b, 0) / totalMembers);
    const maxTotal = Math.max(...totals);
    const minTotal = Math.min(...totals);

    // Percentile: how many members have MORE fines than the current user
    // Lower fines = better = lower percentile number
    const membersWithMoreFines = totals.filter((t) => t > myTotal).length;
    const percentile =
      totalMembers > 1
        ? Math.round((membersWithMoreFines / (totalMembers - 1)) * 100)
        : 0;

    return NextResponse.json({
      myTotal,
      avgTotal,
      maxTotal,
      minTotal,
      percentile,
      totalMembers,
    });
  } catch (err) {
    console.error("Fine stats API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch fine stats" },
      { status: 500 }
    );
  }
}
