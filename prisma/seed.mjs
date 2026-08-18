import { createHmac, randomBytes, scrypt } from "node:crypto";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

const DEFAULT_BUDGET_ALLOCATIONS = [
  {
    name: "Living room",
    description: "Sofa, lighting, rug, coffee table",
    amount: 7200,
  },
  {
    name: "Bedroom",
    description: "Bed frame, side tables, lamps",
    amount: 4000,
  },
  {
    name: "Dining",
    description: "Table, 4 chairs",
    amount: 3000,
  },
  {
    name: "Home office",
    description: "Desk, chair, shelving",
    amount: 2500,
  },
  {
    name: "Balcony",
    description: "Bench, planters",
    amount: 1300,
  },
];

const DEFAULT_ALLOCATIONS_JSON = JSON.stringify(DEFAULT_BUDGET_ALLOCATIONS);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt$16384$8$1$${salt}$${derived.toString("base64url")}`;
}

/**
 * Must stay identical to `digestToken` in src/server/auth/crypto.ts, including
 * the development fallback. Token digests are keyed with AUTH_SECRET, so a plain
 * sha256 here would seed sessions the running app can never look up.
 */
const DEV_TOKEN_PEPPER = "furnishes-development-token-pepper";

function digestToken(token) {
  const secret = process.env.AUTH_SECRET?.trim() || DEV_TOKEN_PEPPER;
  return createHmac("sha256", secret).update(token).digest("hex");
}

async function upsertUser({ email, password, displayName, verified }) {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      displayName,
      emailVerifiedAt: verified ? new Date() : null,
      memoryEnabled: true,
      activeAssistantId: "eva-general",
      styleProfile: {
        create: {
          displayName,
          styleWords: verified ? "warm minimalist, oak, linen" : "",
        },
      },
      budget: {
        create: {
          minimum: 15000,
          maximum: 20000,
          currency: "SGD",
          allocationsJson: DEFAULT_ALLOCATIONS_JSON,
        },
      },
      notificationPrefs: { create: {} },
    },
    update: {
      passwordHash,
      displayName,
      deletedAt: null,
      emailVerifiedAt: verified ? new Date() : null,
      memoryEnabled: true,
      activeAssistantId: "eva-general",
    },
  });
  return user;
}

async function ensureSession(userId, rawToken, userAgent = "e2e-seed") {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.session.deleteMany({
    where: { userId, tokenDigest: digestToken(rawToken) },
  });
  await prisma.session.create({
    data: {
      userId,
      tokenDigest: digestToken(rawToken),
      expiresAt,
      userAgent,
      ipAddress: "127.0.0.1",
    },
  });
  return expiresAt;
}

/**
 * Placeholder catalog. Names are invented on purpose: the wireframe fixtures
 * used real trademarked pieces, which is fine for a picture but not for rows
 * that claim to be purchasable stock.
 *
 * Prices are authored per market (docs/COMMERCE.md) — there is no runtime FX —
 * so each variant carries an explicit SGD and USD amount in integer cents.
 */
const CATALOG = [
  {
    slug: "harbour-sofa",
    name: "Harbour sofa",
    brand: "Furnishes Studio",
    category: "seating",
    description: "Three-seat sofa with a low back and a deep, soft seat.",
    variants: [
      {
        sku: "HRB-SOFA-OAT",
        name: "3-seat · oat linen",
        sgd: 129900,
        usd: 99900,
      },
      {
        sku: "HRB-SOFA-SLT",
        name: "3-seat · slate weave",
        sgd: 139900,
        usd: 107900,
      },
    ],
  },
  {
    slug: "kiln-coffee-table",
    name: "Kiln coffee table",
    brand: "Furnishes Studio",
    category: "tables",
    description: "Solid timber coffee table with a chamfered edge.",
    variants: [
      { sku: "KLN-CT-OAK", name: "Oak", sgd: 74900, usd: 57900 },
      { sku: "KLN-CT-WAL", name: "Walnut", sgd: 84900, usd: 65900 },
    ],
  },
  {
    slug: "lantern-floor-lamp",
    name: "Lantern floor lamp",
    brand: "Furnishes Studio",
    category: "lighting",
    description: "Adjustable floor lamp with a linen shade and dimmer.",
    variants: [
      { sku: "LTN-FL-BRS", name: "Brushed brass", sgd: 32900, usd: 24900 },
      { sku: "LTN-FL-BLK", name: "Matte black", sgd: 32900, usd: 24900 },
    ],
  },
  {
    slug: "weave-wool-rug",
    name: "Weave wool rug",
    brand: "Furnishes Studio",
    category: "textiles",
    description: "Hand-loomed wool rug, 200 × 300 cm.",
    variants: [
      { sku: "WVE-RUG-SND", name: "Sand", sgd: 42000, usd: 32500 },
      { sku: "WVE-RUG-CHR", name: "Charcoal", sgd: 42000, usd: 32500 },
    ],
  },
  {
    slug: "ridge-shelving",
    name: "Ridge shelving unit",
    brand: "Furnishes Studio",
    category: "storage",
    description: "Modular five-shelf unit in oiled oak.",
    variants: [
      { sku: "RDG-SHV-OAK", name: "Oiled oak", sgd: 64000, usd: 49500 },
    ],
  },
  {
    slug: "stem-dining-chair",
    name: "Stem dining chair",
    brand: "Furnishes Studio",
    category: "seating",
    description: "Stackable dining chair with a moulded seat.",
    variants: [
      {
        sku: "STM-DC-NAT",
        name: "Natural ash",
        sgd: 18900,
        usd: 14500,
        status: "made_to_order",
      },
    ],
  },
];

async function seedCatalog() {
  let variantCount = 0;
  for (const entry of CATALOG) {
    const product = await prisma.product.upsert({
      where: { slug: entry.slug },
      update: {
        name: entry.name,
        brand: entry.brand,
        category: entry.category,
        description: entry.description,
        status: "active",
      },
      create: {
        slug: entry.slug,
        name: entry.name,
        brand: entry.brand,
        category: entry.category,
        description: entry.description,
        status: "active",
      },
      select: { id: true },
    });

    for (const [index, variant] of entry.variants.entries()) {
      const row = await prisma.variant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: product.id,
          name: variant.name,
          status: variant.status ?? "in_stock",
          sortOrder: index,
        },
        create: {
          productId: product.id,
          sku: variant.sku,
          name: variant.name,
          status: variant.status ?? "in_stock",
          sortOrder: index,
        },
        select: { id: true },
      });

      for (const [currency, amountCents] of [
        ["SGD", variant.sgd],
        ["USD", variant.usd],
      ]) {
        await prisma.variantPrice.upsert({
          where: {
            variantId_currency: { variantId: row.id, currency },
          },
          update: { amountCents },
          create: { variantId: row.id, currency, amountCents },
        });
      }
      variantCount += 1;
    }
  }
  return { products: CATALOG.length, variants: variantCount };
}

async function main() {
  // Fresh windows for auth attempt limits so re-seeds are not blocked by prior runs.
  await prisma.authRateLimit.deleteMany();

  const owner = await upsertUser({
    email: "owner@example.com",
    password: "password1234",
    displayName: "Owner",
    verified: true,
  });
  const stranger = await upsertUser({
    email: "stranger@example.com",
    password: "password1234",
    displayName: "Stranger",
    verified: true,
  });

  await ensureSession(
    owner.id,
    "e2e-owner-session-token",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await ensureSession(stranger.id, "e2e-stranger-session-token");
  // Extra owner session so Settings can exercise revoke-other-device UX.
  const otherOwnerToken = "e2e-owner-other-session-token";
  await prisma.session.deleteMany({
    where: { userId: owner.id, tokenDigest: digestToken(otherOwnerToken) },
  });
  await prisma.session.create({
    data: {
      userId: owner.id,
      tokenDigest: digestToken(otherOwnerToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ipAddress: "127.0.0.1",
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
  });

  await prisma.budget.upsert({
    where: { userId: owner.id },
    create: {
      userId: owner.id,
      minimum: 15000,
      maximum: 20000,
      currency: "SGD",
      allocationsJson: DEFAULT_ALLOCATIONS_JSON,
    },
    update: {
      minimum: 15000,
      maximum: 20000,
      currency: "SGD",
      allocationsJson: DEFAULT_ALLOCATIONS_JSON,
    },
  });

  const project =
    (await prisma.project.findFirst({
      where: { ownerId: owner.id, name: "Living room refresh" },
    })) ??
    (await prisma.project.create({
      data: {
        ownerId: owner.id,
        name: "Living room refresh",
        summary: "Warm scandi living room",
        brief: "Keep clutter low and materials natural.",
        status: "active",
        members: { create: { userId: owner.id, role: "owner" } },
        timeline: {
          create: { kind: "created", summary: "Project created" },
        },
      },
    }));

  await prisma.user.update({
    where: { id: owner.id },
    data: { activeAssistantId: "eva-general" },
  });

  const conversation =
    (await prisma.conversation.findFirst({
      where: { userId: owner.id, title: "Living room direction" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })) ??
    (await prisma.conversation.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        title: "Living room direction",
        status: "active",
        messages: {
          create: [
            {
              role: "user",
              content: "Can we warm up the living room?",
              status: "complete",
            },
            {
              role: "assistant",
              content: "Start with oak and linen layers.",
              status: "complete",
              assistantId: "eva-general",
            },
          ],
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    }));

  const seedUserMessage =
    conversation.messages.find((message) => message.role === "user") ??
    (await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: "Can we warm up the living room?",
        status: "complete",
      },
    }));
  const seedAssistantMessage =
    conversation.messages.find((message) => message.role === "assistant") ??
    (await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: "Start with oak and linen layers.",
        status: "complete",
        assistantId: "eva-general",
      },
    }));

  await prisma.userPreference.deleteMany({ where: { userId: owner.id } });
  await prisma.preferenceProposal.deleteMany({ where: { userId: owner.id } });

  await prisma.userPreference.createMany({
    data: [
      {
        userId: owner.id,
        category: "room",
        value: "living room",
        confidence: 1,
        source: "manual_chat",
        sourceConversationId: conversation.id,
        sourceMessageId: seedUserMessage.id,
      },
      {
        userId: owner.id,
        category: "style",
        value: "scandinavian",
        confidence: 1,
        source: "manual_chat",
        sourceConversationId: conversation.id,
        sourceMessageId: seedUserMessage.id,
      },
      {
        userId: owner.id,
        category: "color",
        value: "warm tones",
        confidence: 1,
        source: "manual_chat",
        sourceConversationId: conversation.id,
        sourceMessageId: seedUserMessage.id,
      },
    ],
  });

  const pendingBudgetProposal = await prisma.preferenceProposal.create({
    data: {
      userId: owner.id,
      conversationId: conversation.id,
      sourceMessageId: seedUserMessage.id,
      displayMessageId: seedAssistantMessage.id,
      category: "budget",
      proposedValue: "$5000",
      confidence: 0.82,
      status: "pending",
      evidenceText: "budget around 5000",
    },
  });

  const acceptedProposal = await prisma.preferenceProposal.create({
    data: {
      userId: owner.id,
      conversationId: conversation.id,
      sourceMessageId: seedUserMessage.id,
      displayMessageId: seedAssistantMessage.id,
      category: "furniture",
      proposedValue: "sofa",
      acceptedValue: "sofa",
      confidence: 0.8,
      status: "accepted",
      resolvedAt: new Date(),
      evidenceText: "sofa",
    },
  });

  await prisma.userPreference.create({
    data: {
      userId: owner.id,
      category: "furniture",
      value: "sofa",
      confidence: 0.8,
      source: "extracted_confirmed",
      sourceConversationId: conversation.id,
      sourceMessageId: seedUserMessage.id,
      sourceProposalId: acceptedProposal.id,
    },
  });
  // Keep seed fixtures; drop leftover E2E generations so daily quota stays open.
  const seedPrompts = [
    "test-ready seed living room",
    "test-ready after retry seed",
  ];
  await prisma.imageGeneration.deleteMany({
    where: {
      userId: owner.id,
      prompt: { notIn: seedPrompts },
    },
  });

  const readyGeneration =
    (await prisma.imageGeneration.findFirst({
      where: { userId: owner.id, prompt: "test-ready seed living room" },
    })) ??
    (await prisma.imageGeneration.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        prompt: "test-ready seed living room",
        status: "ready",
        provider: "test",
        providerJobId: "seed-ready-job",
        width: 1024,
        height: 1024,
        completedAt: new Date(),
      },
    }));

  let readyUpload = readyGeneration.outputUploadId
    ? await prisma.upload.findUnique({
        where: { id: readyGeneration.outputUploadId },
      })
    : null;
  if (!readyUpload) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const storageKey = `${owner.id}/generated/seed-ready.png`;
    const absolute = path.join(process.cwd(), ".data", "uploads", storageKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
      0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    await writeFile(absolute, png);
    readyUpload = await prisma.upload.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        filename: "seed-ready.png",
        mimeType: "image/png",
        sizeBytes: png.byteLength,
        status: "ready",
        source: "generated_image",
        storageKey,
      },
    });
    await prisma.imageGeneration.update({
      where: { id: readyGeneration.id },
      data: { outputUploadId: readyUpload.id },
    });
  }

  await prisma.imageGeneration.deleteMany({
    where: { userId: owner.id, prompt: "test-ready after retry seed" },
  });
  const failedGeneration = await prisma.imageGeneration.create({
    data: {
      userId: owner.id,
      prompt: "test-ready after retry seed",
      status: "failed",
      provider: "test",
      providerJobId: "seed-fail-job",
      width: 768,
      height: 768,
      errorCode: "provider_failed",
      errorMessage: "Seeded failure.",
      completedAt: new Date(),
    },
  });

  const userUpload =
    (await prisma.upload.findFirst({
      where: {
        userId: owner.id,
        filename: "seed-inspiration.jpg",
        source: "user_upload",
      },
    })) ??
    (await (async () => {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const path = await import("node:path");
      const storageKey = `${owner.id}/seed-inspiration.jpg`;
      const absolute = path.join(process.cwd(), ".data", "uploads", storageKey);
      await mkdir(path.dirname(absolute), { recursive: true });
      // Minimal JPEG SOI/EOI
      const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
      await writeFile(absolute, jpeg);
      return prisma.upload.create({
        data: {
          userId: owner.id,
          projectId: project.id,
          filename: "seed-inspiration.jpg",
          mimeType: "image/jpeg",
          sizeBytes: jpeg.byteLength,
          status: "ready",
          source: "user_upload",
          storageKey,
        },
      });
    })());

  await prisma.inspirationItem.deleteMany({
    where: { userId: owner.id, imageGenerationId: readyGeneration.id },
  });
  const inspiration = await prisma.inspirationItem.create({
    data: {
      userId: owner.id,
      projectId: project.id,
      imageGenerationId: readyGeneration.id,
      title: "Seeded living room",
      note: "Warm oak and linen",
      roomLabel: "Living room",
      colorsJson: JSON.stringify(["#E4D5BE", "#9C7C57"]),
      materialsJson: JSON.stringify(["oak", "linen"]),
    },
  });

  const catalog = await seedCatalog();

  console.info("Seeded catalog:", catalog);
  console.info("Seeded users:", {
    owner: owner.email,
    stranger: stranger.email,
    projectId: project.id,
    conversationId: conversation.id,
    pendingBudgetProposalId: pendingBudgetProposal.id,
    acceptedProposalId: acceptedProposal.id,
    readyGenerationId: readyGeneration.id,
    failedGenerationId: failedGeneration.id,
    userUploadId: userUpload.id,
    inspirationId: inspiration.id,
    ownerSessionToken: "e2e-owner-session-token",
    strangerSessionToken: "e2e-stranger-session-token",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
