import type { ComplianceStatus } from '@/types/domain';

interface Props {
  status: ComplianceStatus;
  large?: boolean;
}

const CONFIG: Record<ComplianceStatus, { label: string; classes: string }> = {
  compliant:     { label: 'PASS',   classes: 'bg-gov-green text-white' },
  non_compliant: { label: 'FAIL',   classes: 'bg-gov-red text-white' },
  warning:       { label: 'REVIEW', classes: 'bg-gov-yellow text-gov-navy' },
  not_checked:   { label: 'N/A',    classes: 'bg-gov-gray-lighter text-gov-gray' },
};

export default function Status({ status, large }: Props) {
  const { label, classes } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center font-bold rounded tracking-wider ${classes} ${
        large ? 'px-4 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {label}
    </span>
  );
}
