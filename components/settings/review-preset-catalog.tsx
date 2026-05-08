"use client";

import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { planLabel, type PlanId } from "@/lib/plans";
import {
  PRESET_CARD_COPY,
  REVIEW_TEMPLATE_PRESET_IDS,
} from "@/lib/reviews/preset-review-templates";

export function ReviewPresetCatalog({ plan }: { plan: PlanId }): ReactElement {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm leading-relaxed">
        When HR or Admin creates a review cycle they choose one of these questionnaires. Everyone invited
        to that cycle sees the same prompts. Upgrade to unlock role-specific presets beyond General.
      </p>
      <div className="grid gap-4">
        {REVIEW_TEMPLATE_PRESET_IDS.map((id) => {
          const meta = PRESET_CARD_COPY[id];
          const locked = meta.requiresPro && plan === "free";
          return (
            <Card key={id} className="border-border/70">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  {meta.requiresPro ? (
                    <Badge variant="outline" className="text-[10px]">
                      Pro / Pro+
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      All plans
                    </Badge>
                  )}
                  {locked ? (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Locked on {planLabel(plan)}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  {meta.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
