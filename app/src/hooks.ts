import { useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// One shared observer for every card instead of ~300 separate ones.
type Listener = (visible: boolean) => void;
const listeners = new WeakMap<Element, Listener>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) listeners.get(e.target)?.(e.isIntersecting);
      },
      { rootMargin: '100% 0px' },
    );
  }
  return observer;
}

/** True while the element is within about one viewport of the screen. */
export function useNearViewport(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  const setRef = useRef(setVisible);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = getObserver();
    listeners.set(el, (v) => setRef.current(v));
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      listeners.delete(el);
    };
  }, [ref]);
  return visible;
}
