import { Link } from "react-router-dom";
import { ArrowRight, TreePine, BarChart2, Building2 } from "lucide-react";
import type { Category } from "@/lib/types";

interface CategoryConfig {
  category: Category;
  label: string;
  description: string;
  subtext: string;
  icon: React.ReactNode;
  protocol: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: "land",
    label: "Land",
    description: "Tokenized real property deeds. Each token represents 100% ownership of a parcel.",
    subtext: "via Fabrica",
    icon: <TreePine size={20} strokeWidth={1.5} />,
    protocol: "fabrica",
  },
  {
    category: "fixed-income",
    label: "Fixed income",
    description: "Tokenized US treasuries and dollar-yield instruments. Onchain T-bills.",
    subtext: "via Ondo Finance",
    icon: <BarChart2 size={20} strokeWidth={1.5} />,
    protocol: "ondo",
  },
  {
    category: "rental-property",
    label: "Rental property",
    description: "Fractional ownership of income-producing residential real estate.",
    subtext: "via RealT",
    icon: <Building2 size={20} strokeWidth={1.5} />,
    protocol: "realt",
  },
];

export function CategoryCards() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="mb-12">
        <h2 className="display text-display-md text-cedar-text mb-3">
          What trades on CedarX
        </h2>
        <p className="text-cedar-muted text-sm tracking-widest uppercase">
          Three categories. One marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cedar-border">
        {CATEGORIES.map(({ category, label, description, subtext, icon, protocol }) => (
          <Link
            key={category}
            to={`/explore?category=${category}`}
            className="group bg-cedar-surface p-8 flex flex-col gap-6 hover:bg-cedar-surface-alt transition-colors duration-200"
          >
            {/* Icon */}
            <div className="text-cedar-amber opacity-80 group-hover:opacity-100 transition-opacity">
              {icon}
            </div>

            {/* Label */}
            <div>
              <h3 className="font-sans text-lg font-medium text-cedar-text mb-2 group-hover:text-cedar-amber transition-colors">
                {label}
              </h3>
              <p className="text-cedar-muted text-sm leading-relaxed mb-4">
                {description}
              </p>
              <p className="text-cedar-muted/60 text-[11px] tracking-widest uppercase">
                {subtext}
              </p>
            </div>

            {/* Arrow */}
            <div className="mt-auto flex items-center gap-1.5 text-cedar-amber text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Browse {label.toLowerCase()}
              <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
