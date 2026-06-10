import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("shopping_history")
    .select("id, completed_at, shopping_history_items(name, unit, quantity, image_url, store, category)")
    .order("completed_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { checkedItems, checkedIds } = await request.json();

  const { data: history, error: historyError } = await supabaseAdmin
    .from("shopping_history")
    .insert({})
    .select()
    .single();
  if (historyError || !history) {
    return NextResponse.json({ error: historyError?.message }, { status: 500 });
  }

  await supabaseAdmin.from("shopping_history_items").insert(
    checkedItems.map((item: {
      name: string; unit: string; quantity: number;
      imageUrl: string | null; url: string | null;
      store: string | null; category: string | null;
    }) => ({
      history_id: history.id,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      image_url: item.imageUrl,
      url: item.url,
      store: item.store,
      category: item.category,
    }))
  );

  await supabaseAdmin.from("shopping_items").delete().in("id", checkedIds);

  return NextResponse.json({ ok: true });
}
