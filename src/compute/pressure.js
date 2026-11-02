/**
 * @file pressure.js
 * Orifice flow and atmospheric decompression physics for outpost modules.
 * MISSION27 SIMULATION based on fluid dynamics through an aperture into vacuum.
 */

export const NOMINAL_ATM_KPA = 101.325; // Standard sea-level lunar habitat atmospheric pressure in kPa
export const MIN_CRITICAL_KPA = 55.0;   // Hypoxia and ebullism danger threshold in kPa

/**
 * Calculates pressure drop per elapsed second using choked orifice flow approximation into vacuum.
 * dP/dt = - (C_d * A / V) * sqrt(gamma * R * T) * P * (2 / (gamma + 1))^((gamma + 1)/(2*(gamma - 1)))
 * @param {number} currentPressureKpa Current module pressure in kPa
 * @param {number} holeDiameterMm Diameter of micrometeoroid puncture / seal breach in mm
 * @param {number} moduleVolumeM3 Internal volume of module in cubic meters (e.g. Hab = 120 m^3)
 * @param {number} dtSeconds Elapsed time in seconds
 * @returns {number} New pressure in kPa (>= 0)
 */
export function simulateLeakStep(currentPressureKpa, holeDiameterMm, moduleVolumeM3, dtSeconds) {
  if (currentPressureKpa <= 0.1 || holeDiameterMm <= 0) return Math.max(0, currentPressureKpa);

  // Aperture area in square meters
  const radiusM = (holeDiameterMm / 1000) / 2;
  const areaM2 = Math.PI * radiusM * radiusM;

  // Air constants: gamma = 1.4, R = 287 J/(kg*K), T = 293.15 K (20 C)
  // Choked sonic flow speed factor: ~ 312 m/s
  const sonicDischargeConstant = 312.0;
  const dischargeCoeff = 0.62; // standard orifice discharge coefficient

  // Effective volumetric flow rate per second: (C_d * A * c) / V
  const decayRate = (dischargeCoeff * areaM2 * sonicDischargeConstant) / Math.max(10, moduleVolumeM3);

  // Exponential decay step P(t + dt) = P(t) * exp(-decayRate * dt)
  const newPressure = currentPressureKpa * Math.exp(-decayRate * dtSeconds);
  return Math.max(0, Math.round(newPressure * 100) / 100);
}

/**
 * Evaluates physiological hazard status for a given pressure.
 * @param {number} pressureKpa Pressure in kPa
 * @returns {{ status: 'NOMINAL'|'CAUTION'|'WARNING'|'CRITICAL', message: string, color: string }}
 */
export function getPressureHazard(pressureKpa) {
  if (pressureKpa >= 95.0) {
    return { status: 'NOMINAL', message: 'Nominal Sea-Level Equivalent', color: '#00BFCF' };
  } else if (pressureKpa >= 80.0) {
    return { status: 'CAUTION', message: 'Mild Depressurization Detected', color: '#FFB800' };
  } else if (pressureKpa >= 60.0) {
    return { status: 'WARNING', message: 'Severe Cabin Pressure Loss - Don Oxygen Masks', color: '#FF8833' };
  } else {
    return { status: 'CRITICAL', message: 'CRITICAL DECOMPRESSION - Evacuate Module', color: '#FF4D5E' };
  }
}
