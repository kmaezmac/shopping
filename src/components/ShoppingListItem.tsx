"use client";

import { useRef, useState } from "react";
import { ShoppingItem } from "@/types";

interface Props {
  item: ShoppingItem;
  onToggleCheck: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export default function ShoppingListItem({
  item,
  onToggleCheck,
  onUpdateQuantity,
  onRemove,
}: Props) {
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff < 0) {
      setOffsetX(Math.max(diff, -120));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -80) {
      onRemove(item.id);
    } else {
      setOffsetX(0);
    }
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
          className={`swipe-item relative rounded-2xl p-4 flex items-center gap-3 border ${
            swiping ? "swiping" : ""
          } ${
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
            className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
              item.checked
                ? "bg-green-500 border-green-500 shadow-sm"
                : "border-[#4a4a5a] hover:border-purple-400"
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
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </button>
          )}

          {/* 商品情報 */}
          <div className="flex-1 min-w-0">
            <p className="item-name font-semibold text-gray-100 truncate text-[15px]">
              {item.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.unit}</p>
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
            <span className="w-7 text-center font-bold text-gray-100">
              {item.quantity}
            </span>
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
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowImage(false)}
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            className="max-w-full max-h-full rounded-xl"
          />
        </div>
      )}
    </>
  );
}
