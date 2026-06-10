import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: historyItems } = await supabaseAdmin
    .from("shopping_history_items")
    .select("image_url")
    .eq("history_id", id);

  if (historyItems) {
    const fileNames = historyItems
      .map((i) => i.image_url)
      .filter((url): url is string => url !== null)
      .map((url) => url.split("/").pop())
      .filter((f): f is string => Boolean(f));
    if (fileNames.length > 0) {
      await supabaseAdmin.storage.from("shopping-images").remove(fileNames);
    }
  }

  await supabaseAdmin.from("shopping_history_items").delete().eq("history_id", id);
  await supabaseAdmin.from("shopping_history").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
