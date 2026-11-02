/**
 * @file resources.js
 * Interconnected ECLSS, Electrical Power, Radiation Safety, Food & Water dynamics.
 * Coupling rules:
 * - Greenhouse turns power and water into food
 * - Low power (<4kW) dims grow lights, starves scrubbers and triggers O2 drop
 * - Depressurization leaks vent gas and force power draw
 * - Radiation shelter pauses science instruments
 */

import { calculateDoseRate } from './compute/dose.js';

export class ResourceManager {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
  }

  update(dtSimMinutes) {
    if (dtSimMinutes <= 0) return;
    const dtSimHours = dtSimMinutes / 60.0;
    const res = this.state.resources;
    const alloc = this.state.powerAllocation;

    // 1. Power Balance
    const totalDraw = (alloc.lifeSupport || 4.5) + (alloc.greenhouse || 3.0) + (alloc.science || 1.5) + (alloc.comms || 1.0) + (alloc.heaters || 1.5);
    res.powerConsumptionKw = totalDraw;

    // Solar generation (e.g. 14.2 nominal, drops during emergencies)
    const powerSurplus = res.solarGenerationKw - totalDraw;
    if (powerSurplus < 0) {
      // Drain battery (kWh)
      const drain = Math.abs(powerSurplus) * dtSimHours;
      res.batteryKwh = Math.max(0, res.batteryKwh - drain);
    } else {
      // Charge battery
      const charge = Math.min(powerSurplus, 3.5) * dtSimHours;
      res.batteryKwh = Math.min(120.0, res.batteryKwh + charge);
    }

    // 2. Life Support & Pressure
    if (this.state.activeEmergency?.type === 'depressurization') {
      // Leaking active: handled by emergency loop or decays
      res.pressureKpa = Math.max(50.0, res.pressureKpa - (dtSimMinutes * 0.4));
      res.oxygenPct = Math.max(70.0, res.oxygenPct - (dtSimMinutes * 0.2));
    } else if (alloc.lifeSupport < 4.0) {
      // Underpowered ECLSS: O2 decays, CO2 builds up
      res.oxygenPct = Math.max(75.0, res.oxygenPct - dtSimMinutes * 0.15);
      res.co2ScrubberPct = Math.max(60.0, res.co2ScrubberPct - dtSimMinutes * 0.25);
    } else {
      // Nominal life support recovery
      if (res.pressureKpa < 101.3) res.pressureKpa = Math.min(101.3, res.pressureKpa + dtSimMinutes * 0.3);
      if (res.oxygenPct < 99.0) res.oxygenPct = Math.min(99.0, res.oxygenPct + dtSimMinutes * 0.08);
      if (res.co2ScrubberPct < 99.0) res.co2ScrubberPct = Math.min(99.0, res.co2ScrubberPct + dtSimMinutes * 0.1);
    }

    // 3. Water & Food (Greenhouse coupling)
    const baseWaterUsageL = dtSimMinutes * 0.12;
    if (alloc.lifeSupport >= 4.0) {
      // 98.4% closed loop
      const netLossL = baseWaterUsageL * (1 - (res.waterRecyclingPct / 100));
      res.waterReservesLiters = Math.max(10, res.waterReservesLiters - netLossL);
    } else {
      res.waterReservesLiters = Math.max(10, res.waterReservesLiters - baseWaterUsageL * 0.4);
    }

    // Greenhouse crop vigor: needs power + water
    if (this.state.activeEmergency?.type === 'greenhouse') {
      res.cropHealthPct = Math.max(20.0, res.cropHealthPct - dtSimMinutes * 0.8);
    } else if ((alloc.greenhouse || 3.0) >= 2.5 && res.waterReservesLiters > 50) {
      res.cropHealthPct = Math.min(100.0, res.cropHealthPct + dtSimMinutes * 0.05);
    } else {
      res.cropHealthPct = Math.max(30.0, res.cropHealthPct - dtSimMinutes * 0.1);
    }

    // 4. Radiation & Safety
    const protonFlux = this.state.activeEmergency?.type === 'radiation' ? (this.state.radiationProtonFlux || 206) : 0.4;
    const inShelter = this.state.playerInShelter || false;
    res.radiationDoseMsvHr = calculateDoseRate(protonFlux, 'X3.9', inShelter);
    res.accumulatedDoseMsv += res.radiationDoseMsvHr * dtSimHours;

    this.state.notifyTelemetry();
  }
}
