/**
 * @file emergencies.js
 * Mission 27 Emergency Controller.
 * 6 Scenarios:
 * 1. Rapid Depressurization (Airlock/Hab B valve pressure map)
 * 2. Solar Particle Event / Radiation (NOAA storm record, shelter order)
 * 3. Power Failure (Array trip, 6 kW solar drop, power bus load balancing)
 * 4. Greenhouse Failure (Moisture clog, water/light/nutrient 3-slider balance)
 * 5. Suit Cooling Failure (During EVA, sublimation failure, waypoint dash)
 * 6. Crew Conflict (Maya vs. Leo power arbitration)
 */

export class EmergencySystem {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
    this.activeCrisis = null;
    this.timerId = null;
    this.nextScheduledTimeHours = 3.0; // fires around H03:00, then every 3-4 hours
    this.playedCrises = new Set();
  }

  update(dtSimMinutes) {
    if (this.state.isPaused || this.activeCrisis) return;

    // Check emergency scheduler
    const currentHours = this.state.missionHoursElapsed;
    if (currentHours >= this.nextScheduledTimeHours) {
      this.triggerNextEmergency();
    }
  }

  triggerNextEmergency() {
    const pool = ['depressurization', 'radiation', 'power', 'greenhouse', 'cooling', 'conflict'];
    const candidates = pool.filter(c => !this.playedCrises.has(c));
    const selected = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : pool[Math.floor(Math.random() * pool.length)];

    this.triggerEmergency(selected);
    this.playedCrises.add(selected);
    this.nextScheduledTimeHours = this.state.missionHoursElapsed + 3.5; // Next in 3.5 mission hours
  }

  triggerEmergency(type) {
    if (this.activeCrisis) return;

    let crisisConfig = {};
    if (type === 'depressurization') {
      crisisConfig = {
        type: 'depressurization',
        name: 'RAPID DEPRESSURIZATION',
        affectedResource: 'lifesupport',
        banner: '⚠ PRESSURE LOSS — HAB MODULE B | 94.2 kPa ↓ | GO TO AIRLOCK',
        countdownSec: 60,
        timeRemaining: 60,
        targetZone: 'airlock',
        beaconPos: { x: 0, y: 1.5, z: 11 },
        promptAction: 'READ PRESSURE MAP',
        speaker: 'Nova (Life Support)',
        dialogue: 'Pressure dropping in Hab B! Get to the airlock panel, now!'
      };
    } else if (type === 'radiation') {
      crisisConfig = {
        type: 'radiation',
        name: 'SOLAR PARTICLE EVENT (SPE)',
        affectedResource: 'radiation',
        banner: '☢ SOLAR PARTICLE EVENT — S3 | 206 pfu PROTON BURST | GO TO COMMAND',
        countdownSec: 90,
        timeRemaining: 90,
        targetZone: 'command',
        beaconPos: { x: 0, y: 1.5, z: -4 },
        promptAction: 'CHECK RADIATION MONITOR',
        speaker: 'Leo (Science)',
        dialogue: 'Proton flux climbing fast. We have about 90 seconds.'
      };
    } else if (type === 'power') {
      crisisConfig = {
        type: 'power',
        name: 'POWER FAILURE — ARRAY 2 TRIP',
        affectedResource: 'power',
        banner: '⚡ POWER BUS FAILURE — SOLAR OUTPUT 6.0 kW | RE-ROUTE LOADS',
        countdownSec: 75,
        timeRemaining: 75,
        targetZone: 'power',
        beaconPos: { x: -14, y: 1.5, z: 0 },
        promptAction: 'OPEN POWER BUS',
        speaker: 'Maya (Systems)',
        dialogue: 'Array 2 just tripped. Go to the power station and re-route the load!'
      };
      this.state.resources.solarGenerationKw = 6.0;
    } else if (type === 'greenhouse') {
      crisisConfig = {
        type: 'greenhouse',
        name: 'GREENHOUSE MOISTURE LOOP FAULT',
        affectedResource: 'food',
        banner: '🌿 GREENHOUSE CLOG — CROP WILTING RISK | GO TO GREENHOUSE',
        countdownSec: 60,
        timeRemaining: 60,
        targetZone: 'greenhouse',
        beaconPos: { x: 14, y: 1.5, z: 0 },
        promptAction: 'INSPECT TRAYS',
        speaker: 'Nova (Life Support)',
        dialogue: 'Moisture loop is clogged. Plants won\'t last the shift.'
      };
    } else if (type === 'cooling') {
      crisisConfig = {
        type: 'cooling',
        name: 'SUIT COOLING FAILURE',
        affectedResource: 'lifesupport',
        banner: '❄ SUIT THERMAL RUNAWAY — SUBLIMATOR OFFLINE | RETURN TO AIRLOCK',
        countdownSec: 45,
        timeRemaining: 45,
        targetZone: 'airlock',
        beaconPos: { x: 0, y: 1.5, z: 11 },
        promptAction: 'CYCLE AIRLOCK',
        speaker: 'Ari (Commander)',
        dialogue: 'Your suit temp is rising. Get back to the airlock now!'
      };
    } else if (type === 'conflict') {
      crisisConfig = {
        type: 'conflict',
        name: 'CREW POWER ARBITRATION',
        affectedResource: 'power',
        banner: '⚖ CREW DISPUTE — POWER ALLOCATION CONFLICT | GO TO COMMAND',
        countdownSec: 90,
        timeRemaining: 90,
        targetZone: 'command',
        beaconPos: { x: 0, y: 1.5, z: -4 },
        promptAction: 'ARBITRATE DISPUTE',
        speaker: 'Maya & Leo',
        dialogue: 'Commander, we need your arbitration on the 14:00 power schedule!'
      };
    }

    this.activeCrisis = crisisConfig;
    this.state.activeEmergency = crisisConfig;
    this.state.addEventLog(`EMERGENCY: ${crisisConfig.name}`, crisisConfig.banner, 'NOAA / NASA ALERT');

    this.audio.playAlarm();

    // Broadcast crew voice line
    window.dispatchEvent(new CustomEvent('mission27:crew-dialogue', {
      detail: {
        speaker: crisisConfig.speaker,
        role: 'CRITICAL ALERT',
        text: crisisConfig.dialogue,
        colorHex: '#FF4D5E'
      }
    }));

    // Real-time countdown
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (!this.activeCrisis) {
        clearInterval(this.timerId);
        return;
      }
      if (!this.state.isPaused) {
        this.activeCrisis.timeRemaining--;
        if (this.activeCrisis.timeRemaining <= 0) {
          this.failEmergency();
        }
      }
    }, 1000);

    this.state.notifyTelemetry();
  }

  resolveEmergency(bonusXp = 150) {
    if (!this.activeCrisis) return;
    const name = this.activeCrisis.name;
    const type = this.activeCrisis.type;

    this.audio.playSuccess();
    this.state.addEventLog('EMERGENCY RESOLVED', `${name} contained successfully. Systems stabilized.`);
    this.state.xp += bonusXp;

    // Badges
    if (type === 'depressurization') this.state.unlockBadge('life_support_pro');
    if (type === 'radiation') this.state.unlockBadge('radiation_ready');
    if (type === 'greenhouse') this.state.unlockBadge('greenhouse_hero');
    if (type === 'cooling') this.state.unlockBadge('eva_ready');

    // Restore solar if power failure
    if (type === 'power') this.state.resources.solarGenerationKw = 14.2;

    this.state.checkRank();
    this.clearCrisis();
  }

  failEmergency() {
    if (!this.activeCrisis) return;
    const name = this.activeCrisis.name;
    this.audio.playAlarm();
    this.state.addEventLog('EMERGENCY ESCALATION', `${name} breached critical margins. Resources penalized.`);

    const res = this.state.resources;
    res.oxygenPct = Math.max(65.0, res.oxygenPct - 15);
    res.batteryKwh = Math.max(15.0, res.batteryKwh - 25);
    res.cropHealthPct = Math.max(25.0, res.cropHealthPct - 20);

    if (this.activeCrisis.type === 'power') this.state.resources.solarGenerationKw = 14.2;

    this.clearCrisis();
  }

  clearCrisis() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.activeCrisis = null;
    this.state.activeEmergency = null;
    this.state.notifyTelemetry();
  }
}
