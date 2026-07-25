const MAX_PX = 1400;
const JPEG_QUALITY = 0.82;

async function resizeToJpeg(file: File | Blob, name: string): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > MAX_PX || h > MAX_PX) {
        if (w > h) { h = Math.round((h * MAX_PX) / w); w = MAX_PX; }
        else        { w = Math.round((w * MAX_PX) / h); h = MAX_PX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          const outName = name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob ?? file], outName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(new File([file], name)); };
    img.src = url;
  });
}

export async function normalizeImageFile(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    return resizeToJpeg(blob, file.name);
  }

  return resizeToJpeg(file, file.name);
}
