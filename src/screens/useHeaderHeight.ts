import { useEffect, useRef } from 'react';

/**
 * Publishes the header's height as `--header-height`, kept current as it
 * resizes. The screens that cover the page start below the header, so its
 * buttons stay clickable on every screen. The layout that owns both the header
 * and those screens calls this and puts the returned ref on the header.
 */
export function useHeaderHeight() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        '--header-height',
        `${header.offsetHeight}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return headerRef;
}
