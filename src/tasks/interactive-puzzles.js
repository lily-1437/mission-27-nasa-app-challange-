/**
 * @file tasks/interactive-puzzles.js
 * Interactive visual puzzles for emergencies and regular outpost stations:
 * 1. Pressure Map Valve Isolation (click leaking module, hold E for 3s to seal)
 * 2. Power Grid Drag & Balance (Life Support >= 4 kW locked, Greenhouse, Science, Comms, Heaters)
 * 3. Greenhouse 3-Slider Balance (Water, Light, Nutrients in target green bands for 10s)
 * 4. Wire Breaker Reset (Connect wires to matching terminals)
 * 5. Suit Prebreathe & EVA Verification
 * 6. Crew Dispute Arbitration (Maya vs Leo)
 */

export class InteractivePuzzleManager {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
  }

  // 1. Rapid Depressurization Pressure Map
  renderPressureMap(container, onComplete) {
    const hatches = [
      { id: 'hab_b', label: 'HABITAT MODULE B', leaking: true, pressure: 94.2 },
      { id: 'command', label: 'COMMAND CORE', leaking: false, pressure: 101.3 },
      { id: 'airlock', label: 'AIRLOCK VESTIBULE', leaking: false, pressure: 101.1 },
      { id: 'greenhouse', label: 'GREENHOUSE POD', leaking: false, pressure: 101.3 }
    ];

    container.innerHTML = `
      <div class="panel puzzle-modal">
        <div class="panel-header">
          <div>
            <h3>ECLSS BULKHEAD // BASE PRESSURE MAP</h3>
            <span class="mono text-alert">⚠ CRITICAL ORIFICE DECOMPRESSION</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-puzzle">CANCEL [ESC]</button>
        </div>
        <p class="mt-8">Click the breaching module on the diagram below, then HOLD [E] (or the Seal button) for 3 seconds to dog the emergency isolation hatch.</p>

        <div class="pressure-map-grid mt-16">
          ${hatches.map(h => `
            <div class="hatch-card panel ${h.leaking ? 'hatch-leaking' : ''}" data-id="${h.id}">
              <div class="hatch-title mono">${h.label}</div>
              <div class="hatch-pressure mono ${h.leaking ? 'text-alert' : 'text-cyan'}">${h.pressure.toFixed(1)} kPa</div>
              <div class="hatch-status mono">${h.leaking ? '⚠ RAPID VENTING' : 'SEAL NOMINAL'}</div>
              ${h.leaking ? '<div class="hiss-particles">💨 💨 💨</div>' : ''}
            </div>
          `).join('')}
        </div>

        <div class="hold-action-area mt-16 text-center">
          <div class="hold-progress-ring-box">
            <button class="btn btn-primary" id="btn-hold-seal">HOLD TO ENGAGE VALVE DOGGING (3s)</button>
            <div class="hold-bar-track mt-8"><div id="hold-bar-fill" class="hold-bar-fill"></div></div>
          </div>
        </div>

        <div id="pressure-feedback" class="mt-16"></div>
      </div>
    `;

    this.audio.playHiss(3.0);
    let selectedHatch = 'hab_b';
    let holdProgress = 0;
    let holdInterval = null;

    container.querySelectorAll('.hatch-card').forEach(card => {
      card.addEventListener('click', () => {
        this.audio.playClick();
        container.querySelectorAll('.hatch-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedHatch = card.dataset.id;
      });
    });

    const sealBtn = container.querySelector('#btn-hold-seal');
    const barFill = container.querySelector('#hold-bar-fill');

    const startHold = () => {
      if (holdInterval) return;
      holdInterval = setInterval(() => {
        holdProgress += 3.5;
        barFill.style.width = `${Math.min(100, holdProgress)}%`;
        if (holdProgress >= 100) {
          clearInterval(holdInterval);
          finishHold();
        }
      }, 100);
    };

    const stopHold = () => {
      if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
      }
      if (holdProgress < 100) {
        holdProgress = 0;
        barFill.style.width = '0%';
      }
    };

    const finishHold = () => {
      const fb = container.querySelector('#pressure-feedback');
      if (selectedHatch === 'hab_b') {
        this.audio.playSuccess();
        fb.innerHTML = `
          <div class="alert alert-success">
            <strong>BULKHEAD SEALED!</strong> Hab Module B hatch dogs locked into frame. Pressure stabilized at 98.4 kPa. (+150 XP)
          </div>
          <button class="btn btn-primary btn-block mt-8" id="btn-done-leak">COMPLETE</button>
        `;
        container.querySelector('#btn-done-leak')?.addEventListener('click', () => onComplete(true));
      } else {
        this.audio.playAlarm();
        fb.innerHTML = `
          <div class="alert alert-error">
            <strong>WRONG HATCH DOGGED:</strong> Venting continues in Hab Module B! Select the leaking module.
          </div>
        `;
        holdProgress = 0;
        barFill.style.width = '0%';
      }
    };

    sealBtn.addEventListener('mousedown', startHold);
    sealBtn.addEventListener('mouseup', stopHold);
    sealBtn.addEventListener('mouseleave', stopHold);

    // Keyboard [E] hold
    const onKey = (e) => {
      if (e.code === 'KeyE') {
        if (e.type === 'keydown') startHold();
        if (e.type === 'keyup') stopHold();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    container.querySelector('#btn-close-puzzle')?.addEventListener('click', () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      onComplete(false);
    });
  }

  // 2. Power Grid Allocation
  renderPowerGridRouting(container, onComplete) {
    const available = this.state.resources.solarGenerationKw || 14.2;
    let alloc = { ...this.state.powerAllocation };
    alloc.lifeSupport = Math.max(4.0, alloc.lifeSupport || 4.5);

    const render = () => {
      const total = alloc.lifeSupport + alloc.greenhouse + alloc.science + alloc.comms + alloc.heaters;
      const net = available - total;
      const valid = total <= available && alloc.lifeSupport >= 4.0;

      container.innerHTML = `
        <div class="panel puzzle-modal">
          <div class="panel-header">
            <div>
              <h3>ELECTRICAL POWER DISTRIBUTION BUS</h3>
              <span class="mono ${valid ? 'text-cyan' : 'text-alert'}">SUPPLY: ${available.toFixed(1)} kW | DEMAND: ${total.toFixed(1)} kW</span>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-close-puzzle">CLOSE [ESC]</button>
          </div>
          <p class="mt-8">Balance available solar output. Life Support requires ≥ 4.0 kW non-negotiable floor.</p>

          <div class="power-sliders-box mt-16">
            <div class="slider-row">
              <div class="slider-meta mono">
                <span>LIFE SUPPORT (MIN 4.0 kW LOCKED)</span>
                <span class="text-cyan">${alloc.lifeSupport.toFixed(1)} kW</span>
              </div>
              <input type="range" min="4.0" max="8.0" step="0.5" value="${alloc.lifeSupport}" id="sl-lifesupport" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>GREENHOUSE HORTICULTURAL LEDS</span>
                <span>${alloc.greenhouse.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="6.0" step="0.5" value="${alloc.greenhouse}" id="sl-greenhouse" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>SCIENCE SENSORS & AVIONICS</span>
                <span>${alloc.science.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="4.0" step="0.5" value="${alloc.science}" id="sl-science" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>COMMS ANTENNA ARRAY</span>
                <span>${alloc.comms.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0.5" max="3.0" step="0.5" value="${alloc.comms}" id="sl-comms" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>HABITAT THERMAL HEATERS</span>
                <span>${alloc.heaters.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="3.0" step="0.5" value="${alloc.heaters}" id="sl-heaters" class="slider-input">
            </div>
          </div>

          <div class="row mt-16 mono">
            <span>GRID BUFFER / SURPLUS:</span>
            <span class="${net >= 0 ? 'text-ok' : 'text-alert'}">${net >= 0 ? '+' : ''}${net.toFixed(1)} kW</span>
          </div>

          <div class="modal-actions mt-16">
            <button class="btn btn-primary btn-block" id="btn-lock-grid" ${valid ? '' : 'disabled'}>ENGAGE POWER ALLOCATION</button>
          </div>
        </div>
      `;

      container.querySelector('#sl-lifesupport')?.addEventListener('input', (e) => { alloc.lifeSupport = parseFloat(e.target.value); render(); });
      container.querySelector('#sl-greenhouse')?.addEventListener('input', (e) => { alloc.greenhouse = parseFloat(e.target.value); render(); });
      container.querySelector('#sl-science')?.addEventListener('input', (e) => { alloc.science = parseFloat(e.target.value); render(); });
      container.querySelector('#sl-comms')?.addEventListener('input', (e) => { alloc.comms = parseFloat(e.target.value); render(); });
      container.querySelector('#sl-heaters')?.addEventListener('input', (e) => { alloc.heaters = parseFloat(e.target.value); render(); });

      container.querySelector('#btn-close-puzzle')?.addEventListener('click', () => onComplete(false));
      container.querySelector('#btn-lock-grid')?.addEventListener('click', () => {
        this.audio.playSuccess();
        this.state.powerAllocation = alloc;
        this.state.xp += 120;
        this.state.addEventLog('GRID BALANCED', 'Power distribution locked. Life support floor secured.');
        onComplete(true);
      });
    };

    render();
  }

  // 3. Greenhouse 3-Slider Balance
  renderGreenhouseSliders(container, onComplete) {
    let water = 35;
    let light = 70;
    let nutrient = 40;
    let inTargetSec = 0;
    let intervalId = null;

    const render = () => {
      const waterOk = water >= 45 && water <= 75;
      const lightOk = light >= 50 && light <= 80;
      const nutrientOk = nutrient >= 40 && nutrient <= 70;
      const allInTarget = waterOk && lightOk && nutrientOk;

      container.innerHTML = `
        <div class="panel puzzle-modal">
          <div class="panel-header">
            <div>
              <h3>GREENHOUSE HYDROPONICS CALIBRATION</h3>
              <span class="mono text-cyan">TARGET BUFFER: ${inTargetSec.toFixed(1)}s / 10.0s</span>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-close-puzzle">CLOSE [ESC]</button>
          </div>
          <p class="mt-8">Keep Water, Light, and Nutrients inside the green target zones for 10 seconds to revive wilting crops.</p>

          <div class="greenhouse-sliders-arena mt-16">
            <div class="slider-row">
              <div class="slider-meta mono">
                <span>WATER CIRCULATION (${waterOk ? '✓ IN ZONE' : 'OUT OF RANGE'})</span>
                <span class="${waterOk ? 'text-ok' : 'text-alert'}">${water}%</span>
              </div>
              <input type="range" min="0" max="100" value="${water}" id="sl-water" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>PHOTOSYNTHETIC LED FLUX (${lightOk ? '✓ IN ZONE' : 'OUT OF RANGE'})</span>
                <span class="${lightOk ? 'text-ok' : 'text-alert'}">${light}%</span>
              </div>
              <input type="range" min="0" max="100" value="${light}" id="sl-light" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta mono">
                <span>NUTRIENT NPK SOLUTION (${nutrientOk ? '✓ IN ZONE' : 'OUT OF RANGE'})</span>
                <span class="${nutrientOk ? 'text-ok' : 'text-alert'}">${nutrient}%</span>
              </div>
              <input type="range" min="0" max="100" value="${nutrient}" id="sl-nutrient" class="slider-input">
            </div>
          </div>

          <div class="hold-bar-track mt-16">
            <div class="hold-bar-fill" style="width: ${(inTargetSec / 10.0) * 100}%"></div>
          </div>

          <div id="gh-feedback" class="mt-16"></div>
        </div>
      `;

      container.querySelector('#sl-water')?.addEventListener('input', (e) => { water = parseInt(e.target.value); });
      container.querySelector('#sl-light')?.addEventListener('input', (e) => { light = parseInt(e.target.value); });
      container.querySelector('#sl-nutrient')?.addEventListener('input', (e) => { nutrient = parseInt(e.target.value); });
      container.querySelector('#btn-close-puzzle')?.addEventListener('click', () => {
        clearInterval(intervalId);
        onComplete(false);
      });
    };

    intervalId = setInterval(() => {
      const waterOk = water >= 45 && water <= 75;
      const lightOk = light >= 50 && light <= 80;
      const nutrientOk = nutrient >= 40 && nutrient <= 70;
      if (waterOk && lightOk && nutrientOk) {
        inTargetSec += 0.5;
        if (inTargetSec >= 10.0) {
          clearInterval(intervalId);
          this.audio.playSuccess();
          this.state.resources.cropHealthPct = 100.0;
          this.state.xp += 150;
          this.state.unlockBadge('greenhouse_hero');
          this.state.addEventLog('CROPS REVIVED', 'Greenhouse nutrient loop stabilized.');
          onComplete(true);
          return;
        }
      } else {
        inTargetSec = Math.max(0, inTargetSec - 0.25);
      }
      render();
    }, 500);

    render();
  }

  // 4. Crew Conflict Arbitration (Maya vs Leo)
  renderCrewConflictArbitration(container, onComplete) {
    container.innerHTML = `
      <div class="panel puzzle-modal">
        <div class="panel-header">
          <div>
            <h3>CREW ARBITRATION // COMMAND ROOM</h3>
            <span class="mono text-cyan">SCHEDULE PRIORITY DECISION</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-puzzle">CANCEL [ESC]</button>
        </div>

        <div class="dialogue-box panel mt-16">
          <p><strong>Maya:</strong> "I need the 14:00 power window to fix Array 2! If we don't recalibrate the tracking gimbal now, battery reserves will drop by nightfall."</p>
          <p class="mt-8"><strong>Leo:</strong> "That window is our only shot at the crater scan! The DSCOVR downlink and thermal imaging window won't repeat for 48 hours!"</p>
        </div>

        <div class="choices-stack mt-16">
          <button class="btn btn-outline btn-block choice-btn" data-choice="maya">
            <strong>[1] BACK MAYA (SYSTEMS FIRST)</strong>
            <small class="mono text-muted">Allocate power window to Array 2 repair. Power +15 kW, Battery secure.</small>
          </button>

          <button class="btn btn-outline btn-block choice-btn mt-8" data-choice="leo">
            <strong>[2] BACK LEO (SCIENCE FIRST)</strong>
            <small class="mono text-muted">Run full crater imaging survey. Science +40, XP bonus.</small>
          </button>

          <button class="btn btn-outline btn-block choice-btn mt-8" data-choice="split">
            <strong>[3] SPLIT 50/50 (BALANCED COMPROMISE)</strong>
            <small class="mono text-muted">Compromise schedule. Power +8, Science +20. Crew morale +10%.</small>
          </button>
        </div>
      </div>
    `;

    const handleChoice = (c) => {
      this.audio.playSuccess();
      if (c === 'maya') {
        this.state.resources.batteryKwh = Math.min(120, this.state.resources.batteryKwh + 15);
        this.state.crew.maya.morale = 100;
        this.state.addEventLog('DECISION: MAYA', 'Array 2 maintenance prioritized. Grid buffers maximized.');
      } else if (c === 'leo') {
        this.state.xp += 200;
        this.state.crew.leo.morale = 100;
        this.state.addEventLog('DECISION: LEO', 'Crater thermal survey executed. Ground data captured.');
      } else {
        this.state.xp += 150;
        this.state.resources.batteryKwh = Math.min(120, this.state.resources.batteryKwh + 8);
        this.state.crew.maya.morale = 95;
        this.state.crew.leo.morale = 95;
        this.state.addEventLog('DECISION: COMPROMISE', 'Balanced load split between systems and science.');
      }
      onComplete(true);
    };

    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn.dataset.choice));
    });

    container.querySelector('#btn-close-puzzle')?.addEventListener('click', () => onComplete(false));
  }
}
