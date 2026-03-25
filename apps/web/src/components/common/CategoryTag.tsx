import type { Category } from "@/lib/types";

const CATEGORY_LABELS: Record<Category, string> = {
  "real-estate":       "Real Estate",
  "luxury-goods":      "Luxury Goods",
  "art":               "Art",
  "collectibles":      "Collectibles",
  "watches":           "Watches",
  "digital-passports": "Digital Passports",
};

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans text-cedar-amber/80">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}
