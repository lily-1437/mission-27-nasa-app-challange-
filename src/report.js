/**
 * @file report.js
 * Mission Complete debrief report with command style, badge showcase,
 * scores, and a clickable "Replay the Moment" timeline.
 */

import { audio } from './audio.js';

export class MissionReport {
  constructor(state) {
    this.state = state;
  }

  render(container, onReturnHome) {
    const badges = this.state.badges || {};
    const badgeList = [
      { id: 'eva_ready', label: 'EVA Ready', desc: 'Completed surface egress protocols', icon: '👨‍🚀' },
      { id: 'life_support_pro', label: 'Life Support Pro', desc: 'Resolved cabin decompression', icon: '💨' },
      { id: 'radiation_ready', label: 'Radiation Ready', desc: 'Safeguarded crew during SPE burst', icon: '☢️' },
      { id: 'greenhouse_hero', label: 'Greenhouse Hero', desc: 'Revived hydroponic crop cycle', icon: '🌿' },
      { id: 'field_geologist', label: 'Field Geologist', desc: 'Sampled ancient lunar crustal rock', icon: '🪨' },
      { id: 'earth_analyst', label: 'Earth Analyst', desc: 'Calibrated DSCOVR EPIC satellite data', icon: '🌍' }
    ];

    container.innerHTML = `
      <div class="screen screen-report">
        <div class="panel report-window">
          <div class="panel-header">
            <div>
              <h2>MISSION27 // FINAL EVALUATION DEBRIEF</h2>
              <span class="mono text-ok">27-HOUR SIMULATION CONCLUDED AT SHACKLETON RIM</span>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-return-home">LEAVE TO TITLE SCREEN</button>
          </div>

          <div class="report-stats-grid mt-16">
            <div class="stat-card panel">
              <span class="label">FINAL RANK</span>
              <span class="val-mono text-cyan">${this.state.rank}</span>
            </div>
            <div class="stat-card panel">
              <span class="label">TOTAL XP GAINED</span>
              <span class="val-mono">${this.state.xp} XP</span>
            </div>
            <div class="stat-card panel">
              <span class="label">CREW SURVIVAL STATUS</span>
              <span class="val-mono text-ok">100% NOMINAL</span>
            </div>
            <div class="stat-card panel">
              <span class="label">GEOLOGICAL SAMPLES</span>
              <span class="val-mono">${(this.state.collectedSamples || []).length} SPECIMENS</span>
            </div>
          </div>

          <!-- Badges Section -->
          <div class="panel mt-16">
            <h4>MISSION BADGES EARNED</h4>
            <div class="badges-row mt-8">
              ${badgeList.map(b => {
                const unlocked = !!badges[b.id];
                return `
                  <div class="badge-item panel ${unlocked ? 'badge-unlocked' : 'badge-locked'}">
                    <span class="badge-icon">${b.icon}</span>
                    <span class="badge-name mono">${b.label}</span>
                    <small class="text-muted">${unlocked ? 'UNLOCKED' : 'LOCKED'}</small>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Clickable Replay the Moment Timeline -->
          <div class="panel mt-16">
            <h4>REPLAY THE MOMENT // TIMELINE AUDIT</h4>
            <p class="text-muted">Click any recorded mission decision or anomaly below to inspect cause, action taken, and telemetry consequences:</p>
            <div class="timeline-log-list mt-8">
              ${(this.state.eventLog || []).map((evt, idx) => `
                <div class="timeline-entry panel" data-idx="${idx}">
                  <span class="mono text-cyan">${evt.time}</span>
                  <strong>${evt.event}</strong>
                  <span class="text-muted">${evt.details}</span>
                  <span class="badge mono">${evt.source || 'SIMULATION'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-return-home')?.addEventListener('click', () => {
      audio.playClick();
      onReturnHome();
    });
  }
}
