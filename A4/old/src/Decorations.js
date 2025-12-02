import * as THREE from 'three';
import { SGNode } from './SceneGraph.js';
import { loadPLY } from './PLYLoader.js';
import { vsPhong, fsPhong } from './shaders.js';

// --- CONFIGURATION ---
// Define your hardcoded objects here.
// You can add as many as you want.
const decorationConfig = [];
// const decorationConfig = [
//     {
//         id: 'airplane_1',
//         url: '../assets/airplane.ply',
//         // Lowered Y to -83.5 (Floor). Increased scale to 10.
//         position: [20, -43.5, 20],
//         rotation: [-Math.PI / 2, 0, 0],
//         scale: 40.0,
//         color: 0x888888
//     },
//     {
//         id: 'airplane_1',
//         url: '../assets/airplane.ply',
//         // Lowered Y to -83.5 (Floor). Increased scale to 10.
//         position: [-30, -43.5, 60],
//         rotation: [-Math.PI / 4, -Math.PI, 0],
//         scale: 40.0,
//         color: 0x888008
//     },
//     {
//         id: 'airplane_1',
//         url: '../assets/airplane.ply',
//         // Lowered Y to -83.5 (Floor). Increased scale to 10.
//         position: [-70, -43.5, 30],
//         rotation: [Math.PI / 4, Math.PI / 2, Math.PI / 4],
//         scale: 40.0,
//         color: 0x800088
//     },
//     {
//         id: 'ant_1',
//         url: '../assets/ant.ply',
//         // Lowered Y to -83.5. Increased scale to 5.
//         position: [-40, -83.5, -10],
//         rotation: [0, 0, 0],
//         scale: 50.0,
//         color: 0x228b22
//     },
//     {
//         id: 'apple_1',
//         url: '../assets/apple.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [-10, -83.5, 50],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 5.0,
//         color: 0xffd700
//     },
//     {
//         id: 'apple_2',
//         url: '../assets/apple.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [-20, -83.5, 50],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 5.0,
//         color: 0xffd700
//     },
//     {
//         id: 'apple_3',
//         url: '../assets/apple.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [-20, -83.5, 40],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 5.0,
//         color: 0xffd700
//     },
//     {
//         id: 'apple_4',
//         url: '../assets/apple.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [-15, -83.5, 45],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 5.0,
//         color: 0xffd700
//     },
//     {
//         id: 'apple_5',
//         url: '../assets/apple.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [-10, -83.5, 45],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 5.0,
//         color: 0xffd700
//     },
//     {
//         id: 'trash_1',
//         url: '../assets/trashcan.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [10, -78.5, 40],
//         rotation: [-Math.PI / 2, 0, 0],
//         scale: 5.0,
//         color: 0xfff7ff
//     },
//     {
//         id: 'beethoven_1',
//         url: '../assets/beethoven.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [100, -78.5, 40],
//         rotation: [0, -Math.PI / 2, 0],
//         scale: 50.0,
//         color: 0x1ff7ff
//     },
//     {
//         id: 'beethoven_2',
//         url: '../assets/beethoven.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [10, -78.5, -40],
//         rotation: [0, 0, 0],
//         scale: 50.0,
//         color: 0x4f00ff
//     },
//     {
//         id: 'hind_1',
//         url: '../assets/hind.ply',
//         // Lowered Y to -83.5. Kept scale (or increased slightly).
//         position: [10, -43.5, 40],
//         rotation: [-Math.PI / 4, 0, Math.PI],
//         scale: 50.0,
//         color: 0x0ff00f
//     },

// ];


/**
 * Helper to create the same Phong material used in index.js
 */
function createPhongMaterial(colorHex) {
    return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: vsPhong,
        fragmentShader: fsPhong,
        side: THREE.DoubleSide, // Render both sides in case normals are flipped
        uniforms: {
            u_objectColor: { value: new THREE.Color(colorHex) },
            u_ka: { value: 0.2 },
            u_kd: { value: 0.6 },
            u_ks: { value: 0.8 },
            u_shininess: { value: 64.0 },
            u_lights: {
                value: [
                    { position: new THREE.Vector3(), direction: new THREE.Vector3(), color: new THREE.Color(0x000000), enabled: 0.0, isSpot: 0.0, cutoff: 0.0 },
                    { position: new THREE.Vector3(), direction: new THREE.Vector3(), color: new THREE.Color(0x000000), enabled: 0.0, isSpot: 0.0, cutoff: 0.0 },
                    { position: new THREE.Vector3(), direction: new THREE.Vector3(), color: new THREE.Color(0x000000), enabled: 0.0, isSpot: 0.0, cutoff: 0.0 }
                ]
            }
        }
    });
}

/**
 * Creates a fallback box to visualize where the object SHOULD be 
 * if the PLY fails to load.
 */
function createFallbackMesh(config) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    // Hot Pink for visibility
    const material = new THREE.MeshBasicMaterial({ color: 0xFF00FF, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);

    // Apply Transforms
    mesh.position.set(config.position[0], config.position[1], config.position[2]);
    mesh.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
    mesh.scale.set(config.scale, config.scale, config.scale);

    return mesh;
}

/**
 * Loads a single decoration and adds it to the scene graph.
 */
async function spawnDecoration(rootSG, config) {
    try {
        console.log(`[Decorations] Attempting to load: ${config.id} from ${config.url}`);

        // 1. Load the raw data (positions, normals, indices)
        const plyData = await loadPLY(config.url);

        // 2. Convert to THREE.BufferGeometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(plyData.positions, 3));

        if (plyData.normals && plyData.normals.length > 0) {
            geometry.setAttribute('normal', new THREE.BufferAttribute(plyData.normals, 3));
        } else {
            geometry.computeVertexNormals();
        }

        if (plyData.indices && plyData.indices.length > 0) {
            geometry.setIndex(new THREE.BufferAttribute(plyData.indices, 1));
        }

        geometry.translate(0, 0.5, 0);

        // 3. Create Mesh
        const material = createPhongMaterial(config.color);
        const mesh = new THREE.Mesh(geometry, material);

        // 4. Apply Transforms
        mesh.position.set(config.position[0], config.position[1], config.position[2]);
        mesh.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
        mesh.scale.set(config.scale, config.scale, config.scale);

        // 5. Add to Scene Graph
        const node = new SGNode(mesh);
        node.data.isDecoration = true;
        rootSG.add(node);

        console.log(`[Decorations] Success: ${config.id}`);

    } catch (err) {
        console.error(`[Decorations] FAILED to load ${config.id}. Spawning fallback box. Error:`, err);

        // SPAWN FALLBACK
        const fallbackMesh = createFallbackMesh(config);
        const node = new SGNode(fallbackMesh);
        rootSG.add(node);
    }
}

/**
 * Main entry point called from index.js
 */
export function initDecorations(rootSG) {
    console.log("Initializing Decorations System...");

    decorationConfig.forEach(config => {
        spawnDecoration(rootSG, config);
    });
}