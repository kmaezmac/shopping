export interface ShoppingItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  imageUrl: string | null;
  checked: boolean;
  createdAt: number;
}
