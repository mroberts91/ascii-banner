interface Option<T extends string | number> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset class="segmented">
      <legend>{props.label}</legend>
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
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
