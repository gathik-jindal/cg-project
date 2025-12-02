import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SGNode } from './SceneGraph.js';
import { vsPhong, fsPhong } from './shaders.js';
import { initDecorations } from './Decorations.js';
import * as CreateSceneObjects from './CreateSceneObjects.js';

let scene, camera, renderer;
let rootSG;
let clock;

// --- GLOBAL VARIABLES FOR CAMERA ---
let controls;
let isFollowMode = false;
// ----------------------------------

// --- GLOBAL VARIABLES FOR LIGHTING ---
// --- LIGHTING STATE ---
const lightState = {
    // Light 0: Point Source (Global) - Fixed location, illuminating entire scene
    light0: {
        position: new THREE.Vector3(0, 50, 50),
        color: new THREE.Color(0xFFFFFF),
        intensity: 0.6,
        enabled: true,
        isSpot: 0.0,        // 0 = Point Light
        direction: new THREE.Vector3(0, 0, 0), // Ignored for point lights
        cutoff: 0.0         // Ignored
    },
    // Light 1: Directional Spotlight (Fixed) - Fixed height/side, lighting middle
    light1: {
        position: new THREE.Vector3(-80, 40, 0), // Side location
        color: new THREE.Color(0xFF0000),        // Red
        intensity: 2.0,
        enabled: true,
        isSpot: 1.0,        // 1 = Spotlight
        // Pointing roughly at the center (0, -50, 0) from (-80, 40, 0)
        direction: new THREE.Vector3(1, -1, 0).normalize(),
        cutoff: Math.cos(Math.PI / 6) // ~30 degree cone
    },
    // Light 2: Moving Spotlight (Tracking) - Fixed location, points to moving object
    light2: {
        position: new THREE.Vector3(0, 80, 80), // FIXED location high up
        color: new THREE.Color(0x00FFFF),       // Cyan
        intensity: 0.8,
        enabled: true,
        isSpot: 1.0,        // 1 = Spotlight
        direction: new THREE.Vector3(0, -1, 0), // Will be updated in animate()
        cutoff: Math.cos(Math.PI / 15) // Narrower beam (~12 degrees)
    }
};

let discNode, poleNode, barNode, swingNode, swingPivot, ballNode, ramp1Node, wallNode, groundNode, wall2Node, ball2Node, dominoNode;
let light0Node, light1Node, light2Node;
let totalSimulatedTime = 0;
let spotLightBallFocus; // which ball the spotlight is following

init();
animate();

