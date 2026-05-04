import type { ReactElement } from "react";

export default function AuthSegmentLoading(): ReactElement {
  return (
    <div
      className="flex min-h-[32vh] items-center justify-center py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="relative size-11">
        <div className="border-primary absolute inset-0 rounded-full border-2 border-t-transparent opacity-80 animate-spin" />
        <div className="bg-primary/15 absolute inset-2 rounded-full" />
      </div>
    </div>
  );
}
