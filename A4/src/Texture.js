import * as THREE from 'three';

// This object will hold all loaded textures
export const textures = {};

// Create a single loader to use for all textures
const textureLoader = new THREE.TextureLoader();

/**
 * Loads all textures and returns a Promise that resolves when loading is complete.
 */
export function loadAllTextures() {
    const promises = [
        // Add each texture to load here
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/checkerboard_texture.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.checkerboard = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/brick.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.brick = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/floor.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.floor = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/grunge.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.grunge = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/redpaint.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.redpaint = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/rust.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.rust = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/stone.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.stone = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/wood.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.wood1 = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/metal.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.metal = texture;
        }),
        new Promise(resolve => {
            const texture = textureLoader.load('../assets/textures/concrete.jpg', resolve);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            textures.concrete = texture;
        }),


    ];

    // Promise.all waits for all the individual texture promises to resolve
    return Promise.all(promises);
}