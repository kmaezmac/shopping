"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingItem } from "@/types";

function rowToItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    name: row.name as string,
    unit: row.unit as string,
    quantity: row.quantity as number,
    imageUrl: (row.image_url as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    checked: row.checked as boolean,
    createdAt: new Date(row.created_at as string).getTime(),
    store: (row.store as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    sortOrder: (row.sort_order as number | null) ?? 0,
  };
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/shopping-items");
    const data = await res.json();
    if (Array.isArray(data)) {
      setItems(data.map(rowToItem));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 10000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const addItem = useCallback(
    async (item: Omit<ShoppingItem, "id" | "checked" | "createdAt" | "sortOrder">) => {
      const maxOrder = items
        .filter((i) => !i.checked)
        .reduce((max, i) => Math.max(max, i.sortOrder), -1);

      const res = await fetch("/api/shopping-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          image_url: item.imageUrl,
          url: item.url,
          store: item.store,
          category: item.category,
          sort_order: maxOrder + 1,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        setItems((prev) => [...prev, rowToItem(data[0])]);
      }
    },
    [items]
  );

  const removeItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/shopping-items/${id}`, { method: "DELETE" });
  }, []);

  const toggleCheck = useCallback(
    async (id: string) => {
      const current = items.find((i) => i.id === id);
      if (!current) return;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
      );
      await fetch(`/api/shopping-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !current.checked }),
      });
    },
    [items]
  );

  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      const currentItem = items.find((i) => i.id === id);
      if (!currentItem) return;

      if (currentItem.quantity + delta <= 0) {
        await removeItem(id);
        return;
      }

      const newQty = currentItem.quantity + delta;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
      );
      await fetch(`/api/shopping-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
    },
    [items, removeItem]
  );

  const updateName = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName.trim() } : item))
    );
    await fetch(`/api/shopping-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
  }, []);

  const updateUnit = useCallback(async (id: string, newUnit: string) => {
    const unit = newUnit.trim() || "個";
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unit } : item))
    );
    await fetch(`/api/shopping-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit }),
    });
  }, []);

  const updateItemMedia = useCallback(
    async (id: string, imageUrl: string | null, url: string | null) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, imageUrl, url } : item))
      );
      await fetch(`/api/shopping-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, url }),
      });
    },
    []
  );

  const updateStoreCategory = useCallback(
    async (id: string, store: string | null, category: string | null) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, store, category } : item))
      );
      await fetch(`/api/shopping-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, category }),
      });
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
    await fetch("/api/shopping-items/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orders: orderedIds.map((id, idx) => ({ id, sort_order: idx })),
      }),
    });
  }, []);

  const clearChecked = useCallback(async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    setItems((prev) => prev.filter((item) => !item.checked));
    if (checkedIds.length > 0) {
      await fetch("/api/shopping-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: checkedIds }),
      });
    }
  }, [items]);

  const clearAll = useCallback(async () => {
    const checkedItems = items.filter((i) => i.checked);
    if (checkedItems.length === 0) return;

    const checkedIds = checkedItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.checked));

    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkedItems, checkedIds }),
    });
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
