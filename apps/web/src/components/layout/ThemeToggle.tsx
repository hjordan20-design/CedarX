import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

function getStoredTheme(): "light" | "dark" {
  try {
    return (localStorage.getItem("cedar-theme") as "light" | "dark") ?? "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("cedar-theme", theme);
  } catch {
    /* storage blocked */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px",
        height: "34px",
        background: "transparent",
        border: "1px solid rgba(196,133,42,0.20)",
        cursor: "pointer",
        color: "rgba(28,23,16,0.50)",
        transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.40)";
        (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.80)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)";
        (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.50)";
      }}
    >
      {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}
