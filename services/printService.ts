import { supabase } from './supabase';

/**
 * printService.ts
 * Service d'impression partagé — imprime du contenu HTML via un iframe caché.
 * Remplace le pattern anti-React `(window as any).printHtml`.
 */

let iframe: HTMLIFrameElement | null = null;

function ensureIframe(): HTMLIFrameElement {
  if (iframe && document.body.contains(iframe)) return iframe;

  iframe = document.createElement('iframe');
  iframe.id = 'gesco-print-iframe';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;z-index:-9999;';
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * Imprime un contenu HTML complet dans une fenêtre masquée.
 * Attend le chargement des images avant de déclencher l'impression.
 */
export function printHtml(htmlContent: string): void {
  const el = ensureIframe();
  const doc = el.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  const doPrint = () => {
    el.contentWindow?.focus();
    el.contentWindow?.print();
  };

  const images = doc.getElementsByTagName('img');
  const totalImages = images.length;

  if (totalImages === 0) {
    doPrint();
    return;
  }

  let loaded = 0;
  const onLoad = () => {
    loaded++;
    if (loaded === totalImages) doPrint();
  };

  for (let i = 0; i < totalImages; i++) {
    images[i].onload = onLoad;
    images[i].onerror = onLoad; // Count errors too so we don't hang
  }

  // Fallback: imprimer même si des images ne chargent pas après 1.5s
  setTimeout(doPrint, 1500);
}
