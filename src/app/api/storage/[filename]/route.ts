import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  await supabaseAdmin.storage.from("shopping-images").remove([filename]);
  return NextResponse.json({ ok: true });
}
