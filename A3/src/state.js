export const appState = {
    // ... existing properties ...
    shadingMode: 'gouraud',
    showLights: true,
    lights: [
        { position: [10.0, 10.0, 10.0], color: [1.0, 1.0, 1.0], enabled: true },
        { position: [-10.0, 5.0, 5.0], color: [0.8, 0.8, 1.0], enabled: true }
    ],
    material: {
        ka: 0.1, kd: 0.6, ks: 0.8, shininess: 32.0
    },
    rotation: { x: 0, y: 0 },

    // NEW: Camera Zoom State
    camera: {
        z: -5.0,     // Current distance
        min: -2.0,   // Closest allowed
        max: -20.0   // Furthest allowed
    }
};