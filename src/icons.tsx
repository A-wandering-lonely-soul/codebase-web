/** @jsxRuntime automatic */
/** @jsxImportSource react */
import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 3 4 7.5 12 12l8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5" /><path d="m4 16.5 8 4.5 8-4.5" /></Svg>;
}

export function CodeIcon(props: IconProps) {
  return <Svg {...props}><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m13 5-2 14" /></Svg>;
}

export function LinkIcon(props: IconProps) {
  return <Svg {...props}><path d="M9 15 15 9" /><path d="M8 12H6.5A3.5 3.5 0 1 1 6.5 5H10" /><path d="M16 12h1.5A3.5 3.5 0 1 0 17.5 19H14" /></Svg>;
}

export function PulseIcon(props: IconProps) {
  return <Svg {...props}><path d="M3 12h4l2-5 4 10 2-5h6" /></Svg>;
}

export function FolderIcon(props: IconProps) {
  return <Svg {...props}><path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10Z" /></Svg>;
}

export function PlusIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;
}

export function RefreshIcon(props: IconProps) {
  return <Svg {...props}><path d="M20 12a8 8 0 1 1-2.2-5.5" /><path d="M20 4v5h-5" /></Svg>;
}

export function SearchIcon(props: IconProps) {
  return <Svg {...props}><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></Svg>;
}

export function TrashIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M7 7l1 12h8l1-12" /></Svg>;
}

export function CpuIcon(props: IconProps) {
  return <Svg {...props}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></Svg>;
}

export function MemoryIcon(props: IconProps) {
  return <Svg {...props}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 10v4M12 10v4M16 10v4" /></Svg>;
}

export function CheckIcon(props: IconProps) {
  return <Svg {...props}><path d="m5 12 5 5L20 7" /></Svg>;
}

export function CloseIcon(props: IconProps) {
  return <Svg {...props}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
}

export function ChevronIcon(props: IconProps) {
  return <Svg {...props}><path d="m9 6 6 6-6 6" /></Svg>;
}
