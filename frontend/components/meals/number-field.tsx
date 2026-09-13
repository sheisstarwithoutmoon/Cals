import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
  /** Smaller label/input styling, used for the micronutrients grid. */
  compact?: boolean;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  invalid,
  errorMessage,
  compact = false,
}: NumberFieldProps) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <Label htmlFor={id} className={compact ? "text-[11px] text-stone-600" : undefined}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        placeholder={placeholder}
        required={required}
        className={compact ? "h-9 text-xs" : undefined}
      />
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
