import { loadPLY } from './PLYLoader.js';
import { loadTexture, createProgram, resizeCanvasToDisplaySize } from './webgl-utils.js';
import { appState } from './state.js';
import { initBuffers, initCubeBuffers } from './buffers.js';
import { vsGouraud, fsGouraud, vsPhong, fsPhong, vsSimple, fsSimple } from './shaders.js';

const { mat4, mat3, vec3 } = window.glMatrix;

// Matrices
const projectionMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const normalMatrix = mat3.create();

let gouraudProgram = null;
let phongProgram = null;
let simpleProgram = null;

function updateUI() {
    const statusDiv = document.getElementById('status-content');

    // Formatting helper
    const fmt = (num) => num.toFixed(2);

    statusDiv.innerHTML = `
        <b>Shading Mode:</b> ${appState.shadingMode.toUpperCase()}<br>
        <b>Illumination:</b> ${appState.useBlinn ? "BLINN-PHONG" : "PHONG"}<br>
        <b>Light 1 (White):</b> ${appState.lights[0].enabled ? "ON" : "OFF"}<br>
        <b>Light 2 (Blue):</b> ${appState.lights[1].enabled ? "ON" : "OFF"}<br>
        <br>
        <b>Texture:</b> ${appState.texture.toUpperCase()}<br>
        <b>Mapping:</b> ${appState.texMapping.toUpperCase()}<br>
        <br>
        <b>Material (Global):</b><br>
        Diffuse (Kd): ${fmt(appState.material.kd)}<br>
        Specular (Ks): ${fmt(appState.material.ks)}
    `;
}

let woodTexture = null;
let checkerTexture = null;

