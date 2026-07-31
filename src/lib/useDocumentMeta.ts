import { useEffect } from 'react';

type Meta = {
  title?: string;
  description?: string;
  image?: string | null;
};

const setTag = (attr: 'property' | 'name', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/**
 * Atualiza título e meta tags Open Graph em runtime (páginas públicas).
 * Observação: crawlers que não executam JS (ex.: WhatsApp) leem apenas o
 * index.html estático — para preview por empresa é preciso SSR/prerender.
 */
export function useDocumentMeta({ title, description, image }: Meta) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = title;
      setTag('property', 'og:title', title);
    }
    if (description) {
      setTag('name', 'description', description);
      setTag('property', 'og:description', description);
    }
    if (image) {
      setTag('property', 'og:image', image);
    }
    return () => { document.title = prevTitle; };
  }, [title, description, image]);
}
