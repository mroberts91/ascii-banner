import type { ComponentChildren } from 'preact';

/** A link that opens in a new tab and says so, visually and to screen readers. */
export function ExternalLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span class="new-tab" aria-hidden="true">
        ↗
      </span>
      <span class="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}
