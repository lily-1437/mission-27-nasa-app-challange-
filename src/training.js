/**
 * @file training.js
 * Earth Training Center walkable hall / station simulator.
 * 6 Stations: Life Support, Power, Radiation, Greenhouse, EVA Simulator, Command Room.
 */

import { audio } from './audio.js';

export class TrainingFacility {
  constructor(state, minigameHub) {
    this.state = state;
    this.minigameHub = minigameHub;
  }

  render(container, onComplete) {
    const cert = this.state.trainingCompleted;
    const completedCount = Object.values(cert).filter(Boolean).length;

    container.innerHTML = `
      <div class="screen screen-training">
        <header class="training-header panel">
          <div>
            <h2>EARTH TRAINING CENTER // SIMULATION LABS</h2>
            <span class="mono text-muted">JOHNSON SPACE CENTER LUNAR ANALOG FACILITY</span>
          </div>
          <div class="header-right">
            <span class="badge ${completedCount >= 5 ? 'badge-ok' : 'badge-accent'}">CERTIFIED: ${completedCount} / 6 STATIONS</span>
            <button class="btn btn-outline btn-sm" id="btn-skip-training">SKIP TRAINING [ESC]</button>
          </div>
        </header>

        <div class="training-hub-layout mt-16">
          <div class="stations-grid" id="training-stations-grid">
            <div class="station-card panel" data-station="find_leak">
              <div class="station-icon">💨</div>
              <div class="station-meta">
                <h4>1. LIFE SUPPORT LAB</h4>
                <p class="mono">"Find the Leak" - Analog pressure gauge cluster & valve seal.</p>
              </div>
              <span class="badge ${cert.find_leak ? 'badge-ok' : ''}">${cert.find_leak ? 'CERTIFIED' : 'ENTER'}</span>
            </div>

            <div class="station-card panel" data-station="route_power">
              <div class="station-icon">⚡</div>
              <div class="station-meta">
                <h4>2. POWER GRID LAB</h4>
                <p class="mono">"Route the Power" - Solar budget allocation (≥4.0 kW Life Support).</p>
              </div>
              <span class="badge ${cert.route_power ? 'badge-ok' : ''}">${cert.route_power ? 'CERTIFIED' : 'ENTER'}</span>
            </div>

            <div class="station-card panel" data-station="radiation_shelter">
              <div class="station-icon">☢️</div>
              <div class="station-meta">
                <h4>3. RADIATION SAFETY ROOM</h4>
                <p class="mono">"Radiation Shelter" - Rapid storm core evacuation drill.</p>
              </div>
              <span class="badge ${cert.radiation_shelter ? 'badge-ok' : ''}">${cert.radiation_shelter ? 'CERTIFIED' : 'ENTER'}</span>
            </div>

            <div class="station-card panel" data-station="repair_wiring">
              <div class="station-icon">🔌</div>
              <div class="station-meta">
                <h4>4. REPAIR BENCH</h4>
                <p class="mono">"Repair the Wiring" - Avionics harness impedance port matching.</p>
              </div>
              <span class="badge ${cert.repair_wiring ? 'badge-ok' : ''}">${cert.repair_wiring ? 'CERTIFIED' : 'ENTER'}</span>
            </div>

            <div class="station-card panel" data-station="command_triage">
              <div class="station-icon">⚖️</div>
              <div class="station-meta">
                <h4>5. COMMAND ROOM</h4>
                <p class="mono">"Command Triage" - Urgency prioritization & crew CRM dilemma.</p>
              </div>
              <span class="badge ${cert.command_triage ? 'badge-ok' : ''}">${cert.command_triage ? 'CERTIFIED' : 'ENTER'}</span>
            </div>

            <div class="station-card panel" data-station="eva_sim">
              <div class="station-icon">👨‍🚀</div>
              <div class="station-meta">
                <h4>6. EVA SIMULATOR</h4>
                <p class="mono">"Suit Verification" - Pressure, sublimator loop, and battery checks.</p>
              </div>
              <span class="badge ${cert.eva_sim ? 'badge-ok' : ''}">${cert.eva_sim ? 'CERTIFIED' : 'ENTER'}</span>
            </div>
          </div>

          <div class="minigame-mount-point" id="training-mount-area">
            <div class="panel placeholder-card">
              <h3>SELECT A TRAINING STATION</h3>
              <p>Master habitat systems, power distribution, and survival protocols before launch.</p>
              <div class="mt-16">
                <button class="btn btn-primary" id="btn-launch-lunar-now">PROCEED DIRECTLY TO MOON</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-skip-training')?.addEventListener('click', () => {
      audio.playClick();
      this.state.go('HOME');
    });

    container.querySelector('#btn-launch-lunar-now')?.addEventListener('click', () => {
      audio.playSuccess();
      this.state.missionHoursElapsed = 0;
      this.state.missionTimerActive = true;
      this.state.go('MOON');
    });

    const mount = container.querySelector('#training-mount-area');
    container.querySelectorAll('.station-card').forEach(card => {
      card.addEventListener('click', () => {
        audio.playClick();
        const station = card.dataset.station;
        if (station === 'find_leak') {
          this.minigameHub.startFindLeak(mount, () => this.render(container, onComplete));
        } else if (station === 'route_power') {
          this.minigameHub.startRoutePower(mount, () => this.render(container, onComplete));
        } else if (station === 'radiation_shelter') {
          this.minigameHub.startRadiationShelter(mount, () => this.render(container, onComplete));
        } else if (station === 'repair_wiring') {
          this.minigameHub.startRepairWiring(mount, () => this.render(container, onComplete));
        } else if (station === 'command_triage') {
          this.minigameHub.startCommandTriage(mount, () => this.render(container, onComplete));
        } else {
          // EVA Sim
          mount.innerHTML = `
            <div class="panel">
              <h3>EVA SUIT SIMULATOR</h3>
              <p>Pressure 29.6 kPa nominal. Sublimator ice cake nominal. Battery 100%.</p>
              <button class="btn btn-primary mt-16" id="btn-cert-eva">PASS CERTIFICATION</button>
            </div>
          `;
          mount.querySelector('#btn-cert-eva')?.addEventListener('click', () => {
            this.state.trainingCompleted.eva_sim = true;
            this.state.xp += 100;
            this.state.unlockBadge('eva_ready');
            this.render(container, onComplete);
          });
        }
      });
    });
  }
}
