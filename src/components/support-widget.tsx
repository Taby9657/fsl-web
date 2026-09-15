"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/components/ui/feedback";
import { SupportForm } from "@/components/support-form";

/**
 * Plovoucí tlačítko „Napsat nám" na každé stránce.
 *
 * Proč plovoucí a ne jen odkaz v patičce: člověk hlásí chybu ve chvíli,
 * kdy na ni kouká. Kdyby musel hledat kontakt, většina to vzdá — a liga
 * se o chybě nedozví. Adresa stránky se do zprávy přiloží sama.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // V administraci ne — supervisor píše sám sobě.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Zlatá výplň, ne obtažení: v decentní variantě si tlačítka nikdo
          nevšiml na první dobrou — a to je u hlášení chyb ta jediná věc,
          na které záleží. Popisek je vidět i na telefonu; samotná ikona
          nikomu neřekne, co se po kliknutí stane. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Napsat nám"
        className="fixed bottom-4 right-4 z-[90] flex items-center gap-2.5 rounded-full bg-go px-5 py-3.5 text-[15px] font-bold text-bg shadow-[0_10px_30px_-6px_rgba(201,161,64,0.65)] ring-1 ring-black/10 transition hover:bg-[#d8b055] active:bg-[#bd9439] sm:bottom-6 sm:right-6 sm:px-6 sm:py-4 sm:text-[16px]"
      >
        <MessageSquarePlus size={22} strokeWidth={2.4} />
        Napsat nám
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Napsat nám"
        size="md"
      >
        <p className="mb-4 text-[13px] leading-6 text-mu">
          Nefunguje něco, nebo si nejsi jistý? Napiš nám to rovnou odsud —
          dotaz, platby, soupiska, registrace, chyba na webu, cokoli.
        </p>
        <SupportForm />
      </Modal>
    </>
  );
}
