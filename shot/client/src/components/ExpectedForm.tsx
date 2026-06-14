import type { ExpectedValues } from '@/types/domain';

interface Props {
  values: ExpectedValues;
  onChange: (values: ExpectedValues) => void;
  disabled?: boolean;
}

const FIELDS: Array<{ key: keyof ExpectedValues; label: string; placeholder: string }> = [
  { key: 'brand',      label: 'Brand Name',            placeholder: 'e.g., OLD TOM DISTILLERY' },
  { key: 'class_type', label: 'Class / Type',          placeholder: 'e.g., Kentucky Straight Bourbon Whiskey' },
  { key: 'abv',        label: 'Alcohol Content (ABV)', placeholder: 'e.g., 45% Alc./Vol. (90 Proof)' },
  { key: 'net',        label: 'Net Contents',          placeholder: 'e.g., 750 mL' },
];

export default function ExpectedForm({ values, onChange, disabled }: Props) {
  const handleChange = (key: keyof ExpectedValues, value: string) => {
    onChange({ ...values, [key]: value || undefined });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Expected value fields */}
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label htmlFor={`field-${key}`} className="mb-1 block text-sm font-medium text-gov-navy">
            {label}
          </label>
          <input
            id={`field-${key}`}
            type="text"
            value={values[key] ?? ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded border border-gov-gray-lighter px-3 py-2.5 text-sm text-gov-navy
                       placeholder-gov-gray-light focus:outline-none focus:ring-2 focus:ring-gov-blue
                       focus:border-transparent disabled:bg-gov-gray-lightest disabled:cursor-not-allowed"
          />
        </div>
      ))}
    </div>
  );
}
