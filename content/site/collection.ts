/** Collection page: filter configs and product list for FurnitureFilter-style UI. */

/**
 * UI accent matches `globals.css` `--color-accent` (nav, CTAs). Terracotta swatch keeps its own hex.
 */
const COLLECTION_PALETTE = {
  accent: "var(--color-accent)",
  dark: "#1a1a1a",
  terracottaSwatch: "#C4622D",
} as const;
export const COLLECTION_ACCENT = COLLECTION_PALETTE.accent;
/** Matches `globals.css` `--color-surface` / `--background` */
export const COLLECTION_BG = "var(--color-surface)";
export const COLLECTION_DARK = COLLECTION_PALETTE.dark;

/** Default grey intro line on `/collections` when no filter-specific copy applies. */
export const COLLECTION_DEFAULT_HERO_DESCRIPTION =
  "Curated furniture and pieces for considered living. Quality materials and enduring design.";

/** Category links for the filter bar (first = "View all", rest = categories). */
export const COLLECTION_CATEGORY_LINKS = [
  "View all",
  "Sofas & Sectionals",
  "Armchairs",
  "Tables",
  "Lighting",
  "Decor",
  "Clearance",
] as const;

export type QuickFilterOption = string | { label: string; hex: string };

export interface QuickFilter {
  id: string;
  label: string;
  type?: "swatch" | "price";
  options: QuickFilterOption[];
}

export interface DrawerFilter {
  id: string;
  label: string;
  type?: "sort";
  options: string[];
}

/** Pre-selected room when `/collections` has no `room` query param. */
export const DEFAULT_COLLECTION_ROOM = "Living Room";

export const quickFilters: QuickFilter[] = [
  {
    id: "room",
    label: "Room",
    options: [
      "Living Room",
      "Bedroom",
      "Dining Room",
      "Home Office",
      "Bathroom",
      "Entryway",
      "Kids Room",
      "Outdoor / Patio",
      "Basement",
      "Studio / Loft",
    ],
  },
  {
    id: "category",
    label: "Category",
    options: [
      "Sofas & Sectionals",
      "Armchairs",
      "Ottomans & Poufs",
      "Dining Chairs",
      "Bar Stools",
      "Beds & Bed Frames",
      "Nightstands",
      "Dressers",
      "Wardrobes",
      "Bookshelves",
      "TV Stands",
      "Coffee Tables",
      "Dining Tables",
      "Desks",
      "Side Tables",
      "Console Tables",
      "Benches",
      "Floor Lamps",
      "Table Lamps",
      "Pendant Lights",
      "Rugs",
      "Mirrors",
      "Curtains",
      "Decorative Objects",
      "Planters",
    ],
  },
  {
    id: "style",
    label: "Style",
    options: [
      "Minimalist",
      "Mid century modern",
      "Scandinavian",
      "Japandi",
      "Industrial",
      "Wabi sabi",
      "Bohemian",
      "Contemporary",
      "Art Deco",
      "Coastal",
      "Rustic / Farmhouse",
      "Traditional",
      "Eclectic",
      "Maximalist",
      "Brutalist",
    ],
  },
  {
    id: "material",
    label: "Material",
    options: [
      "Solid Oak",
      "Solid Walnut",
      "Solid Pine",
      "Plywood",
      "Bamboo",
      "Rattan / Wicker",
      "Cane",
      "Velvet",
      "Linen",
      "Boucle",
      "Leather",
      "Faux Leather",
      "Marble",
      "Travertine",
      "Concrete",
      "Brass",
      "Steel",
      "Powder coated metal",
      "Glass",
      "Acrylic",
      "Reclaimed Wood",
    ],
  },
  {
    id: "color",
    label: "Color",
    type: "swatch",
    options: [
      { label: "Warm White", hex: "#F2ECE4" },
      { label: "Ivory", hex: "#E8E0D0" },
      { label: "Sand", hex: "#D4B896" },
      { label: "Terracotta", hex: COLLECTION_PALETTE.terracottaSwatch },
      { label: "Rust", hex: "#A0412A" },
      { label: "Blush", hex: "#E8B4A0" },
      { label: "Sage", hex: "#7C9E82" },
      { label: "Olive", hex: "#6B7C45" },
      { label: "Forest", hex: "#3D5A40" },
      { label: "Sky Blue", hex: "#8AAFC0" },
      { label: "Slate Blue", hex: "#5C7A8A" },
      { label: "Navy", hex: "#2C3E54" },
      { label: "Lavender", hex: "#A89BB5" },
      { label: "Walnut Brown", hex: "#6B4C35" },
      { label: "Caramel", hex: "#A0724A" },
      { label: "Charcoal", hex: "#4A4A4A" },
      { label: "Black", hex: COLLECTION_PALETTE.dark },
      { label: "White", hex: "#FAFAFA" },
    ],
  },
  {
    id: "price",
    label: "Price",
    type: "price",
    options: [
      "Under $100",
      "$100 to $300",
      "$300 to $600",
      "$600 to $1,000",
      "$1,000 to $2,000",
      "$2,000 to $5,000",
      "$5,000+",
    ],
  },
];

