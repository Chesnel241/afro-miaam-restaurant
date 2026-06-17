import { menuItems, CATEGORY_LABELS, CATEGORY_ORDER } from "@/data/menu";
import type { MenuItem, MenuCategory } from "@/lib/types";

export const SITE_URL = "https://afromiaam.com";

export const RESTAURANT_INFO = {
  name: "Afro Miaam",
  legalName: "Afro Miaam",
  slogan: "Ça mijote, ça régale",
  description:
    "Cuisine afro gastronomique à Lyon. Commande dès aujourd'hui avec 3 h de marge minimum. Plats africains faits maison, retrait sur place ou livraison à 3 € dans Lyon.",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  image: `${SITE_URL}/banniere-site.png`,
  telephone: "+33751019452",
  email: "afromiaam@gmail.com",
  priceRange: "€€",
  servesCuisine: ["African", "West African", "Senegalese", "Ivorian"],
  paymentAccepted: ["Cash", "Credit Card", "Bank Transfer"],
  currenciesAccepted: "EUR",
  address: {
    streetAddress: "315 rue Garibaldi",
    addressLocality: "Lyon",
    postalCode: "69007",
    addressRegion: "Auvergne-Rhône-Alpes",
    addressCountry: "FR",
  },
  geo: {
    latitude: 45.7434,
    longitude: 4.8430,
  },
  socials: {
    instagram:
      "https://www.instagram.com/afro_miaam?igsh=amV1YXZjc3lhNTV3",
    facebook:
      "https://www.facebook.com/share/1Kr7G9GA3d/?mibextid=wwXIfr",
    tiktok:
      "https://www.tiktok.com/@afro_miaam?_r=1&_t=ZS-96GwYiFGd09",
  },
} as const;

// Public/default opening hours used by the SEO structured data when the live
// schedule from settings.global is not available at render time (e.g. on
// statically-prerendered pages). The admin's actual current schedule lives in
// settings.global.schedule — feel free to mirror it here whenever the brand
// horaires change so the SEO metadata stays in sync without a DB query.
export const OPENING_HOURS = [
  {
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "17:00",
    closes: "22:00",
  },
] as const;

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function restaurantJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": `${SITE_URL}/#restaurant`,
    name: RESTAURANT_INFO.name,
    legalName: RESTAURANT_INFO.legalName,
    slogan: RESTAURANT_INFO.slogan,
    description: RESTAURANT_INFO.description,
    url: RESTAURANT_INFO.url,
    logo: RESTAURANT_INFO.logo,
    image: RESTAURANT_INFO.image,
    telephone: RESTAURANT_INFO.telephone,
    email: RESTAURANT_INFO.email,
    priceRange: RESTAURANT_INFO.priceRange,
    servesCuisine: [...RESTAURANT_INFO.servesCuisine],
    paymentAccepted: [...RESTAURANT_INFO.paymentAccepted],
    currenciesAccepted: RESTAURANT_INFO.currenciesAccepted,
    acceptsReservations: true,
    hasMenu: `${SITE_URL}/menu`,
    address: {
      "@type": "PostalAddress",
      ...RESTAURANT_INFO.address,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: RESTAURANT_INFO.geo.latitude,
      longitude: RESTAURANT_INFO.geo.longitude,
    },
    openingHoursSpecification: OPENING_HOURS.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...h.dayOfWeek],
      opens: h.opens,
      closes: h.closes,
    })),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: RESTAURANT_INFO.telephone,
      email: RESTAURANT_INFO.email,
      contactType: "customer service",
      areaServed: "FR",
      availableLanguage: ["French"],
    },
    areaServed: {
      "@type": "City",
      name: "Lyon",
    },
    sameAs: [
      RESTAURANT_INFO.socials.instagram,
      RESTAURANT_INFO.socials.facebook,
      RESTAURANT_INFO.socials.tiktok,
    ],
  };
}

export function menuJsonLd(items: readonly MenuItem[] = menuItems) {
  const sections = CATEGORY_ORDER.map((category: MenuCategory) => {
    const sectionItems = items.filter((i) => i.category === category);
    if (sectionItems.length === 0) return null;
    return {
      "@type": "MenuSection",
      name: CATEGORY_LABELS[category],
      hasMenuItem: sectionItems.map((item) => ({
        "@type": "MenuItem",
        "@id": `${SITE_URL}/menu#${item.id}`,
        name: item.name,
        description: item.description,
        image: absoluteUrl(item.image),
        offers: {
          "@type": "Offer",
          price: item.price.toFixed(2),
          priceCurrency: "EUR",
          availability:
            item.available === false
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          url: `${SITE_URL}/menu`,
        },
      })),
    };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menu#menu`,
    name: "Menu Afro Miaam",
    description:
      "Plats africains, signatures, entrées, accompagnements, desserts, gourmandises et boissons.",
    inLanguage: "fr-FR",
    hasMenuSection: sections,
  };
}

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

const PRESTATIONS_DATA = [
  {
    id: "corporate",
    name: "Traiteur Business & Corporate",
    description:
      "Plateaux repas premium, cocktails dînatoires et séminaires. Cuisine africaine raffinée pour vos réunions et événements professionnels à Lyon.",
    basePrice: 25,
    category: "Catering",
  },
  {
    id: "private",
    name: "Célébrations privées",
    description:
      "Mariages, baptêmes, anniversaires. Gestion complète pour des moments inoubliables, avec une cuisine africaine d'exception.",
    basePrice: 45,
    category: "Event Catering",
  },
  {
    id: "chef",
    name: "Chef à domicile",
    description:
      "L'expérience d'un restaurant gastronomique chez vous. Menu africain sur-mesure préparé en direct par notre chef.",
    basePrice: 85,
    category: "Personal Chef",
  },
] as const;

export function serviceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/prestations#services`,
    name: "Prestations Afro Miaam — Traiteur africain à Lyon",
    itemListElement: PRESTATIONS_DATA.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Service",
        "@id": `${SITE_URL}/prestations#${p.id}`,
        name: p.name,
        description: p.description,
        category: p.category,
        provider: { "@id": `${SITE_URL}/#restaurant` },
        areaServed: { "@type": "City", name: "Lyon" },
        offers: {
          "@type": "Offer",
          price: p.basePrice.toFixed(2),
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: p.basePrice.toFixed(2),
            priceCurrency: "EUR",
            unitText: "PER_PERSON",
          },
        },
      },
    })),
  };
}

export type BreadcrumbCrumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: readonly BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.name,
      item: `${SITE_URL}${c.path.startsWith("/") ? "" : "/"}${c.path}`,
    })),
  };
}
