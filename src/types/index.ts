export interface ShoppingItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  imageUrl: string | null;
  url: string | null;
  checked: boolean;
  createdAt: number;
  store: string | null;
  category: string | null;
  sortOrder: number;
}
