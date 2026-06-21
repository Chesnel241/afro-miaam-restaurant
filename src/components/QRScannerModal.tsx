"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

export function QRScannerModal({ onClose }: { onClose: () => void }) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configuration du scanner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    };

    scannerRef.current = new Html5QrcodeScanner("reader", config, false);

    const onScanSuccess = (decodedText: string) => {
      // Strict validation: the scanned content must parse as a URL with the
      // same origin as the current site, and the path must start with
      // "/valider-commande/". A substring check (the old behaviour) lets
      // an attacker craft https://evil.com/x/valider-commande/y for an
      // open-redirect / phishing attack.
      let safeTarget: string | null = null;
      try {
        const parsed = new URL(decodedText);
        if (
          parsed.origin === window.location.origin &&
          parsed.pathname.startsWith("/valider-commande/")
        ) {
          safeTarget = parsed.pathname + parsed.search;
        }
      } catch {
        // Not a URL.
      }

      if (!safeTarget) {
        setError("Ce QR Code n'est pas un code de livraison Afro Miaam valide.");
        return;
      }

      if (scannerRef.current) {
        scannerRef.current.clear().then(() => {
          window.location.href = safeTarget;
        }).catch((err: unknown) => {
          console.warn("QR_SCAN_CLEANUP_FAILED", (err as { code?: string }).code ?? "unknown");
          window.location.href = safeTarget;
        });
      }
    };

    const onScanFailure = (_error: unknown) => {
      // Ignore continuous read failures (camera frames without a code).
    };

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
      }
    };
  }, []);

  // Close on Escape — basic modal accessibility. We attach to window so the
  // listener fires even when focus is inside the camera viewport.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un QR code de livraison"
    >
      <div
        className="absolute inset-0 bg-primary/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-in">
        <div className="bg-primary p-6 text-center text-cream">
          <h3 className="font-display text-xl font-black uppercase tracking-widest">Scanner Livraison</h3>
          <p className="text-[10px] opacity-60 mt-1">Placez le QR Code du restaurant dans le cadre</p>
        </div>

        <div className="p-6">
          <div id="reader" className="overflow-hidden rounded-2xl border-none"></div>
          
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-center text-[11px] font-bold text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <button 
            onClick={onClose}
            className="btn btn-primary mt-6 w-full py-4 text-xs font-black uppercase tracking-widest"
          >
            Annuler
          </button>
        </div>
      </div>

      <style jsx global>{`
        #reader {
          border: none !important;
        }
        #reader img {
          display: none !important;
        }
        #reader__dashboard_section_csr button {
          background-color: #1F3D2B !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          margin-top: 10px !important;
          cursor: pointer !important;
        }
        #reader__scan_region {
            background: #F4EDE4 !important;
            border-radius: 16px !important;
        }
        #reader__status_span {
            font-size: 10px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            color: #1F3D2B !important;
        }
      `}</style>
    </div>
  );
}
