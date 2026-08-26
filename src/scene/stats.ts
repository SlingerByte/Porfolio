/**
 * Live renderer statistics, written by a bridge inside the Canvas and read by
 * dev panels. Module-level on purpose: instrumentation, not app state.
 */
export const sceneStats = {
  calls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
}
