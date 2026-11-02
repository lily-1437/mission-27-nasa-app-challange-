/**
 * @file dose.js
 * Radiation dose and solar particle event (SPE) exposure calculator.
 * MISSION27 SIMULATION combining NOAA Space Weather data with lunar shielding physics.
 */

/**
 * Background GCR (Galactic Cosmic Ray) dose rate on lunar surface in mSv/hr.
 * Real baseline: approx 0.025 - 0.035 mSv/hr (approx 60 mSv/year).
 */
export const BASELINE_GCR_DOSE_MSV_HR = 0.03;

/**
 * Calculates instantaneous radiation dose rate in mSv/hr based on proton flux and flare class.
 * @param {number} protonFluxPfu Proton flux (>10 MeV) in pfu (particle flux units)
 * @param {string} flareClass Solar flare classification (e.g. 'C', 'M1.2', 'X3.9', 'X5.8')
 * @param {boolean} inShelter Whether crew is inside the water-jacketed storm shelter
 * @returns {number} Dose rate in mSv/hr
 */
export function calculateDoseRate(protonFluxPfu, flareClass = 'C', inShelter = false) {
  // Flare multiplier based on X-ray class
  let flareMultiplier = 1.0;
  if (flareClass.startsWith('X')) {
    const val = parseFloat(flareClass.slice(1)) || 1.0;
    flareMultiplier = 2.0 + val * 0.8;
  } else if (flareClass.startsWith('M')) {
    const val = parseFloat(flareClass.slice(1)) || 1.0;
    flareMultiplier = 1.2 + val * 0.1;
  }

  // SPE proton dose contribution: 10 pfu is S1 (minor), >100 is S2, >1000 is S3
  let speDose = 0;
  if (protonFluxPfu > 10) {
    speDose = (protonFluxPfu / 10) * 0.15 * flareMultiplier;
  }

  const unshieldedRate = BASELINE_GCR_DOSE_MSV_HR + speDose;

  if (inShelter) {
    // Water-jacket (≥30 cm H2O equivalent + regolith berm) provides ~92% attenuation
    return unshieldedRate * 0.08;
  }

  return unshieldedRate;
}

/**
 * Determines NOAA Space Weather S-Scale threat tier from proton flux (>10 MeV).
 * @param {number} pfu 
 * @returns {{ scale: string, level: number, label: string, color: string }}
 */
export function getStormThreatLevel(pfu) {
  if (pfu >= 100000) return { scale: 'S5', level: 5, label: 'EXTREME SOLAR STORM', color: '#FF2A40' };
  if (pfu >= 10000) return { scale: 'S4', level: 4, label: 'SEVERE SOLAR STORM', color: '#FF4D5E' };
  if (pfu >= 1000) return { scale: 'S3', level: 3, label: 'STRONG SOLAR STORM', color: '#FF8833' };
  if (pfu >= 100) return { scale: 'S2', level: 2, label: 'MODERATE SOLAR STORM', color: '#FFB800' };
  if (pfu >= 10) return { scale: 'S1', level: 1, label: 'MINOR SOLAR STORM', color: '#00BFCF' };
  return { scale: 'S0', level: 0, label: 'QUIET BACKGROUND', color: '#4ADE80' };
}
