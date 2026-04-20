import Link from "next/link";
import {
  FeaturePlaceholderPage,
  previewLinkClass,
} from "@/components/site/FeaturePlaceholderPage";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import { aboutBodyMutedClass } from "@/lib/site/about-typography";

export default function RoomPlannerPage() {
  return (
    <FeaturePlaceholderPage
      title="Room planner"
      description="Spatial planning is part of the broader design workflow we are building. Use the assistant and the planning tools linked here to define your space, style, and budget."
      showInspirationLink={false}
      footer={
        <div className={`mt-8 max-w-2xl space-y-4 ${aboutBodyMutedClass}`}>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <Link
                href={WORKFLOW_ROUTES.assistant}
                className={previewLinkClass}
              >
                Eva assistant
              </Link>{" "}
              — refine layout and product choices in conversation
            </li>
            <li>
              <Link href={WORKFLOW_ROUTES.style} className={previewLinkClass}>
                Style
              </Link>{" "}
              and{" "}
              <Link href={WORKFLOW_ROUTES.budget} className={previewLinkClass}>
                Budget
              </Link>{" "}
              — lock direction and spend
            </li>
            <li>
              <Link
                href={WORKFLOW_ROUTES.inspiration}
                className={previewLinkClass}
              >
                Inspiration
              </Link>{" "}
              — explore tools and ideas
            </li>
          </ul>
          <p>
            <Link href={WORKFLOW_ROUTES.home} className={previewLinkClass}>
              Home
            </Link>
          </p>
        </div>
      }
    />
  );
}