export const drawerFilters: DrawerFilter[] = [
  {
    id: "sort",
    label: "Sort by",
    type: "sort",
    options: [
      "Newest Arrivals",
      "Most Popular",
      "Best Rated",
      "Price: Low to High",
      "Price: High to Low",
      "Biggest Discount",
    ],
  },
  {
    id: "size",
    label: "Size",
    options: [
      "Small (under 80cm)",
      "Medium (80 to 150 cm)",
      "Large (150 to 220 cm)",
      "Extra Large (220cm+)",
      "Compact / Space saving",
      "Modular / Expandable",
    ],
  },
  {
    id: "features",
    label: "Features",
    options: [
      "Storage included",
      "Foldable / Stackable",
      "Adjustable height",
      "Pet friendly fabric",
      "Stain resistant",
      "Outdoor safe",
      "Handmade",
      "Sustainable / Eco certified",
      "Assembly free",
      "Customizable",
      "Kid safe finish",
      "FSC Certified Wood",
    ],
  },
  {
    id: "brand",
    label: "Brand",
    options: [
      "Studio Plus",
      "Edit Collection",
      "Nordic",
      "Auki",
      "AP Design",
      "Glove",
      "Forma",
      "Wabi Living",
      "Drift",
      "Kora",
    ],
  },
  {
    id: "rating",
    label: "Rating",
    options: ["4.5★ & above", "4★ & above", "3.5★ & above"],
  },
];

/** Sort options — single source from drawer "sort" filter. */
export const sortOptions: string[] =
  drawerFilters.find((f) => f.id === "sort")?.options ?? [];

/** Default sort option (first in list); use for initial state and comparisons. */
export const DEFAULT_SORT = sortOptions[0] ?? "Newest Arrivals";

/** rgba aligned with `--color-primary` / `COLLECTION_DARK` (#1a1a1a). */
export function darkRgba(alpha: number): string {
  return `rgba(26,26,26,${alpha})`;
}

/** Type (category) options for inline filter — "All" plus quickFilter category options. */
export const COLLECTION_TYPE_OPTIONS: string[] = [
  "All",
  ...((quickFilters.find((f) => f.id === "category")?.options ??
    []) as string[]),
];

/** Price options for inline filter — "All" plus quickFilter price options. */
export const COLLECTION_PRICE_OPTIONS: string[] = [
  "All",
  ...((quickFilters.find((f) => f.id === "price")?.options ?? []) as string[]),
];

export interface CollectionProduct {
  id: number;
  name: string;
  price: number;
  brand: string;
  category: string;
  image: string;
  /** Room label for PDP eyebrow; defaults to {@link DEFAULT_COLLECTION_ROOM}. */
  room?: string;
}

