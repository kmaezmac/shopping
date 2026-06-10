import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function PATCH(request: Request) {
  const { orders } = await request.json();
  await Promise.all(
    orders.map(({ id, sort_order }: { id: string; sort_order: number }) =>
      supabaseAdmin.from("shopping_items").update({ sort_order }).eq("id", id)
    )
  );
  return NextResponse.json({ ok: true });
}
