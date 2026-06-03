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
  review?: unknown;
  discounts?: {
    welcomeOffer?: boolean;
    referralCredits?: number;
    referralCodeUsed?: string;
    promoCodeUsed?: string;
    promoDiscount?: number;
  } | null;
  deletionRequested?: boolean;
  customer?: {
    phone?: string;
    slot?: string;
    deliveryMode?: string;
  };
};

// Pure mapper used by tests and by the OrderContext when normalizing rows.
// Accepts either an ISO string, a Date, or a Firestore-like object exposing
// toDate() — the last form is retained so legacy test fixtures keep working.
type DateLike = string | Date | { toDate(): Date } | undefined | null;

function toIso(value: DateLike): string {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export function docToOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    userId: (data.userId as string) || "",
    userName: (data.userName as string) || "",
    userEmail: (data.userEmail as string) || "",
    items: (data.items as OrderItem[]) || [],
    total: (data.total as number) || 0,
    status: (data.status as OrderStatus) || "En attente",
    createdAt: toIso(data.createdAt as DateLike),
    hasReviewed: (data.hasReviewed as boolean) || false,
    referrerId: (data.referrerId as string) || undefined,
    review: data.review ?? null,
    discounts: (data.discounts as Order["discounts"]) ?? null,
    deletionRequested: (data.deletionRequested as boolean) || false,
    customer: data.customer as
      | { phone?: string; slot?: string; deliveryMode?: string }
      | undefined,
  };
}
