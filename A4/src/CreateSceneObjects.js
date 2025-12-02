import * as THREE from 'three';
import { SGNode } from './SceneGraph.js';
import { vsPhong, fsPhong } from './shaders.js';
import * as Physics from './Physics.js';
import { textures } from './Texture.js';

const BALL_START_DELAY = 2.21

/**
 * Creates the light visualization spheres and adds them to the scene graph.
 * @param {SGNode} rootSG The root of the SceneGraph
 * @param {Object} lightState The light state configuration
 * @return {Object} An object containing the light nodes
 */
export function createLightVisuals(rootSG, lightState) {
    // Helper to create a simple "glowing" sphere
    function createVisual(color, position) {
        const geom = new THREE.SphereGeometry(2, 16, 16);
        // Use BasicMaterial so it looks like it's emitting light (unlit)
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geom, mat);

        // Set initial position
        mesh.position.copy(position);

        const node = new SGNode(mesh);
        rootSG.add(node);
        return node;
    }

    // Create visuals for all 3 lights based on the config we wrote earlier
    let light0Node = createVisual(lightState.light0.color, lightState.light0.position); // Point
    let light1Node = createVisual(lightState.light1.color, lightState.light1.position); // Side Spot
    let light2Node = createVisual(lightState.light2.color, lightState.light2.position); // Tracking

    return { light0Node, light1Node, light2Node };
}

/** Creates a Phong Shader Material with the given color.
 * @param {number} colorHex The color of the material in hexadecimal.
 * @param {THREE.Texture} [texture=null] Optional texture to apply to the material.
 * @returns {THREE.ShaderMaterial} The created Phong shader material.
 */
function createPhongMaterial(colorHex, texture = null) {
    return new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: vsPhong,
        fragmentShader: fsPhong,
        uniforms: {
            u_objectColor: { value: new THREE.Color(colorHex) },
            u_ka: { value: 0.2 },
            u_kd: { value: 0.6 },
            u_ks: { value: 0.8 },
            u_shininess: { value: 64.0 },
            u_useTexture: { value: texture !== null },
            u_texture: { value: texture },
            u_lights: {
                value: [
                    // Initialize with placeholders; updateMaterials will fill these
                    {
                        position: new THREE.Vector3(),
                        direction: new THREE.Vector3(),
                        color: new THREE.Color(0x000000),
                        enabled: 0.0,
                        isSpot: 0.0,
                        cutoff: 0.0
                    },
                    {
                        position: new THREE.Vector3(),
                        direction: new THREE.Vector3(),
                        color: new THREE.Color(0x000000),
                        enabled: 0.0,
                        isSpot: 0.0,
                        cutoff: 0.0
                    },
                    {
                        position: new THREE.Vector3(),
                        direction: new THREE.Vector3(),
                        color: new THREE.Color(0x000000),
                        enabled: 0.0,
                        isSpot: 0.0,
                        cutoff: 0.0
                    }
                ]
            }
        }
    });
}

/**
 * Creates a ramp and adds it to the scene graph.
 * @param {SGNode} rootSG The Root of the SceneGraph
 * @returns SGNode of the ramp
 */
export function createRamp1(rootSG) {
    const geom = new THREE.BoxGeometry(20, 0.2, 3);
    const mat = createPhongMaterial(0x444444, textures.concrete);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(10, -0.5, 0);
    mesh.rotation.z = Math.PI / 6;

    let ramp1Node = new SGNode(mesh);
    rootSG.add(ramp1Node);

    return ramp1Node;
}

/**
 * 
 * @param {SGNode} rootSG The Root of the SceneGraph
 * @returns SGNode of the wall
 */
export function createWall(rootSG) {
    const geom = new THREE.BoxGeometry(50, 50, 1);
    const mat = createPhongMaterial(0x0000ff, textures.brick);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(-50, -58, -40);

    let wallNode = new SGNode(mesh);
    rootSG.add(wallNode);
    wallNode.data.normal = (0, 0, 1);

    return wallNode;
}

/**
 * Creates a second wall and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @returns SGNode of the wall
 */
