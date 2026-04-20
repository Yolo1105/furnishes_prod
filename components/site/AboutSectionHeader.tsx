import { createElement, type ElementType, type ReactNode } from "react";
import { aboutSectionTitleClass } from "@/lib/site/about-typography";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";

type AboutSectionHeaderProps = {
  label: string;
  heading: ReactNode;
  headingAs?: ElementType;
};

export function AboutSectionHeader({
  label,
  heading,
  headingAs: Tag = "h2",
}: AboutSectionHeaderProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="font-sans lg:col-span-2">
        <BracketedSectionLabel
          label={label}
          size="compact"
          labelClassName="uppercase tracking-wider"
        />
      </div>
      {createElement(
        Tag,
        { className: `lg:col-span-10 ${aboutSectionTitleClass}` },
        heading,
      )}
    </div>
  );
}
