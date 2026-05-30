import { Timestamp } from "firebase/firestore";

export type OrderStatus = "Attente Acompte" | "Acompte Reçu" | "En attente" | "En cours" | "Livré";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  itemId?: string;
  image?: string;
  flavor?: string;
};

export type Order = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  hasReviewed?: boolean;
  referrerId?: string;
  review?: any;
  deletionRequested?: boolean;
  customer?: {
    phone?: string;
    slot?: string;
    deliveryMode?: string;
  };
};

// Extracted from OrderContext.tsx so unit tests can import this pure logic
// without dragging in JSX (vitest's esbuild transform with tsconfig
// "jsx: preserve" trips on the Provider's <OrderContext.Provider> return).

export function docToOrder(id: string, data: Record<string, unknown>): Order {
  let dateStr = "";
  const createdAt = data.createdAt;

  if (createdAt && typeof (createdAt as Timestamp).toDate === "function") {
    dateStr = (createdAt as Timestamp).toDate().toISOString();
  } else if (createdAt instanceof Date) {
    dateStr = createdAt.toISOString();
  } else if (typeof createdAt === "string") {
    dateStr = createdAt;
  } else {
    dateStr = new Date().toISOString();
  }

  return {
    id,
    userId: (data.userId as string) || "",
    userName: (data.userName as string) || "",
    userEmail: (data.userEmail as string) || "",
    items: (data.items as OrderItem[]) || [],
    total: (data.total as number) || 0,
    status: (data.status as OrderStatus) || "En attente",
    createdAt: dateStr,
    hasReviewed: (data.hasReviewed as boolean) || false,
    review: data.review || null,
    deletionRequested: (data.deletionRequested as boolean) || false,
    customer: data.customer as { phone?: string; slot?: string; deliveryMode?: string; } | undefined,
  };
}
