import { describe, it, expect } from "vitest";
import {
  deriveArtifactDescription,
  deriveArtifactTags,
  artifactKindLabel,
} from "@/lib/eva-dashboard/artifact-metadata";

describe("artifact-metadata", () => {
  it("derives stable tags from kind and provenance", () => {
    expect(deriveArtifactTags("pdf", "upload")).toEqual(["PDF", "Uploaded"]);
    expect(deriveArtifactTags("image", "remote")).toEqual(["Image", "Linked"]);
  });

  it("derives description from available fields", () => {
    expect(
      deriveArtifactDescription({
        fileType: "floorplan",
        mimeType: "image/png",
        sourceType: "upload",
      }),
    ).toContain("Floorplan");
    expect(
      deriveArtifactDescription({
        fileType: "other",
        mimeType: null,
        sourceType: "remote",
      }),
    ).toContain("External link");
  });

  it("artifactKindLabel covers kinds", () => {
    expect(artifactKindLabel("image")).toBe("Image");
    expect(artifactKindLabel("other")).toBe("File");
  });
});
