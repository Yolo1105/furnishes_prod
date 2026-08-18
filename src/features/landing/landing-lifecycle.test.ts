import { describe, expect, it, vi } from "vitest";
import type * as THREE from "three-landing";
import {
  landingWorkItems,
  resolveLandingDestination,
} from "./landing-navigation";
import { disposeLandingScene } from "./three/disposeLandingScene";

/** Keep in sync with `HERO_ROOM_NAMES` in LandingHero.tsx. */
const EXPECTED_ROOM_PRESETS = [
  "LIVING",
  "STUDIO",
  "LOUNGE",
  "NOOK",
  "WING",
] as const;

describe("resolveLandingDestination", () => {
  it("maps home and contact to in-page scroll targets", () => {
    expect(resolveLandingDestination("home")).toEqual({
      kind: "scroll",
      sectionId: "home",
    });
    expect(resolveLandingDestination("contact")).toEqual({
      kind: "scroll",
      sectionId: "contact",
    });
  });

  it("maps login to a route", () => {
    expect(resolveLandingDestination("login")).toEqual({
      kind: "route",
      href: "/login",
    });
  });

  it("maps quiz to a route", () => {
    expect(resolveLandingDestination("quiz")).toEqual({
      kind: "route",
      href: "/quiz",
    });
  });

  it("maps studio and journal destinations into section anchors", () => {
    expect(resolveLandingDestination("studio")).toEqual({
      kind: "scroll",
      sectionId: "studio",
    });
    expect(resolveLandingDestination("journal")).toEqual({
      kind: "scroll",
      sectionId: "about-blog",
    });
    expect(resolveLandingDestination("work")).toEqual({
      kind: "scroll",
      sectionId: "about-projects",
    });
  });

  it("maps the Product menu label to the general Work destination", () => {
    const productItem = landingWorkItems.find(
      (item) => item.label === "Product",
    );
    expect(productItem?.destination).toBe("work");
    expect(resolveLandingDestination("work")).toEqual({
      kind: "scroll",
      sectionId: "about-projects",
    });
  });
});

describe("hero room presets", () => {
  it("documents the five reference room presets in order", () => {
    expect(EXPECTED_ROOM_PRESETS).toHaveLength(5);
    expect(EXPECTED_ROOM_PRESETS[0]).toBe("LIVING");
    expect(EXPECTED_ROOM_PRESETS[4]).toBe("WING");
  });
});

describe("disposeLandingScene", () => {
  it("stops the loop, disposes the renderer, and removes the canvas", () => {
    const setAnimationLoop = vi.fn();
    const dispose = vi.fn();
    const forceContextLoss = vi.fn();
    const remove = vi.fn();
    const materialDispose = vi.fn();
    const geometryDispose = vi.fn();
    const mapDispose = vi.fn();

    const material = {
      dispose: materialDispose,
      map: { dispose: mapDispose },
    };

    const scene = {
      traverse: (fn: (object: unknown) => void) => {
        fn({
          geometry: { dispose: geometryDispose },
          material,
        });
      },
    };

    const renderer = {
      setAnimationLoop,
      dispose,
      forceContextLoss,
      domElement: { remove },
    } as unknown as THREE.WebGLRenderer;

    disposeLandingScene(renderer, scene as unknown as THREE.Scene);

    expect(setAnimationLoop).toHaveBeenCalledWith(null);
    expect(geometryDispose).toHaveBeenCalled();
    expect(mapDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(dispose).toHaveBeenCalled();
    expect(forceContextLoss).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });
});
