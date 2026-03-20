import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TreePine, BarChart2, Building2 } from "lucide-react";
import type { Category } from "@/lib/types";
import { useInView } from "@/hooks/useInView";

interface CategoryConfig {
  category: Category;
  label: string;
  description: string;
  subtext: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: "land",
    label: "Land",
    description: "Tokenized real property deeds. Each token represents 100% ownership of a parcel.",
    subtext: "via Fabrica",
    icon: <TreePine size={22} strokeWidth={1.5} />,
  },
  {
    category: "fixed-income",
    label: "Fixed income",
    description: "Tokenized US treasuries and dollar-yield instruments. Onchain T-bills.",
    subtext: "via Ondo Finance",
    icon: <BarChart2 size={22} strokeWidth={1.5} />,
  },
  {
    category: "rental-property",
    label: "Rental property",
    description: "Fractional ownership of income-producing residential real estate.",
    subtext: "via RealT",
    icon: <Building2 size={22} strokeWidth={1.5} />,
  },
];

function CategoryCard({ category, label, description, subtext, icon, index }: CategoryConfig & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      key={category}
      to={`/explore?category=${category}`}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative bg-cedar-surface flex flex-col gap-6 p-8 overflow-hidden
        transition-all duration-300
        hover:-translate-y-1 hover:bg-cedar-surface-alt hover:shadow-[0_0_0_1px_#C4852A]
        scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 80}ms` : "0ms" }}
    >
      {/* Amber top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      {/* Icon */}
      <div className="text-cedar-amber opacity-70 group-hover:opacity-100 transition-opacity duration-200">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-sans text-lg font-medium text-cedar-text mb-2 group-hover:text-cedar-amber transition-colors duration-200">
          {label}
        </h3>
        <p className="text-cedar-muted text-sm leading-relaxed mb-4">
          {description}
        </p>
        <p className="text-cedar-muted/50 text-[11px] tracking-widest uppercase">
          {subtext}
        </p>
      </div>

      {/* Arrow CTA */}
      <div className="flex items-center gap-1.5 text-cedar-amber text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200">
        Browse {label.toLowerCase()}
        <ArrowRight size={12} />
      </div>
    </Link>
  );
}

export function CategoryCards() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div
        ref={headingRef as React.Ref<HTMLDivElement>}
        className={`mb-12 scroll-fade${headingInView ? " in-view" : ""}`}
      >
        <h2 className="display text-display-md text-cedar-text mb-3">
          What trades on CedarX
        </h2>
        <p className="text-cedar-muted text-sm tracking-widest uppercase">
          Three categories. One marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cedar-border">
        {CATEGORIES.map((cat, i) => (
          <CategoryCard key={cat.category} {...cat} index={i} />
        ))}
      </div>
    </section>
  );
}
