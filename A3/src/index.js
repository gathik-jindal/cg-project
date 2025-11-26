import { loadPLY } from './PLYLoader.js';
import { createProgram, resizeCanvasToDisplaySize } from './webgl-utils.js';
import { appState } from './state.js';
import { initBuffers } from './buffers.js';

const { mat4, mat3, toRadian } = window.glMatrix;
console.log("glMatrix v3 loaded:", mat4, mat3);

// Matrices (Allocated once to avoid garbage collection)
const projectionMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const normalMatrix = mat3.create(); // 3x3 matrix for normals

// Shader Program Placeholders
let currentProgram = null;
let gouraudProgram = null;
let phongProgram = null;

async function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        alert("Unable to initialize WebGL2.");
        return;
    }

    // 1. Load Geometry
    let plyData;
    let meshBuffers;
    try {
        plyData = await loadPLY('../assets/airplane.ply');
        meshBuffers = initBuffers(gl, plyData);
        console.log("Geometry Loaded & Buffered");
    } catch (e) {
        console.error("Failed to load PLY", e);
        return;
    }

    // 2. Setup Controls
    setupControls(canvas);

    // 3. Render Loop
    function render(time) {
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // --- A. Compute Projection Matrix ---
        const fieldOfView = 45 * Math.PI / 180; // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // --- B. Compute Model-View Matrix ---
        mat4.identity(modelViewMatrix);

        // Move camera back so we can see the object (View transform)
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -5.0]);

        // Rotate object based on appState (Model transform)
        mat4.rotate(modelViewMatrix, modelViewMatrix, appState.rotation.x, [1, 0, 0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, appState.rotation.y, [0, 1, 0]);

        // --- C. Compute Normal Matrix ---
        // Invert and Transpose the ModelView matrix
        // This is required so lighting works correctly when scaling/rotating
        mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        // --- D. Draw (Placeholder) ---
        // Here we will eventually bind the shader, set uniforms, and draw.
        // For now, we just have the matrices ready.

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function setupControls(canvas) {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    // Mouse control for rotation
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => isDragging = false);

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // Update state
        appState.rotation.y += deltaX * 0.01;
        appState.rotation.x += deltaY * 0.01;

        lastX = e.clientX;
        lastY = e.clientY;
    });

    // Keyboard for shader toggling
    window.addEventListener('keydown', (e) => {
        if (e.key === 's' || e.key === 'S') {
            appState.shadingMode = appState.shadingMode === 'gouraud' ? 'phong' : 'gouraud';
            console.log("Switched to:", appState.shadingMode);
        }
    });
}

main();