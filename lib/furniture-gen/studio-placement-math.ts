/**
 * Matches `PlacedFurniture` layout in `room-furniture-scene.tsx`
 * (linear spacing along X, fixed Z).
 */

export function studioPlacementForIndex(args: {
  widthM: number;
  placedCount: number;
  orderIndex: number;
}): { x: number; z: number; rotationY: number } {
  const { widthM, placedCount: n, orderIndex: i } = args;
  if (n <= 0 || i < 0 || i >= n) {
    return { x: 0, z: 0.15, rotationY: 0 };
  }
  const spacing = Math.min(1.5, widthM / Math.max(n + 1, 2));
  const x = (i - (n - 1) / 2) * spacing;
  return { x, z: 0.15, rotationY: 0 };
}

/** Returns true if client-reported position matches server layout within epsilon. */
export function positionsMatchStudioLayout(
  widthM: number,
  n: number,
  reported: { orderIndex: number; x: number; z: number; rotationY: number },
): boolean {
  const expected = studioPlacementForIndex({
    widthM,
    placedCount: n,
    orderIndex: reported.orderIndex,
  });
  const eps = 1e-3;
  return (
    Math.abs(reported.x - expected.x) < eps &&
    Math.abs(reported.z - expected.z) < eps &&
    Math.abs(reported.rotationY - expected.rotationY) < eps
  );
}
