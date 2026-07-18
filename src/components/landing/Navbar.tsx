import { Menu, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "~/components/ui/ThemeToggle";

const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Who It's For", href: "#audience" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all"
      style={{
        backgroundColor: scrolled
          ? "var(--bg-sidebar)"
          : "transparent",
        borderBottom: scrolled
          ? "1px solid var(--border-default)"
          : "1px solid transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a
          href="#hero"
          className="flex items-center gap-2.5 font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Zap size={16} className="text-white" />
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:inline">
            LOGISTIQS Intelligence
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-primary)";
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--bg-muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="#early-access"
            className="btn-primary hidden h-10 px-5 text-sm sm:inline-flex"
          >
            Request Early Access
          </a>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md md:hidden"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="border-b px-4 pb-4 pt-2 md:hidden"
          style={{
            backgroundColor: "var(--bg-sidebar)",
            borderColor: "var(--border-default)",
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              className="block rounded-md px-3 py-2.5 text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#early-access"
            className="btn-primary mt-3 flex h-10 w-full items-center justify-center px-5 text-sm"
          >
            Request Early Access
          </a>
        </div>
      )}
    </nav>
  );
}
