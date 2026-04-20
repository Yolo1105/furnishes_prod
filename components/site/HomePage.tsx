import { AboutWhoWe } from "@/components/site/AboutWhoWe";
import { DesignSection } from "@/components/site/DesignSection";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { HeritageSection } from "@/components/site/HeritageSection";
import { MaterialSection } from "@/components/site/MaterialSection";
import { LandingCarousel } from "@/components/site/LandingCarousel";
import { SidebarNav } from "@/components/site/SidebarNav";
import { MAIN_LANDING_IMAGES } from "@/content/site/landing-main-images";

export function HomePage() {
  return (
    <>
      <SidebarNav />

      <section id="Home" className="min-h-dvh">
        <LandingCarousel images={MAIN_LANDING_IMAGES} />
      </section>

      <AboutWhoWe />

      <ExperienceSection />

      <DesignSection />

      <MaterialSection />

      <HeritageSection />
    </>
  );
}
