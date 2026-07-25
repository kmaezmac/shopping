export async function uploadImage(file: File): Promise<string | null> {
  const signRes = await fetch("/api/storage/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name }),
  });
  if (!signRes.ok) return null;
  const { signedUrl, publicUrl } = await signRes.json();

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!uploadRes.ok) return null;

  return publicUrl as string;
}
