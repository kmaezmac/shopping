"use client";

import { useRef, useState } from "react";
import { ShoppingItem } from "@/types";
import { supabase } from "@/lib/supabase";

interface Props {
  item: ShoppingItem;
  onToggleCheck: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdateName: (id: string, newName: string) => void;
  onUpdateItemMedia: (id: string, imageUrl: string | null, url: string | null) => void;
  onUpdateStoreCategory: (id: string, store: string | null, category: string | null) => void;
  onRemove: (id: string) => void;
  onDragStart?: (id: string, e: React.TouchEvent) => void;
  isDragging?: boolean;
}

export default function ShoppingListItem({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onUpdateName,
  onUpdateItemMedia,
  onUpdateStoreCategory,
  onRemove,
  onDragStart,
  isDragging,
}: Props) {
  const [showImage, setShowImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editUrl, setEditUrl] = useState(item.url ?? "");
  const [editStore, setEditStore] = useState(item.store ?? "");
  const [editCategory, setEditCategory] = useState(item.category ?? "");
  const [editPreview, setEditPreview] = useState<string | null>(item.imageUrl);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    setEditName(item.name);
    setEditUrl(item.url ?? "");
    setEditStore(item.store ?? "");
    setEditCategory(item.category ?? "");
    setEditPreview(item.imageUrl);
    setEditFile(null);
    setIsEditing(true);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);

    if (editName.trim() !== item.name) {
      await onUpdateName(item.id, editName.trim());
    }

    let newImageUrl = item.imageUrl;
    if (editFile) {
      const ext = editFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("shopping-images")
        .upload(fileName, editFile);
      if (!error) {
        const { data } = supabase.storage.from("shopping-images").getPublicUrl(fileName);
        newImageUrl = data.publicUrl;
        if (item.imageUrl) {
          const oldFile = item.imageUrl.split("/").pop();
          if (oldFile) await supabase.storage.from("shopping-images").remove([oldFile]);
        }
      }
    } else if (editPreview === null && item.imageUrl) {
      const oldFile = item.imageUrl.split("/").pop();
      if (oldFile) await supabase.storage.from("shopping-images").remove([oldFile]);
      newImageUrl = null;
    }

    const newUrl = editUrl.trim() || null;
    if (newImageUrl !== item.imageUrl || newUrl !== item.url) {
      await onUpdateItemMedia(item.id, newImageUrl, newUrl);
    }

    const newStore = editStore.trim() || null;
    const newCategory = editCategory.trim() || null;
    if (newStore !== item.store || newCategory !== item.category) {
      await onUpdateStoreCategory(item.id, newStore, newCategory);
    }

    setSaving(false);
    setIsEditing(false);
  };

  return (
    <>
      <div
        className={`rounded-2xl px-3 py-2.5 flex items-center gap-2 border mb-2 transition-all ${
          isDragging
            ? "border-purple-500 shadow-[0_4px_20px_rgba(147,51,234,0.4)] scale-[1.02] opacity-80"
            : item.checked
            ? "checked-item bg-[#1a1a24] border-[#2a2a3a]"
            : "bg-[#1c1c28] border-[#2a2a3a] shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
        }`}
      >
        {/* ドラッグハンドル (未チェックのみ) */}
        {!item.checked && onDragStart && (
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              onDragStart(item.id, e);
            }}
            className="touch-none flex-shrink-0 flex items-center justify-center w-5 self-stretch cursor-grab active:cursor-grabbing text-gray-600 select-none"
          >
            <svg width="10" height="18" viewBox="0 0 10 18" fill="currentColor">
              <circle cx="2.5" cy="2.5" r="1.8" />
              <circle cx="7.5" cy="2.5" r="1.8" />
              <circle cx="2.5" cy="9" r="1.8" />
              <circle cx="7.5" cy="9" r="1.8" />
              <circle cx="2.5" cy="15.5" r="1.8" />
              <circle cx="7.5" cy="15.5" r="1.8" />
            </svg>
          </div>
        )}

        {/* チェックボックス */}
        <button
          onClick={() => onToggleCheck(item.id)}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            item.checked ? "bg-green-500 border-green-500" : "border-[#4a4a5a]"
          }`}
        >
          {item.checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* 商品情報（名前フル幅＋メタ行） */}
        <div className="flex-1 min-w-0">
          {/* 商品名：常にフル幅 */}
          <button
            onClick={openEdit}
            className="item-name font-semibold text-gray-100 text-[14px] text-left w-full leading-snug"
            style={{ wordBreak: "break-word" }}
          >
            {item.name}
          </button>

          {/* メタ行：画像サムネイル＋単位・店舗・カテゴリ・URL */}
          <div className="flex items-center gap-2 mt-1">
            {item.imageUrl && (
              <button
                onClick={() => setShowImage(true)}
                className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-[#2a2a3a]"
              >
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-500">{item.unit}</span>
                {item.store && (
                  <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/60 px-1.5 py-0.5 rounded-full leading-none">
                    {item.store}
                  </span>
                )}
                {item.category && (
                  <span className="text-xs text-gray-600">{item.category}</span>
                )}
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-xs text-purple-400 mt-0.5 underline underline-offset-2"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  リンク
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 右側コントロール（横並び） */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 rounded-full bg-red-900/30 text-red-400 border border-red-800/60 flex items-center justify-center active:bg-red-900/60 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => onUpdateQuantity(item.id, -1)}
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors bg-[#2a2a3a] text-gray-300 border border-[#3a3a4a] active:bg-[#3a3a4a] text-base"
          >
            −
          </button>
          <span className="w-6 text-center font-bold text-gray-100 text-sm">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="w-7 h-7 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800 flex items-center justify-center font-bold active:bg-purple-900/60 transition-colors text-base"
          >
            +
          </button>
        </div>
      </div>

      {/* 画像拡大表示 */}
      {showImage && item.imageUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowImage(false)}
        >
          <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      {/* 編集モーダル */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-[#1c1c28] border border-[#2a2a3a] w-full rounded-t-2xl p-5 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-100 font-bold text-base">商品を編集</p>
              <button onClick={() => setIsEditing(false)} className="text-gray-500 text-2xl leading-none">×</button>
            </div>

            {/* 商品名 */}
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 rounded-lg px-4 py-3 mb-3 text-base focus:outline-none focus:border-purple-500"
              autoFocus
              placeholder="商品名"
            />

            {/* 店舗名・カテゴリ */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="店舗名（任意）"
                value={editStore}
                onChange={(e) => setEditStore(e.target.value)}
                className="flex-1 bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 placeholder-gray-500 rounded-lg px-3 py-3 text-base focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="カテゴリ（任意）"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="flex-1 bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 placeholder-gray-500 rounded-lg px-3 py-3 text-base focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* URL */}
            <input
              type="url"
              placeholder="URL（任意）"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="w-full bg-[#2a2a3a] border border-[#3a3a4a] text-gray-100 placeholder-gray-500 rounded-lg px-4 py-3 mb-3 text-base focus:outline-none focus:border-purple-500"
            />

            {/* 画像 */}
            <div className="mb-4">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleEditImageChange} />
              {editPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative inline-block">
                    <img src={editPreview} alt="プレビュー" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => {
                        setEditPreview(null);
                        setEditFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-purple-400 px-3 py-2 rounded-lg border border-[#3a3a4a] active:bg-[#2a2a3a]"
                  >
                    画像を変更
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-gray-500 border border-dashed border-[#3a3a4a] rounded-lg px-4 py-3 w-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  画像を追加
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#3a3a4a] text-gray-400 font-semibold text-sm active:bg-[#2a2a3a]"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editName.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm active:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
