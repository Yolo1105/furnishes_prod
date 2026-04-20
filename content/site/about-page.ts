import {
  HERO_IMAGE_JON,
  HERO_IMAGE_LUTE,
  HERO_IMAGE_MARKUS,
  LANDING_MAIN_5,
  LANDING_MAIN_7,
} from "@/content/site/about-images";

/** Segments for the intro headline; `highlight` uses site orange (`--color-accent`) on the about page. */
export const ABOUT_INTRO_HEADLINE_PARTS = [
  { text: "Fusing " },
  { text: "passion", highlight: true },
  { text: " and " },
  { text: "craft", highlight: true },
  { text: ": every space tells a story with Furnishes." },
] as const;

/** Single line under the intro headline. */
export const ABOUT_INTRO_HEADLINE_TAGLINE =
  "Honest materials, careful detail rooms that feel like yours.";

export const ABOUT_INTRO_SUBHEADLINE =
  "From concept to completion, our approach is an innovative fusion of craftsmanship, sustainable choices, and timeless design.";
export const ABOUT_INTRO_SUBCOLUMN1 =
  "Furnishes draws on a wide spectrum of design traditions and contemporary practice. From the clarity of minimalism and the richness of natural materials to the rigor of space planning, our roots run deep in both craft and function.";
export const ABOUT_INTRO_SUBCOLUMN2 =
  "This blend of influence fuels interiors that are as livable as they are distinctive, balancing rhythm, restraint, and refinement. It is in this intersection that Furnishes creates something lasting: spaces shaped by care and expertise.";

export const ABOUT_AWARDS_LABEL = "Projects";
export const ABOUT_AWARDS_HEADLINE =
  "A recognition of design excellence shaped by dedication, innovation, and lasting influence.";

export type AboutAwardImage = { src: string; alt: string };
export type AboutAwardEntry = {
  year: string;
  award: string;
  project: string;
  result: string;
  images?: AboutAwardImage[];
};

export const ABOUT_AWARDS: AboutAwardEntry[] = [
  {
    year: "2024",
    award: "Scandinavian Design Awards, Residential Category",
    project: "Nordic Retreat House",
    result: "Winner",
    images: [
      { src: HERO_IMAGE_LUTE, alt: "Nordic Retreat House interior" },
      { src: HERO_IMAGE_JON, alt: "Nordic Retreat House exterior" },
      { src: HERO_IMAGE_MARKUS, alt: "Nordic Retreat House space" },
    ],
  },
  {
    year: "2023",
    award: "ArchDaily Interior Excellence, Public Spaces",
    project: "Oslo Civic Pavilion",
    result: "Honorable Mention",
    images: [
      { src: HERO_IMAGE_JON, alt: "Oslo Civic Pavilion view" },
      { src: HERO_IMAGE_MARKUS, alt: "Oslo Civic Pavilion space" },
      { src: HERO_IMAGE_LUTE, alt: "Oslo Civic Pavilion interior" },
    ],
  },
  {
    year: "2022",
    award: "Global Design Awards, Eco Innovation",
    project: "Forestline Studio",
    result: "Finalist",
  },
  {
    year: "2021",
    award: "Nordic Design Week, Innovation & Craftsmanship",
    project: "Haven Workspace",
    result: "Winner",
  },
];

export const ABOUT_TEAMS_LABEL = "Teams";
export const ABOUT_TEAMS_HEADLINE =
  "A team united by vision, craft, and timeless design.";

export type AboutTeamMember = {
  name: string;
  role: string;
  /** Shown under the name row when this member is active (rotation or hover). */
  roleDescription?: string;
  image?: { src: string; alt: string };
};

export const ABOUT_TEAM_MEMBERS: AboutTeamMember[] = [
  {
    name: "Elizabeth",
    role: "Creative Director",
    roleDescription:
      "Leads visual direction and narrative across projects, balancing brand, materials, and spatial storytelling.",
    image: { src: HERO_IMAGE_LUTE, alt: "Elizabeth" },
  },
  {
    name: "Mohan",
    role: "3D Visualization Lead",
    roleDescription:
      "Turns concepts into accurate renders and walkthroughs so clients can see light, scale, and detail before build.",
    image: { src: HERO_IMAGE_MARKUS, alt: "Mohan" },
  },
  {
    name: "Henry",
    role: "Design Researcher",
    roleDescription:
      "Surfaces user needs, benchmarks, and trends to inform layouts, ergonomics, and long term adaptability.",
    image: { src: HERO_IMAGE_JON, alt: "Henry" },
  },
  {
    name: "Jessica",
    role: "Principal Architect",
    roleDescription:
      "Owns planning, code coordination, and technical resolution from early studies through construction support.",
    image: { src: LANDING_MAIN_7, alt: "Jessica" },
  },
];

export const ABOUT_BLOG_LABEL = "Blog";
export const ABOUT_BLOG_HEADLINE =
  "Insights shaped by our exploration of space and design.";

export const ABOUT_BLOG_ITEMS: {
  title: string;
  readTime: string;
  imageSrc: string;
  imageAlt: string;
  href?: string;
}[] = [
  {
    title: "Scandinavian minimalism",
    readTime: "3 min read",
    imageSrc: HERO_IMAGE_LUTE,
    imageAlt: "Scandinavian minimalism",
  },
  {
    title: "Diving into ocean conservation",
    readTime: "5 min read",
    imageSrc: HERO_IMAGE_JON,
    imageAlt: "Ocean conservation",
  },
  {
    title: "The next era of renewable energy",
    readTime: "6 min read",
    imageSrc: HERO_IMAGE_MARKUS,
    imageAlt: "Renewable energy",
  },
  {
    title: "How to cultivate a growth mindset",
    readTime: "4 min read",
    imageSrc: LANDING_MAIN_5,
    imageAlt: "Growth mindset",
  },
];
