/**
 * Merge Eva schema + studio models (PostgreSQL).
 * Excludes studio Conversation, ConversationMessage, duplicate auth models.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const studioPath =
  process.env.STUDIO_SCHEMA ??
  "C:/Users/mohan/Downloads/studio-account-final-necessary/studio-account-final/prisma/schema.prisma";

const studio = fs.readFileSync(studioPath, "utf8");

function stripGeneratorDatasource(src) {
  return src.replace(/^generator[\s\S]*?^datasource[\s\S]*?^}\s*/m, "");
}

function extractEnums(src) {
  const enums = [];
  const re = /^enum \w+ \{[\s\S]*?^\}/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const block = m[0];
    if (block.includes("enum MessageRole")) continue;
    enums.push(block);
  }
  return enums.join("\n\n");
}

let studioTail = stripGeneratorDatasource(studio)
  .replace(/model User \{[\s\S]*?^}\s*/m, "")
  .replace(/model Account \{[\s\S]*?^}\s*/m, "")
  .replace(/model Session \{[\s\S]*?^}\s*/m, "")
  .replace(/model VerificationToken \{[\s\S]*?^}\s*/m, "")
  .replace(/model Conversation \{[\s\S]*?^}\s*/m, "")
  .replace(/model ConversationMessage \{[\s\S]*?^}\s*/m, "")
  .replace(/model ConversationShare \{[\s\S]*?^}\s*/m, "")
  .trim();

studioTail = studioTail.replace(/^enum \w+ \{[\s\S]*?^\}\s*/gm, "").trim();

const enums = extractEnums(studio);

const header = `// Merged Eva + Studio account (PostgreSQL).
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

const conversation = `model Conversation {
  id                String             @id @default(cuid())
  title             String             @default("New Chat")
  userId            String?
  user              User?              @relation(fields: [userId], references: [id], onDelete: SetNull)
  currentNodeId     String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  messages          Message[]
  preferences       Preference[]
  preferenceChanges PreferenceChange[]
  files             File[]
  costLogs          CostLog[]
  sharedProjects    SharedProject[]
  nodeTransitions   NodeTransition[]

  snippet           String?              @db.Text
  status            ConversationStatus   @default(active)
  messageCount      Int                  @default(0)
  projectId         String?
  project           Project?             @relation(fields: [projectId], references: [id], onDelete: SetNull)
  userPreferences   UserPreference[]
  conversationShares ConversationShare[]

  @@index([userId])
  @@index([projectId])
}
`;

const account = `model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}
`;

const session = `model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expires])
}
`;

const user = `model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          UserRole    @default(user)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  deletionScheduledAt DateTime?

  accounts      Account[]
  sessions      Session[]
  conversations Conversation[]

  profile             UserProfile?
  styleProfile        StyleProfileRecord?
  userPreferences     UserPreference[]
  budget              Budget?
  designPlaybooks     DesignPlaybook[]
  shortlistItems      ShortlistItem[]
  projects            Project[]
  projectMembers      ProjectMember[]
  uploads             Upload[]
  notificationPrefs   NotificationPrefs?
  userDevices         UserDevice[]
  securityEvents      SecurityEvent[]
  invoices            Invoice[]
  consents            Consent[]
  activityEvents      ActivityEvent[]
  passwordResets      PasswordReset[]
  dataExports         DataExport[]
  cart                Cart?
  addresses           Address[]
  paymentMethods      PaymentMethod[]
  contactPrefs        ContactPrefs?
  orders              Order[]
  supportThreads      SupportThread[]
  conversationSharesReceived ConversationShare[] @relation("ConversationShareRecipient")
}
`;

const verificationToken = `model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@index([expires])
}
`;

const conversationShare = `model ConversationShare {
  id               String   @id @default(cuid())
  conversationId   String
  conversation     Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sharedWithUserId String
  sharedWithUser   User     @relation("ConversationShareRecipient", fields: [sharedWithUserId], references: [id], onDelete: Cascade)
  permission       SharePermission @default(read)
  createdAt        DateTime @default(now())

  @@unique([conversationId, sharedWithUserId])
}
`;

const middle = `/// Log of playbook node transitions per conversation (for Decision Trace).
model NodeTransition {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  fromNodeId     String?
  toNodeId       String
  edgeId         String?
  reason         String?
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}

model SharedProject {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  shareId        String       @unique
  createdAt      DateTime     @default(now())
  expiresAt      DateTime?

  @@index([shareId])
}

model CostLog {
  id                String       @id @default(cuid())
  conversationId    String
  conversation      Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  model             String
  promptTokens      Int
  completionTokens  Int
  costUsd           Float
  category          String       @default("chat")
  createdAt         DateTime     @default(now())

  @@index([conversationId])
}

${account}

${session}

${user}

${verificationToken}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String       @db.Text
  extractions    Json?
  createdAt      DateTime     @default(now())
  feedback       MessageFeedback[]

  @@index([conversationId])
}

model MessageFeedback {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  rating    String
  comment   String?
  createdAt DateTime @default(now())

  @@index([messageId])
}

model Preference {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  field          String
  value          String       @db.Text
  confidence     Float        @default(0.5)
  status         String       @default("potential")
  source         String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([conversationId, field])
  @@index([conversationId])
}

model PreferenceChange {
  id              String       @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  field           String
  oldValue        String?
  newValue        String
  confidence      Float        @default(0.5)
  changeType      String       @default("set")
  confirmed       Boolean      @default(false)
  sourceMessageId String?
  createdAt       DateTime     @default(now())

  @@index([conversationId])
}

model File {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  filename       String
  url            String
  type           String?
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}

model DesignDoc {
  id         String   @id @default(cuid())
  source     String
  chunkIndex Int
  content    String   @db.Text
  embedding  Json?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([source])
}

model CalibrationLog {
  id                   String   @id @default(cuid())
  conversationId       String
  field                String
  predictedConfidence  Float
  accepted             Boolean
  createdAt            DateTime @default(now())

  @@index([conversationId])
  @@index([field])
}

model Playbook {
  id        String   @id @default(cuid())
  nodes     Json
  edges     Json
  updatedAt DateTime @updatedAt
}
`;

const outFixed =
  header +
  "\n" +
  enums +
  "\n\n" +
  conversation +
  "\n" +
  middle +
  "\n" +
  conversationShare +
  "\n\n" +
  studioTail;

fs.writeFileSync(path.join(root, "prisma", "schema.prisma"), outFixed, "utf8");
console.log("Wrote prisma/schema.prisma");
