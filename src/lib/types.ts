export type MenuCategory =
  | "signature"
  | "plat"
  | "accompagnement"
  | "sauce"
  | "dessert"
  | "boisson";

export type MenuItem = {
  id: string;
  category: MenuCategory;
  name: string;
  description: string;
  price: number;
  image: string;
  tags?: string[];
};

export type CartLine = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export type DeliveryMode = "retrait" | "livraison";

export type Reservation = {
  items: CartLine[];
  subtotal: number;
  deliveryMode: DeliveryMode;
  deliveryFee: number;
  total: number;
  date: string;
  slot: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  };
};
