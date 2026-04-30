import { randomBytes } from "node:crypto";

import { prisma } from "../lib/eva/db";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run seed in production. Set ALLOW_PROD_SEED=true to override " +
        "(only do this if you understand the consequences).",
    );
  }

  /** Fixed so `/login` prefilled credentials match after seed (override per env). */
  const demoPasswordPlain =
    process.env.DEMO_SEED_PASSWORD?.trim() || "demopass-change-me-123";
  const adminPassword = randomBytes(16).toString("hex");
  const demoHash = await bcrypt.hash(demoPasswordPlain, SALT_ROUNDS);
  const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password: demoHash,
      role: "user",
    },
    update: { password: demoHash },
  });
  console.log("Seeded demo user:", demoUser.email);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminHash,
      role: "admin",
    },
    update: { password: adminHash },
  });
  console.log("Seeded admin user:", adminUser.email);

  const existing = await prisma.conversation.findFirst({
    where: { title: "Sample design chat" },
  });
  if (!existing) {
    const convo = await prisma.conversation.create({
      data: {
        title: "Sample design chat",
        userId: demoUser.id,
        messages: {
          create: [
            {
              role: "user",
              content:
                "I want to redesign my living room in a minimalist style.",
            },
            {
              role: "assistant",
              content:
                "I've noted your interest in a minimalist living room. Do you have a budget or color preferences?",
            },
            {
              role: "user",
              content: "Around $5k, and I like warm neutrals.",
            },
          ],
        },
      },
      include: { messages: true },
    });
    console.log(
      "Seeded sample conversation:",
      convo.id,
      "with",
      convo.messages.length,
      "messages",
    );
  }

  const playbookCount = await prisma.playbook.count();
  if (playbookCount === 0) {
    await prisma.playbook.create({
      data: { nodes: [], edges: [] },
    });
    console.log(
      "Seeded empty Eva playbook (nodes/edges editable in /chatbot).",
    );
  }

  console.log(
    `Seeded demo user (${demoUser.email}) — password matches login form default / DEMO_SEED_PASSWORD.`,
  );
  console.log(`Seeded admin user with password: ${adminPassword}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
