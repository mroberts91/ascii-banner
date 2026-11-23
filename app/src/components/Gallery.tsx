import { FontCard } from './FontCard';

export function Gallery({ fonts }: { fonts: readonly string[] }) {
  if (fonts.length === 0) {
    return <p class="empty">No fonts match. Try a different search or category.</p>;
  }
  return (
    <section class="gallery" aria-label="Font previews">
      {fonts.map((f) => (
        <FontCard key={f} font={f} />
      ))}
    </section>
  );
}
