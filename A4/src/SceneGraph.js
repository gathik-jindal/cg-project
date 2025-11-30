// CHANGE THE TOP LINE TO THIS:
import * as THREE from 'three';

// SceneGraph.js
export class SGNode {
    constructor(object3D = null) {
        this.object3D = object3D;   // Three.js Object3D
        this.children = [];
        this.parent = null;
        this.state = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.data = {};
        this.updateFunc = null;     // Animation callback
    }

    add(child) {
        child.parent = this;
        this.children.push(child);
        if (this.object3D && child.object3D)
            this.object3D.add(child.object3D);
    }

    setUpdateCallback(updateFunc) {
        this.updateFunc = updateFunc;
    }

    update(dt) {
        if (this.updateFunc)
            this.updateFunc(this, dt);

        for (let child of this.children)
            child.update(dt);
    }
}