function createUI() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.zIndex = '100';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '5px';
    document.body.appendChild(container);

    function createBtn(text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.padding = '8px';
        btn.style.cursor = 'pointer';
        btn.onclick = onClick;
        container.appendChild(btn);
        return btn;
    }

    // 1. Camera Toggle
    const camBtn = createBtn("Switch Camera Mode (Global)", () => {
        isFollowMode = !isFollowMode;
        camBtn.innerText = isFollowMode ? "Camera: Following Ball" : "Camera: Global";

        if (isFollowMode) {
            if (spotLightBallFocus) {
                const ballPos = spotLightBallFocus.object3D.position;
                controls.target.copy(ballPos);
                camera.position.set(ballPos.x + 30, ballPos.y + 20, ballPos.z + 30);
            }
        } else {
            controls.target.set(-20, -50, 0);
            camera.position.set(-20, -60, 150);
        }
    });

    // 2. Light Controls
    const l0Btn = createBtn("Toggle Point Light (ON)", () => {
        lightState.light0.enabled = !lightState.light0.enabled;
        l0Btn.innerText = `Point Light (${lightState.light0.enabled ? "ON" : "OFF"})`;
    });

    const l1Btn = createBtn("Toggle Side Spot (ON)", () => {
        lightState.light1.enabled = !lightState.light1.enabled;
        l1Btn.innerText = `Side Spot (${lightState.light1.enabled ? "ON" : "OFF"})`;
    });

    const l2Btn = createBtn("Toggle Tracking Spot (ON)", () => {
        lightState.light2.enabled = !lightState.light2.enabled;
        l2Btn.innerText = `Tracking Spot (${lightState.light2.enabled ? "ON" : "OFF"})`;
    });

    createBtn("↺ RESET SIMULATION", () => {
        resetSimulation();
    });
}

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-20, -60, 150);
    camera.lookAt(-20, -60, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- CONTROLS SETUP ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(-20, -50, 0);

    // Math.PI / 2 means 90 degrees (the horizon). 
    // Subtracting 0.1 gives a tiny buffer so you don't clip into the floor mesh.
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    createUI();

    rootSG = new SGNode(scene);
    clock = new THREE.Clock();

    ramp1Node = CreateSceneObjects.createRamp1(rootSG);
    wallNode = CreateSceneObjects.createWall(rootSG);
    wall2Node = CreateSceneObjects.createWall2(rootSG);
    groundNode = CreateSceneObjects.createGround(rootSG);
    dominoNode = CreateSceneObjects.createDomino(rootSG);

    // createDiscPoleBar returns an array.
    [swingNode, swingPivot, discNode, poleNode, barNode] = CreateSceneObjects.createDiscPoleBar(rootSG);

    ball2Node = CreateSceneObjects.createRollingBall2(rootSG, dominoNode, handleBallDominoCollision);

    // --- PASS A GETTER FUNCTION ---
    // Instead of passing 'totalSimulatedTime' (value), we pass a function that returns it.
    ballNode = CreateSceneObjects.createRollingBall(
        rootSG,
        () => totalSimulatedTime,
        ramp1Node,
        swingNode,
        ball2Node,
        handleGroundBallCollision,
        handleWallBallCollision,
        handleWall2Collision,
        handleBarBallCollision,
        handleBallBallCollison,
    );

    const lightNodes = CreateSceneObjects.createLightVisuals(rootSG, lightState);
    light0Node = lightNodes.light0Node;
    light1Node = lightNodes.light1Node;
    light2Node = lightNodes.light2Node;

    // --- LOAD DECORATIONS ---
    initDecorations(rootSG);
    // ----------------------

    spotLightBallFocus = ballNode; // Start by following the first ball

    window.addEventListener('resize', onResize);
}

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const fixed_dt = 1 / 60;

    // 1. Update Physics
    rootSG.update(fixed_dt);
    totalSimulatedTime += fixed_dt;

    // 2. Camera Follow Logic
    if (isFollowMode && spotLightBallFocus) {
        const ballPos = spotLightBallFocus.object3D.position;
        const offset = camera.position.clone().sub(controls.target);
        controls.target.copy(ballPos);
        camera.position.copy(ballPos).add(offset);
    }

    // 3. Update Controls
    controls.update();

    // --- LIGHTING LOGIC ---

    // 1. Update Tracking Light Position (Light 2)
    if (spotLightBallFocus) {
        const targetPos = spotLightBallFocus.object3D.position;

        // A. Update Position (Hover above the ball)
        lightState.light2.position.set(targetPos.x, targetPos.y + 20, targetPos.z);

        // B. Update Direction (Point AT the ball) [ADD THIS BLOCK]
        // Calculate vector from Light -> Ball
        const newDir = new THREE.Vector3()
            .subVectors(targetPos, lightState.light2.position)
            .normalize();

        lightState.light2.direction.copy(newDir);

        // Update the VISUAL mesh position
        if (light2Node) {
            light2Node.object3D.position.copy(lightState.light2.position);
        }
    }

    // 2. Visual Feedback: Dim the spheres if the light is OFF
    // We check the 'enabled' flag and set the mesh color accordingly
    if (light0Node) light0Node.object3D.material.color.setHex(lightState.light0.enabled ? 0xFFFFFF : 0x111111);
    if (light1Node) light1Node.object3D.material.color.setHex(lightState.light1.enabled ? 0xFF0000 : 0x111111);
    if (light2Node) light2Node.object3D.material.color.setHex(lightState.light2.enabled ? 0x00FFFF : 0x111111);

    // 3. Push data to Shaders
    camera.updateMatrixWorld();

    // Manually update the inverse matrix so 'updateMaterials' uses the current camera position
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    // ---------------------

    updateMaterials(rootSG);
    // ---------------------------

    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function distPointToSegment(P, A, B) {
    const AB = B.clone().sub(A);
    const AP = P.clone().sub(A);

    const t = AP.dot(AB) / AB.lengthSq();
    const tClamped = Math.max(0, Math.min(1, t));

    const closest = A.clone().add(AB.multiplyScalar(tClamped));
    return {
        distance: P.distanceTo(closest),
        closestPoint: closest,
        t: tClamped
    };
}

