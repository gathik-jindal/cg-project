export const appState = {
    shadingMode: 'phong', // 'gouraud' or 'phong'
    useBlinn: true,       // true = Blinn-Phong, false = Standard Phong
    camera: { z: -5.0, min: -2.0, max: -20.0 },
    texture: 'none', // Add: 'none', 'wood', 'checker'
    texMapping: 'spherical',

    // Lighting Toggle
    showLights: true,

    modelList: [
        'beethoven.ply',
        'hind.ply',
        'ant.ply',
        'airplane.ply',
        'balance.ply',
        'big_atc.ply',
        'big_dodge.ply',
        'big_porsche.ply',
        'big_spider.ply',
        'canstick.ply',
        'chopper.ply',
        'cow.ply',
        'cube.ply',
        'dart.ply',
        'dodecahedron.ply',
        'egret.ply',
        'ellell.ply',
        'egret.ply',
        'f16.ply',
        'footbones.ply',
        'fracttree.ply',
    ],
    currentModelIndex: 0,

    // Global Light Settings
    lights: [
        // Light 1: White/Warm Light from Top-Right
        { position: [2.0, 2.0, 2.0], color: [1.0, 1.0, 1.0], enabled: true },

        // Light 2: Green/Cool Light from Bottom-Left
        { position: [-2.5, -1.25, 1.25], color: [0.0, 1.0, 0.2], enabled: true }
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

    material: { ka: 0.1, kd: 0.6, ks: 0.8, shininess: 32.0 },

    // Camera/Model transform basics
    rotation: { x: 0, y: 0 },
};