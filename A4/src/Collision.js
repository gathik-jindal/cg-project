import * as THREE from 'three';

// --- UTILITY FUNCTIONS ---

/**
 * Finds the closest point on a line segment to a given point.
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

/**
 * Calculates the velocity of a point on the swinging bar.
 * Dependencies (discNode, swingPivot) are now passed in.
 */
export function computeBarVelocity(closestPoint, discNode, swingPivot) {
    const discAngularSpeed = 0.5;
    const discOrigin = discNode.object3D.position.clone();
    const discAxis = new THREE.Vector3(0, 1, 0);

    const swingAngularSpeed = 3.0;
    const swingPivotObj = swingPivot.object3D;
    const pivotPos = new THREE.Vector3().setFromMatrixPosition(swingPivotObj.matrixWorld);
    const swingAxis = new THREE.Vector3(0, 1, 0).transformDirection(swingPivotObj.matrixWorld).normalize();

    const r_pivot = pivotPos.clone().sub(discOrigin);
    const v_pivot = new THREE.Vector3().crossVectors(discAxis.clone().multiplyScalar(discAngularSpeed), r_pivot);

    const r_point = closestPoint.clone().sub(pivotPos);
    const v_point_rel = new THREE.Vector3().crossVectors(swingAxis.multiplyScalar(swingAngularSpeed), r_point);

    return v_pivot.add(v_point_rel);
}

/**
 * Checks for collision between a sphere and an Axis-Aligned Bounding Box (AABB).
 */
export function sphereAABBCollision(ballPos, radius, box) {
    const closest = new THREE.Vector3(
        THREE.MathUtils.clamp(ballPos.x, box.min.x, box.max.x),
        THREE.MathUtils.clamp(ballPos.y, box.min.y, box.max.y),
        THREE.MathUtils.clamp(ballPos.z, box.min.z, box.max.z)
    );
    return closest.distanceTo(ballPos) <= radius;
}


// --- COLLISION HANDLERS ---

export function handleGroundBallCollision(ballNode) {
    const ball = ballNode.object3D;
    const pos = ball.position;
    const vel = ballNode.velocity;
    const r = ballNode.data.radius;
    const GROUND_Y = -83;

    if (pos.y - r <= GROUND_Y) {
        pos.y = GROUND_Y + r;
        vel.y = 0;
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
    const REST = 0.6;

    if (pos.z - r <= WALL_Z && vel.z < 0) {
        pos.z = WALL_Z + r;
        vel.z = -vel.z * REST;
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
        vel.x = speed;
        vel.y = 0;
        vel.z = 0;
    }
}

export function handleBarBallCollision(ballNode, barNode, discNode, swingPivot) {
    const ball = ballNode.object3D;
    const bar = barNode.object3D;
    const ballRadius = ballNode.data.radius;
    const barRadius = barNode.data.radius;
    const barLength = barNode.data.length;

    ball.updateMatrixWorld(true);
    const C = new THREE.Vector3().setFromMatrixPosition(ball.matrixWorld);

    bar.updateMatrixWorld(true);
    const A = new THREE.Vector3(0, -barLength / 2, 0).applyMatrix4(bar.matrixWorld);
    const B = new THREE.Vector3(0, barLength / 2, 0).applyMatrix4(bar.matrixWorld);

    const { distance, closestPoint } = distPointToSegment(C, A, B);
    const minDist = ballRadius + barRadius;

    if (distance < minDist) {
        const normal = C.clone().sub(closestPoint).normalize();
        const vBall = ballNode.velocity.clone();
        const vBar = computeBarVelocity(closestPoint, discNode, swingPivot);
        const vRel = vBall.clone().sub(vBar);
        const velAlongNormal = vRel.dot(normal);

        if (velAlongNormal < 0) {
            const restitution = 1.2;
            const j = -(1 + restitution) * velAlongNormal;
            const impulse = normal.clone().multiplyScalar(j);
            ballNode.velocity.add(impulse);

            const overlap = minDist - distance;
            ball.position.add(normal.multiplyScalar(overlap + 0.01));
        }
        ballNode.state = "IN_AIR";
        return true;
    }
    return false;
}

export function handleBallBallCollison(ballA, ballB) {
    const posA = ballA.object3D.position;
    const posB = ballB.object3D.position;
    const radiusA = ballA.data.radius;
    const radiusB = ballB.data.radius;

    if (!radiusA || !radiusB) return false;

    const distance = posA.distanceTo(posB);
    const sumOfRadii = radiusA + radiusB;

    if (distance > sumOfRadii) {
        return false; // No collision
    }

    // This function now returns true on collision but does NOT change the spotlight focus.
    // That logic belongs in the caller.

    const uA = ballA.velocity.x;
    const uB = ballB.velocity.x;
    const mA = 1;
    const mB = 2;

    const vA = ((uA * (mA - mB)) + (2 * mB * uB)) / (mA + mB);
    const vB = ((uB * (mB - mA)) + (2 * mA * uA)) / (mA + mB);

    ballA.velocity.x = vA;
    ballB.velocity.x = vB;
    ballA.velocity.y = 0;
    ballA.velocity.z = 0;
    ballB.velocity.y = 0;
    ballB.velocity.z = 0;

    return true;
}

export function handleBallDominoCollision(ballNode, dominoNode) {
    if (dominoNode.state == "FALLEN") { ballNode.velocity.set(0, 0, 0) }
    if (dominoNode.state !== "STANDING") return false;

    const ball = ballNode.object3D;
    const ballPos = ball.position.clone();
    const r = ballNode.data.radius;
    const dominoMesh = dominoNode.children[0].object3D;
    const box = dominoMesh.geometry.boundingBox.clone();
    box.applyMatrix4(dominoMesh.matrixWorld);

    if (sphereAABBCollision(ballPos, r, box)) {
        dominoNode.state = "TOPPLING";
        dominoNode.data.angularVelocity = 1.0;
        ballNode.velocity.set(0, 0, 0);
        return true;
    }
    return false;
}