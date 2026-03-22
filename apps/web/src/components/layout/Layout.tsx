import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed left vertical rule — architectural detail, desktop only */}
      <div
        aria-hidden="true"
        className="hidden lg:block"
        style={{
          position: "fixed",
          left: "52px",
          top: 0,
          bottom: 0,
          width: "1px",
          pointerEvents: "none",
          zIndex: 2,
          background: "linear-gradient(180deg, transparent 0%, rgba(196,133,42,0.25) 15%, rgba(196,133,42,0.12) 80%, transparent 100%)",
        }}
      />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
