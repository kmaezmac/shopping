"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useShoppingList } from "@/hooks/useShoppingList";
import AddItemForm from "@/components/AddItemForm";
import ShoppingListItem from "@/components/ShoppingListItem";
import { ShoppingItem } from "@/types";

export default function Home() {
  const {
    items,
    loaded,
    addItem,
    removeItem,
    toggleCheck,
    updateQuantity,
    updateName,
    updateUnit,
    updateItemMedia,
    updateStoreCategory,
    reorderItems,
    clearChecked,
    clearAll,
  } = useShoppingList();

  const [showConfirm, setShowConfirm] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const currentOrderRef = useRef<string[]>([]);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const reorderRef = useRef(reorderItems);
  useEffect(() => { reorderRef.current = reorderItems; }, [reorderItems]);

  // items が変わったとき（ドラッグ中でなければ）表示順を同期
  useEffect(() => {
    if (!isDraggingRef.current) {
      const order = items
        .filter((i) => !i.checked)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.id);
      setDisplayOrder(order);
      currentOrderRef.current = order;
    }
  }, [items]);

  const handleDragStart = useCallback((id: string, e: React.TouchEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    currentOrderRef.current = [...displayOrder];
    setDraggingId(id);
    document.body.style.overflow = "hidden";
  }, [displayOrder]);

  useEffect(() => {
    if (!draggingId) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const currentOrder = currentOrderRef.current;
      const otherIds = currentOrder.filter((id) => id !== draggingId);

      let insertBefore = otherIds.length;
      for (let i = 0; i < otherIds.length; i++) {
        const el = itemRefs.current.get(otherIds[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (touchY < rect.top + rect.height / 2) {
          insertBefore = i;
          break;
        }
      }

      const newOrder = [...otherIds];
      newOrder.splice(insertBefore, 0, draggingId);

      if (newOrder.join(",") !== currentOrder.join(",")) {
        currentOrderRef.current = newOrder;
        setDisplayOrder([...newOrder]);
      }
    };

    const onEnd = () => {
      isDraggingRef.current = false;
      document.body.style.overflow = "";
      reorderRef.current(currentOrderRef.current);
      setDraggingId(null);
    };

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [draggingId]);

  const handleAddItem = (item: Omit<ShoppingItem, "id" | "checked" | "createdAt" | "sortOrder">) => {
    addItem(item);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const checkedItems = items.filter((i) => i.checked);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto pb-24">
      {/* ヘッダー */}
      <header className="bg-[#181824] border-b border-[#2a2a3a] text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">お買い物リスト</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {items.length}件 ・ {checkedItems.length}件完了
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="text-sm bg-[#2a2a3a] text-gray-300 px-3 py-1.5 rounded-lg active:bg-[#3a3a4a]"
            >
              履歴
            </Link>
            {checkedItems.length > 0 && (
              <button
                onClick={clearChecked}
                className="text-sm bg-[#2a2a3a] text-gray-300 px-3 py-1.5 rounded-lg active:bg-[#3a3a4a]"
              >
                完了を消す
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-lg font-medium text-gray-400">リストは空です</p>
            <p className="text-sm mt-1 text-gray-600">下の＋ボタンから追加してください</p>
          </div>
        ) : (
          <>
            {/* 未チェック（ドラッグ可） */}
            {displayOrder.map((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return null;
              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                >
                  <ShoppingListItem
                    item={item}
                    onToggleCheck={toggleCheck}
                    onUpdateQuantity={updateQuantity}
                    onUpdateName={updateName}
                    onUpdateUnit={updateUnit}
                    onUpdateItemMedia={updateItemMedia}
                    onUpdateStoreCategory={updateStoreCategory}
                    onRemove={removeItem}
                    onDragStart={handleDragStart}
                    isDragging={draggingId === item.id}
                  />
                </div>
              );
            })}

            {/* チェック済み */}
            {checkedItems.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-2 px-1">
                  <div className="h-px flex-1 bg-[#2a2a3a]" />
                  <span className="text-xs text-gray-500">
                    カゴに入れた ({checkedItems.length})
                  </span>
                  <div className="h-px flex-1 bg-[#2a2a3a]" />
                </div>
                {checkedItems.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onToggleCheck={toggleCheck}
                    onUpdateQuantity={updateQuantity}
                    onUpdateName={updateName}
                    onUpdateUnit={updateUnit}
                    onUpdateItemMedia={updateItemMedia}
                    onUpdateStoreCategory={updateStoreCategory}
                    onRemove={removeItem}
                  />
                ))}
              </>
            )}

            {/* 買い物完了ボタン（チェック済みがある時のみ） */}
            {checkedItems.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full mt-6 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:bg-green-700 transition-colors shadow-[0_4px_16px_rgba(34,197,94,0.3)]"
              >
                買い物完了
              </button>
            )}
          </>
        )}
      </div>

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-[#1c1c28] border border-[#2a2a3a] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-gray-100 font-bold text-base mb-2">
              買い物を完了しますか？
            </p>
            <p className="text-gray-500 text-sm mb-5">
              チェック済みの{checkedItems.length}件を履歴に保存して削除します。
              未チェックの商品はリストに残ります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#3a3a4a] text-gray-400 font-semibold text-sm active:bg-[#2a2a3a]"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  await clearAll();
                  setShowConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm active:bg-green-700"
              >
                完了する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 追加フォーム */}
      <AddItemForm onAdd={handleAddItem} />
    </main>
  );
}
