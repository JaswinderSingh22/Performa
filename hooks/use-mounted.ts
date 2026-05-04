"use client";

import * as React from "react";

/** Returns true after mount (useful for client-only hydration guards). */
export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}
