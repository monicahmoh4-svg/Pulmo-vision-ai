import { useState, useEffect, useCallback } from "react";

/**
 * usePWAInstall
 *
 * Key fix: we delay rendering decisions by 3 seconds after mount.
 * The beforeinstallprompt event fires asynchronously — if we check
 * canInstall immediately on mount it's always false, causing the banner
 * to never show. The `ready` flag prevents the banner from hiding itself
 * before the browser has had a chance to fire the event.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall,     setCanInstall]     = useState(false);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [dismissed,      setDismissed]      = useState(
    () => sessionStorage.getItem("pwa-dismissed") === "1"
  );
  // Wait 3 s before deciding "not installable" — gives browser time to fire
  const [ready,          setReady]          = useState(false);

  useEffect(() => {
    // Detect already-installed (standalone mode)
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsInstalled(mq.matches || Boolean(navigator.standalone));

    // iOS Safari detection (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    setIsIOS(
      /iphone|ipad|ipod/i.test(ua) &&
      !/crios|fxios|opios|chrome/i.test(ua) &&
      "standalone" in navigator
    );

    const onPrompt = (e) => {
      e.preventDefault();          // stop Chrome mini-infobar
      setDeferredPrompt(e);
      setCanInstall(true);
      setReady(true);              // show banner immediately when event fires
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled",        onInstalled);

    // After 3 s, mark ready regardless — banner will show for iOS even
    // if beforeinstallprompt never fires
    const timer = setTimeout(() => setReady(true), 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled",        onInstalled);
      clearTimeout(timer);
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
      console.warn("[PWA] install prompt error:", err);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  }, []);

  return { canInstall, install, isInstalled, isIOS, dismissed, dismiss, ready };
}