export function computeBarVelocity(barNode, closestPoint) {
    // 1. Get kinematics of the Parent Disc
    // The disc rotates around its own position on the Y axis
    const discAngularSpeed = 0.9; // Matches your update loop: angle += 0.9 * dt
    const discOrigin = discNode.object3D.position.clone(); // (-20.5, -22, 0)
    const discAxis = new THREE.Vector3(0, 1, 0); // Rotates around Y

    // 2. Get kinematics of the Swing Arm
    // The swing rotates around the pivot on the Y axis (relative to parent)
    const swingAngularSpeed = 3.0; // Matches your update loop: pivot_angle += 3 * dt

    // We need the world position of the Swing Pivot (where the bar attaches)
    const swingPivotObj = swingPivot.object3D;
    const pivotPos = new THREE.Vector3().setFromMatrixPosition(swingPivotObj.matrixWorld);

    // The swing axis in World Space (It's Y-axis local, transformed to World)
    const swingAxis = new THREE.Vector3(0, 1, 0).transformDirection(swingPivotObj.matrixWorld).normalize();

    // --- CALCULATION ---

    // A. Velocity of the Swing Pivot point (caused by the Disc rotation)
    // v_pivot = w_disc x r_disc
    const r_pivot = pivotPos.clone().sub(discOrigin);
    const v_pivot = new THREE.Vector3()
        .crossVectors(discAxis.clone().multiplyScalar(discAngularSpeed), r_pivot);

    // B. Velocity of the collision point relative to the Swing Pivot (caused by Swing rotation)
    // v_point_rel = w_swing x r_swing
    const r_point = closestPoint.clone().sub(pivotPos);
    const v_point_rel = new THREE.Vector3()
        .crossVectors(swingAxis.multiplyScalar(swingAngularSpeed), r_point);

    // Total Velocity = Velocity of the Pivot + Velocity relative to the Pivot
    const totalVelocity = v_pivot.add(v_point_rel);

    return totalVelocity;
}

export function handleGroundBallCollision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r = ballNode.data.radius;

    const GROUND_Y = -83;   // <-- your ground height
    const REST = 0;       // small bounce if you want, or 0 for no bounce

    // Check if ball is below or touching ground
    if (pos.y - r <= GROUND_Y) {

        // Snap ball onto ground
        pos.y = GROUND_Y + r;

        vel.y = 0;

        // Mark as on-ground
        ballNode.state = "ON_GROUND";

        return true;
    }

    return false;
}


export function handleWallBallCollision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r = ballNode.data.radius;

    const WALL_Z = -40;
    const REST = 0.6;     // 0 = dead stop, 1 = perfect bounce

    // Check collision
    if (pos.z - r <= WALL_Z && vel.z < 0) {

        // Snap ball outside the wall so it does not sink in
        pos.z = WALL_Z + r;

        // Bounce (reflect z component)
        vel.z = -vel.z * REST;
        // console.log(vel);

        return true;
    }

    return false;
}

export function handleWall2Collision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r = ballNode.data.radius;

    if (pos.x - r < -120) {
        pos.x = -120 + r;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

        // Overwrite velocity: Direction (1, 0, 0) * Speed
        vel.x = speed;
        vel.y = 0;
        vel.z = 0;
        // console.log(pos.z);
    }
}

// Add this in your collision loop

