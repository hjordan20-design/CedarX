import { Hero } from "@/components/home/Hero";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";

export function HomePage() {
  return (
    <>
      <Hero />
      <CategoryCards />
      <HowItWorks />
    </>
  );
}
