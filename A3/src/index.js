import { loadPLY } from './PLYLoader.js';
import { createProgram, resizeCanvasToDisplaySize } from './webgl-utils.js';
import { appState } from './state.js';
import { initBuffers } from './buffers.js';
import { vsGouraud, fsGouraud, vsPhong, fsPhong } from './shaders.js';

const { mat4, mat3, vec3 } = window.glMatrix;

// Matrices
const projectionMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const normalMatrix = mat3.create();
const viewMatrix = mat4.create();

// Programs
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
        plyData = await loadPLY('../assets/beethoven.ply');
        meshBuffers = initBuffers(gl, plyData);
    } catch (e) {
        console.error("Failed to load PLY", e);
        return;
    }

    // 2. Initialize Shaders
    gouraudProgram = createProgram(gl, vsGouraud, fsGouraud);
    phongProgram = createProgram(gl, vsPhong, fsPhong);

    // 3. Setup Controls
    setupControls(canvas);

    // 4. Render Loop
    function render(time) {
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE); // Good practice for 3D (Removes faces that are not visible to the viewer)

        // --- Calculate Matrices ---
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 100.0);

        // View Matrix (Camera) - Move back 5 units
        mat4.identity(viewMatrix);
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -5.0]);

        // ModelView Matrix (Camera + Object Rotation)
        mat4.copy(modelViewMatrix, viewMatrix);
        mat4.rotate(modelViewMatrix, modelViewMatrix, appState.rotation.x, [1, 0, 0]);
        mat4.rotate(modelViewMatrix, modelViewMatrix, appState.rotation.y, [0, 1, 0]);

        // Normal Matrix (Invert + Transpose of ModelView)
        mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        // --- Light Position Handling ---
        // Transform the light position defined in state.js into View Space
        // We assume the light in state.js is "World Space"
        const lightPosWorld = appState.lights[0].position; // Using first light for now
        const lightPosView = vec3.create();
        vec3.transformMat4(lightPosView, lightPosWorld, viewMatrix);

        // --- SWITCH LOGIC ---
        let programToUse;

        if (appState.shadingMode === 'gouraud') {
            programToUse = gouraudProgram;
        } else {
            programToUse = phongProgram;
        }

        gl.useProgram(programToUse);

        // --- BIND UNIFORMS (Common to both) ---
        // Since variable names are identical in both shaders, this logic is clean.

        // Matrices
        gl.uniformMatrix4fv(gl.getUniformLocation(programToUse, 'u_modelViewMatrix'), false, modelViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(programToUse, 'u_projectionMatrix'), false, projectionMatrix);
        gl.uniformMatrix3fv(gl.getUniformLocation(programToUse, 'u_normalMatrix'), false, normalMatrix);

        // Light & Material
        gl.uniform3fv(gl.getUniformLocation(programToUse, 'u_lightPosition'), lightPosView);
        gl.uniform3fv(gl.getUniformLocation(programToUse, 'u_lightColor'), appState.lights[0].color);

        gl.uniform1f(gl.getUniformLocation(programToUse, 'u_ka'), appState.material.ka);
        gl.uniform1f(gl.getUniformLocation(programToUse, 'u_kd'), appState.material.kd);
        gl.uniform1f(gl.getUniformLocation(programToUse, 'u_ks'), appState.material.ks);
        gl.uniform1f(gl.getUniformLocation(programToUse, 'u_shininess'), appState.material.shininess);

        // Draw
        gl.bindVertexArray(meshBuffers.vao);
        gl.drawElements(gl.TRIANGLES, meshBuffers.elementCount, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function setupControls(canvas) {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

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
        appState.rotation.y += deltaX * 0.01;
        appState.rotation.x += deltaY * 0.01;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener('keydown', (e) => {
        // Toggle Shading Model
        if (e.key === 's' || e.key === 'S') {
            appState.shadingMode = appState.shadingMode === 'gouraud' ? 'phong' : 'gouraud';
            console.log("Switched to:", appState.shadingMode);
        }
    });
}
main();