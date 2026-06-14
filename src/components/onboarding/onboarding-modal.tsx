"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useTranslations } from "@/i18n/context";

interface SlideItem {
  emoji: string;
  labelKey: string;
  detailKey: string;
}

interface Slide {
  emoji?: string;
  titleKey: string;
  bodyKey?: string;
  items?: SlideItem[];
  isFinal?: boolean;
}

const SLIDES: Slide[] = [
  {
    emoji: "🐱",
    titleKey: "slide1Title",
    bodyKey: "slide1Body",
  },
  {
    titleKey: "slide2Title",
    items: [
      { emoji: "🍼", labelKey: "slide2Feedings", detailKey: "slide2FeedingsDetail" },
      { emoji: "⚖️", labelKey: "slide2Weight",   detailKey: "slide2WeightDetail" },
      { emoji: "🩺", labelKey: "slide2Health",   detailKey: "slide2HealthDetail" },
      { emoji: "💊", labelKey: "slide2Meds",     detailKey: "slide2MedsDetail" },
    ],
  },
  {
    titleKey: "slide3Title",
    items: [
      { emoji: "👥", labelKey: "slide3Household", detailKey: "slide3HouseholdDetail" },
      { emoji: "🔗", labelKey: "slide3Share",     detailKey: "slide3ShareDetail" },
      { emoji: "🔔", labelKey: "slide3Alerts",    detailKey: "slide3AlertsDetail" },
    ],
  },
  {
    emoji: "🎉",
    titleKey: "slide4Title",
    bodyKey: "slide4Body",
    isFinal: true,
  },
];

export function OnboardingModal() {
  const { open, setOpen, setSeen } = useOnboardingStore();
  const t = useTranslations("onboarding");
  const [slide, setSlide] = useState(0);

  function handleClose() {
    setSeen();
    setOpen(false);
    setSlide(0);
  }

  const current = SLIDES[slide];
  const isFirst = slide === 0;
  const isLast = slide === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm mx-auto p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">{t(current.titleKey)}</DialogTitle>

        {/* Slide body */}
        <div className="px-6 pt-8 pb-4 min-h-[340px] flex flex-col">
          {current.emoji && (
            <div className="text-6xl text-center mb-4">{current.emoji}</div>
          )}
          <h2 className="text-xl font-bold text-center mb-3">{t(current.titleKey)}</h2>

          {current.bodyKey && (
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {t(current.bodyKey)}
            </p>
          )}

          {current.items && (
            <ul className="space-y-3 mt-1">
              {current.items.map((item) => (
                <li key={item.labelKey} className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5 shrink-0">{item.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{t(item.labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(item.detailKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {current.isFinal && (
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild onClick={handleClose}>
                <Link href="/kittens/new">{t("slide4Cta")}</Link>
              </Button>
              <Button variant="ghost" onClick={handleClose}>{t("slide4Done")}</Button>
            </div>
          )}
        </div>

        {/* Footer: dots + nav */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst}
            onClick={() => setSlide((s) => s - 1)}
            aria-label={t("back")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === slide ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {isLast ? (
            <div className="w-8" />
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSlide((s) => s + 1)}
              aria-label={t("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
