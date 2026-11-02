/**
 * @file crew.js
 * Scripted crew routines, interaction dialogues, and interpersonal crisis arbitration.
 * Crew:
 * - Ari (Commander): suit stripe Gold (0xD4AF37), station: Habitat/Command
 * - Maya (Systems Engineer): suit stripe Orange (0xFF7A00), station: Power Station
 * - Leo (Science Specialist): suit stripe Cyan (0x00D8FF), station: Science Lab
 * - Nova (Life Support): suit stripe Emerald Green (0x00FF88), station: Greenhouse/ECLSS
 */

import * as THREE from '../lib/three.module.js';

export class CrewManager {
  constructor(world, state, audio) {
    this.world = world;
    this.state = state;
    this.audio = audio;

    this.crewMembers = {
      ari: {
        id: 'ari',
        name: 'Ari',
        fullName: 'Ari Vance',
        role: 'Commander',
        color: 0xD4AF37,
        colorHex: '#D4AF37',
        pos: new THREE.Vector3(0, 0, -2),
        rot: 0,
        assignedModule: 'Habitat / Command',
        speech: 'Status report looks solid, Commander. Maintain vigilance on polar sun angles.',
        currentTask: null,
        mesh: null
      },
      maya: {
        id: 'maya',
        name: 'Maya',
        fullName: 'Maya Lin',
        role: 'Systems Engineer',
        color: 0xFF7A00,
        colorHex: '#FF7A00',
        pos: new THREE.Vector3(-13, 0, 1),
        rot: Math.PI * 0.4,
        assignedModule: 'Power Station',
        speech: 'Photovoltaic arrays are tracking nominal at 89.9°S. Never let life support drop below 4 kW.',
        currentTask: null,
        mesh: null
      },
      leo: {
        id: 'leo',
        name: 'Leo',
        fullName: 'Leo Thorne',
        role: 'Science Specialist',
        color: 0x00D8FF,
        colorHex: '#00D8FF',
        pos: new THREE.Vector3(7, 0, -7),
        rot: -Math.PI * 0.3,
        assignedModule: 'Science Lab',
        speech: 'The LOLA DEM data indicates ancient anorthosites right along the perimeter ridge. Collect samples when you EVA.',
        currentTask: null,
        mesh: null
      },
      nova: {
        id: 'nova',
        name: 'Nova',
        fullName: 'Nova Chen',
        role: 'Life Support Specialist',
        color: 0x00FF88,
        colorHex: '#00FF88',
        pos: new THREE.Vector3(13, 0, 1),
        rot: -Math.PI * 0.5,
        assignedModule: 'Greenhouse',
        speech: 'The microgreens transpiration rate is steady. Water reclamation loop is operating at 98.4%.',
        currentTask: null,
        mesh: null
      }
    };
  }

  init(astronautBaseModel) {
    // If GLTF model is provided, clone for each crew member with suit-stripe color
    for (const [key, member] of Object.entries(this.crewMembers)) {
      let crewGroup;
      if (astronautBaseModel) {
        crewGroup = astronautBaseModel.clone(true);
        // Apply suit stripe color to accessories
        crewGroup.traverse(child => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            if (child.name.toLowerCase().includes('stripe') || child.name.toLowerCase().includes('chest') || child.name.toLowerCase().includes('badge')) {
              child.material.color.setHex(member.color);
            }
          }
        });
      } else {
        // Fallback procedural visual marker
        crewGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.9;
        crewGroup.add(bodyMesh);

        // Colored stripe
        const stripeGeo = new THREE.BoxGeometry(0.65, 0.25, 0.35);
        const stripeMat = new THREE.MeshStandardMaterial({ color: member.color, roughness: 0.3 });
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(0, 1.2, 0);
        crewGroup.add(stripeMesh);
      }

      // Height snap to terrain
      const y = this.world.getElevationAt(member.pos.x, member.pos.z);
      member.pos.y = y;
      crewGroup.position.copy(member.pos);
      crewGroup.rotation.y = member.rot;

      this.world.scene.add(crewGroup);
      member.mesh = crewGroup;

      // Register interactable
      this.world.interactables.push({
        id: `crew_${member.id}`,
        label: `${member.fullName} (${member.role})`,
        range: 3.5,
        pos: member.pos,
        action: 'TALK'
      });
    }
  }

  update(dt, playerPos) {
    // Turn towards player when nearby
    for (const member of Object.values(this.crewMembers)) {
      if (member.mesh) {
        const dist = playerPos.distanceTo(member.pos);
        if (dist < 6.0) {
          const angle = Math.atan2(playerPos.x - member.pos.x, playerPos.z - member.pos.z);
          member.mesh.rotation.y = THREE.MathUtils.lerp(member.mesh.rotation.y, angle, dt * 3.0);
        }
      }
    }
  }

  talkTo(crewId) {
    const member = this.crewMembers[crewId.replace('crew_', '')];
    if (!member) return;

    this.audio.playClick();
    window.dispatchEvent(new CustomEvent('mission27:crew-dialogue', {
      detail: {
        speaker: `${member.fullName} (${member.role})`,
        role: member.role,
        colorHex: member.colorHex,
        text: member.speech
      }
    }));
  }
}
