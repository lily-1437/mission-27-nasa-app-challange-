/**
 * @file objectives.js
 * Rolling objectives manager with task pool and location rotation.
 */

export class ObjectiveManager {
  constructor(state, audio) {
    this.state = state;
    this.audio = audio;

    this.pool = [
      { id: 'power_check', label: 'Verify Outpost Solar Generation & Grid Margins', location: 'Power Station', targetZone: 'power', xp: 100 },
      { id: 'airlock_cycle', label: 'Complete Airlock Suit Verification for EVA', location: 'Airlock', targetZone: 'airlock', xp: 120 },
      { id: 'greenhouse_inspect', label: 'Inspect Hydroponic Trays & Moisture Loop', location: 'Greenhouse', targetZone: 'greenhouse', xp: 100 },
      { id: 'rover_survey', label: 'Mount Lunar Rover in Bay & Survey Rim', location: 'Rover Bay', targetZone: 'rover_bay', xp: 150 },
      { id: 'rock_samples', label: 'Collect 3 Geological Rock Specimens', location: 'Surface Perimeter', targetZone: 'surface', xp: 150, progress: 0, total: 3 },
      { id: 'earth_photo', label: 'Photograph Earthrise via Field Viewfinder', location: 'Crater Overlook', targetZone: 'surface', xp: 120 },
      { id: 'science_dscovr', label: 'Calibrate DSCOVR EPIC Satellite Earth View', location: 'Science Lab', targetZone: 'science', xp: 150 },
      { id: 'talk_crew', label: 'Consult with Commander Ari in Habitat', location: 'Habitat', targetZone: 'habitat', xp: 80 }
    ];

    this.initObjectives();
  }

  initObjectives() {
    if (!this.state.objectives || this.state.objectives.length === 0) {
      this.state.objectives = this.pool.slice(0, 4).map(o => ({ ...o, completed: false }));
    }
  }

  complete(id) {
    const obj = this.state.objectives.find(o => o.id === id);
    if (obj && !obj.completed) {
      obj.completed = true;
      this.state.xp += (obj.xp || 100);
      this.audio.playSuccess();
      this.state.addEventLog('OBJECTIVE COMPLETE', obj.label);
      this.state.checkRank();

      // Check badges
      if (id === 'airlock_cycle') this.state.unlockBadge('eva_ready');
      if (id === 'rock_samples') this.state.unlockBadge('field_geologist');
      if (id === 'science_dscovr') this.state.unlockBadge('earth_analyst');

      // Rotate in a new objective after 2.5s
      setTimeout(() => {
        this.rotateNext();
      }, 2500);

      this.state.notifyTelemetry();
      return true;
    }
    return false;
  }

  rotateNext() {
    const activeIds = new Set(this.state.objectives.map(o => o.id));
    const nextCandidate = this.pool.find(o => !activeIds.has(o.id));
    if (nextCandidate) {
      this.state.objectives.push({ ...nextCandidate, completed: false });
      this.state.notifyTelemetry();
    }
  }
}
