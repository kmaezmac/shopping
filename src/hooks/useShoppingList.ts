"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingItem } from "@/types";
import { supabase } from "@/lib/supabase";

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (data) {
      setItems(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          quantity: row.quantity,
          imageUrl: row.image_url,
          url: row.url ?? null,
          checked: row.checked,
          createdAt: new Date(row.created_at).getTime(),
          store: row.store ?? null,
          category: row.category ?? null,
          sortOrder: row.sort_order ?? 0,
        }))
      );
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("shopping_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        () => { fetchItems(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  const addItem = useCallback(
    async (item: Omit<ShoppingItem, "id" | "checked" | "createdAt" | "sortOrder">) => {
      const maxOrder = items
        .filter((i) => !i.checked)
        .reduce((max, i) => Math.max(max, i.sortOrder), -1);

      const { data } = await supabase
        .from("shopping_items")
        .insert({
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          image_url: item.imageUrl,
          url: item.url,
          store: item.store,
          category: item.category,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (data) {
        setItems((prev) => [
          ...prev,
          {
            id: data.id,
            name: data.name,
            unit: data.unit,
            quantity: data.quantity,
            imageUrl: data.image_url,
            url: data.url ?? null,
            checked: data.checked,
            createdAt: new Date(data.created_at).getTime(),
            store: data.store ?? null,
            category: data.category ?? null,
            sortOrder: data.sort_order ?? 0,
          },
        ]);
      }
    },
    [items]
  );

  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  }, []);

  const toggleCheck = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
    const { data } = await supabase
      .from("shopping_items")
      .select("checked")
      .eq("id", id)
      .single();
    if (data) {
      await supabase
        .from("shopping_items")
        .update({ checked: !data.checked })
        .eq("id", id);
    }
  }, []);

  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem) return;

      if (currentItem.quantity + delta <= 0) {
        await removeItem(id);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
      );
      await supabase
        .from("shopping_items")
        .update({ quantity: currentItem.quantity + delta })
        .eq("id", id);
    },
    [items, removeItem]
  );

  const updateName = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: newName.trim() } : item
      )
    );
    await supabase
      .from("shopping_items")
      .update({ name: newName.trim() })
      .eq("id", id);
  }, []);

  const updateUnit = useCallback(async (id: string, newUnit: string) => {
    const unit = newUnit.trim() || "個";
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unit } : item))
    );
    await supabase.from("shopping_items").update({ unit }).eq("id", id);
  }, []);

  const updateItemMedia = useCallback(
    async (id: string, imageUrl: string | null, url: string | null) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, imageUrl, url } : item
        )
      );
      await supabase
        .from("shopping_items")
        .update({ image_url: imageUrl, url })
        .eq("id", id);
    },
    []
  );

  const updateStoreCategory = useCallback(
    async (id: string, store: string | null, category: string | null) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, store, category } : item
        )
      );
      await supabase
        .from("shopping_items")
        .update({ store, category })
        .eq("id", id);
    },
    []
  );

  const reorderItems = useCallback(async (orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        sortOrder: orderMap.has(item.id) ? orderMap.get(item.id)! : item.sortOrder,
      }))
    );
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase.from("shopping_items").update({ sort_order: idx }).eq("id", id)
      )
    );
  }, []);

  const clearChecked = useCallback(async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    setItems((prev) => prev.filter((item) => !item.checked));
    if (checkedIds.length > 0) {
      await supabase.from("shopping_items").delete().in("id", checkedIds);
    }
  }, [items]);

  // 買い物完了: チェック済みのみ履歴保存して削除、未チェックは残す
  const clearAll = useCallback(async () => {
    const checkedItems = items.filter((i) => i.checked);
    if (checkedItems.length === 0) return;

    const { data: history } = await supabase
      .from("shopping_history")
      .insert({})
      .select()
      .single();

    if (history) {
      await supabase.from("shopping_history_items").insert(
        checkedItems.map((item) => ({
          history_id: history.id,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          image_url: item.imageUrl,
          url: item.url,
          store: item.store,
          category: item.category,
        }))
      );
    }

    const checkedIds = checkedItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.checked));
    await supabase.from("shopping_items").delete().in("id", checkedIds);
  }, [items]);

  return {
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
  };
}
