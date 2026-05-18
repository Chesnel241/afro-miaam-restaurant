export type MenuCategory =
  | "signature"
  | "plat"
  | "entree"
  | "accompagnement"
  | "sauce"
  | "dessert"
  | "gourmandise"
  | "boisson";

export type Flavor = {
  name: string;
  supplement: number; // 0 si pas de supplément
};

export type MenuItem = {
  id: string;
  category: MenuCategory;
  name: string;
  description: string;
  price: number;
  image: string;
  tags?: string[];
  available?: boolean;
  flavors?: Flavor[];
};

export type CartLine = {
  id: string;       // identifiant unique dans le panier (peut inclure la saveur)
  itemId: string;    // identifiant du plat d'origine
  name: string;
  price: number;     // prix final (base + supplément saveur)
  image: string;
  quantity: number;
  flavor?: string;   // nom de la saveur choisie
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