export function createWall2(rootSG) {
    const geom = new THREE.BoxGeometry(50, 50, 1);
    const mat = createPhongMaterial(0x0000ff, textures.brick);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(-120, -58, 25);

    // --- ORIENTATION CALCULATION ---

    // 1. The Ball's incoming velocity
    const vIn = new THREE.Vector3(-30.77671738501819, 0, 25.06866101091984);

    // 2. The desired outgoing velocity (Positive X axis)
    // We keep the same speed (magnitude), just change direction to (1, 0, 0)
    const speed = vIn.length();
    const vOut = new THREE.Vector3(speed, 0, 0);

    // 3. Calculate the Wall Normal
    // The normal is the vector difference: vOut - vIn
    const normal = new THREE.Vector3().subVectors(vOut, vIn).normalize();

    // 4. Rotate the wall to face this normal
    // Since BoxGeometry faces 'Z' by default, looking at (pos + normal) aligns it correctly.
    const lookTarget = mesh.position.clone().add(normal);
    mesh.lookAt(lookTarget);

    let wall2Node = new SGNode(mesh);
    // Add a flag so your collision code knows this is a static wall
    wall2Node.isWall = true;
    wall2Node.data.normal = normal;

    rootSG.add(wall2Node);

    return wall2Node;
}

/** Creates the ground and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @returns SGNode of the ground
 */
export function createGround(rootSG) {
    const geom = new THREE.BoxGeometry(400, 1, 400);
    const mat = createPhongMaterial(0x444444, textures.floor);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(-20, -84, 0);

    let groundNode = new SGNode(mesh);
    rootSG.add(groundNode);

    return groundNode;
}

/**
 * Creates the rolling ball and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @param {Function} getTimeCallback Function that returns the current simulation time
 * @param {SGNode} ramp1Node The ramp node
 * @param {SGNode} swingNode The swing node
 * @param {SGNode} ball2Node The second ball node
 * @param {SGNode} discNode The disc node
 * @param {SGNode} swingPivot The pivot node of the swing arm
 * @param {Function} setFocusCallback Callback to update the spotlight focus ball
 * @returns SGNode of the rolling ball
 */
export function createRollingBall(rootSG,
    getTimeCallback,
    ramp1Node,
    swingNode,
    ball2Node,
    discNode,
    swingPivot,
    setFocusCallback
) {
    const geom = new THREE.SphereGeometry(1, 32, 32);
    const mat = createPhongMaterial(0xff0000, textures.checkerboard);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(18, 5.2, 0);

    // Scene graph node
    let ballNode = new SGNode(mesh);
    ballNode.state = "WAITING";
    ballNode.data.gravity = new THREE.Vector3(0, -9.8, 0);
    ballNode.data.radius = 1;

    ballNode.setUpdateCallback((node, dt) => {
        if (node.state === "WAITING") {
            // We call the function to get the LIVE value of time from index.js
            if (getTimeCallback() > BALL_START_DELAY) {
                node.state = "ON_RAMP";
            } else {
                return;
            }
        }

        if (Physics.handleBarBallCollision(ballNode, swingNode, discNode, swingPivot)) {
            return; // collision handled
        }

        Physics.handleWallBallCollision(ballNode);
        Physics.handleWall2Collision(ballNode);
        // checkWallCollision(ballNode, wall2Node);
        Physics.handleGroundBallCollision(ballNode)
        Physics.handleBallBallCollison(ballNode, ball2Node, (ball) => {
            if (setFocusCallback) {
                setFocusCallback(ball);
            }
        });

        const ball = node.object3D;
        const ramp = ramp1Node.object3D;
        let rampEndX = 4;
        // console.log(node.state);
        if (node.state === "ON_RAMP") {

            // 1. Compute ramp normal
            ramp.updateMatrixWorld(true);
            const normal = new THREE.Vector3(0, 1, 0)
                .applyMatrix3(new THREE.Matrix3().setFromMatrix4(ramp.matrixWorld))
                .normalize();

            // 2. Gravity component parallel to ramp
            const g = node.data.gravity.clone();
            const g_parallel = g.clone().sub(normal.clone().multiplyScalar(g.dot(normal)));

            // 3. Accelerate along ramp
            node.velocity.add(g_parallel.multiplyScalar(dt));

            // 4. Update position
            ball.position.add(node.velocity.clone().multiplyScalar(dt));

            // 5. Check if ball leaves ramp
            if (ball.position.x < rampEndX) {
                node.state = "IN_AIR";
                // console.log("in freefall");
            }

        } else if (node.state === "IN_AIR") {

            // Free fall
            node.velocity.add(node.data.gravity.clone().multiplyScalar(dt));
            ball.position.add(node.velocity.clone().multiplyScalar(dt));

            // (Later: Collisions)

        }

        else if (node.state === "ON_GROUND") {

            // No gravity
            node.velocity.y = 0;

            // Slide/roll on ground
            const v = node.velocity.clone();
            v.y = 0; // force flat motion
            ball.position.add(v.multiplyScalar(dt));
            // return;
        }

        const velocity = node.velocity;
        const radius = node.data.radius;
        const speed = velocity.length();

        if (speed > 0.01) {
            // 1. Calculate rotation axis (perpendicular to velocity)
            const rotationAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize();

            // 2. Calculate angle of rotation based on distance traveled
            const distance = speed * dt;
            const angle = distance / radius;

            // 3. Create a delta rotation and apply it
            const deltaRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);
            ball.quaternion.premultiply(deltaRotation);
        }
    });

    rootSG.add(ballNode);

    return ballNode;
}

