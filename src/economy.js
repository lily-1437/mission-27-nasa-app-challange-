/**
 * @file economy.js
 * Simulates resource coupling loops, life-support consumption, and mission clock.
 */

import { CONFIG } from './state.js';
import { calculateDoseRate } from './compute/dose.js';

export class SimulationEconomy {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
    this.intervalId = null;
    this.lastTickTime = performance.now();
  }

  start() {
    if (this.intervalId) return;
    this.lastTickTime = performance.now();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    if (this.state.isPaused || !this.state.missionTimerActive) return;

    const dtRealSec = 1; // 1 second real tick
    // In game time: 1 sec = 1 sim-minute = (1 / 60) mission hours
    const dtSimHours = dtRealSec / 60;
    this.state.missionHoursElapsed += dtSimHours;

    if (this.state.missionHoursElapsed >= CONFIG.MISSION_HOURS_TOTAL) {
      this.state.missionHoursElapsed = CONFIG.MISSION_HOURS_TOTAL;
      this.state.missionTimerActive = false;
      this.state.addEventLog('MISSION COMPLETE', '27-hour lunar simulation successfully concluded.');
      this.state.go('REPORT');
      return;
    }

    // Couple resources:
    const res = this.state.resources;
    const alloc = this.state.powerAllocation;

    // 1. Power balance
    const totalDraw = (alloc.lifeSupport || 4.5) + (alloc.greenhouse || 3.0) + (alloc.heaters || 1.5) + (alloc.science || 1.5) + (alloc.comms || 1.0);
    res.powerConsumptionKw = totalDraw;
    const powerSurplus = res.solarGenerationKw - totalDraw;

    if (powerSurplus < 0) {
      // Drain battery (kW * hours)
      const kwhDrain = Math.abs(powerSurplus) * dtSimHours;
      res.batteryKwh = Math.max(0, res.batteryKwh - kwhDrain);
    } else {
      // Recharge battery up to capacity
      const maxCharge = alloc.batteryCharge || 2.7;
      const kwhCharge = Math.min(powerSurplus, maxCharge) * dtSimHours;
      res.batteryKwh = Math.min(CONFIG.BATTERY_CAPACITY_KWH, res.batteryKwh + kwhCharge);
    }

    // 2. Life Support check: Must have >= 4.0 kW
    if (alloc.lifeSupport < CONFIG.MIN_LIFE_SUPPORT_KW) {
      // Insufficient blower/scrubber power -> O2 declines faster and CO2 builds up
      res.oxygenPct = Math.max(70, res.oxygenPct - 0.15);
      res.co2ScrubberPct = Math.max(50, res.co2ScrubberPct - 0.4);
    } else {
      // Healthy regeneration
      res.oxygenPct = Math.min(99.0, res.oxygenPct + 0.02);
      res.co2ScrubberPct = Math.min(99.0, res.co2ScrubberPct + 0.05);
    }

    // 3. Water loop coupling
    const waterDraw = 0.08 * dtRealSec; // ~4.8 L per hour base
    if (alloc.lifeSupport >= CONFIG.MIN_LIFE_SUPPORT_KW) {
      // 98% recycled
      const netWaterLoss = waterDraw * (1 - res.waterRecyclingPct / 100);
      res.waterReservesLiters = Math.max(0, res.waterReservesLiters - netWaterLoss);
    } else {
      res.waterReservesLiters = Math.max(0, res.waterReservesLiters - waterDraw * 0.4);
    }

    // 4. Greenhouse coupling: needs power + water
    if (alloc.greenhouse >= 3.0 && res.waterReservesLiters > 20) {
      res.cropHealthPct = Math.min(100, res.cropHealthPct + 0.05);
    } else {
      res.cropHealthPct = Math.max(20, res.cropHealthPct - 0.1);
    }

    // 5. Radiation exposure accumulation
    const protonFlux = this.state.activeEmergency?.type === 'radiation' ? 206 : 0.5;
    const inShelter = this.state.playerPos.z < -10 && Math.abs(this.state.playerPos.x) < 5;
    res.radiationDoseMsvHr = calculateDoseRate(protonFlux, 'X3.9', inShelter);
    res.accumulatedDoseMsv += res.radiationDoseMsvHr * dtSimHours;

    this.state.notifyTelemetry();
  }
}
