import { Hero } from "@/components/home/Hero";
import { CategoryCards } from "@/components/home/CategoryCards";
import { FeaturedAssets } from "@/components/home/FeaturedAssets";
import { HowItWorks } from "@/components/home/HowItWorks";

export function HomePage() {
  return (
    <>
      <Hero />
      <CategoryCards />
      <FeaturedAssets />
      <HowItWorks />
    </>
  );
}
