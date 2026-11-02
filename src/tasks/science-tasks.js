/**
 * @file tasks/science-tasks.js
 * 5 Real-Data Science Visual Puzzles (2x2 choice grid or interactive scanner):
 * 1. Earth observation (EPIC)
 * 2. Solar storm watch
 * 3. Crater survey (permanently shadowed coldest spot on Shackleton height map)
 * 4. Sample ID (match scanned rock to anorthosite, basalt or breccia using color & density)
 * 5. Earthrise photo (viewfinder alignment from crater rim)
 */

export class ScienceTaskManager {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;
  }

  // 1. Earth Observation (EPIC)
  renderEpicObservation(container, onComplete) {
    container.innerHTML = `
      <div class="science-task-modal panel">
        <div class="panel-header">
          <div>
            <h3>DSCOVR SATELLITE EARTH OBSERVATION (NASA EPIC)</h3>
            <span class="mono text-muted">NASA DATA // 2024-05-10 REAL TELEMETRY</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-task">CLOSE [ESC]</button>
        </div>
        <p class="mt-8">Mission Control asks: "A major flood occurred in Bangladesh (~90°E longitude). Select the EPIC frame where the Indian Ocean / Bay of Bengal region directly faces the camera."</p>

        <div class="science-grid-2x2 mt-16">
          <div class="science-card panel" data-id="frame_00">
            <img src="assets/epic/epic_1b_20240510002712.jpg" class="science-card-img" alt="EPIC capture 00:22 UTC">
            <div class="mono science-card-meta">00:22 UTC | LON 164.4°E</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="frame_04">
            <img src="assets/epic/epic_1b_20240510040317.jpg" class="science-card-img" alt="EPIC capture 03:58 UTC">
            <div class="mono science-card-meta">03:58 UTC | LON 110.3°E</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="frame_05" data-correct="true">
            <img src="assets/epic/epic_1b_20240510055119.jpg" class="science-card-img" alt="EPIC capture 05:46 UTC">
            <div class="mono science-card-meta">05:46 UTC | LON 83.3°E</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="frame_07">
            <img src="assets/epic/epic_1b_20240510073921.jpg" class="science-card-img" alt="EPIC capture 07:34 UTC">
            <div class="mono science-card-meta">07:34 UTC | LON 56.3°E</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>
        </div>

        <div id="science-task-feedback" class="mt-16"></div>
      </div>
    `;

    this.bind2x2Handlers(container, onComplete, 'EPIC MATCH CONFIRMED', 'Frame at Lon 83.3°E aligns directly with the target Bay of Bengal coordinates.');
  }

  // 2. Solar Storm Watch (NOAA SWPC Record)
  renderSolarStormWatch(container, onComplete) {
    container.innerHTML = `
      <div class="science-task-modal panel">
        <div class="panel-header">
          <div>
            <h3>NOAA SPACE WEATHER // SOLAR PARTICLE BURST TIMING</h3>
            <span class="mono text-muted">NOAA DATA // MAY 2024 ACTIVE REGION 3664</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-task">CLOSE [ESC]</button>
        </div>
        <p class="mt-8">Mission Control asks: "Read the SWPC GOES-16 proton flux chart. At what threshold hour must the crew order shelter before acute proton flux exceeds the 10 pfu (S1) danger threshold?"</p>

        <div class="science-grid-2x2 mt-16">
          <div class="science-card panel" data-id="opt_1">
            <div class="chart-preview mono text-cyan">06:27 UTC // FLARE BEGIN</div>
            <div class="mono science-card-meta">X3.9 X-ray flash detected. Protons have not yet arrived at 1 AU.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="opt_2" data-correct="true">
            <div class="chart-preview mono text-alert">08:15 UTC // PROTON RISE >10 pfu</div>
            <div class="mono science-card-meta">S1 threshold breached. High-energy (>10 MeV) protons impacting magnetosphere.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="opt_3">
            <div class="chart-preview mono">17:45 UTC // PEAK 206 pfu</div>
            <div class="mono science-card-meta">S2 peak already reached. Lethal cumulative dose if unshielded.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="opt_4">
            <div class="chart-preview mono">22:00 UTC // STORM DECAY</div>
            <div class="mono science-card-meta">Proton flux receding towards background GCR baseline.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>
        </div>

        <div id="science-task-feedback" class="mt-16"></div>
      </div>
    `;

    this.bind2x2Handlers(container, onComplete, 'STORM WATCH PASSED', '08:15 UTC is the critical evacuation window before proton flux exceeds 10 pfu.');
  }

  // 3. Crater Survey (Coldest permanently shadowed spot on Shackleton LOLA DEM)
  renderCraterSurvey(container, onComplete) {
    container.innerHTML = `
      <div class="science-task-modal panel">
        <div class="panel-header">
          <div>
            <h3>LOLA DEM TOPOGRAPHY // PSR COLD TRAP SURVEY</h3>
            <span class="mono text-muted">NASA LRO LOLA DEM // SHACKLETON RIM</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-task">CLOSE [ESC]</button>
        </div>
        <p class="mt-8">Mission Control asks: "Which geological feature represents the coldest Permanently Shadowed Region (PSR, 40 K / -233°C) harboring volatile water ice deposits?"</p>

        <div class="science-grid-2x2 mt-16">
          <div class="science-card panel" data-id="psr_rim">
            <div class="chart-preview mono">SHACKLETON HIGH RIDGE (+692m)</div>
            <div class="mono science-card-meta">Peak of near-permanent sunlight. Temperatures reach +120°C.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="psr_floor" data-correct="true">
            <div class="chart-preview mono text-cyan">CRATER INTERIOR FLOOR (4.2 km depth)</div>
            <div class="mono science-card-meta">Total permanent solar occultation. Cold trap preserving ancient water ice.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="psr_slopes">
            <div class="chart-preview mono">NORTH WALL TALUS SLOPE (31° incline)</div>
            <div class="mono science-card-meta">Steep regolith slump with intermittent grazing light scatter.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="psr_mound">
            <div class="chart-preview mono">CENTRAL CRATER PEAK BULGE</div>
            <div class="mono science-card-meta">Reflected thermal radiation from illuminated southern lip.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>
        </div>

        <div id="science-task-feedback" class="mt-16"></div>
      </div>
    `;

    this.bind2x2Handlers(container, onComplete, 'PSR ICE LOCATED', 'The 4.2 km deep Shackleton crater floor acts as a cryogenic trap at 40 Kelvin.');
  }

  // 4. Sample ID (Anorthosite, Basalt, Breccia)
  renderSampleIdentification(container, rockId, rockName, onComplete) {
    let mineralInfo = '';
    let correctId = 'anorthosite';
    if (rockId.includes('basalt')) {
      correctId = 'basalt';
      mineralInfo = 'Dark pyroxene-rich matrix with high iron & titanium (ilmenite) content. Density 3.2 g/cm³.';
    } else if (rockId.includes('breccia')) {
      correctId = 'breccia';
      mineralInfo = 'Angular fragments welded into glassy shock-melt matrix. Density 2.8 g/cm³.';
    } else {
      correctId = 'anorthosite';
      mineralInfo = 'Light-colored coarse plagioclase feldspar (>90%). Density 2.7 g/cm³. Ancient magma ocean crust.';
    }

    container.innerHTML = `
      <div class="science-task-modal panel">
        <div class="panel-header">
          <div>
            <h3>FIELD SPECTROMETER // GEOLOGICAL SPECIMEN ID</h3>
            <span class="mono text-muted">LUNAR SAMPLE RETURN PROTOCOL</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-task">CLOSE [ESC]</button>
        </div>
        <p class="mt-8">Scan readings: <em>${mineralInfo}</em></p>
        <p>Identify the rock suite classification for lab cataloging:</p>

        <div class="science-grid-2x2 mt-16">
          <div class="science-card panel" data-id="anorthosite" ${correctId === 'anorthosite' ? 'data-correct="true"' : ''}>
            <div class="chart-preview mono text-cyan">HIGHLAND ANORTHOSITE</div>
            <div class="mono science-card-meta">Calcium-rich plagioclase from primordial 4.4 Ga lunar magma ocean.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="basalt" ${correctId === 'basalt' ? 'data-correct="true"' : ''}>
            <div class="chart-preview mono text-cyan">MARE VOLCANIC BASALT</div>
            <div class="mono science-card-meta">Mantle-derived volcanic flood rock rich in iron, magnesium & ilmenite.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="breccia" ${correctId === 'breccia' ? 'data-correct="true"' : ''}>
            <div class="chart-preview mono text-cyan">IMPACT MELT BRECCIA</div>
            <div class="mono science-card-meta">Composite clastic rock fused under extreme meteorite impact shock.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>

          <div class="science-card panel" data-id="pyroclastic">
            <div class="chart-preview mono">PYROCLASTIC GLASS BEADS</div>
            <div class="mono science-card-meta">Volcanic fire-fountain quench droplets.</div>
            <button class="btn btn-outline btn-sm btn-block mt-8 btn-select-option">SELECT FRAME</button>
          </div>
        </div>

        <div id="science-task-feedback" class="mt-16"></div>
      </div>
    `;

    this.bind2x2Handlers(container, onComplete, 'SAMPLE CATALOGED', `Geological classification of ${rockName} verified successfully.`);
  }

  // 5. Earthrise Viewfinder Camera
  renderEarthriseCamera(container, onComplete) {
    container.innerHTML = `
      <div class="science-task-modal panel">
        <div class="panel-header">
          <div>
            <h3>FIELD CAMERA // EARTHRISE VIEWFINDER</h3>
            <span class="mono text-muted">DSCOVR ALIGNED OPTICAL POSITIONING</span>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-close-task">CLOSE [ESC]</button>
        </div>
        <p class="mt-8">Align the reticle with Earth in the high lunar sky and capture the exposure.</p>

        <div class="viewfinder-frame mt-16">
          <div class="viewfinder-crosshairs"></div>
          <img src="assets/epic/epic_1b_20240510055119.jpg" class="viewfinder-earth" alt="Earth in viewfinder">
          <div class="viewfinder-readout mono">EXPOSURE: 1/500s | ISO 100 | FOV 42° | TARGET: EARTH</div>
        </div>

        <div class="modal-actions mt-16">
          <button class="btn btn-primary btn-block" id="btn-snap-viewfinder">TRIGGER SHUTTER EXPOSURE [SPACE]</button>
        </div>
        <div id="science-task-feedback" class="mt-16"></div>
      </div>
    `;

    container.querySelector('#btn-close-task')?.addEventListener('click', () => onComplete(false));
    container.querySelector('#btn-snap-viewfinder')?.addEventListener('click', () => {
      this.audio.playSuccess();
      this.state.xp += 150;
      this.state.addEventLog('PHOTOGRAPH CAPTURED', 'High-resolution Earthrise recorded at Shackleton Rim.', 'NASA DATA');
      this.state.unlockBadge('earth_analyst');
      const fb = container.querySelector('#science-task-feedback');
      fb.innerHTML = `
        <div class="alert alert-success">
          <strong>EXPOSURE SAVED!</strong> High-resolution Earthrise photo archived to mission dossier (+150 XP).
        </div>
        <button class="btn btn-primary mt-16 btn-block" id="btn-done-cam">DONE</button>
      `;
      container.querySelector('#btn-done-cam')?.addEventListener('click', () => onComplete(true));
    });
  }

  bind2x2Handlers(container, onComplete, successTitle, successMsg) {
    container.querySelector('#btn-close-task')?.addEventListener('click', () => onComplete(false));

    container.querySelectorAll('.btn-select-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.science-card');
        const isCorrect = card.dataset.correct === 'true';
        const fb = container.querySelector('#science-task-feedback');

        if (isCorrect) {
          this.audio.playSuccess();
          this.state.xp += 150;
          this.state.addEventLog('SCIENCE PUZZLE PASSED', successTitle, 'NASA DATA');
          fb.innerHTML = `
            <div class="alert alert-success">
              <strong>${successTitle}</strong> ${successMsg} (+150 XP)
            </div>
            <button class="btn btn-primary mt-16 btn-block" id="btn-finish-science">CONTINUE</button>
          `;
          container.querySelector('#btn-finish-science')?.addEventListener('click', () => onComplete(true));
        } else {
          this.audio.playAlarm();
          fb.innerHTML = `
            <div class="alert alert-error">
              <strong>INCORRECT:</strong> The selected telemetry does not match physical mission criteria. Re-read the observation parameters.
            </div>
          `;
        }
      });
    });
  }
}