export function handleBarBallCollision(ballNode, barNode) {
    const ball = ballNode.object3D;
    const bar = barNode.object3D;

    const ballRadius = ballNode.data.radius;
    const barRadius = barNode.data.radius;
    const barLength = barNode.data.length;

    // 1. Ball center
    ball.updateMatrixWorld(true);
    const C = new THREE.Vector3().setFromMatrixPosition(ball.matrixWorld);

    // 2. Bar endpoints (in world space)
    bar.updateMatrixWorld(true);
    // Note: Your bar geometry is rotated, so we ensure we get the correct top/bottom points
    // Cylinder is usually Y-aligned, but you rotated Z. Let's rely on matrix transformation.
    const A = new THREE.Vector3(0, -barLength / 2, 0).applyMatrix4(bar.matrixWorld);
    const B = new THREE.Vector3(0, barLength / 2, 0).applyMatrix4(bar.matrixWorld);

    // 3. Check Distance
    const { distance, closestPoint } = distPointToSegment(C, A, B);
    const minDist = ballRadius + barRadius;

    if (distance < minDist) {

        // --- PHYSICS RESPONSE ---

        // 1. Calculate Normal (Direction from Bar -> Ball)
        const normal = C.clone().sub(closestPoint).normalize();

        // 2. Get velocities
        const vBall = ballNode.velocity.clone();
        const vBar = computeBarVelocity(barNode, closestPoint);

        // 3. Calculate Relative Velocity (Ball relative to Bar)
        // This makes the physics calculation assume the bar is stationary 
        // and the ball is hitting it at the combined speed.
        const vRel = vBall.clone().sub(vBar);

        // 4. Calculate velocity along the normal
        const velAlongNormal = vRel.dot(normal);

        // Only resolve if moving towards each other
        if (velAlongNormal < 0) {
            // Restitution (Bounciness): 1.0 = super bouncy, 0.5 = dull
            const restitution = 1.2;

            // Impulse scalar
            const j = -(1 + restitution) * velAlongNormal;

            // Apply impulse along normal
            const impulse = normal.clone().multiplyScalar(j);

            // New Velocity = Old Velocity + Impulse
            ballNode.velocity.add(impulse);
            // console.log(ballNode.velocity);

            // 5. Position Correction (prevent sinking/tunneling)
            // Push the ball out along the normal so it no longer overlaps
            const overlap = minDist - distance;
            // Add a small buffer (0.01) to ensure it clears
            ball.position.add(normal.multiplyScalar(overlap + 0.01));
        }

        ballNode.state = "IN_AIR";
        return true;
    }

    return false;
}

export function handleBallBallCollison(ballA, ballB) {
    // they collide only if A is catching up to B
    const posA = ballA.object3D.position;
    const posB = ballB.object3D.position;
    const radiusA = ballA.data.radius;
    const radiusB = ballB.data.radius;

    // Safety check in case radius is not defined
    if (!radiusA || !radiusB) return false;

    // 2. Calculate distance between centers
    const distance = posA.distanceTo(posB);
    const sumOfRadii = radiusA + radiusB;
    // console.log(distance);
    // 3. Check for collision
    if (distance > sumOfRadii) {
        return false; // No collision
    }

    spotLightBallFocus = ball2Node; // Switch spotlight to follow ball 2


    const uA = ballA.velocity.x;
    const uB = ballB.velocity.x;

    const mA = 1;   // ball A mass
    const mB = 2;   // ball B mass

    // 1D elastic collision
    const vA = ((uA * (mA - mB)) + (2 * mB * uB)) / (mA + mB);
    const vB = ((uB * (mB - mA)) + (2 * mA * uA)) / (mA + mB);

    ballA.velocity.x = vA;
    ballB.velocity.x = vB;

    // optional: remove Y & Z components
    ballA.velocity.y = 0;
    ballA.velocity.z = 0;
    ballB.velocity.y = 0;
    ballB.velocity.z = 0;

    return true;
}

export function sphereAABBCollision(ballPos, radius, box) {
    const closest = new THREE.Vector3(
        THREE.MathUtils.clamp(ballPos.x, box.min.x, box.max.x),
        THREE.MathUtils.clamp(ballPos.y, box.min.y, box.max.y),
        THREE.MathUtils.clamp(ballPos.z, box.min.z, box.max.z)
    );

    return closest.distanceTo(ballPos) <= radius;
}

