import * as THREE from 'three';
import { SGNode } from './SceneGraph.js';

/**
 * Computes the shortest distance from point P to the line segment AB.
 * @param {THREE.Vector3} P The point.
 * @param {THREE.Vector3} A The start point of the segment.
 * @param {THREE.Vector3} B The end point of the segment.
 * @returns {Object} An object
 * containing:
 *  distance: The shortest distance from P to segment AB.
 *  closestPoint: The closest point on segment AB to point P.
 *  t: The parameter t (0 <= t <= 1) indicating the position on segment AB.
 */
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

/** Computes the velocity of a point on the rotating bar at the closest point to a collision.
 * @param {THREE.Vector3} closestPoint The closest point on the bar to the collision.
 * @param {SGNode} discNode The disc node (parent of the swing and bar).
 * @param {SGNode} swingPivot The pivot node of the swing arm.
 * @returns {THREE.Vector3} The velocity vector of the bar at the closest point.
 */
export function computeBarVelocity(closestPoint, discNode, swingPivot) {
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

/** Handles collision between the ball and the ground.
 * @param {SGNode} ballNode The ball node.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
export function handleGroundBallCollision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r = ballNode.data.radius;

    const GROUND_Y = -83;   // <-- your ground height

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

/** Handles collision between the ball and the wall.
 * @param {SGNode} ballNode The ball node.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
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

/** Handles collision between the ball and the second wall.
 * @param {SGNode} ballNode The ball node.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
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

/** Handles collision between the ball and the bar.
 * @param {SGNode} ballNode The ball node.
 * @param {SGNode} barNode The bar node.
 * @param {SGNode} discNode The disc node (parent of the bar).
 * @param {SGNode} swingPivot The pivot node of the swing arm.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
export function handleBarBallCollision(ballNode, barNode, discNode, swingPivot) {
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
        const vBar = computeBarVelocity(closestPoint, discNode, swingPivot);

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

/** Handles collision between two balls and updates their velocities.
 * @param {SGNode} ballA The first ball node.
 * @param {SGNode} ballB The second ball node.
 * @param {Function} onCollision Callback function to execute on collision.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
export function handleBallBallCollison(ballA, ballB, onCollision) {
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

    onCollision(ballB);

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

/** Checks for collision between a sphere and an axis-aligned bounding box (AABB).
 * @param {THREE.Vector3} ballPos The center position of the sphere.
 * @param {number} radius The radius of the sphere.
 * @param {THREE.Box3} box The axis-aligned bounding box.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
export function sphereAABBCollision(ballPos, radius, box) {
    const closest = new THREE.Vector3(
        THREE.MathUtils.clamp(ballPos.x, box.min.x, box.max.x),
        THREE.MathUtils.clamp(ballPos.y, box.min.y, box.max.y),
        THREE.MathUtils.clamp(ballPos.z, box.min.z, box.max.z)
    );

    return closest.distanceTo(ballPos) <= radius;
}

/** Handles collision between the ball and a domino.
 * @param {SGNode} ballNode The ball node.
 * @param {SGNode} dominoNode The domino node.
 * @returns {boolean} True if a collision occurred, false otherwise.
 */
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