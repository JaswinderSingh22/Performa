import type { Metadata } from "next";
import type { ReactElement } from "react";

import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "PerformaAI — Scoped review cycles, AI-assisted performance",
  description:
    "Run team-scoped review cycles, collect self-reviews, guide managers through structured remarks, and approve with HR—powered by context-aware AI.",
};

export default function Home(): ReactElement {
  return <LandingPage />;
}
