import { describe, expect, it } from "vitest";
import { CHAT_GENERATION_FAILURE } from "@/lib/eva/core/chat-generation-failure";
import { mapChatGenerationFailureToSurface } from "@/lib/eva/chat/failure/map-chat-generation-failure-to-surface";

describe("mapChatGenerationFailureToSurface", () => {
  it("maps stream interruptions to provider_stream_failure", () => {
    expect(
      mapChatGenerationFailureToSurface(
        CHAT_GENERATION_FAILURE.STREAM_INTERRUPTED,
      ),
    ).toBe("provider_stream_failure");
  });

  it("maps sanitization collapse", () => {
    expect(
      mapChatGenerationFailureToSurface(
        CHAT_GENERATION_FAILURE.SANITIZATION_COLLAPSED_OUTPUT,
      ),
    ).toBe("sanitize_to_empty");
  });

  it("maps abort", () => {
    expect(
      mapChatGenerationFailureToSurface(CHAT_GENERATION_FAILURE.CLIENT_ABORT),
    ).toBe("aborted_request");
  });
});
