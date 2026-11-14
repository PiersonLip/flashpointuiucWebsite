export const ILLINOIS_EMAIL_RE = /^[a-z0-9._+-]+@illinois\.edu$/i;

export function isIllinoisEmail(email: string) {
  return ILLINOIS_EMAIL_RE.test(email.trim());
}

export function normalizeNetid(netid: string) {
  return netid.trim().toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const CATEGORIES = {
  digital: {
    label: "Digital bodies",
    subcategories: ["APS-C", "Full frame"],
  },
  film: {
    label: "Film cameras",
    subcategories: ["35mm film"],
  },
  lens: {
    label: "Lenses",
    subcategories: ["Nikon F", "Sony A", "Minolta MD"],
  },
  equipment: {
    label: "Equipment",
    subcategories: ["Accessories", "Lighting", "Support"],
  },
} as const;

export type EquipmentCategory = keyof typeof CATEGORIES;

export const DEFAULT_RENTAL_DAYS = 7;
export const WAITLIST_OFFER_HOURS = 24;
export const APP_NAME = "Flashpoint Rentals";
export const APP_URL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";
