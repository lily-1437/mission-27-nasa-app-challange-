/**
 * @file epic-match.js
 * Pure computation module for matching DSCOVR EPIC frames to target geographic coordinates.
 * MISSION27 SIMULATION (computational logic) referencing NASA DATA.
 */

/**
 * Calculates shortest angular distance between two longitudes in degrees (-180 to 180).
 * @param {number} lon1 
 * @param {number} lon2 
 * @returns {number} Distance in degrees (0 to 180)
 */
export function angularDistanceLon(lon1, lon2) {
  let diff = Math.abs(lon1 - lon2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Finds the EPIC image frame closest to the target geographic longitude.
 * @param {Array<Object>} records Array of EPIC metadata records from epic-2024-05-10.json
 * @param {number} targetLon Target longitude in degrees (-180 to 180)
 * @returns {{ record: Object, angularDistance: number, hint: string }}
 */
export function findBestEpicMatch(records, targetLon) {
  if (!records || records.length === 0) {
    throw new Error('No EPIC records provided for matching.');
  }

  let bestRecord = records[0];
  let minDistance = Infinity;

  for (const record of records) {
    const coords = record.centroid_coordinates || (record.coords && record.coords.centroid_coordinates);
    if (!coords) continue;
    const dist = angularDistanceLon(coords.lon, targetLon);
    if (dist < minDistance) {
      minDistance = dist;
      bestRecord = record;
    }
  }

  const bestCoords = bestRecord.centroid_coordinates || bestRecord.coords.centroid_coordinates;
  const hint = getGeographicHint(bestCoords.lon);

  return {
    record: bestRecord,
    angularDistance: minDistance,
    hint
  };
}

/**
 * Provides an educational geographic region hint for a given longitude.
 * @param {number} lon
 * @returns {string} Description of region in view
 */
export function getGeographicHint(lon) {
  if (lon >= 60 && lon <= 110) return 'Centred over South Asia & the Indian Ocean (facing Bangladesh/India).';
  if (lon > 110 && lon <= 170) return 'Centred over East Asia, Southeast Asia, and Western Pacific.';
  if (lon > 170 || lon < -140) return 'Centred over the vast Pacific Ocean.';
  if (lon >= -140 && lon < -60) return 'Centred over the Americas & Eastern Pacific.';
  if (lon >= -60 && lon < 0) return 'Centred over the Atlantic Ocean.';
  return 'Centred over Europe, Africa, and the Middle East.';
}
