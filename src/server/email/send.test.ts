import { describe, expect, it, vi } from "vitest";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(async () => ({ messageId: "test" })),
    })),
  },
}));

describe("sendEmail", () => {
  it("logs when SMTP is unset", async () => {
    delete process.env.SMTP_HOST;
    const { sendEmail } = await import("./send");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result).toEqual({ delivered: true, mode: "log" });
  });

  it("uses smtp mode when SMTP_HOST is set", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.EMAIL_FROM = "Eva <eva@furnishes.local>";
    vi.resetModules();
    const nodemailer = await import("nodemailer");
    const { sendEmail } = await import("./send");
    const result = await sendEmail({
      to: "a@b.com",
      subject: "Hi",
      text: "Body",
    });
    expect(result.mode).toBe("smtp");
    expect(nodemailer.default.createTransport).toHaveBeenCalled();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.EMAIL_FROM;
  });
});
