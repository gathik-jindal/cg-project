// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SGNode } from './SceneGraph.js';

let scene, camera, renderer;
let rootSG;           // Root of Scene Graph
let clock;
let discNode, poleNode, barNode, swingNode, swingPivot, ballNode, ramp1Node, wallNode;
const BALL_START_DELAY = 2.21; // seconds

init();
animate();

function init() {
    // --- Basic Scene ---
    scene = new THREE.Scene();

    // --- Camera ---
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    // camera.position.set(-20, -20, -42);
    camera.position.set(-120, -50, -20);
    // camera.position.set(0,0,0);


    camera.lookAt(0, -50, -20);
    // camera.lookAt(-50, -58, -42);


    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Scene Graph Root ---
    rootSG = new SGNode(scene);

    clock = new THREE.Clock();

    createRamp1();
    createWall();
    createRollingBall();
    createDiscPoleBar();

    window.addEventListener('resize', onResize);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function distPointToSegment(P, A, B) {
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

function computeBarVelocity(barNode, closestPoint) {
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

function handleWallBallCollision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r   = ballNode.data.radius;

    const WALL_Z = -40;
    const REST = 0.6;     // 0 = dead stop, 1 = perfect bounce

    // Check collision
    if (pos.z - r <= WALL_Z && vel.z < 0) {

        // Snap ball outside the wall so it does not sink in
        pos.z = WALL_Z + r;

        // Bounce (reflect z component)
        vel.z = -vel.z * REST;

        return true;
    }

    return false;
}


function handleBarBallCollision(ballNode, barNode) {
    const ball = ballNode.object3D;
    const bar  = barNode.object3D;

    const ballRadius = ballNode.data.radius;
    const barRadius  = barNode.data.radius;
    const barLength  = barNode.data.length;

    // 1. Ball center
    ball.updateMatrixWorld(true);
    const C = new THREE.Vector3().setFromMatrixPosition(ball.matrixWorld);

    // 2. Bar endpoints (in world space)
    bar.updateMatrixWorld(true);
    // Note: Your bar geometry is rotated, so we ensure we get the correct top/bottom points
    // Cylinder is usually Y-aligned, but you rotated Z. Let's rely on matrix transformation.
    const A = new THREE.Vector3(0, -barLength/2, 0).applyMatrix4(bar.matrixWorld);
    const B = new THREE.Vector3(0, barLength/2, 0).applyMatrix4(bar.matrixWorld);

    // 3. Check Distance
    const { distance, closestPoint } = distPointToSegment(C, A, B);
    const minDist = ballRadius + barRadius;

    if (distance < minDist) {
        
        // --- PHYSICS RESPONSE ---
        
        // 1. Calculate Normal (Direction from Bar -> Ball)
        const normal = C.clone().sub(closestPoint).normalize();

        // 2. Get velocities
        const vBall = ballNode.velocity.clone();
        const vBar  = computeBarVelocity(barNode, closestPoint);

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
            console.log(ballNode.velocity);
            
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


// -----------------------
// Ground
// -----------------------
function createRamp1() {
    const geom = new THREE.BoxGeometry(20, 0.2, 3);
    const mat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(10, -0.5, 0);
    mesh.rotation.z = Math.PI/6;

    ramp1Node = new SGNode(mesh);
    rootSG.add(ramp1Node);
}

function createWall() {
    const geom = new THREE.BoxGeometry(50, 50, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(-50, -58, -40);
   

    wallNode = new SGNode(mesh);
    rootSG.add(wallNode);
}


// -----------------------
// Rolling ball
// -----------------------
function createRollingBall() {
    const geom = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);


    mesh.position.set(18, 5.2, 0);

    // Scene graph node
    ballNode = new SGNode(mesh);

    ballNode.state = "WAITING"; 
    ballNode.data.gravity = new THREE.Vector3(0, -9.8, 0);
    ballNode.data.radius = 1;

    ballNode.setUpdateCallback((node, dt) => {

        if (node.state === "WAITING") {
            if (clock.getElapsedTime() > BALL_START_DELAY) {
                node.state = "ON_RAMP"; // Time's up, start rolling
            } else {
                return; // Do nothing until the delay has passed
            }
        }

        if (handleBarBallCollision(ballNode, swingNode)) {
            return; // collision handled
        }

        handleWallBallCollision(ballNode);

        const ball = node.object3D;
        const ramp = ramp1Node.object3D;
        let rampEndX=4;
        console.log(node.state);
        if (node.state === "ON_RAMP") {
    
            // 1. Compute ramp normal
            ramp.updateMatrixWorld(true);
            const normal = new THREE.Vector3(0,1,0)
                .applyMatrix3(new THREE.Matrix3().setFromMatrix4(ramp.matrixWorld))
                .normalize();
    
            // 2. Gravity component parallel to ramp
            const g = node.data.gravity.clone();
            const g_parallel = g.clone().sub( normal.clone().multiplyScalar(g.dot(normal)) );
    
            // 3. Accelerate along ramp
            node.velocity.add( g_parallel.multiplyScalar(dt) );
    
            // 4. Update position
            ball.position.add( node.velocity.clone().multiplyScalar(dt) );
    
            // 5. Check if ball leaves ramp
            if (ball.position.x < rampEndX) {
                node.state = "IN_AIR";
                console.log("in freefall");
            }
    
        } else if (node.state === "IN_AIR") {
    
            // Free fall
            node.velocity.add( node.data.gravity.clone().multiplyScalar(dt) );
            ball.position.add( node.velocity.clone().multiplyScalar(dt) );
    
            // (Later: Collisions)
    
        }
    });
    

    rootSG.add(ballNode);
}

function createDiscPoleBar() {
    // ------------------------
    // 1. Disc
    // ------------------------
    const discGeom = new THREE.CylinderGeometry(3, 3, 0.2, 64);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x555555});
    const discMesh = new THREE.Mesh(discGeom, discMat);
    discMesh.position.set(-20.5, -22, 0);
    discMesh.scale.set(1.5, 1.5, 1.5);
    discNode = new SGNode(discMesh);
    rootSG.add(discNode);
    let angle = 0;
    let pivot_angle = 0;

    discNode.setUpdateCallback((self, dt) => {
        angle += 0.5 * dt;
        self.object3D.rotation.y = angle;
    });

    // 2. Vertical Pole
    // ------------------------
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, 4, 16);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const poleMesh = new THREE.Mesh(poleGeom, poleMat);
    

    poleMesh.position.x = -2.8;  // half of the pole height
    poleMesh.position.y = 2;

    poleNode = new SGNode(poleMesh);
    discNode.add(poleNode);

    // Pole motion around circle boundary
    const radius = 5;

    // ------------------------
    // 3. Horizontal pole
    // ------------------------
    const barGeom = new THREE.CylinderGeometry(0.05, 0.05, 3, 16);
    const barMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const barMesh = new THREE.Mesh(barGeom, barMat);

    barMesh.rotation.z = Math.PI / 2; // make it horizontal
    barMesh.position.y = 1.9; // same height as pole top
    barMesh.position.x = -1.5;

    barNode = new SGNode(barMesh);
    poleNode.add(barNode);

    // Position the pivot at the end of the horizontal bar
    swingPivot = new SGNode(new THREE.Object3D());
    barNode.add(swingPivot);
    swingPivot.object3D.position.y= 4;


    //Swinging pole
    const swingGeom = new THREE.CylinderGeometry(0.05, 0.05, 5, 16);
    const swingMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const swingMesh = new THREE.Mesh(swingGeom, swingMat);
    swingMesh.rotation.z = Math.PI / 2; // make it horizontal

    // The cylinder's origin is at its center.
    // Translate it down by half its height so the top is at the pivot point.

    swingNode = new SGNode(swingMesh);
    // Add the swing to the pivot, not the bar
    swingPivot.add(swingNode);
    swingNode.object3D.position.y = -2.5;
    swingNode.object3D.position.x = -2.5;
    swingNode.data.radius = 0.05; // <-- ADD THIS
    swingNode.data.length = 5;

    // Apply the swinging animation to the pivot
    swingPivot.setUpdateCallback((self, dt) => {
        pivot_angle+=3*dt;
        swingPivot.data.angularVelocity = 3;
        // Use Math.sin for a back-and-forth swinging motion
        self.object3D.rotation.y = pivot_angle;

        
    });


}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Update entire Scene Graph
    rootSG.update(dt);

    renderer.render(scene, camera);
}
