// Vykreslí `og.html` do `public/og.png` (1200 × 630).
// Spouští se ručně po změně textu v předloze, ne při buildu — karta se mění
// párkrát za sezónu a Vercel by kvůli ní tahal celý Chromium.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const zde = dirname(fileURLToPath(import.meta.url));
const cil = join(zde, "..", "..", "public", "og.png");

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage({ viewport: { width: 1200, height: 630 } });
await stranka.goto("file://" + join(zde, "og.html"));
await stranka.evaluate(() => document.fonts.ready);
await stranka.waitForTimeout(400);
await stranka.screenshot({ path: cil });
await prohlizec.close();

console.log("Hotovo:", cil);