async function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return alert("WebGL2 missing");

    // 1. Setup Global Mesh Buffer Variable
    let meshBuffers = null;
    let lightCubeBuffers = initCubeBuffers(gl); // Initialize immediately

    // --- NEW: Function to load model by index ---
    async function loadCurrentModel() {
        const filename = appState.modelList[appState.currentModelIndex];
        console.log(`Loading: ${filename}...`);

        try {
            // Assume assets are in the parent folder, adjust path if needed
            const plyData = await loadPLY(`../assets/${filename}`);

            // Create new buffers
            const newBuffers = initBuffers(gl, plyData);

            // Atomic swap (prevents flickering/crashes during render loop)
            meshBuffers = newBuffers;
            console.log("Model loaded successfully.");
        } catch (e) {
            console.error("Failed to load model:", e);
        }
    }

    // Initial Load
    await loadCurrentModel();

    // 2. Initialize Programs
    gouraudProgram = createProgram(gl, vsGouraud, fsGouraud);
    phongProgram = createProgram(gl, vsPhong, fsPhong);
    simpleProgram = createProgram(gl, vsSimple, fsSimple);

    // 3. Load textures
    woodTexture = loadTexture(gl, '../assets/textures/wood-grain_texture.jpg');
    checkerTexture = loadTexture(gl, '../assets/textures/checkerboard_texture.jpg');

    // --- PASS THE LOAD FUNCTION TO CONTROLS ---
    setupControls(canvas, loadCurrentModel);
    updateUI();

    function render(time) {
        // Ensure we don't render before the first model is loaded
        if (!meshBuffers) {
            requestAnimationFrame(render);
            return;
        }

        resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // ... (Keep your existing Matrix setup code here) ...
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 100.0);

        mat4.identity(viewMatrix);
        mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, appState.camera.z]);
        mat4.rotate(viewMatrix, viewMatrix, appState.rotation.x, [1, 0, 0]);
        mat4.rotate(viewMatrix, viewMatrix, appState.rotation.y, [0, 1, 0]);

        // --- PART A: Draw Objects ---
        const program = (appState.shadingMode === 'gouraud') ? gouraudProgram : phongProgram;
        gl.useProgram(program);

        // ... (Keep your Texture Setup code here) ...
        const useTexture = (appState.texture !== 'none');
        if (useTexture) {
            const tex = (appState.texture === 'wood') ? woodTexture : checkerTexture;
            const texMappingVal = (appState.texMapping === 'spherical') ? 1 : 2;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
            gl.uniform1i(gl.getUniformLocation(program, 'u_texMapping'), texMappingVal);
            gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), 1);
        } else {
            gl.uniform1i(gl.getUniformLocation(program, 'u_texMapping'), 0);
            gl.uniform1i(gl.getUniformLocation(program, 'u_useTexture'), 0);
        }

        if (appState.shadingMode === 'phong') {
            gl.uniform1i(gl.getUniformLocation(program, 'u_useBlinn'), appState.useBlinn ? 1 : 0);
        }

        appState.objects.forEach(obj => {
            // ... (Keep your Object Matrix/Uniform code here) ...
            mat4.identity(modelMatrix);
            mat4.translate(modelMatrix, modelMatrix, obj.position);
            mat4.rotate(modelMatrix, modelMatrix, obj.rotation.x * Math.PI / 180, [1, 0, 0]);
            mat4.rotate(modelMatrix, modelMatrix, obj.rotation.y * Math.PI / 180, [0, 1, 0]);
            mat4.scale(modelMatrix, modelMatrix, obj.scale);

            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
            mat3.normalFromMat4(normalMatrix, modelViewMatrix);

            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_modelViewMatrix'), false, modelViewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projectionMatrix'), false, projectionMatrix);
            gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_normalMatrix'), false, normalMatrix);

            // Lights and Material Uniforms
            for (let i = 0; i < 2; i++) {
                const light = appState.lights[i];
                const effectiveColor = (appState.showLights && light && light.enabled) ? light.color : [0, 0, 0];
                const lightPosView = vec3.create();
                if (light) vec3.transformMat4(lightPosView, light.position, viewMatrix);
                gl.uniform3fv(gl.getUniformLocation(program, `u_lights[${i}].position`), lightPosView);
                gl.uniform3fv(gl.getUniformLocation(program, `u_lights[${i}].color`), effectiveColor);
            }
            gl.uniform3fv(gl.getUniformLocation(program, 'u_objectColor'), obj.color);
            gl.uniform1f(gl.getUniformLocation(program, 'u_ka'), appState.material.ka);
            gl.uniform1f(gl.getUniformLocation(program, 'u_kd'), appState.material.kd);
            gl.uniform1f(gl.getUniformLocation(program, 'u_ks'), appState.material.ks);
            gl.uniform1f(gl.getUniformLocation(program, 'u_shininess'), obj.material.shininess);

            // DRAW
            gl.bindVertexArray(meshBuffers.vao);
            gl.drawElements(gl.TRIANGLES, meshBuffers.elementCount, gl.UNSIGNED_SHORT, 0);
        });

        // --- PART B: Draw Lights ---
        // ... (Keep your Light Drawing code here - unchanged) ...
        if (appState.showLights) {
            gl.useProgram(simpleProgram);
            appState.lights.forEach(light => {
                if (!light.enabled) return;
                mat4.identity(modelMatrix);
                mat4.translate(modelMatrix, modelMatrix, light.position);
                mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.2]);
                mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
                gl.uniformMatrix4fv(gl.getUniformLocation(simpleProgram, 'u_modelViewMatrix'), false, modelViewMatrix);
                gl.uniformMatrix4fv(gl.getUniformLocation(simpleProgram, 'u_projectionMatrix'), false, projectionMatrix);
                gl.uniform3fv(gl.getUniformLocation(simpleProgram, 'u_color'), light.color);
                gl.bindVertexArray(lightCubeBuffers.vao);
                gl.drawElements(gl.TRIANGLES, lightCubeBuffers.elementCount, gl.UNSIGNED_SHORT, 0);
            });
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// Updated setupControls to accept the loader callback
function setupControls(canvas, loadModelCallback) {
    let isDragging = false;
    let lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        appState.rotation.y += (e.clientX - lastX) * 0.01;
        appState.rotation.x += (e.clientY - lastY) * 0.01;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        appState.camera.z -= e.deltaY * 0.01;
    }, { passive: false });

    // --- KEYBOARD CONTROLS ---
    window.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case ' ': // Spacebar to cycle models
            case '.': // Or the dot key
                appState.currentModelIndex = (appState.currentModelIndex + 1) % appState.modelList.length;
                loadModelCallback(); // Calls the function inside main
                break;

            case 's':
                appState.shadingMode = (appState.shadingMode === 'gouraud') ? 'phong' : 'gouraud';
                break;
            case 'b':
                appState.useBlinn = !appState.useBlinn;
                break;
            case '1':
                appState.lights[0].enabled = !appState.lights[0].enabled;
                break;
            case '2':
                appState.lights[1].enabled = !appState.lights[1].enabled;
                break;
            case 'z':
                appState.material.kd = Math.min(1.0, appState.material.kd + 0.1);
                break;
            case 'x':
                appState.material.kd = Math.max(0.0, appState.material.kd - 0.1);
                break;
            case 'c':
                appState.material.ks = Math.min(1.0, appState.material.ks + 0.1);
                break;
            case 'v':
                appState.material.ks = Math.max(0.0, appState.material.ks - 0.1);
                break;
            case 't':
                if (appState.texture === 'none') appState.texture = 'wood';
                else if (appState.texture === 'wood') appState.texture = 'checker';
                else appState.texture = 'none';
                break;
            case 'm':
                appState.texMapping = (appState.texMapping === 'spherical') ? 'cylindrical' : 'spherical';
                break;
        }

        updateUI();
    });
}

main();