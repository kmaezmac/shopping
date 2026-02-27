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
  onRemove: (id: string) => void;
}

export default function ShoppingListItem({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onUpdateName,
  onUpdateItemMedia,
  onRemove,
}: Props) {
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editUrl, setEditUrl] = useState(item.url ?? "");
  const [editPreview, setEditPreview] = useState<string | null>(item.imageUrl);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff < 0) setOffsetX(Math.max(diff, -120));
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -80) {
      onRemove(item.id);
    } else {
      setOffsetX(0);
    }
  };

  const openEdit = () => {
    setEditName(item.name);
    setEditUrl(item.url ?? "");
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

    // 名前更新
    if (editName.trim() !== item.name) {
      await onUpdateName(item.id, editName.trim());
    }

    // 画像・URL更新
    let newImageUrl = item.imageUrl;

    if (editFile) {
      // 新画像をアップロード
      const ext = editFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("shopping-images")
        .upload(fileName, editFile);

      if (!error) {
        const { data } = supabase.storage.from("shopping-images").getPublicUrl(fileName);
        newImageUrl = data.publicUrl;

        // 旧画像を削除
        if (item.imageUrl) {
          const oldFile = item.imageUrl.split("/").pop();
          if (oldFile) await supabase.storage.from("shopping-images").remove([oldFile]);
        }
      }
    } else if (editPreview === null && item.imageUrl) {
      // 画像を削除した場合
      const oldFile = item.imageUrl.split("/").pop();
      if (oldFile) await supabase.storage.from("shopping-images").remove([oldFile]);
      newImageUrl = null;
    }

    const newUrl = editUrl.trim() || null;
    if (newImageUrl !== item.imageUrl || newUrl !== item.url) {
      await onUpdateItemMedia(item.id, newImageUrl, newUrl);
    }

    setSaving(false);
    setIsEditing(false);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl mb-3">
        {/* 削除背景 */}
        <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-2xl">
          <span className="text-white font-bold text-sm">削除</span>
        </div>

        {/* メインカード */}
        <div
          className={`swipe-item relative rounded-2xl p-4 flex items-start gap-3 border ${swiping ? "swiping" : ""} ${
            item.checked
              ? "checked-item bg-[#1a1a24] border-[#2a2a3a]"
              : "bg-[#1c1c28] border-[#2a2a3a] shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
          }`}
          style={{ transform: `translateX(${offsetX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* チェックボックス */}
          <button
            onClick={() => onToggleCheck(item.id)}
            className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5 ${
              item.checked ? "bg-green-500 border-green-500 shadow-sm" : "border-[#4a4a5a]"
            }`}
          >
            {item.checked && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* 画像サムネイル */}
          {item.imageUrl && (
            <button
              onClick={() => setShowImage(true)}
              className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-[#2a2a3a]"
            >
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </button>
          )}

          {/* 商品情報 */}
          <div className="flex-1 min-w-0">
            <button onClick={openEdit} className="item-name font-semibold text-gray-100 text-[15px] text-left break-words w-full">
              {item.name}
            </button>
            <p className="text-xs text-gray-500 mt-0.5">{item.unit}</p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-purple-400 mt-1 underline underline-offset-2"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                リンクを開く
              </a>
            )}
          </div>

          {/* 数量コントロール */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors shadow-sm ${
                item.quantity <= 1
                  ? "bg-red-900/40 text-red-400 border border-red-800 active:bg-red-900/60"
                  : "bg-[#2a2a3a] text-gray-300 border border-[#3a3a4a] active:bg-[#3a3a4a]"
              }`}
            >
              {item.quantity <= 1 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : "−"}
            </button>
            <span className="w-7 text-center font-bold text-gray-100">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-8 h-8 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800 flex items-center justify-center text-lg font-bold active:bg-purple-900/60 transition-colors shadow-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 画像拡大表示 */}
      {showImage && item.imageUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setShowImage(false)}>
          <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      {/* 編集モーダル */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-[#1c1c28] border border-[#2a2a3a] w-full rounded-t-2xl p-5 pb-8 animate-slide-up">
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
            />

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
                      onClick={() => { setEditPreview(null); setEditFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >×</button>
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
