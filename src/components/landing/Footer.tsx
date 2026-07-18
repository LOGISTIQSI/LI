export default function Footer() {
  return (
    <footer
      className="border-t py-8"
      style={{
        borderColor: "var(--border-default)",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          &copy; 2026 LOGISTIQS Intelligence. All rights reserved.
        </span>
        <div className="flex gap-6 text-sm">
          <a
            href="#"
            className="transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
