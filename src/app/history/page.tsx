"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HistoryItem {
  name: string;
  unit: string;
  quantity: number;
  image_url: string | null;
}

interface HistoryEntry {
  id: string;
  completed_at: string;
  items: HistoryItem[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("shopping_history")
        .select("id, completed_at, shopping_history_items(name, unit, quantity, image_url)")
        .order("completed_at", { ascending: false });

      if (data) {
        setHistories(
          data.map((h) => ({
            id: h.id,
            completed_at: h.completed_at,
            items: (h.shopping_history_items as HistoryItem[]) || [],
          }))
        );
      }
      setLoaded(true);
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const itemKey = (historyId: string, index: number) => `${historyId}-${index}`;

  const toggleSelect = (key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllInHistory = (historyId: string, items: HistoryItem[]) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      const keys = items.map((_, i) => itemKey(historyId, i));
      const allSelected = keys.every((k) => next.has(k));
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const getSelectedItemsData = (): HistoryItem[] => {
    const result: HistoryItem[] = [];
    for (const h of histories) {
      h.items.forEach((item, i) => {
        if (selectedItems.has(itemKey(h.id, i))) {
          result.push(item);
        }
      });
    }
    return result;
  };

  const addToCurrentList = async () => {
    const items = getSelectedItemsData();
    if (items.length === 0) return;
    setAdding(true);

    await supabase.from("shopping_items").insert(
      items.map((item) => ({
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
      <header className="sticky top-0 bg-[#181824] border-b border-[#2a2a3a] text-white px-5 py-4 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 text-2xl leading-none">
            &larr;
          </Link>
          <h1 className="text-xl font-bold text-gray-100">買い物履歴</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {histories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium text-gray-400">履歴はありません</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3 px-1">
              商品をタップして選択 → リストに追加できます
            </p>
            {histories.map((h) => (
              <div
                key={h.id}
                className="mb-3 rounded-2xl bg-[#1c1c28] border border-[#2a2a3a] shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                <div
                  onClick={() =>
                    setExpandedId(expandedId === h.id ? null : h.id)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-gray-200 text-sm">
                      {formatDate(h.completed_at)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {h.items.length}品目
                    </p>
                  </div>
                  <span
                    className={`text-gray-500 transition-transform text-sm ${
                      expandedId === h.id ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </div>
                {expandedId === h.id && (
                  <div className="flex justify-end px-4 pb-1">
                    <button
                      onClick={() => selectAllInHistory(h.id, h.items)}
                      className="text-xs text-purple-400 px-2 py-1 rounded-lg active:bg-purple-900/30"
                    >
                      全選択
                    </button>
                  </div>
                )}

                {expandedId === h.id && (
                  <div className="border-t border-[#2a2a3a] px-4 py-2">
                    {h.items.map((item, i) => {
                      const key = itemKey(h.id, i);
                      const isSelected = selectedItems.has(key);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSelect(key)}
                          className={`flex items-center gap-3 py-2.5 w-full text-left rounded-xl px-2 transition-colors ${
                            isSelected ? "bg-purple-900/30" : ""
                          }`}
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
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.unit}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-400">
                            x{item.quantity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* リストに追加ボタン（選択時のみ表示） */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14] to-transparent z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={addToCurrentList}
              disabled={adding}
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm active:bg-purple-700 transition-colors shadow-[0_4px_20px_rgba(147,51,234,0.4)] disabled:opacity-50"
            >
              {adding
                ? "追加中..."
                : `選択した${selectedItems.size}品をリストに追加`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
