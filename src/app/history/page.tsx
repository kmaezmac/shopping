"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HistoryProduct {
  name: string;
  unit: string;
  quantity: number;
  image_url: string | null;
  lastUsed: number;
}

export default function HistoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<HistoryProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [swipeState, setSwipeState] = useState<{ name: string; offsetX: number; swiping: boolean } | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("shopping_history")
        .select("completed_at, shopping_history_items(name, unit, quantity, image_url)")
        .order("completed_at", { ascending: false });

      if (data) {
        const productMap = new Map<string, HistoryProduct>();
        for (const h of data) {
          const items = (h.shopping_history_items as { name: string; unit: string; quantity: number; image_url: string | null }[]) || [];
          const ts = new Date(h.completed_at).getTime();
          for (const item of items) {
            if (!productMap.has(item.name)) {
              productMap.set(item.name, {
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                image_url: item.image_url,
                lastUsed: ts,
              });
            }
          }
        }
        setProducts(Array.from(productMap.values()));
      }
      setLoaded(true);
    };
    fetchData();
  }, []);

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedNames((prev) => {
      if (prev.size === products.length) {
        return new Set();
      }
      return new Set(products.map((p) => p.name));
    });
  };

  const removeProduct = async (productName: string) => {
    // UIから即削除
    setProducts((prev) => prev.filter((p) => p.name !== productName));
    setSelectedNames((prev) => {
      const next = new Set(prev);
      next.delete(productName);
      return next;
    });
    setSwipeState(null);

    // 該当商品名のhistory_itemsを取得（image_urlも取得）
    const { data: historyItems } = await supabase
      .from("shopping_history_items")
      .select("id, history_id, image_url")
      .eq("name", productName);

    if (historyItems && historyItems.length > 0) {
      // Storageから画像を削除
      const imageUrls = historyItems
        .map((item) => item.image_url)
        .filter((url): url is string => url !== null);

      if (imageUrls.length > 0) {
        const fileNames = imageUrls
          .map((url) => {
            const parts = url.split("/");
            return parts[parts.length - 1];
          })
          .filter(Boolean);

        if (fileNames.length > 0) {
          await supabase.storage.from("shopping-images").remove(fileNames);
        }
      }

      // history_itemsから削除
      await supabase
        .from("shopping_history_items")
        .delete()
        .eq("name", productName);

      // 空になったhistoryレコードを削除
      const historyIds = [...new Set(historyItems.map((item) => item.history_id))];
      for (const historyId of historyIds) {
        const { count } = await supabase
          .from("shopping_history_items")
          .select("id", { count: "exact", head: true })
          .eq("history_id", historyId);

        if (count === 0) {
          await supabase.from("shopping_history").delete().eq("id", historyId);
        }
      }
    }
  };

  const handleTouchStart = (name: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipeState({ name, offsetX: 0, swiping: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) {
      setSwipeState((prev) => prev ? { ...prev, offsetX: Math.max(diff, -120) } : null);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeState) return;
    if (swipeState.offsetX < -80) {
      removeProduct(swipeState.name);
    } else {
      setSwipeState(null);
    }
  };

  const addToCurrentList = async () => {
    const selected = products.filter((p) => selectedNames.has(p.name));
    if (selected.length === 0) return;
    setAdding(true);

    await supabase.from("shopping_items").insert(
      selected.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        image_url: item.image_url,
      }))
    );

    setAdding(false);
    router.push("/");
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto pb-24">
      <header className="bg-[#181824] border-b border-[#2a2a3a] text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 text-2xl leading-none">
              &larr;
            </Link>
            <h1 className="text-xl font-bold text-gray-100">買い物履歴</h1>
          </div>
          {products.length > 0 && (
            <button
              onClick={selectAll}
              className="text-xs text-purple-400 px-3 py-1.5 rounded-lg active:bg-purple-900/30 border border-[#3a3a4a]"
            >
              {selectedNames.size === products.length ? "全解除" : "全選択"}
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium text-gray-400">履歴はありません</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3 px-1">
              タップで選択 ・ 左スワイプで削除
            </p>
            <div className="space-y-2">
              {products.map((product) => {
                const isSelected = selectedNames.has(product.name);
                const isSwiping = swipeState?.name === product.name;
                const offsetX = isSwiping ? swipeState.offsetX : 0;

                return (
                  <div key={product.name} className="relative overflow-hidden rounded-2xl">
                    {/* 削除背景 */}
                    <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-2xl">
                      <span className="text-white font-bold text-sm">削除</span>
                    </div>

                    <div
                      onClick={() => {
                        if (!isSwiping || offsetX === 0) toggleSelect(product.name);
                      }}
                      onTouchStart={(e) => handleTouchStart(product.name, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`swipe-item ${isSwiping && swipeState.swiping ? "swiping" : ""} relative flex items-center gap-3 w-full text-left rounded-2xl p-3 transition-colors border cursor-pointer ${
                        isSelected
                          ? "bg-purple-900/30 border-purple-700"
                          : "bg-[#1c1c28] border-[#2a2a3a]"
                      }`}
                      style={{ transform: `translateX(${offsetX}px)` }}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-purple-500 border-purple-500"
                            : "border-[#4a4a5a]"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">{product.unit}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-400">
                        x{product.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedNames.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14] to-transparent z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={addToCurrentList}
              disabled={adding}
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm active:bg-purple-700 transition-colors shadow-[0_4px_20px_rgba(147,51,234,0.4)] disabled:opacity-50"
            >
              {adding
                ? "追加中..."
                : `選択した${selectedNames.size}品をリストに追加`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
