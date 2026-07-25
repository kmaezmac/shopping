import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { filename } = await request.json();
  const ext = (filename as string).split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from("shopping-images")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("shopping-images")
    .getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: publicUrlData.publicUrl,
  });
}
