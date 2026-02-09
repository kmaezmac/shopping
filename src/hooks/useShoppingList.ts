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
      .order("created_at", { ascending: true });

    if (data) {
      setItems(
        data.map((row) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          quantity: row.quantity,
          imageUrl: row.image_url,
          checked: row.checked,
          createdAt: new Date(row.created_at).getTime(),
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
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const addItem = useCallback(
    async (item: Omit<ShoppingItem, "id" | "checked" | "createdAt">) => {
      const { data } = await supabase
        .from("shopping_items")
        .insert({
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          image_url: item.imageUrl,
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
            checked: data.checked,
            createdAt: new Date(data.created_at).getTime(),
          },
        ]);
      }
    },
    []
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

      // 数量1で−したら削除
      if (currentItem.quantity + delta <= 0) {
        await removeItem(id);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
      );
      await supabase
        .from("shopping_items")
        .update({ quantity: currentItem.quantity + delta })
        .eq("id", id);
    },
    [items, removeItem]
  );

  const clearChecked = useCallback(async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    setItems((prev) => prev.filter((item) => !item.checked));
    if (checkedIds.length > 0) {
      await supabase.from("shopping_items").delete().in("id", checkedIds);
    }
  }, [items]);

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

  const clearAll = useCallback(async () => {
    if (items.length === 0) return;

    // 履歴に保存
    const { data: history } = await supabase
      .from("shopping_history")
      .insert({})
      .select()
      .single();

    if (history) {
      await supabase.from("shopping_history_items").insert(
        items.map((item) => ({
          history_id: history.id,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          image_url: item.imageUrl,
        }))
      );
    }

    const allIds = items.map((i) => i.id);
    setItems([]);
    await supabase.from("shopping_items").delete().in("id", allIds);
  }, [items]);

  return {
    items,
    loaded,
    addItem,
    removeItem,
    toggleCheck,
    updateQuantity,
    updateName,
    clearChecked,
    clearAll,
  };
}