/** Creates the disc-pole-bar-swing structure and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @returns {[SGNode, SGNode, SGNode, SGNode, SGNode]} Nodes of the swing structure: swingNode, swingPivot, discNode, poleNode, barNode
 */
export function createDiscPoleBar(rootSG) {
    // ------------------------
    // 1. Disc
    // ------------------------
    const discGeom = new THREE.CylinderGeometry(3, 3, 0.2, 64);
    const discMat = createPhongMaterial(0x555555, textures.stone);
    const discMesh = new THREE.Mesh(discGeom, discMat);
    discMesh.position.set(-20.5, -22, 0);
    discMesh.scale.set(1.5, 1.5, 1.5);

    let discNode = new SGNode(discMesh);
    rootSG.add(discNode);

    // Initialize angle in data
    discNode.data.angle = 0;

    discNode.setUpdateCallback((self, dt) => {
        // Update data.angle instead of local variable
        self.data.angle += 0.5 * dt;
        self.object3D.rotation.y = self.data.angle;
    });

    // 2. Vertical Pole
    // ------------------------
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, 4, 16);
    const poleMat = createPhongMaterial(0xff0000, textures.rust);
    const poleMesh = new THREE.Mesh(poleGeom, poleMat);

    poleMesh.position.x = -2.8;
    poleMesh.position.y = 2;

    let poleNode = new SGNode(poleMesh);
    discNode.add(poleNode);

    // 3. Horizontal pole
    // ------------------------
    const barGeom = new THREE.CylinderGeometry(0.05, 0.05, 3, 16);
    const barMat = createPhongMaterial(0xff0000, textures.rust);
    const barMesh = new THREE.Mesh(barGeom, barMat);

    barMesh.rotation.z = Math.PI / 2;
    barMesh.position.y = 1.9;
    barMesh.position.x = -1.5;

    let barNode = new SGNode(barMesh);
    poleNode.add(barNode);

    // Position the pivot at the end of the horizontal bar
    let swingPivot = new SGNode(new THREE.Object3D());
    barNode.add(swingPivot);
    swingPivot.object3D.position.y = 4;

    // Initialize angle in data
    swingPivot.data.angle = 0;

    // Swinging pole
    const swingGeom = new THREE.CylinderGeometry(0.05, 0.05, 5, 16);
    const swingMat = createPhongMaterial(0x00ff00, textures.rust);
    const swingMesh = new THREE.Mesh(swingGeom, swingMat);
    swingMesh.rotation.z = Math.PI / 2;

    let swingNode = new SGNode(swingMesh);
    swingPivot.add(swingNode);
    swingNode.object3D.position.y = -2.5;
    swingNode.object3D.position.x = -2.5;
    swingNode.data.radius = 0.05;
    swingNode.data.length = 5;

    // Apply the swinging animation to the pivot
    swingPivot.setUpdateCallback((self, dt) => {
        // Update data.angle instead of local variable
        self.data.angle += 3 * dt;
        self.data.angularVelocity = 3;
        self.object3D.rotation.y = self.data.angle;
    });

    return [swingNode, swingPivot, discNode, poleNode, barNode];
}

