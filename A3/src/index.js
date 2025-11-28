import { loadPLY } from './PLYLoader.js';
import { createProgram, resizeCanvasToDisplaySize } from './webgl-utils.js';
import { appState } from './state.js';
import { initBuffers } from './buffers.js';
import { vsGouraud, fsGouraud, vsPhong, fsPhong } from './shaders.js';

const { mat4, mat3, vec3 } = window.glMatrix;

// Matrices (Reusable)
const projectionMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();     // Local transform of the object
const modelViewMatrix = mat4.create(); // Combined View * Model
const normalMatrix = mat3.create();

let gouraudProgram = null;
let phongProgram = null;

async function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return alert("WebGL2 missing");

    // 1. Load Geometry (Single mesh reused for all airplanes)
    let meshBuffers;
    try {
        const plyData = await loadPLY('../assets/airplane.ply');
        meshBuffers = initBuffers(gl, plyData);
    } catch (e) {
        console.error(e);
        return;
    }

    // 2. Initialize Programs
    gouraudProgram = createProgram(gl, vsGouraud, fsGouraud);
    phongProgram = createProgram(gl, vsPhong, fsPhong);

    setupControls(canvas);

    function render(time) {
        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // --- Global Scene Matrices ---
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 100.0);

        // View Matrix (Camera Zoom + Global Rotation)
        mat4.identity(viewMatrix);
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, appState.camera.z]);
        // We treat appState.rotation as "rotating the camera orbit"
        mat4.rotate(viewMatrix, viewMatrix, appState.rotation.x, [1, 0, 0]);
        mat4.rotate(viewMatrix, viewMatrix, appState.rotation.y, [0, 1, 0]);

        // Pick Program
        const program = (appState.shadingMode === 'gouraud') ? gouraudProgram : phongProgram;
        gl.useProgram(program);

        // --- Render Each Object ---
        appState.objects.forEach(obj => {

            // 1. Calculate Local Model Matrix
            mat4.identity(modelMatrix);
            mat4.translate(modelMatrix, modelMatrix, obj.position);
            mat4.rotate(modelMatrix, modelMatrix, obj.rotation.x * Math.PI / 180, [1, 0, 0]);
            mat4.rotate(modelMatrix, modelMatrix, obj.rotation.y * Math.PI / 180, [0, 1, 0]);
            mat4.scale(modelMatrix, modelMatrix, obj.scale);

            // 2. Combine with View Matrix -> ModelView
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            // 3. Normal Matrix
            mat3.normalFromMat4(normalMatrix, modelViewMatrix);

            // 4. Set Uniforms
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_modelViewMatrix'), false, modelViewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projectionMatrix'), false, projectionMatrix);
            gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_normalMatrix'), false, normalMatrix);

            // Light (Transform to View Space)
            // We loop through MAX_LIGHTS (2). 
            // If appState has fewer lights, we send black color for the extras.
            for (let i = 0; i < 2; i++) {
                // Get the light from state, or a dummy default if undefined
                const light = appState.lights[i];

                // Determine effective color (handle enabled/disabled)
                // If global showLights is false, or this specific light is disabled -> Black
                const effectiveColor = (appState.showLights && light && light.enabled)
                    ? light.color
                    : [0.0, 0.0, 0.0];

                // Calculate View Space Position
                const lightPosView = vec3.create();
                if (light) {
                    vec3.transformMat4(lightPosView, light.position, viewMatrix);
                } else {
                    vec3.set(lightPosView, 0, 0, 0);
                }

                // Upload to Shader Array: u_lights[0].position, u_lights[1].position, etc.
                const posLoc = gl.getUniformLocation(program, `u_lights[${i}].position`);
                const colLoc = gl.getUniformLocation(program, `u_lights[${i}].color`);

                gl.uniform3fv(posLoc, lightPosView);
                gl.uniform3fv(colLoc, effectiveColor);
            }

            // Object Material Uniforms
            gl.uniform3fv(gl.getUniformLocation(program, 'u_objectColor'), obj.color);
            gl.uniform1f(gl.getUniformLocation(program, 'u_ka'), obj.material.ka);
            gl.uniform1f(gl.getUniformLocation(program, 'u_kd'), obj.material.kd);
            gl.uniform1f(gl.getUniformLocation(program, 'u_ks'), obj.material.ks);
            gl.uniform1f(gl.getUniformLocation(program, 'u_shininess'), obj.material.shininess);

            // 5. Draw
            // (If you had different meshes, you would bind the specific buffer here)
            gl.bindVertexArray(meshBuffers.vao);
            gl.drawElements(gl.TRIANGLES, meshBuffers.elementCount, gl.UNSIGNED_SHORT, 0);
        });

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// (setupControls remains the same, controlling appState.rotation and appState.camera.z)
function setupControls(canvas) {
    let isDragging = false;
    let lastX = 0, lastY = 0;

    canvas.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => isDragging = false);

    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        appState.rotation.y += deltaX * 0.01;
        appState.rotation.x += deltaY * 0.01;
        lastX = e.clientX; lastY = e.clientY;
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        appState.camera.z -= e.deltaY * 0.01;
        if (appState.camera.z > appState.camera.min) appState.camera.z = appState.camera.min;
        if (appState.camera.z < appState.camera.max) appState.camera.z = appState.camera.max;
    }, { passive: false });

    window.addEventListener('keydown', e => {
        if (e.key === 's' || e.key === 'S') {
            appState.shadingMode = (appState.shadingMode === 'gouraud') ? 'phong' : 'gouraud';
            console.log("Mode:", appState.shadingMode);
        }
    });
}
main();