"use client";

import { useState, useRef } from "react";
import { ShoppingItem } from "@/types";
import { supabase } from "@/lib/supabase";

interface Props {
  onAdd: (item: Omit<ShoppingItem, "id" | "checked" | "createdAt">) => void;
}

export default function AddItemForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("shopping-images")
      .upload(fileName, file);

    if (error) {
      console.error("画像アップロード失敗:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("shopping-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setUploading(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    onAdd({
      name: name.trim(),
      unit: unit.trim() || "個",
      quantity,
      imageUrl,
    });

    setName("");
    setUnit("");
    setQuantity(1);
    setPreviewUrl(null);
    setImageFile(null);
    setUploading(false);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-purple-600 text-white rounded-full shadow-[0_4px_20px_rgba(147,51,234,0.5)] flex items-center justify-center text-3xl z-50 active:scale-95 transition-transform"
      >
        +
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-[#1c1c28] w-full rounded-t-2xl p-5 pb-8 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-100">商品を追加</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 商品名 */}
        <input
          type="text"
          placeholder="商品名 *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 placeholder-gray-500 rounded-lg px-4 py-3 mb-3 text-base focus:outline-none focus:border-purple-500"
          autoFocus
        />

        {/* 単位と個数 */}
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="単位（例: 200g, 6枚）"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex-1 bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 placeholder-gray-500 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-[#2a2a3a] text-gray-300 text-xl font-bold active:bg-[#3a3a4a]"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-semibold text-gray-100">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-[#2a2a3a] text-gray-300 text-xl font-bold active:bg-[#3a3a4a]"
            >
              +
            </button>
          </div>
        </div>

        {/* 画像 */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {previewUrl ? (
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="プレビュー"
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setImageFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-gray-500 border border-dashed border-[#3a3a4a] rounded-lg px-4 py-3 w-full"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              画像を追加
            </button>
          )}
        </div>

        {/* 追加ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || uploading}
          className="w-full py-3 rounded-lg text-white font-bold text-base bg-purple-600 disabled:bg-[#2a2a3a] disabled:text-gray-600 active:bg-purple-700 transition-colors"
        >
          {uploading ? "追加中..." : "追加する"}
        </button>
      </div>
    </div>
  );
}
