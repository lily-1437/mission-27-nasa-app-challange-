/**
 * @file state.js
 * Central state machine, CONFIG parameters, and telemetry store for MISSION27.
 */

export const CONFIG = {
  MISSION_HOURS_TOTAL: 27,
  MISSION_SPEED_SIM_MIN_PER_SEC: 1, // 1 sim-minute per real second (~27 min total run)
  SOLAR_PEAK_KW: 18.0,
  MIN_LIFE_SUPPORT_KW: 4.0,
  BASE_O2_CONSUMPTION: 0.05, // % per sim-minute
  BATTERY_CAPACITY_KWH: 120.0,
  GRAVITY_MOON: 1.62,
  WALK_SPEED: 4.5,
  ROVER_MAX_SPEED: 14.0,
  TERRAIN_EXTENT_M: 1280.0,
  TERRAIN_ELEV_MIN: 600.21,
  TERRAIN_ELEV_MAX: 692.19
};

export class GameState {
  constructor() {
    this.screen = null;
    this.screenHistory = [];
    this.screenListeners = new Set();
    this.telemetryListeners = new Set();
    this.isPaused = false;
    this.isMuted = false;

    // Mission Progression
    this.missionHoursElapsed = 0; // 0 to 27
    this.missionTimerActive = false;
    this.xp = 0;
    this.rank = 'Astronaut Trainee';

    // Resources
    this.resources = {
      pressureKpa: 101.3,
      oxygenPct: 96.5,
      co2ScrubberPct: 98.0,
      solarGenerationKw: 14.2,
      powerConsumptionKw: 8.5,
      batteryKwh: 105.0,
      radiationDoseMsvHr: 0.03,
      accumulatedDoseMsv: 0.012,
      stormThreatScale: 'S0',
      cropHealthPct: 95.0,
      foodRationsSols: 27.0,
      waterRecyclingPct: 98.4,
      waterReservesLiters: 450.0
    };

    // Badges Showcase
    this.badges = {
      eva_ready: false,
      life_support_pro: false,
      radiation_ready: false,
      greenhouse_hero: false,
      field_geologist: false,
      earth_analyst: false
    };

    // Subsystems Power Allocation (kW)
    this.powerAllocation = {
      lifeSupport: 4.5, // >= 4.0 kW strictly required
      greenhouse: 3.0,
      science: 1.5,
      comms: 1.0,
      heaters: 1.5,
      batteryCharge: 2.7
    };

    // Crew Roster
    this.crew = {
      ari: {
        name: 'Ari Vance',
        role: 'Commander',
        status: 'Optimal',
        morale: 100,
        heartRate: 72,
        assignedModule: 'COMMAND',
        bio: 'Former test pilot with 1,200 hours in lunar analog sims. Leads tactical decisions.'
      },
      maya: {
        name: 'Maya Lin',
        role: 'Systems Engineer',
        status: 'Optimal',
        morale: 95,
        heartRate: 78,
        assignedModule: 'POWER',
        bio: 'Power grid specialist. Directs solar tracking arrays and fuel cell balancing.'
      },
      leo: {
        name: 'Leo Thorne',
        role: 'Science Specialist',
        status: 'Optimal',
        morale: 92,
        heartRate: 70,
        assignedModule: 'SCIENCE',
        bio: 'Planetary geologist and DSCOVR Earth observation analyst.'
      },
      nova: {
        name: 'Nova Chen',
        role: 'Life Support Specialist',
        status: 'Optimal',
        morale: 98,
        heartRate: 68,
        assignedModule: 'ECLSS',
        bio: 'Biomedical engineer supervising closed-loop water and oxygen reclamation.'
      }
    };

    // Objectives Checklist
    this.objectives = [
      { id: 'power_check', label: 'Verify Outpost Solar Generation & Grid Margins', completed: false, location: 'POWER' },
      { id: 'airlock_cycle', label: 'Complete Airlock Suit Verification for EVA', completed: false, location: 'AIRLOCK' },
      { id: 'greenhouse_inspect', label: 'Inspect Hydroponic Trays & Moisture Loop', completed: false, location: 'GREENHOUSE' },
      { id: 'rover_survey', label: 'Mount Lunar Rover & Survey Shackleton Rim', completed: false, location: 'SURFACE' },
      { id: 'rock_samples', label: 'Collect 3 Geological Rock Specimens', completed: false, progress: 0, total: 3, location: 'SURFACE' },
      { id: 'earth_photo', label: 'Photograph Earthrise via Field Viewfinder', completed: false, location: 'SURFACE' }
    ];

    // Training Modules Status
    this.trainingCompleted = {
      find_leak: false,
      route_power: false,
      radiation_shelter: false,
      repair_wiring: false,
      command_triage: false
    };

    // Active Emergency
    this.activeEmergency = null; // { type, name, timeRemaining, maxTime, targetModule, beaconPos }

    // Rover & Player
    this.inRover = false;
    this.roverBattery = 98;
    this.roverSpeed = 0;
    this.playerPos = { x: 0, y: 1.5, z: 10 };
    this.playerRotation = 0;

    // Field Science
    this.collectedSamples = [];
    this.capturedPhotos = [];

    // Historical Event Log
    this.eventLog = [
      {
        time: 'H00:00',
        event: 'OUTPOST COMMISSIONING',
        details: 'Initial atmospheric pressurization to 101.3 kPa successful. All crew members report green vitals.',
        source: 'MISSION27 SIMULATION'
      }
    ];

    // UI State
    this.opsConsoleOpen = false;
    this.opsConsoleTab = 'telemetry'; // 'telemetry' | 'protocols' | 'crew' | 'events'
    this.dataDrawerOpen = false;
    this.activeModal = null;
    this.interactionPrompt = null; // { label, actionKey, onTrigger }
  }