export interface CollectionProductDetail extends CollectionProduct {
  ref: string;
  /** Normalized room line above buy-box copy (matches quick filter “Room” labels). */
  room: string;
  description: string;
  additionalInfo: string;
  rating: number;
  reviewCount: number;
  sizes: string[];
  colors: { name: string; value: string }[];
  images: string[];
  dimensions: {
    height: string;
    width: string;
    depth: string;
    seatHeight: string;
    seatDepth: string;
    weight: string;
  };
  materials: { name: string; value: string }[];
  fullDescription: string;
  delivery: string;
  care: string;
  warranty: string;
}

export const collectionProducts: CollectionProduct[] = [
  {
    id: 0,
    name: "Arca Sofa",
    price: 1290,
    brand: "Studio Plus",
    category: "Sofas & Sectionals",
    image: "/images/landing-banner.jpg",
  },
  {
    id: 1,
    name: "Lune Chair",
    price: 640,
    brand: "Edit",
    category: "Armchairs",
    image: "/images/landing-main-1.jpg",
  },
  {
    id: 2,
    name: "Teak Side Table",
    price: 320,
    brand: "Glove",
    category: "Side Tables",
    image: "/images/landing-banner-4.jpg",
  },
  {
    id: 3,
    name: "Forma Shelf",
    price: 890,
    brand: "Nordic",
    category: "Bookshelves",
    image: "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg",
  },
  {
    id: 4,
    name: "Kora Pendant",
    price: 280,
    brand: "Studio Plus",
    category: "Pendant Lights",
    image: "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg",
  },
  {
    id: 5,
    name: "Drift Bed",
    price: 1850,
    brand: "Edit Collection",
    category: "Beds & Bed Frames",
    image: "/images/landing-main-5.jpg",
    room: "Bedroom",
  },
  {
    id: 6,
    name: "Petal Ottoman",
    price: 420,
    brand: "Auki",
    category: "Ottomans & Poufs",
    image: "/images/landing-main-3.jpg",
  },
  {
    id: 7,
    name: "Alto Desk",
    price: 760,
    brand: "AP Design",
    category: "Desks",
    image: "/images/landing-banner-3.jpg",
    room: "Home Office",
  },
  {
    id: 8,
    name: "Wabi Rug",
    price: 340,
    brand: "Nordic",
    category: "Rugs",
    image: "/images/landing-main-6.jpg",
  },
  {
    id: 9,
    name: "Stone Coffee Table",
    price: 920,
    brand: "Edit",
    category: "Coffee Tables",
    image: "/images/landing-main-7.jpg",
  },
  {
    id: 10,
    name: "Nest Armchair",
    price: 580,
    brand: "Studio Plus",
    category: "Armchairs",
    image: "/images/landing-banner-unused-1.jpg",
  },
  {
    id: 11,
    name: "Cedar Wardrobe",
    price: 1100,
    brand: "Glove",
    category: "Wardrobes",
    image: "/images/landing-main-4.jpg",
  },
];

/** Get a single product by id (string or number). Returns null if not found. */
export function getCollectionProduct(
  id: string | number,
): CollectionProduct | null {
  const numId = typeof id === "string" ? parseInt(id, 10) : id;
  if (Number.isNaN(numId)) return null;
  return collectionProducts.find((p) => p.id === numId) ?? null;
}

/** PDP “similar items”: same category first, then other pieces (excludes current id). */
export function getSimilarCollectionProducts(
  excludeId: number,
  limit = 4,
): CollectionProduct[] {
  const current = collectionProducts.find((p) => p.id === excludeId);
  const others = collectionProducts.filter((p) => p.id !== excludeId);
  if (!current) return others.slice(0, limit);
  const sameCat = others.filter((p) => p.category === current.category);
  const otherCat = others.filter((p) => p.category !== current.category);
  return [...sameCat, ...otherCat].slice(0, limit);
}

