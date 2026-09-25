"use client";

import { useEffect, useRef } from "react";

export function ProtectedSimulationRenderer({ html, title }: { html: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Prevent devtools shortcuts on parent window
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "F12" ||
        (event.ctrlKey && event.shiftKey && (event.key === "I" || event.key === "i")) ||
        (event.ctrlKey && event.shiftKey && (event.key === "C" || event.key === "c")) ||
        (event.ctrlKey && event.shiftKey && (event.key === "J" || event.key === "j")) ||
        (event.ctrlKey && (event.key === "U" || event.key === "u"))
      ) {
        event.preventDefault();
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    // Attach to window and document for broader coverage
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        const protectionScript = `
          <style>
            body {
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            input, textarea {
              -webkit-user-select: auto;
              -moz-user-select: auto;
              -ms-user-select: auto;
              user-select: auto;
            }
          </style>
          <script>
            document.addEventListener('contextmenu', event => event.preventDefault());
            document.addEventListener('keydown', event => {
              if (
                event.key === 'F12' || 
                (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i')) || 
                (event.ctrlKey && event.shiftKey && (event.key === 'C' || event.key === 'c')) ||
                (event.ctrlKey && event.shiftKey && (event.key === 'J' || event.key === 'j')) ||
                (event.ctrlKey && (event.key === 'U' || event.key === 'u'))
              ) {
                event.preventDefault();
              }
            });
          </script>
        `;
        
        // Inject protection script before the actual html
        // Note: some HTML might have <head> and <body> tags, so appending at the beginning usually puts it in head or body automatically by browser parser.
        const protectedHtml = protectionScript + html;
        
        doc.open();
        doc.write(protectedHtml);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div 
      className="absolute inset-0 w-full h-full select-none" 
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <iframe
        ref={iframeRef}
        title={title}
        className="w-full h-full border-0 pointer-events-auto"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