export function handleBallDominoCollision(ballNode, dominoNode) {
    if (dominoNode.state == "FALLEN") { ballNode.velocity.set(0, 0, 0) }
    if (dominoNode.state !== "STANDING") return false;

    const ball = ballNode.object3D;
    const ballPos = ball.position.clone();
    const r = ballNode.data.radius;

    // compute world bounding box of domino
    const dominoMesh = dominoNode.children[0].object3D;

    // compute world bounding box of the domino's visible mesh
    const box = dominoMesh.geometry.boundingBox.clone();
    box.applyMatrix4(dominoMesh.matrixWorld);

    // check collision
    if (sphereAABBCollision(ballPos, r, box)) {
        dominoNode.state = "TOPPLING";
        dominoNode.data.angularVelocity = 1.0;  // initial push

        // Stop the ball that hit the domino
        ballNode.velocity.set(0, 0, 0);

        return true;
    }

    // Do nothing if there is no collision
    return false;
}

/** Updates the shader uniforms for all materials in the scene graph with the current light states.
 * @param {SGNode} node The current node in the scene graph.
 */
export function updateMaterials(node) {
    if (node.object3D && node.object3D.material && node.object3D.material.uniforms) {
        const uniforms = node.object3D.material.uniforms;
        const viewMatrix = camera.matrixWorldInverse;

        const updateLightUniform = (index, state) => {
            uniforms.u_lights.value[index].color.copy(state.color);
            uniforms.u_lights.value[index].enabled = state.enabled ? 1.0 : 0.0;
            uniforms.u_lights.value[index].isSpot = state.isSpot;
            uniforms.u_lights.value[index].cutoff = state.cutoff;

            // 1. Transform Position (Point) -> View Space
            const worldPos = state.position.clone();
            const viewPos = worldPos.applyMatrix4(viewMatrix);
            uniforms.u_lights.value[index].position.copy(viewPos);

            // 2. Transform Direction (Vector) -> View Space
            // "transformDirection" applies the rotation of the matrix but ignores translation
            const worldDir = state.direction.clone();
            const viewDir = worldDir.transformDirection(viewMatrix).normalize();
            uniforms.u_lights.value[index].direction.copy(viewDir);
        };

        updateLightUniform(0, lightState.light0);
        updateLightUniform(1, lightState.light1);
        updateLightUniform(2, lightState.light2);
    }

    for (const child of node.children) {
        updateMaterials(child);
    }
}


/** Resets the simulation to its initial state. */
function resetSimulation() {
    // 1. Reset Global Time
    totalSimulatedTime = 0;

    // 2. Reset Ball 1
    if (ballNode) {
        ballNode.object3D.position.set(18, 5.2, 0);
        ballNode.object3D.rotation.set(0, 0, 0);
        ballNode.velocity.set(0, 0, 0);
        ballNode.state = "WAITING";
    }

    // 3. Reset Ball 2
    if (ball2Node) {
        ball2Node.object3D.position.set(-30, -81, 24.50727456099691);
        ball2Node.object3D.rotation.set(0, 0, 0);
        ball2Node.velocity.set(0, 0, 0);
    }

    // 4. Reset Domino
    if (dominoNode) {
        dominoNode.state = "STANDING";
        dominoNode.data.angle = 0;
        dominoNode.data.angularVelocity = 0;
        dominoNode.data.fallen = false;
        dominoNode.object3D.rotation.z = 0;
    }

    // --- NEW: Reset Disc and Swing ---
    if (discNode) {
        discNode.data.angle = 0;
        discNode.object3D.rotation.y = 0;
    }
    if (swingPivot) {
        swingPivot.data.angle = 0;
        swingPivot.object3D.rotation.y = 0;
    }
    // ---------------------------------

    // 5. Reset Spotlight
    spotLightBallFocus = ballNode;

    // 6. Reset Camera
    if (isFollowMode && spotLightBallFocus) {
        const ballPos = spotLightBallFocus.object3D.position;
        controls.target.copy(ballPos);
        camera.position.set(ballPos.x + 30, ballPos.y + 20, ballPos.z + 30);
    }
}