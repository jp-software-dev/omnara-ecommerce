"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget. It renders NOTHING until NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set, so the forms behave exactly as before without the key. Tokens are
// single-use: bump `resetKey` after every submit attempt to get a fresh one.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const captchaEnabled = Boolean(SITE_KEY);

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry on the next mount
        reject(new Error("Could not load the verification widget."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function Turnstile({
  onToken,
  resetKey = 0,
}: {
  /** Receives the token, or null when it expires or fails. Pass a stable function (e.g. a state setter). */
  onToken: (token: string | null) => void;
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [onToken]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onToken(null);
    }
  }, [resetKey, onToken]);

  if (!SITE_KEY) return null;
  return <div ref={container} className="min-h-[65px]" />;
}