/** Guest review line on the product detail page (mock — no persistence). */
export interface CollectionProductComment {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
}

export function getMockProductComments(
  productId: number,
): CollectionProductComment[] {
  const seed = productId % 4;
  const names = ["Maya T.", "James L.", "Priya S.", "Alex K."];
  const bodies = [
    "Beautiful in person — fabric has a nice hand and the frame feels solid. Delivery was smooth.",
    "We’ve had it for two months. Comfortable for long sits and the colour reads true to the photos.",
    "Great scale for our flat. Assembly was straightforward and support answered questions quickly.",
    "Exactly the quiet, minimal look we wanted. Would buy again in another room.",
  ];
  return [
    {
      id: `c-${productId}-a`,
      author: names[seed]!,
      rating: 5,
      date: "2 weeks ago",
      title: "Love the finish",
      body: bodies[seed]!,
    },
    {
      id: `c-${productId}-b`,
      author: names[(seed + 1) % 4]!,
      rating: 4.5,
      date: "1 month ago",
      title: "Solid quality",
      body: bodies[(seed + 1) % 4]!,
    },
    {
      id: `c-${productId}-c`,
      author: names[(seed + 2) % 4]!,
      rating: 5,
      date: "6 weeks ago",
      title: "Would recommend",
      body: bodies[(seed + 2) % 4]!,
    },
  ];
}

/** Get full product details for the detail page (ref, dimensions, accordions, etc.). */
export function getCollectionProductDetails(
  product: CollectionProduct,
): CollectionProductDetail {
  const cat = product.category.replace(/\s*&\s*/, " ");
  const ref = `${cat
    .split(" ")
    .map((w) => w.slice(0, 2))
    .join("")
    .toUpperCase()
    .slice(
      0,
      3,
    )} ${product.name.replace(/\s/g, "").slice(0, 3).toUpperCase()} ${product.id}`;
  const isSofa = /sofa|sectional/i.test(product.category);
  const details: CollectionProductDetail = {
    ...product,
    room: product.room ?? DEFAULT_COLLECTION_ROOM,
    ref,
    description: `A beautifully designed ${product.name.toLowerCase()} from ${product.brand}. Crafted with attention to detail and quality materials.`,
    additionalInfo:
      "Available in multiple options. Natural materials may vary slightly in color and texture.",
    rating: 4.5,
    reviewCount: 52,
    sizes: isSofa ? ["2 seat", "3 seat", "Sectional"] : ["Standard"],
    colors: [
      { name: "Charcoal", value: "#4A4A4A" },
      { name: "Warm Grey", value: "#8B7355" },
      { name: "Terracotta", value: "#C4622D" },
      { name: "Natural", value: "#D4B896" },
    ],
    images: [
      product.image,
      product.image,
      product.image,
      product.image,
      product.image,
    ],
    dimensions: {
      height: "85 cm / 33.5 in",
      width: "220 cm / 86.6 in",
      depth: "95 cm / 37.4 in",
      seatHeight: "45 cm / 17.7 in",
      seatDepth: "58 cm / 22.8 in",
      weight: "68 kg / 150 lbs",
    },
    materials: [
      { name: "Frame", value: "Solid Oak" },
      { name: "Upholstery", value: "Premium Fabric" },
      { name: "Finish", value: "Natural" },
    ],
    fullDescription: `The ${product.name} represents contemporary design, combining quality materials with enduring comfort. Each piece is crafted with attention to detail and precision construction.`,
    delivery:
      "In stock. Ships in 3 to 5 business days. White glove delivery available.",
    care: "Follow manufacturer care instructions. Clean regularly with appropriate products.",
    warranty: "5 year limited warranty covering manufacturing defects.",
  };
  if (!details.colors.length || !details.sizes.length) {
    throw new Error(
      `getCollectionProductDetails: product ${product.id} must define at least one color and one size`,
    );
  }
  return details;
}
