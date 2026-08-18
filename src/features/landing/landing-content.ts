/**
 * Canonical Landing copy mirrored from the frozen reference
 * (`reference/2026-07-16/landing.jsx`). Demo / unverified
 * facts stay marked; `productionReady: false` until a CMS supplies verified data.
 */
export const landingContent = {
  productionReady: false,
  brand: { name: "Furnishes" },
  hero: {
    title: "Interior",
    echoes: ["Revolution", "Revolution", "Revolution", "Revolution"] as const,
    blurb: ["Visual development", "and support in 3D production"] as const,
    cta: "Move in, built to last",
    ariaLabel: "Interior Revolution",
  },
  waitlist: {
    tag: "[ Early access · 2026 ]",
    titleLead: "Be",
    titleAccent: "first",
    titleTrail: "through the door.",
    lead: "Be first to configure Plinth, Wedge, and Cylinder in Bone & Moss. One note the day it opens, nothing more.",
    placeholder: "you@studio.com",
    idleNote: "No spam, unsubscribe anytime.",
  },
  aboutManifesto: {
    /**
     * Archive WHO ARE WE weave: text + 7 inline thumbs (desktop). Image paths
     * live under `public/images/` — intentional difference vs the
     * photo-stripped Phase 1 reference.
     */
    parts: [
      { type: "text", text: "We understand that ", highlight: false },
      { type: "text", text: "good design ", highlight: true },
      { type: "image", index: 0 },
      {
        type: "text",
        text: "goes beyond aesthetics. It sets the tone for how a home feels day after day. ",
        highlight: false,
      },
      { type: "image", index: 1 },
      { type: "text", text: "Our philosophy ", highlight: false },
      { type: "image", index: 2 },
      {
        type: "text",
        text: "centers around creating functional, ",
        highlight: false,
      },
      { type: "image", index: 3 },
      { type: "text", text: "comfortable ", highlight: true },
      {
        type: "text",
        text: "spaces that hold both quiet mornings and full evenings. ",
        highlight: false,
      },
      {
        type: "text",
        text: "We listen first to what matters ",
        highlight: false,
      },
      { type: "image", index: 4 },
      {
        type: "text",
        text: ", then we shape ",
        highlight: false,
      },
      { type: "image", index: 5 },
      {
        type: "text",
        text: " light, material, and layout to how you live, work, and rest, so every room feels ",
        highlight: false,
      },
      { type: "image", index: 6 },
      {
        type: "text",
        text: "considered, calm, and truly yours.",
        highlight: false,
      },
    ] as const,
    images: [
      {
        src: "/images/landing-main-1.jpg",
        alt: "Sunlit living room with soft seating and natural light",
      },
      {
        src: "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg",
        alt: "Open-plan interior with large windows and warm finishes",
      },
      {
        src: "/images/landing-main-4.jpg",
        alt: "Warm wood joinery and soft seating in a living space",
      },
      {
        src: "/images/landing-main-5.jpg",
        alt: "Calm bedroom retreat with layered textiles",
      },
      {
        src: "/images/landing-main-6.jpg",
        alt: "Dining area designed for everyday gathering",
      },
      {
        src: "/images/landing-main-7.jpg",
        alt: "Close-up of interior material and texture detail",
      },
      {
        src: "/images/landing-banner-3.jpg",
        alt: "Wide architectural view of a finished interior",
      },
    ] as const,
  },
  experience: {
    eyebrow: "Experience",
    titleLead: "For",
    titleAccent: "modern",
    titleTrail: "living.",
    lead: "Good design should feel natural in daily life: easy to live with, calm to look at, genuinely pleasant to use. We work with people who understand how a space is really lived in, so every room stays thoughtful, durable and honest from first sketch to final frame.",
    philosophyTitle: "Futuristic &\nminimalist.",
    philosophyLabel: "[ Our philosophy ]",
    philosophyBody:
      "What you see on screen is what gets built. Every project is led by specialists who care about proportion, light, and the honest use of materials. They stay close to the work until the last detail feels right, with clear updates along the way and finishes that age well.",
    philosophyImage: {
      src: "/images/hero/lute-Fv5GnGntvcg-unsplash.jpg",
      alt: "Modern minimalist living room with natural light",
    },
    quote: "A space should feel right long before it's real.",
    features: [
      {
        title: "Concept & lookdev",
        body: "We develop the look, mood and material language of a space long before a single wall is built.",
        icon: "layers" as const,
      },
      {
        title: "Lighting & mood",
        body: "Light, shadow and surface tuned frame by frame until every room reads true to life.",
        icon: "sun" as const,
      },
      {
        title: "Final frames",
        body: "Production-ready stills and motion, delivered for film, games and architecture.",
        icon: "frame" as const,
      },
    ],
  },
  studio: {
    /** Archive Material / Our Services layout, mapped onto the Studio section. */
    eyebrow: "Our services",
    titlePrimary: "Crafted ",
    titleAccent: "interiors",
    intro:
      "Room refresh or full build: clear plans, trusted trades, spaces that feel easy to live in.",
    services: [
      {
        title: "Construction Management",
        description:
          "We coordinate contractors, suppliers, and inspections from walkthrough to punch list, flag clashes early, and keep updates and quality checks steady through handover.",
        image: {
          src: "/images/landing-banner-1.jpg",
          alt: "Interior build with coordinated trades",
        },
      },
      {
        title: "Interior Design Consultant",
        description:
          "We shape layout, materials, and fixtures to how you live, using samples so decisions stay clear. When code or budget push back, we adjust without losing the idea.",
        image: {
          src: "/images/landing-banner-3.jpg",
          alt: "Consultant with samples and layout notes",
        },
      },
      {
        title: "Interior Space Planning",
        description:
          "We plan circulation, storage, and light before locking walls and joinery, balance privacy and flow, and leave room for services and future change.",
        image: {
          src: "/images/landing-banner-4.jpg",
          alt: "Living space with clear flow and storage",
        },
      },
      {
        title: "Sustainable Building Solutions",
        description:
          "We pick materials and systems that age well and suit your air quality goals, with efficient lighting, responsible timber, and reuse when it fits. Priorities are set early so green choices stay realistic on site.",
        image: {
          src: "/images/landing-banner.jpg",
          alt: "Natural materials in a calm interior",
        },
      },
      {
        title: "Renovation and Remodeling",
        description:
          "We work with the structure and character you already have, phase the work cleanly, and run kitchens, baths, or whole home jobs from strip out to finish with clear scope and progress.",
        image: {
          src: "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg",
          alt: "Renovated room with new joinery and surfaces",
        },
      },
    ] as const,
  },
  aboutIntro: {
    label: "Who we are",
    parts: [
      { text: "Fusing ", highlight: false },
      { text: "passion", highlight: true },
      { text: " and ", highlight: false },
      { text: "craft", highlight: true },
      { text: ": every space tells a story with Furnishes.", highlight: false },
    ] as const,
    tagline: "Honest materials, careful detail, rooms that feel like yours.",
    images: [
      {
        src: "/images/hero/lute-Fv5GnGntvcg-unsplash.jpg",
        alt: "Modern living room with clean lines and soft light",
      },
      {
        src: "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg",
        alt: "Cozy interior seating area with warm materials",
      },
    ] as const,
    col1: "Furnishes draws on a wide spectrum of design traditions and contemporary practice. From the clarity of minimalism and the richness of natural materials to the rigor of space planning, our roots run deep in both craft and function.",
    subtitle:
      "From concept to completion, our approach is an innovative fusion of craftsmanship, sustainable choices, and timeless design.",
    col2: "This blend of influence fuels interiors that are as livable as they are distinctive, balancing rhythm, restraint, and refinement. It is in this intersection that Furnishes creates something lasting: spaces shaped by care and expertise.",
  },
  projects: {
    label: "Projects",
    titleBefore: "A recognition of design",
    titleAccent: "excellence",
    titleAfter: "shaped by dedication, innovation, and lasting influence.",
    defaultExpandedYear: "2026",
    items: [
      {
        year: "2026",
        award: "Scandinavian Design Awards, Residential Category",
        project: "Nordic Retreat House",
        result: "Winner",
        images: [
          {
            src: "/images/landing-main-6.jpg",
            alt: "Nordic Retreat House interior",
          },
          {
            src: "/images/landing-main-7.jpg",
            alt: "Nordic Retreat House exterior",
          },
          {
            src: "/images/landing-main-1.jpg",
            alt: "Nordic Retreat House space",
          },
        ],
      },
      {
        year: "2025",
        award: "ArchDaily Interior Excellence, Public Spaces",
        project: "Oslo Civic Pavilion",
        result: "Honorable Mention",
        images: [
          {
            src: "/images/landing-main-2.jpg",
            alt: "Oslo Civic Pavilion view",
          },
          {
            src: "/images/landing-main-3.jpg",
            alt: "Oslo Civic Pavilion space",
          },
          {
            src: "/images/hero/jon-stebbe-paydk0JcIOQ-unsplash.jpg",
            alt: "Oslo Civic Pavilion interior",
          },
        ],
      },
      {
        year: "2024",
        award: "Global Design Awards, Eco Innovation",
        project: "Forestline Studio",
        result: "Finalist",
        images: [
          {
            src: "/images/landing-main-4.jpg",
            alt: "Forestline Studio exterior",
          },
          {
            src: "/images/landing-main-5.jpg",
            alt: "Forestline Studio interior",
          },
          {
            src: "/images/hero/lute-Fv5GnGntvcg-unsplash.jpg",
            alt: "Forestline Studio detail",
          },
        ],
      },
      {
        year: "2023",
        award: "Nordic Design Week, Innovation & Craftsmanship",
        project: "Haven Workspace",
        result: "Winner",
        images: [
          {
            src: "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg",
            alt: "Haven Workspace open plan",
          },
          {
            src: "/images/landing-banner-3.jpg",
            alt: "Haven Workspace lounge",
          },
          {
            src: "/images/landing-banner.jpg",
            alt: "Haven Workspace materials",
          },
        ],
      },
    ],
  },
  teams: {
    label: "Teams",
    titleBefore: "A team united by",
    titleAccent: "vision",
    titleAfter: ", craft, and timeless design.",
    members: [
      {
        name: "Elizabeth",
        role: "Creative Director",
        desc: "Leads visual direction and narrative across projects, balancing brand, materials, and spatial storytelling. She sets the tone for each brief, from first moodboards to final detailing, and keeps every room coherent without losing warmth or personality.",
        image: {
          src: "/images/landing-banner-3.jpg",
          alt: "Elizabeth, Creative Director at Furnishes",
        },
      },
      {
        name: "Mohan",
        role: "3D Visualization Lead",
        desc: "Turns concepts into accurate renders and walkthroughs so clients can see light, scale, and detail before build. He models materials with care, tests camera paths for clarity, and makes sure what you approve on screen is what arrives on site.",
        image: {
          src: "/images/hero/markus-spiske-OOZxVR65q3c-unsplash.jpg",
          alt: "Mohan, 3D Visualization Lead at Furnishes",
        },
      },
      {
        name: "Henry",
        role: "Design Researcher",
        desc: "Surfaces user needs, benchmarks, and trends to inform layouts, ergonomics, and long term adaptability. He studies how people move through a home day to day, then folds those findings into plans that stay practical as life changes.",
        image: {
          src: "/images/landing-main-2.jpg",
          alt: "Henry, Design Researcher at Furnishes",
        },
      },
      {
        name: "Jessica",
        role: "Principal Architect",
        desc: "Owns planning, code coordination, and technical resolution from early studies through construction support. She bridges design intent and build reality, keeping structure, services, and finishes aligned so the finished space feels effortless.",
        image: {
          src: "/images/landing-main-3.jpg",
          alt: "Jessica, Principal Architect at Furnishes",
        },
      },
    ],
  },
  journal: {
    label: "Blog",
    titleBefore: "Insights shaped by our exploration of",
    titleAccent: "space",
    titleAfter: "and design.",
    entries: [
      {
        title: "Scandinavian minimalism at home",
        read: "3 min read",
        image: {
          src: "/images/landing-main-6.jpg",
          alt: "Scandinavian minimalist living room with light wood",
        },
      },
      {
        title: "Materials that age well indoors",
        read: "5 min read",
        image: {
          src: "/images/landing-main-7.jpg",
          alt: "Natural interior materials and finishes",
        },
      },
      {
        title: "Lighting plans for calm evenings",
        read: "6 min read",
        image: {
          src: "/images/landing-main-1.jpg",
          alt: "Warm evening lighting in a modern interior",
        },
      },
      {
        title: "Small-space layouts that still feel open",
        read: "4 min read",
        image: {
          src: "/images/landing-main-4.jpg",
          alt: "Compact open-plan interior layout",
        },
      },
    ],
  },
  heritage: {
    cta: "[ Start your project ]",
    titleLine1: "Heritage",
    titleLine2Before: "we",
    titleLine2After: "preserve",
    paragraphs: [
      "From workshop roots to full interiors, craft, clarity, and lasting materials stay at the center of how we work.",
      "We still sketch with real samples, watch light move through a room, and choose finishes that feel honest in the hand. The process stays quiet and deliberate, clear plans, steady partners, and spaces built to live well long after the first reveal.",
    ] as const,
    items: [
      {
        title: "Workshop beginnings",
        category: "Origins",
        body: "What began as a small workshop grew through joinery, samples, and clients who valued care over volume. That early habit of listening to materials, light, and daily use still shapes how we plan each project today.",
      },
      {
        title: "First signature spaces",
        category: "Milestones",
        body: "Early residential and studio projects set our language of honest materials, clear plans, and rooms built to age well with daily life.",
      },
      {
        title: "Craft & collaborators",
        category: "Makers",
        body: "We deepened ties with local makers and suppliers so bespoke details and trusted fabrication stay central to every brief.",
      },
      {
        title: "Broader commissions",
        category: "Growth",
        body: "Larger renovations and mixed-use work stretched our process while keeping the same bar for light, proportion, and finish.",
      },
      {
        title: "Today & next chapters",
        category: "Legacy",
        body: "The studio now balances new builds and careful renewals, carrying a heritage of clarity, warmth, and buildable design forward.",
      },
    ],
  },
  contact: {
    emailAddress: "hello@example.invalid",
    studioLabel: "By appointment · demo location",
    studioBlurb: "Visual development & support across the full 3D pipeline.",
    hours: [
      "Mon-Fri · 9am-6pm SGT",
      "Sat · 10am-4pm SGT",
      "Closed Sun & public holidays",
    ] as const,
  },
  links: {
    social: [
      { label: "Instagram", href: null, enabled: false },
      { label: "Behance", href: null, enabled: false },
    ],
    legal: [
      { label: "Terms & Conditions", href: "/terms", enabled: true },
      { label: "Privacy Policy", href: "/privacy-policy", enabled: true },
      { label: "Refund Policy", href: "/refund-policy", enabled: true },
    ],
  },
  footer: {
    body: "A design studio for high-quality, modern interiors. A seamless process that shapes each space around how you live, work, and rest.",
    ctaBefore: "Interested? Let's get in",
    ctaAfter: "touch today!",
  },
} as const;
