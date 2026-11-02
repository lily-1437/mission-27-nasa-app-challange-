/**
 * @file slope.js
 * Terrain slope calculation and mobility physics for lunar surface travel.
 * MISSION27 SIMULATION based on NASA LRO LOLA DEM topography.
 */

/**
 * Calculates local slope angle in degrees from elevation grid or surrounding samples.
 * @param {number} dz_dx Gradient in X (rise/run)
 * @param {number} dz_dy Gradient in Y (rise/run)
 * @returns {number} Slope angle in degrees (0 to 90)
 */
export function calculateSlopeDegrees(dz_dx, dz_dy) {
  const gradientMagnitude = Math.hypot(dz_dx, dz_dy);
  return (Math.atan(gradientMagnitude) * 180) / Math.PI;
}

/**
 * Computes walking speed multiplier according to slope.
 * Steeper uphill grades slow locomotion significantly (Apollo field data).
 * @param {number} slopeDeg Slope in degrees (positive = uphill, negative = downhill)
 * @returns {number} Speed factor between 0.35 and 1.15
 */
export function getMobilitySpeedMultiplier(slopeDeg) {
  if (slopeDeg > 25) return 0.35; // Severe terrain crawl
  if (slopeDeg > 15) return 0.55;
  if (slopeDeg > 8) return 0.8;
  if (slopeDeg < -15) return 0.75; // Downhill caution on loose regolith
  if (slopeDeg < -5) return 1.05; // Slight downhill assist
  return 1.0; // Nominal flat ground
}

/**
 * Computes suit / rover battery power draw multiplier based on slope resistance.
 * @param {number} slopeDeg Slope in degrees
 * @param {boolean} [isRover=false] Whether using rover or EMU suit
 * @returns {number} Multiplier (1.0 = nominal, up to 2.5 on steep inclines)
 */
export function getPowerDrainMultiplier(slopeDeg, isRover = false) {
  const absSlope = Math.abs(slopeDeg);
  const base = isRover ? 1.0 : 0.8;
  if (absSlope <= 3) return base;
  // Non-linear power drain on inclines
  const extra = Math.pow(absSlope / 15, 1.4);
  return Math.min(2.8, base + extra);
}
