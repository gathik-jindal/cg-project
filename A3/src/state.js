export const appState = {
    shadingMode: 'phong', // Default to best looking
    camera: { z: -5.0, min: -2.0, max: -20.0 },

    // Lighting Toggle
    showLights: true,

    // Global Light Settings
    lights: [
        // Light 1: White/Warm Light from Top-Right
        { position: [10.0, 10.0, 10.0], color: [1.0, 1.0, 1.0], enabled: true },

        // Light 2: Blue/Cool Light from Bottom-Left
        { position: [-10.0, -5.0, 5.0], color: [0.2, 0.2, 1.0], enabled: true }
    ],

    // List of Objects in the scene
    objects: [
        {
            id: 'plane_1',
            type: 'airplane', // Which mesh to use
            position: [-1.5, 0.0, 0.0], // Left side
            rotation: { x: 0, y: 0, z: 0 },
            scale: [1.0, 1.0, 1.0],
            // Material Props
            color: [0.8, 0.2, 0.2], // Red
            material: { ka: 0.1, kd: 0.6, ks: 0.8, shininess: 32.0 }
        },
        {
            id: 'plane_2',
            type: 'airplane',
            position: [1.5, 0.0, 0.0], // Right side
            rotation: { x: 0, y: 180, z: 0 }, // Facing opposite
            scale: [1.0, 1.0, 1.0],
            // Material Props
            color: [0.2, 0.2, 0.8], // Blue
            material: { ka: 0.1, kd: 0.6, ks: 0.8, shininess: 32.0 }
        }
    ],

    // Camera/Model transform basics
    rotation: { x: 0, y: 0 },
};