/** Creates the second rolling ball and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @param {SGNode} dominoNode The domino node to interact with
 * @param {Function} handleBallDominoCollision Collision handler for ball-domino
 * @returns SGNode of the rolling ball
 */
export function createRollingBall2(rootSG, dominoNode, handleBallDominoCollision) {
    const geom = new THREE.SphereGeometry(2, 32, 32);
    const mat = createPhongMaterial(0xff0000, textures.metal);
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(-30, -81, 24.50727456099691);

    let ball2Node = new SGNode(mesh);
    ball2Node.data.radius = 2;

    rootSG.add(ball2Node);

    ball2Node.setUpdateCallback((node, dt) => {
        handleBallDominoCollision(node, dominoNode);
        const ball = node.object3D;
        const v = node.velocity.clone();
        ball.position.add(v.multiplyScalar(dt));
        const velocity = node.velocity;
        const radius = node.data.radius;
        const speed = velocity.length();

        if (speed > 0.01) {
            // 1. Calculate rotation axis (perpendicular to velocity)
            const rotationAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize();

            // 2. Calculate angle of rotation based on distance traveled
            const distance = speed * dt;
            const angle = distance / radius;

            // 3. Create a delta rotation and apply it
            const deltaRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);
            ball.quaternion.premultiply(deltaRotation);
        }

        return;
    });

    return ball2Node;
}

/** * Creates the domino and adds it to the scene graph.
 * @param {SGNode} rootSG Root of the SceneGraph
 * @returns SGNode of the domino
 */
export function createDomino(rootSG) {
    // --- 1. The Visible Domino Mesh ---
    const geom = new THREE.BoxGeometry(0.5, 10.0, 5.0); // width(x), height(y), depth(z)
    geom.computeBoundingBox();

    const mat = createPhongMaterial(0x888800);
    const mesh = new THREE.Mesh(geom, mat);

    // Translate the mesh UP so its bottom edge is at y=0 in its local space.
    mesh.position.y = 5.0; // Half of its height

    const dominoMeshNode = new SGNode(mesh);

    // --- 2. The Invisible Pivot Node ---
    // This node will sit on the ground and be the center of rotation.
    const pivot = new THREE.Object3D();
    pivot.position.set(30, -83, 24.50727456099691); // Position the pivot on the ground

    let dominoNode = new SGNode(pivot);
    dominoNode.add(dominoMeshNode); // Add the visible mesh as a child of the pivot

    // --- 3. Physics Data and Update Logic ---
    dominoNode.state = "STANDING";
    dominoNode.data = {
        angle: 0,
        angularVelocity: 0,
        // fallAxis is correct, we want to rotate around Z to fall along X.
        fallAxis: new THREE.Vector3(0, 0, 1),
        fallen: false
    };

    // Add the whole pivot assembly to the scene
    rootSG.add(dominoNode);

    dominoNode.setUpdateCallback((node, dt) => {
        if (node.state !== "TOPPLING") return;

        // integrate angle
        node.data.angle += node.data.angularVelocity * dt;

        // apply constant acceleration to fall faster
        node.data.angularVelocity += 3 * dt;

        // clamp, mark fallen
        if (node.data.angle > Math.PI / 2) {
            node.data.angle = Math.PI / 2;

            // --- NEW: Change Color ONCE when it finishes falling ---
            if (node.state !== "FALLEN") {
                node.state = "FALLEN";

                // 1. Get the child node that holds the mesh
                const meshNode = node.children[0];

                // 2. Access the material uniforms
                if (meshNode && meshNode.object3D.material.uniforms) {
                    // Change to GREEN (0x00FF00) to indicate success
                    meshNode.object3D.material.uniforms.u_objectColor.value.setHex(0x00FF00);
                }
            }
        }

        // update rotation of the PIVOT around the Z-axis
        node.object3D.rotation.z = -node.data.angle;
    });

    return dominoNode;
}