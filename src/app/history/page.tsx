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
  store: string | null;
  category: string | null;
}

interface HistorySession {
  id: string;
  completedAt: number;
  items: HistoryItem[];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // selected: Map<sessionId, Set<itemIndex>>
  const [selected, setSelected] = useState<Map<string, Set<number>>>(new Map());

  const totalSelected = [...selected.values()].reduce((sum, s) => sum + s.size, 0);

  const toggleItem = (sessionId: string, idx: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(sessionId) ?? []);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      if (set.size === 0) next.delete(sessionId);
      else next.set(sessionId, set);
      return next;
    });
  };

  const getSelectedItems = () => {
    const items: HistoryItem[] = [];
    for (const [sessionId, indices] of selected) {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) continue;
      for (const idx of indices) {
        if (session.items[idx]) items.push(session.items[idx]);
      }
    }
    return items;
  };

  const addSelected = async () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    setAdding("selected");
    await supabase.from("shopping_items").insert(
      items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        image_url: item.image_url,
        store: item.store,
        category: item.category,
      }))
    );
    setAdding(null);
    router.push("/");
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("shopping_history")
        .select(
          "id, completed_at, shopping_history_items(name, unit, quantity, image_url, store, category)"
        )
        .order("completed_at", { ascending: false });

      if (data) {
        setSessions(
          data.map((h) => ({
            id: h.id,
            completedAt: new Date(h.completed_at).getTime(),
            items: (
              h.shopping_history_items as HistoryItem[]
            ) || [],
          }))
        );
      }
      setLoaded(true);
    };
    fetchData();
  }, []);

  const restoreSession = async (session: HistorySession) => {
    if (adding) return;
    setAdding(session.id);
    await supabase.from("shopping_items").insert(
      session.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        image_url: item.image_url,
        store: item.store,
        category: item.category,
      }))
    );
    setAdding(null);
    router.push("/");
  };

  const deleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);

    const { data: historyItems } = await supabase
      .from("shopping_history_items")
      .select("image_url")
      .eq("history_id", sessionId);

    if (historyItems) {
      const fileNames = historyItems
        .map((i) => i.image_url)
        .filter((url): url is string => url !== null)
        .map((url) => url.split("/").pop())
        .filter((f): f is string => Boolean(f));
      if (fileNames.length > 0) {
        await supabase.storage.from("shopping-images").remove(fileNames);
      }
    }

    await supabase.from("shopping_history_items").delete().eq("history_id", sessionId);
    await supabase.from("shopping_history").delete().eq("id", sessionId);

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setDeletingId(null);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 日付ごとにグループ化
  const grouped: Record<string, HistorySession[]> = {};
  for (const session of sessions) {
    const date = formatDate(session.completedAt);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(session);
  }
  const dateKeys = Object.keys(grouped);

  return (
    <main className="max-w-lg mx-auto pb-24">
      <header className="bg-[#181824] border-b border-[#2a2a3a] text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 text-2xl leading-none">
            &larr;
          </Link>
          <h1 className="text-xl font-bold text-gray-100">買い物履歴</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium text-gray-400">履歴はありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateKeys.map((date) => (
              <div key={date}>
                {/* 日付ヘッダー */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-[#2a2a3a]" />
                  <span className="text-xs font-medium text-gray-400 px-2">{date}</span>
                  <div className="h-px flex-1 bg-[#2a2a3a]" />
                </div>

                <div className="space-y-3">
                  {grouped[date].map((session) => (
                    <div
                      key={session.id}
                      className="bg-[#1c1c28] border border-[#2a2a3a] rounded-2xl overflow-hidden"
                    >
                      {/* セッションヘッダー */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-300">
                            {formatTime(session.completedAt)}
                          </span>
                          <span className="text-xs text-gray-600">
                            {session.items.length}品
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => restoreSession(session)}
                            disabled={adding === session.id}
                            className="text-xs bg-purple-900/40 text-purple-300 border border-purple-800/60 px-3 py-1.5 rounded-lg active:bg-purple-900/60 disabled:opacity-50"
                          >
                            {adding === session.id ? "追加中..." : "セットで追加"}
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            disabled={deletingId === session.id}
                            className="w-8 h-8 rounded-lg bg-red-900/30 text-red-400 border border-red-800/60 flex items-center justify-center active:bg-red-900/60 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === session.id ? (
                              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* アイテム一覧 */}
                      <div className="divide-y divide-[#2a2a3a]">
                        {session.items.map((item, idx) => {
                          const isSelected = selected.get(session.id)?.has(idx) ?? false;
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleItem(session.id, idx)}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                isSelected ? "bg-purple-900/20" : "active:bg-[#2a2a3a]"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  isSelected ? "bg-purple-500 border-purple-500" : "border-[#4a4a5a]"
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
                                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{item.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-xs text-gray-600">{item.unit}</span>
                                  {item.store && (
                                    <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded-full">
                                      {item.store}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className="text-xs text-gray-600">{item.category}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-gray-500 flex-shrink-0">
                                ×{item.quantity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択した単品を追加 */}
      {totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f14] via-[#0f0f14] to-transparent z-40">
          <div className="max-w-lg mx-auto">
            <button
              onClick={addSelected}
              disabled={adding === "selected"}
              className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold text-sm active:bg-purple-700 transition-colors shadow-[0_4px_20px_rgba(147,51,234,0.4)] disabled:opacity-50"
            >
              {adding === "selected" ? "追加中..." : `選択した${totalSelected}品をリストに追加`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
