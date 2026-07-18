import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

// Blocking script: runs before paint. Default is dark; only switch to light if
// the user explicitly chose it previously.
const DARK_MODE_SCRIPT = `(function(){
  try{
    if(localStorage.getItem('theme')==='light'){
      document.documentElement.classList.remove('dark');
    }
  }catch(e){}
})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "LOGISTIQS Intelligence — Cross-Border Mining Transport Intelligence",
      },
      {
        name: "description",
        content:
          "An AI-powered operations command centre for African cross-border mining logistics. Prevent predictable cross-border transport failures before they happen.",
      },
      { name: "theme-color", content: "#020617" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        children: DARK_MODE_SCRIPT,
      },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
