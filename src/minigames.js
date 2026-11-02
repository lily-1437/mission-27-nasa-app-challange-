/**
 * @file minigames.js
 * Interactive training center minigames and emergency resolution puzzles.
 */

import { simulateLeakStep } from './compute/pressure.js';
import { audio } from './audio.js';

export class MiniGameHub {
  constructor(state) {
    this.state = state;
    this.currentGame = null;
  }

  // 1. Life Support Lab ("Find the Leak")
  startFindLeak(container, onComplete) {
    container.innerHTML = `
      <div class="panel training-game-panel">
        <div class="panel-header">
          <h3>ECLSS LAB // FIND THE LEAK</h3>
          <span class="badge badge-alert" id="leak-timer">TIME: 30s</span>
        </div>
        <p class="game-instruction">A micrometeorite breach is venting pressure in one habitat compartment. Inspect the 4 analog telemetry gauges below, identify which needle is rapidly falling, and engage EMERGENCY VALVE SEAL!</p>
        
        <div class="gauges-grid">
          ${['HABITAT', 'COMMAND', 'AIRLOCK', 'GREENHOUSE'].map(mod => `
            <div class="gauge-card panel" id="gauge-${mod.toLowerCase()}">
              <div class="gauge-title">${mod} MODULE</div>
              <div class="gauge-dial">
                <div class="gauge-needle" id="needle-${mod.toLowerCase()}"></div>
                <div class="gauge-center-pin"></div>
              </div>
              <div class="gauge-val" id="val-${mod.toLowerCase()}">101.3 kPa</div>
              <button class="btn btn-outline valve-btn" data-module="${mod.toLowerCase()}">CLOSE VALVE</button>
            </div>
          `).join('')}
        </div>

        <div id="leak-feedback" class="game-feedback"></div>
      </div>
    `;

    const leakingModule = ['habitat', 'command', 'airlock', 'greenhouse'][Math.floor(Math.random() * 4)];
    const pressures = { habitat: 101.3, command: 101.3, airlock: 101.3, greenhouse: 101.3 };
    let timeLeft = 30;
    let resolved = false;

    audio.playHiss(3.0);

    const timerInterval = setInterval(() => {
      if (resolved) return;
      timeLeft--;
      const timerEl = container.querySelector('#leak-timer');
      if (timerEl) timerEl.textContent = `TIME: ${timeLeft}s`;

      // Simulate pressure decay on leaking module
      pressures[leakingModule] = simulateLeakStep(pressures[leakingModule], 14, 110, 1);

      // Update gauges
      for (const mod of Object.keys(pressures)) {
        const valEl = container.querySelector(`#val-${mod}`);
        const needleEl = container.querySelector(`#needle-${mod}`);
        if (valEl) valEl.textContent = `${pressures[mod].toFixed(1)} kPa`;
        if (needleEl) {
          // Angle 101.3 kPa -> 0 deg, 50 kPa -> -90 deg
          const angle = ((pressures[mod] - 101.3) / 51.3) * 90;
          needleEl.style.transform = `rotate(${angle}deg)`;
        }
      }

      if (pressures[leakingModule] < 60) {
        audio.playAlarm();
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endLeak(false, 'TIME EXPIRED: Cabin atmospheric pressure breached critical margin.');
      }
    }, 1000);

    const endLeak = (success, message) => {
      resolved = true;
      clearInterval(timerInterval);
      const fb = container.querySelector('#leak-feedback');
      if (success) {
        audio.playSuccess();
        this.state.trainingCompleted.find_leak = true;
        this.state.xp += 100;
        fb.innerHTML = `
          <div class="alert alert-success">
            <strong>CERTIFICATION PASSED!</strong> ${message}<br>
            <small>SCIENCE CODEX: Orifice decompression follows choked gas flow. Fast valve isolation preserves the 101.3 kPa sea-level nitrogen/oxygen balance without dumping emergency reserves.</small>
          </div>
          <button class="btn btn-primary mt-16" id="btn-finish-leak">CONTINUE TO NEXT STATION</button>
        `;
      } else {
        fb.innerHTML = `
          <div class="alert alert-error">
            <strong>FAILED:</strong> ${message}
          </div>
          <button class="btn btn-outline mt-16" id="btn-retry-leak">RETRY MODULE</button>
        `;
      }

      container.querySelector('#btn-finish-leak')?.addEventListener('click', () => onComplete(true));
      container.querySelector('#btn-retry-leak')?.addEventListener('click', () => this.startFindLeak(container, onComplete));
    };

    container.querySelectorAll('.valve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (resolved) return;
        audio.playClick();
        const clickedMod = e.target.dataset.module;
        if (clickedMod === leakingModule) {
          endLeak(true, `Hatch seal engaged in ${clickedMod.toUpperCase()} module. Pressure stabilized at ${pressures[clickedMod].toFixed(1)} kPa.`);
        } else {
          endLeak(false, `WRONG HATCH SEALED! Venting continues in the ${leakingModule.toUpperCase()} module.`);
        }
      });
    });
  }

  // 2. Power Grid ("Route the Power")
  startRoutePower(container, onComplete) {
    let availableSolar = 12.0; // kW
    let allocations = {
      lifeSupport: 4.5,
      greenhouse: 3.5,
      heaters: 2.0,
      avionics: 1.5
    };

    const render = () => {
      const totalDraw = Object.values(allocations).reduce((a, b) => a + b, 0);
      const net = availableSolar - totalDraw;
      const isLifeSupportValid = allocations.lifeSupport >= 4.0;
      const isBalanced = net >= 0 && isLifeSupportValid;

      container.innerHTML = `
        <div class="panel training-game-panel">
          <div class="panel-header">
            <h3>POWER LAB // ROUTE THE POWER</h3>
            <span class="badge ${isBalanced ? 'badge-ok' : 'badge-alert'}">SOLAR SUPPLY: ${availableSolar.toFixed(1)} kW</span>
          </div>
          <p class="game-instruction">Balance the base power budget. Life Support MUST receive at least 4.0 kW to keep air scrubbers and thermal loops running. Adjust power sliders so total consumption is ≤ ${availableSolar.toFixed(1)} kW.</p>

          <div class="power-sliders-box">
            <div class="slider-row ${allocations.lifeSupport < 4.0 ? 'row-alert' : ''}">
              <div class="slider-meta">
                <span class="label">LIFE SUPPORT (CRITICAL FLOOR: 4.0 kW)</span>
                <span class="val-mono">${allocations.lifeSupport.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="8" step="0.5" value="${allocations.lifeSupport}" id="sl-lifesupport" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta">
                <span class="label">GREENHOUSE HORTICULTURAL LEDS</span>
                <span class="val-mono">${allocations.greenhouse.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="6" step="0.5" value="${allocations.greenhouse}" id="sl-greenhouse" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta">
                <span class="label">HABITAT COMFORT HEATERS</span>
                <span class="val-mono">${allocations.heaters.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="4" step="0.5" value="${allocations.heaters}" id="sl-heaters" class="slider-input">
            </div>

            <div class="slider-row">
              <div class="slider-meta">
                <span class="label">SCIENCE AVIONICS & RADAR</span>
                <span class="val-mono">${allocations.avionics.toFixed(1)} kW</span>
              </div>
              <input type="range" min="0" max="3" step="0.5" value="${allocations.avionics}" id="sl-avionics" class="slider-input">
            </div>
          </div>

          <div class="budget-summary panel mt-16">
            <div class="row">
              <span class="label">TOTAL CONSUMPTION</span>
              <span class="val-mono ${totalDraw > availableSolar ? 'text-alert' : 'text-ok'}">${totalDraw.toFixed(1)} kW</span>
            </div>
            <div class="row">
              <span class="label">SURPLUS / BATTERY CHARGE</span>
              <span class="val-mono ${net < 0 ? 'text-alert' : 'text-ok'}">${net >= 0 ? '+' : ''}${net.toFixed(1)} kW</span>
            </div>
          </div>

          <div id="power-feedback" class="game-feedback mt-16">
            ${!isLifeSupportValid ? '<div class="alert alert-error">WARNING: Life support allocation is below 4.0 kW non-negotiable floor!</div>' : ''}
            ${net < 0 ? '<div class="alert alert-error">WARNING: Power grid deficit! Total demand exceeds available solar output.</div>' : ''}
            ${isBalanced ? '<div class="alert alert-success">GRID BALANCED: Life support secured with positive battery buffer.</div>' : ''}
          </div>

          <div class="actions-row mt-16">
            <button class="btn btn-primary" id="btn-lock-grid" ${isBalanced ? '' : 'disabled'}>CONFIRM GRID ALLOCATION</button>
          </div>
        </div>
      `;

      // Event listeners
      container.querySelector('#sl-lifesupport')?.addEventListener('input', (e) => {
        allocations.lifeSupport = parseFloat(e.target.value);
        audio.playClick();
        render();
      });
      container.querySelector('#sl-greenhouse')?.addEventListener('input', (e) => {
        allocations.greenhouse = parseFloat(e.target.value);
        audio.playClick();
        render();
      });
      container.querySelector('#sl-heaters')?.addEventListener('input', (e) => {
        allocations.heaters = parseFloat(e.target.value);
        audio.playClick();
        render();
      });
      container.querySelector('#sl-avionics')?.addEventListener('input', (e) => {
        allocations.avionics = parseFloat(e.target.value);
        audio.playClick();
        render();
      });

      container.querySelector('#btn-lock-grid')?.addEventListener('click', () => {
        audio.playSuccess();
        this.state.powerAllocation = { ...allocations, batteryCharge: net };
        this.state.trainingCompleted.route_power = true;
        this.state.xp += 100;
        const fb = container.querySelector('#power-feedback');
        fb.innerHTML = `
          <div class="alert alert-success">
            <strong>POWER CERTIFIED!</strong> Microgrid configured successfully.<br>
            <small>SCIENCE CODEX: In polar regions, solar power is low-grazing. Shedding non-critical lighting and comfort heaters during deficits guarantees ECLSS oxygen generation.</small>
          </div>
          <button class="btn btn-primary mt-16" id="btn-finish-power">CONTINUE TO NEXT STATION</button>
        `;
        container.querySelector('#btn-finish-power')?.addEventListener('click', () => onComplete(true));
      });
    };

    render();
  }

  // 3. Radiation Safety Room ("Radiation Shelter")
  startRadiationShelter(container, onComplete) {
    let crew = [
      { id: 'ari', name: 'Ari (Commander)', sheltered: false, icon: '👩‍🚀' },
      { id: 'maya', name: 'Maya (Systems)', sheltered: false, icon: '👩‍🔧' },
      { id: 'leo', name: 'Leo (Science)', sheltered: false, icon: '👨‍🔬' },
      { id: 'nova', name: 'Nova (Life Support)', sheltered: false, icon: '👩‍⚕️' }
    ];
    let timeLeft = 25;
    let resolved = false;

    audio.playAlarm();

    const render = () => {
      const allSheltered = crew.every(c => c.sheltered);
      container.innerHTML = `
        <div class="panel training-game-panel">
          <div class="panel-header">
            <h3>RADIATION ROOM // EVACUATION DRILL</h3>
            <span class="badge badge-alert" id="rad-timer">BURST IMPACT: ${timeLeft}s</span>
          </div>
          <p class="game-instruction">NOAA SWPC has detected an X3.9 solar flare! High-energy proton flux (>100 pfu) will breach habitat walls. Order all 4 crew members into the water-jacketed storm core immediately!</p>

          <div class="shelter-drill-arena">
            <div class="unshielded-zone panel">
              <h4>UNSHIELDED HABITAT (DOSE: 2.8 mSv/hr)</h4>
              <div class="crew-list">
                ${crew.filter(c => !c.sheltered).map(c => `
                  <div class="crew-card panel">
                    <span>${c.icon} ${c.name}</span>
                    <button class="btn btn-primary btn-sm btn-evac" data-id="${c.id}">ORDER TO SHELTER</button>
                  </div>
                `).join('')}
                ${crew.filter(c => !c.sheltered).length === 0 ? '<div class="text-muted">Unshielded zone completely clear.</div>' : ''}
              </div>
            </div>

            <div class="shielded-zone panel">
              <h4>SHIELDED STORM CORE (DOSE: 0.12 mSv/hr -95%)</h4>
              <div class="crew-list">
                ${crew.filter(c => c.sheltered).map(c => `
                  <div class="crew-card panel bg-surface-shielded">
                    <span>${c.icon} ${c.name}</span>
                    <span class="badge badge-ok">SECURED</span>
                  </div>
                `).join('')}
                ${crew.filter(c => c.sheltered).length === 0 ? '<div class="text-muted">No personnel inside storm shelter.</div>' : ''}
              </div>
            </div>
          </div>

          <div id="rad-feedback" class="game-feedback mt-16"></div>
        </div>
      `;

      if (allSheltered && !resolved) {
        resolved = true;
        clearInterval(timerInterval);
        audio.playSuccess();
        this.state.trainingCompleted.radiation_shelter = true;
        this.state.xp += 100;
        const fb = container.querySelector('#rad-feedback');
        fb.innerHTML = `
          <div class="alert alert-success">
            <strong>EVACUATION DRILL PERFECT!</strong> All 4 crew members secured behind 30cm water equivalent before proton impact.<br>
            <small>SCIENCE CODEX: High-energy protons are attenuated most effectively by hydrogen-rich materials like water and polyethylene. Lead produces dangerous secondary bremsstrahlung radiation.</small>
          </div>
          <button class="btn btn-primary mt-16" id="btn-finish-rad">CONTINUE TO NEXT STATION</button>
        `;
        container.querySelector('#btn-finish-rad')?.addEventListener('click', () => onComplete(true));
        return;
      }

      container.querySelectorAll('.btn-evac').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (resolved) return;
          audio.playClick();
          const cid = e.target.dataset.id;
          const member = crew.find(c => c.id === cid);
          if (member) member.sheltered = true;
          render();
        });
      });
    };

    const timerInterval = setInterval(() => {
      if (resolved) return;
      timeLeft--;
      const timerEl = container.querySelector('#rad-timer');
      if (timerEl) timerEl.textContent = `BURST IMPACT: ${timeLeft}s`;

      if (timeLeft <= 0) {
        resolved = true;
        clearInterval(timerInterval);
        const fb = container.querySelector('#rad-feedback');
        fb.innerHTML = `
          <div class="alert alert-error">
            <strong>DRILL FAILED:</strong> Solar particle burst impacted before full evacuation. Crew accumulated excess acute radiation dosage.
          </div>
          <button class="btn btn-outline mt-16" id="btn-retry-rad">RETRY EVACUATION DRILL</button>
        `;
        container.querySelector('#btn-retry-rad')?.addEventListener('click', () => this.startRadiationShelter(container, onComplete));
      }
    }, 1000);

    render();
  }

  // 4. Repair Bench ("Repair the Wiring")
  startRepairWiring(container, onComplete) {
    const circuits = [
      { id: 'c1', label: 'SOLAR ARRAY BUS A', color: '#00BFCF', pin: 'PORT 1', target: 'PORT 1', connected: false },
      { id: 'c2', label: 'ECLSS OXYGEN BLOWER', color: '#4ADE80', pin: 'PORT 2', target: 'PORT 2', connected: false },
      { id: 'c3', label: 'COMMS TRANSCEIVER', color: '#FFB800', pin: 'PORT 3', target: 'PORT 3', connected: false },
      { id: 'c4', label: 'FUEL CELL RELAY', color: '#FF4D5E', pin: 'PORT 4', target: 'PORT 4', connected: false }
    ];

    let selectedWire = null;

    const render = () => {
      const allConnected = circuits.every(c => c.connected);
      container.innerHTML = `
        <div class="panel training-game-panel">
          <div class="panel-header">
            <h3>REPAIR BENCH // HARNESS WIRING</h3>
            <span class="badge ${allConnected ? 'badge-ok' : 'badge-alert'}">${circuits.filter(c => c.connected).length} / 4 CIRCUITS CLOSED</span>
          </div>
          <p class="game-instruction">Match disconnected harness cables to their corresponding avionics terminal ports. Click a cable harness on the left, then click its matching labeled terminal port on the right.</p>

          <div class="wiring-bench-grid">
            <div class="wires-column">
              <h4>DISCONNECTED CABLES</h4>
              ${circuits.map(c => `
                <div class="cable-node panel ${c.connected ? 'connected' : ''} ${selectedWire === c.id ? 'selected' : ''}" data-wire="${c.id}" style="border-left: 4px solid ${c.color}">
                  <span class="label">${c.label}</span>
                  <span class="badge">${c.connected ? 'TERMINATED' : 'OPEN'}</span>
                </div>
              `).join('')}
            </div>

            <div class="terminals-column">
              <h4>TERMINAL PORTS</h4>
              ${['PORT 2', 'PORT 4', 'PORT 1', 'PORT 3'].map(port => {
                const conn = circuits.find(c => c.target === port && c.connected);
                return `
                  <div class="port-node panel ${conn ? 'connected' : ''}" data-port="${port}">
                    <span class="port-label">${port}</span>
                    <span class="port-status">${conn ? conn.label : 'VACANT'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div id="wiring-feedback" class="game-feedback mt-16">
            ${allConnected ? `
              <div class="alert alert-success">
                <strong>HARNESS REPAIRED!</strong> All avionics lines impedance-matched and locked.<br>
                <small>SCIENCE CODEX: Spacecraft wire harnesses use MIL-STD-1553B bus architectures with redundant twisted-pair shielding to eliminate electromagnetic interference.</small>
              </div>
              <button class="btn btn-primary mt-16" id="btn-finish-wiring">CONTINUE TO NEXT STATION</button>
            ` : ''}
          </div>
        </div>
      `;

      if (allConnected) {
        audio.playSuccess();
        this.state.trainingCompleted.repair_wiring = true;
        this.state.xp += 100;
        container.querySelector('#btn-finish-wiring')?.addEventListener('click', () => onComplete(true));
        return;
      }

      container.querySelectorAll('.cable-node').forEach(el => {
        el.addEventListener('click', () => {
          const wireId = el.dataset.wire;
          const circ = circuits.find(c => c.id === wireId);
          if (circ && !circ.connected) {
            audio.playClick();
            selectedWire = wireId;
            render();
          }
        });
      });

      container.querySelectorAll('.port-node').forEach(el => {
        el.addEventListener('click', () => {
          if (!selectedWire) return;
          const port = el.dataset.port;
          const circ = circuits.find(c => c.id === selectedWire);
          if (circ && circ.target === port) {
            audio.playSuccess();
            circ.connected = true;
            selectedWire = null;
            render();
          } else {
            audio.playAlarm();
            selectedWire = null;
            render();
          }
        });
      });
    };

    render();
  }

  // 5. Command Room ("Command Triage & Interpersonal Leadership")
  startCommandTriage(container, onComplete) {
    let alerts = [
      { id: 'a1', title: 'Life Support Pressure Drop', urgency: 1, text: 'Cabin decompression in progress (101.3 -> 85 kPa)', correctRank: 1 },
      { id: 'a2', title: 'Solar Flare SPE Alert', urgency: 2, text: 'Active Region AR3664 proton burst in 10 minutes', correctRank: 2 },
      { id: 'a3', title: 'Greenhouse Humidity High', urgency: 3, text: 'Hydroponic condensation loop elevated by 8%', correctRank: 3 },
      { id: 'a4', title: 'Comfort Thermal Drift', urgency: 4, text: 'Crew quarters temperature dropped from 21°C to 19°C', correctRank: 4 }
    ].sort(() => Math.random() - 0.5);

    let stage = 'triage'; // 'triage' | 'dilemma'

    const render = () => {
      if (stage === 'triage') {
        container.innerHTML = `
          <div class="panel training-game-panel">
            <div class="panel-header">
              <h3>COMMAND ROOM // ALERT TRIAGE</h3>
              <span class="badge badge-alert">CRITICAL EVENT MANAGEMENT</span>
            </div>
            <p class="game-instruction">Rank simultaneous incoming alerts from HIGHEST urgency (1) to LOWEST urgency (4). Use UP / DOWN buttons to order the queue.</p>

            <div class="triage-list">
              ${alerts.map((a, idx) => `
                <div class="triage-item panel">
                  <span class="triage-rank">#${idx + 1}</span>
                  <div class="triage-info">
                    <strong>${a.title}</strong>
                    <p>${a.text}</p>
                  </div>
                  <div class="triage-btns">
                    <button class="btn btn-sm btn-outline btn-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                    <button class="btn btn-sm btn-outline btn-down" data-idx="${idx}" ${idx === alerts.length - 1 ? 'disabled' : ''}>▼</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="actions-row mt-16">
              <button class="btn btn-primary" id="btn-submit-triage">CONFIRM TRIAGE ORDER</button>
            </div>
            <div id="triage-feedback" class="game-feedback mt-16"></div>
          </div>
        `;

        container.querySelectorAll('.btn-up').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (idx > 0) {
              audio.playClick();
              const temp = alerts[idx];
              alerts[idx] = alerts[idx - 1];
              alerts[idx - 1] = temp;
              render();
            }
          });
        });

        container.querySelectorAll('.btn-down').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            if (idx < alerts.length - 1) {
              audio.playClick();
              const temp = alerts[idx];
              alerts[idx] = alerts[idx + 1];
              alerts[idx + 1] = temp;
              render();
            }
          });
        });

        container.querySelector('#btn-submit-triage')?.addEventListener('click', () => {
          const isCorrect = alerts.every((a, idx) => a.correctRank === idx + 1);
          if (isCorrect) {
            audio.playSuccess();
            stage = 'dilemma';
            render();
          } else {
            audio.playAlarm();
            const fb = container.querySelector('#triage-feedback');
            fb.innerHTML = `
              <div class="alert alert-error">
                <strong>INCORRECT PRIORITY:</strong> Immediate hypoxia/depressurization threats ALWAYS precede secondary flare warnings, followed by biological greenhouse life support, and lastly cabin thermal comfort.
              </div>
            `;
          }
        });
      } else {
        // Interpersonal crew leadership dilemma between Maya and Leo
        container.innerHTML = `
          <div class="panel training-game-panel">
            <div class="panel-header">
              <h3>COMMAND LEADERSHIP // INTERPERSONAL TRIAGE</h3>
              <span class="badge badge-ok">PHASE 2</span>
            </div>
            <p class="game-instruction">A dispute breaks out between Systems Lead Maya and Science Officer Leo during battery reserve depletion:</p>

            <div class="dialogue-box panel">
              <p><strong>Maya:</strong> "Commander, available power is down to 8.0 kW! We must cut radar scanning and ground spectroscopy immediately to conserve our backup fuel cell!"</p>
              <p><strong>Leo:</strong> "Wait! The DSCOVR satellite downlink and crater rim radar window is closing in 15 minutes! If we shut radar down now, we lose 24 hours of lunar surface data!"</p>
            </div>

            <div class="choices-box mt-16">
              <button class="choice-card panel" data-choice="compromise">
                <strong>OPTION A (Balanced Compromise):</strong>
                <p>Run radar at 50% power for 10 minutes while cutting habitat comfort heaters. Maya keeps battery margin; Leo captures critical radar data.</p>
              </button>
              <button class="choice-card panel mt-8" data-choice="systems">
                <strong>OPTION B (Strict Safety):</strong>
                <p>Order immediate radar shutdown. Systems integrity and battery buffers take non-negotiable precedence over science yield.</p>
              </button>
            </div>

            <div id="dilemma-feedback" class="game-feedback mt-16"></div>
          </div>
        `;

        container.querySelectorAll('.choice-card').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const choice = btn.dataset.choice;
            audio.playSuccess();
            this.state.trainingCompleted.command_triage = true;
            this.state.xp += 150;
            this.state.crew.maya.morale = 98;
            this.state.crew.leo.morale = 95;
            const fb = container.querySelector('#dilemma-feedback');
            fb.innerHTML = `
              <div class="alert alert-success">
                <strong>EXECUTIVE DECISION LOGGED!</strong> ${choice === 'compromise' ? 'Compromise maintained high crew cohesion (+morale) while capturing critical science telemetry.' : 'Prudent safety protocol preserved power bus.'}<br>
                <small>SCIENCE CODEX: Crew Resource Management (CRM) in long-duration isolation requires collaborative negotiation to prevent burnout and operational discord.</small>
              </div>
              <button class="btn btn-primary mt-16" id="btn-finish-command">COMPLETE EARTH TRAINING CERTIFICATION</button>
            `;
            container.querySelector('#btn-finish-command')?.addEventListener('click', () => onComplete(true));
          });
        });
      }
    };

    render();
  }
}
