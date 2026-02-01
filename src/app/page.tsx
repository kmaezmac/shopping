"use client";

import { useState, useRef } from "react";
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
    clearChecked,
    clearAll,
  } = useShoppingList();
  const [showConfirm, setShowConfirm] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  const handleAddItem = (item: Omit<ShoppingItem, "id" | "checked" | "createdAt">) => {
    addItem(item);
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const uncheckedItems = items.filter((i) => !i.checked);
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
      <header className="sticky top-0 bg-[#181824] border-b border-[#2a2a3a] text-white px-5 py-4 z-40">
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

      {/* リスト */}
      <div ref={listTopRef} />
      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-lg font-medium text-gray-400">リストは空です</p>
            <p className="text-sm mt-1 text-gray-600">下の＋ボタンから追加してください</p>
          </div>
        ) : (
          <>
            {/* 未チェック */}
            {uncheckedItems.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onToggleCheck={toggleCheck}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}

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
                    onRemove={removeItem}
                  />
                ))}
              </>
            )}

            {/* 買い物完了ボタン */}
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full mt-6 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:bg-green-700 transition-colors shadow-[0_4px_16px_rgba(34,197,94,0.3)]"
            >
              買い物完了
            </button>
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
              現在のリスト（{items.length}件）を履歴に保存してリストをクリアします。
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
