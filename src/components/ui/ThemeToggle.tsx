"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg
        text-slate-600 dark:text-slate-300
        hover:bg-slate-100 dark:hover:bg-slate-700
        transition-colors text-sm font-medium"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
