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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Napsat nám"
        className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-full border border-gold/40 bg-c1/95 px-4 py-3 text-[13px] font-semibold text-gold shadow-xl backdrop-blur transition hover:border-gold hover:bg-c2 sm:bottom-6 sm:right-6"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">Napsat nám</span>
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
