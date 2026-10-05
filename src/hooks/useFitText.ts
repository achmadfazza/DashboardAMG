import { useEffect, useRef } from 'react';

/**
 * Fits the element's font size so its text stays on one line and never
 * overflows its container width. Re-fits whenever the text changes or the
 * container is resized (ResizeObserver + window resize).
 *
 * The element should be a block-level container for the text and have
 * `whitespace-nowrap` so overflow is measurable.
 */
export const useFitText = <T extends HTMLElement>(text: string, minPx = 10, maxPx = 24) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const available = el.clientWidth;
      if (available <= 0) return;

      // Measure starting from the largest allowed size
      el.style.fontSize = `${maxPx}px`;
      if (el.scrollWidth <= available) return;

      // Scale proportionally, then fine-tune down by 1px until it fits
      let size = Math.floor((available / el.scrollWidth) * maxPx);
      size = Math.max(minPx, Math.min(maxPx, size));
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > available && size > minPx) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [text, minPx, maxPx]);

  return ref;
};
