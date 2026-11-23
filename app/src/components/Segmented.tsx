interface Option<T extends string | number> {
  value: T;
  label: string;
  /** Short glyph shown instead of the label on narrow screens (label stays for screen readers). */
  icon?: string;
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  name: string;
  /** Hide the legend visually (still announced) for toolbar-style placement. */
  hideLegend?: boolean;
  class?: string;
}) {
  return (
    <fieldset class={`segmented${props.class ? ` ${props.class}` : ''}`}>
      <legend class={props.hideLegend ? 'visually-hidden' : undefined}>{props.label}</legend>
      <div class="segmented-row">
        {props.options.map((o) => (
          <label key={o.value} class={o.value === props.value ? 'on' : ''}>
            <input
              type="radio"
              name={props.name}
              value={String(o.value)}
              checked={o.value === props.value}
              onChange={() => props.onChange(o.value)}
            />
            {o.icon ? (
              <>
                <span class="seg-icon" aria-hidden="true">
                  {o.icon}
                </span>
                <span class="seg-text">{o.label}</span>
              </>
            ) : (
              o.label
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
