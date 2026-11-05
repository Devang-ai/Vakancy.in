import { useEffect } from 'react';

/**
 * useSEO - Custom React hook for technical SEO, dynamic metadata, canonical links & Schema.org JSON-LD
 *
 * @param {Object} options
 * @param {string} options.title - Page title
 * @param {string} options.description - Meta description
 * @param {string} [options.canonical] - Canonical path or full URL (defaults to window.location.pathname)
 * @param {string} [options.ogType='website'] - Open Graph type
 * @param {string} [options.ogImage] - Open Graph image URL
 * @param {Object|Array} [options.schema] - Schema.org JSON-LD object or array of objects
 */
export const useSEO = ({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = 'https://vakancy.in/assets/brand/vakancy-og-share.png',
  schema
}) => {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = title.includes('Vakancy') ? title : `${title} | Vakancy.in`;
    }

    // 2. Helper to set/create meta tag
    const setMetaTag = (attribute, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 3. Update Standard Meta Tags
    if (description) {
      setMetaTag('name', 'description', description);
    }

    // 4. Update Canonical Link
    const baseUrl = 'https://vakancy.in';
    const canonicalHref = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${baseUrl}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
      : `${baseUrl}${window.location.pathname}`;

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalHref);

    // 5. Open Graph Meta Tags
    const fullTitle = document.title;
    setMetaTag('property', 'og:title', fullTitle);
    if (description) setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalHref);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', ogImage);

    // 6. Twitter Meta Tags
    setMetaTag('name', 'twitter:title', fullTitle);
    if (description) setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 7. Inject Schema.org JSON-LD
    let scriptEl = document.getElementById('vakancy-schema-jsonld');
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'vakancy-schema-jsonld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Clean up dynamic schema if needed
      const existingScript = document.getElementById('vakancy-schema-jsonld');
      if (existingScript) existingScript.remove();
    };
  }, [title, description, canonical, ogType, ogImage, schema]);
};

export default useSEO;
