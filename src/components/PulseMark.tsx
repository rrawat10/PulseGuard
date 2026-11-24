export default function PulseMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" role="img" aria-label="PulseGuard mark" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="15" fill="#1D64C7" />
      <path d="M8 33h11l5-10 8 22 7-29 6 17h11" stroke="white" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
