import { useState, useEffect, useCallback } from "react";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall,     setCanInstall]     = useState(false);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [dismissed,      setDismissed]      = useState(false);

  useEffect(() => {
    // All browser API access is inside useEffect — safe from SSR / build-time issues
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(window.navigator.standalone);
    setIsInstalled(standalone);

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !/crios/i.test(navigator.userAgent) &&
      !/fxios/i.test(navigator.userAgent);
    setIsIOS(ios);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("[PWA] Install prompt error:", err);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { canInstall, install, isInstalled, isIOS, dismissed, dismiss };
}
