export const appState = {
    // Shading Mode: 'gouraud' or 'phong' (Task 1)
    shadingMode: 'gouraud',

    // Lighting Toggle (Task 2)
    showLights: true,

    // Light Sources Configuration (Task 2: 2 or more lights)
    lights: [
        { position: [10.0, 10.0, 10.0], color: [1.0, 1.0, 1.0], enabled: true }, // Light 1
        { position: [-10.0, 5.0, 5.0], color: [0.8, 0.8, 1.0], enabled: true }   // Light 2
    ],

    // Material Properties (Optical properties)
    material: {
        ka: 0.1,   // Ambient
        kd: 0.6,   // Diffuse
        ks: 0.8,   // Specular
        shininess: 32.0
    },

    // Camera/Model transform basics
    rotation: { x: 0, y: 0 }
};