  // --- Screen State Machine ---
  go(screen, payload = null, force = false) {
    if (!force && this.screen === screen) return;
    const prev = this.screen;
    if (prev) this.screenHistory.push(prev);
    this.screen = screen;
    this.notifyScreenChange(prev, screen, payload);
  }

  goBack() {
    if (this.screenHistory.length > 0) {
      const prev = this.screenHistory.pop();
      const current = this.screen;
      this.screen = prev;
      this.notifyScreenChange(current, prev, null);
    } else {
      this.go('HOME');
    }
  }

  onScreenChange(listener) {
    this.screenListeners.add(listener);
    return () => this.screenListeners.delete(listener);
  }

  notifyScreenChange(from, to, payload) {
    for (const listener of this.screenListeners) {
      try { listener(from, to, payload); } catch (e) { console.error(e); }
    }
  }

  // --- Telemetry & Listeners ---
  onTelemetryUpdate(listener) {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  notifyTelemetry() {
    for (const listener of this.telemetryListeners) {
      try { listener(this); } catch (e) { console.error(e); }
    }
  }

  addEventLog(event, details, source = 'MISSION27 SIMULATION') {
    const timeFormatted = `H${Math.floor(this.missionHoursElapsed).toString().padStart(2, '0')}:${Math.floor((this.missionHoursElapsed % 1) * 60).toString().padStart(2, '0')}`;
    this.eventLog.unshift({
      time: timeFormatted,
      event,
      details,
      source
    });
    if (this.eventLog.length > 50) this.eventLog.pop();
  }

  completeObjective(id) {
    const obj = this.objectives.find(o => o.id === id);
    if (obj && !obj.completed) {
      obj.completed = true;
      this.xp += 150;
      this.addEventLog('OBJECTIVE COMPLETED', obj.label);
      this.checkRank();
      this.notifyTelemetry();
      return true;
    }
    return false;
  }

  unlockBadge(badgeKey) {
    if (this.badges && !this.badges[badgeKey]) {
      this.badges[badgeKey] = true;
      this.xp += 100;
      this.addEventLog('BADGE UNLOCKED', `Earned achievement: ${badgeKey.replace(/_/g, ' ').toUpperCase()}`);
      this.checkRank();
      this.notifyTelemetry();
    }
  }

  checkRank() {
    if (this.xp >= 1000) this.rank = 'Mission Commander';
    else if (this.xp >= 600) this.rank = 'Senior Lunar Specialist';
    else if (this.xp >= 300) this.rank = 'Lunar Outpost Engineer';
    else this.rank = 'Astronaut Trainee';
  }
}

export const state = new GameState();
