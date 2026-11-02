import { angularDistanceLon, findBestEpicMatch } from '../src/compute/epic-match.js';
import { calculateSlopeDegrees, getMobilitySpeedMultiplier } from '../src/compute/slope.js';
import { calculateDoseRate, getStormThreatLevel } from '../src/compute/dose.js';
import { simulateLeakStep, getPressureHazard } from '../src/compute/pressure.js';

console.log('Testing compute modules...');

// 1. EPIC Match Tests
const testRecords = [
  { image: 'frame_pacific', centroid_coordinates: { lat: 20, lon: 164.4 } },
  { image: 'frame_indianocean', centroid_coordinates: { lat: 20, lon: 83.3 } },
  { image: 'frame_atlantic', centroid_coordinates: { lat: 20, lon: -24.7 } }
];
const match = findBestEpicMatch(testRecords, 90.0);
console.assert(match.record.image === 'frame_indianocean', `Selected ${match.record.image}`);
const wrapDist = angularDistanceLon(179, -179);
console.assert(Math.abs(wrapDist - 2) < 0.001, `Wrap dist: ${wrapDist}`);

// 2. Slope & Mobility Tests
const slopeZero = calculateSlopeDegrees(0, 0);
console.assert(slopeZero === 0, `Slope zero: ${slopeZero}`);
const slopeIncline = calculateSlopeDegrees(1, 0);
console.assert(Math.abs(slopeIncline - 45) < 0.01, `Slope 45: ${slopeIncline}`);
const speedFlat = getMobilitySpeedMultiplier(2);
const speedSteep = getMobilitySpeedMultiplier(26);
console.assert(speedFlat === 1.0 && speedSteep === 0.35, `Speed: ${speedFlat}, ${speedSteep}`);

// 3. Radiation & Dose Tests
const stormTier = getStormThreatLevel(206);
console.assert(stormTier.scale === 'S2', `Storm tier: ${stormTier.scale}`);
const doseOutside = calculateDoseRate(206, 'X3.9', false);
const doseInside = calculateDoseRate(206, 'X3.9', true);
console.assert(doseInside < doseOutside * 0.1, `Dose inside: ${doseInside}, outside: ${doseOutside}`);

// 4. Pressure Tests
const p0 = 101.3;
const p1 = simulateLeakStep(p0, 15, 120, 10);
console.assert(p1 < p0 && p1 > 90, `Pressure step: ${p1}`);
const hazard = getPressureHazard(50);
console.assert(hazard.status === 'CRITICAL', `Hazard: ${hazard.status}`);

console.log('ALL COMPUTE TESTS PASSED SUCCESSFULLY!');
