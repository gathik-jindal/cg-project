import { loadPLY } from './PLYLoader.js';
import { createProgram, resizeCanvasToDisplaySize } from './webgl-utils.js';
import { appState } from './state.js';

// We will define shaders in the next step, for now placeholders:
const vsGouraud = `...`; // Coming in Step 3
const fsGouraud = `...`; // Coming in Step 3

async function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2"); // Use WebGL2 for easier shader syntax

    if (!gl) {
        alert("Unable to initialize WebGL2.");
        return;
    }

    // 1. Load Geometry (Bunny) 
    let plyData;
    try {
        // Ensure you have this file in your assets folder
        plyData = await loadPLY('../assets/airplane.ply');
        console.log("PLY Loaded:", plyData);
    } catch (e) {
        console.error("Failed to load PLY", e);
        return;
    }

    // 2. Setup Buffers (Placeholder for Step 2)
    // initBuffers(gl, plyData);

    // 3. Setup Input Listeners (Keyboard controls) [cite: 49]
    setupControls();

    // 4. Render Loop
    function render(time) {
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // Logic to switch shaders based on appState.shadingMode goes here

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        // Toggle Shading Model [cite: 49]
        if (e.key === 's' || e.key === 'S') {
            appState.shadingMode = appState.shadingMode === 'gouraud' ? 'phong' : 'gouraud';
            console.log("Switched to:", appState.shadingMode);
        }
    });
}

main();