"use client";

import { useEffect, useState } from "react";

interface BotDetectionProps {
  onVerified: () => void;
  onBotDetected: () => void;
}

export function BotDetection({ onVerified, onBotDetected }: BotDetectionProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isBot, setIsBot] = useState(false);

  useEffect(() => {
    const checkBot = async () => {
      try {
        const win = window as any;
        const nav = navigator as any;
        const doc = document as any;

        const checks = {
          webdriver: !!nav.webdriver,
          automationControlled: win.domAutomation || win.domAutomationController,
          headless: /HeadlessChrome/.test(navigator.userAgent),
          phantom: !!win.__phantomas || !!win._phantom,
          selenium:
            !!win.callSelenium ||
            !!doc.__selenium_unwrapped ||
            !!doc.__webdriver_script_fn,
          screenAnomaly:
            window.outerWidth === 0 ||
            window.outerHeight === 0 ||
            screen.width === 0,
          puppeteer: !!win.__puppeteer_evaluation_script__,
        };

        const isLikelyBot = Object.values(checks).some((v) => v === true);

        if (isLikelyBot) {
          setIsBot(true);
          onBotDetected();
        } else {
          onVerified();
        }
      } catch {
        onVerified();
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkBot, 100);
    return () => clearTimeout(timer);
  }, [onVerified, onBotDetected]);

  if (isChecking) {
    return null;
  }

  if (!isBot) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-w-md px-8 text-center font-mono">
        <div className="mb-6 text-4xl text-red-500">!</div>
        <h1 className="mb-4 text-xl text-red-500">bot detected</h1>
        <p className="mb-8 text-sm text-zinc-500">
          automated behavior detected. this platform is for humans only.
          disable automation tools and refresh.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="border border-zinc-700 px-6 py-2 text-sm text-white hover:bg-zinc-900"
        >
          refresh
        </button>
      </div>
    </div>
  );
}
