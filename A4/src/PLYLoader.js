function recalculateNormals(positions, indices) {
    const normals = new Float32Array(positions.length);

    // 1. Accumulate Face Normals
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // Get vertices
        const v0x = positions[i0 * 3], v0y = positions[i0 * 3 + 1], v0z = positions[i0 * 3 + 2];
        const v1x = positions[i1 * 3], v1y = positions[i1 * 3 + 1], v1z = positions[i1 * 3 + 2];
        const v2x = positions[i2 * 3], v2y = positions[i2 * 3 + 1], v2z = positions[i2 * 3 + 2];

        // Edge vectors
        const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
        const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;

        // Cross Product (Face Normal)
        const nx = e1y * e2z - e1z * e2y;
        const ny = e1z * e2x - e1x * e2z;
        const nz = e1x * e2y - e1y * e2x;

        // Add to the vertex normals
        normals[i0 * 3] += nx; normals[i0 * 3 + 1] += ny; normals[i0 * 3 + 2] += nz;
        normals[i1 * 3] += nx; normals[i1 * 3 + 1] += ny; normals[i1 * 3 + 2] += nz;
        normals[i2 * 3] += nx; normals[i2 * 3 + 1] += ny; normals[i2 * 3 + 2] += nz;
    }

    // 2. Normalize results
    for (let i = 0; i < normals.length; i += 3) {
        const x = normals[i];
        const y = normals[i + 1];
        const z = normals[i + 2];

        // Avoid division by zero
        let len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0) {
            len = 1.0 / len; // multiplication is faster than division
            normals[i] *= len;
            normals[i + 1] *= len;
            normals[i + 2] *= len;
        }
    }

    return normals;
}

/**
 * Normalizes the geometry by centering it at (0,0,0) and scaling it
 * so its largest dimension is exactly 1.0.
 *
 * @param {Float32Array} positions - The vertex positions array [x, y, z, x, y, z, ...]
 */
function normalizeGeometry(positions) {
    if (positions.length === 0) return;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // Calculate Bounding Box
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;

        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }

    // Calculate Center and Size
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    // Find the largest dimension
    const maxDim = Math.max(sizeX, sizeY, sizeZ);
    // Determine scale factor (target size 1.0)
    const scale = maxDim > 0 ? 1.0 / maxDim : 1.0;

    // Center and Scale in place
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (positions[i] - centerX) * scale;
        positions[i + 1] = (positions[i + 1] - centerY) * scale;
        positions[i + 2] = (positions[i + 2] - centerZ) * scale;
    }

    console.log(`Normalized Geometry: Center moved from [${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)}] to Origin. Scaled by ${scale.toFixed(4)}.`);
}

/**
 * A simple .ply file parser.
 * This parser assumes the file is in ASCII format.
 * It extracts vertex positions and face indices, supporting both triangles and quads. It also extracts normals if present else all
 * are replaced with (0,0,0).
 *
 * @param {string} plyText - The raw text content of the .ply file.
 * @returns {object} An object with { positions: Float32Array, indices: Uint16Array, normals: Float32Array }.
 */
function parsePLY(plyText) {
    const lines = plyText.split('\n');
    const positions = [];
    const indices = [];
    const normals = [];

    let vertexCount = 0;
    let faceCount = 0;

    let verticesRead = 0;
    let facesRead = 0;

    const STATE = {
        HEADER: 0,
        READING_VERTICES: 1,
        READING_FACES: 2
    };
    let currentState = STATE.HEADER;

    let foundNormals = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            continue;
        }

        const parts = trimmedLine.split(' ');

        switch (currentState) {
            case STATE.HEADER:
                if (parts[0] === 'element' && parts[1] === 'vertex') {
                    vertexCount = parseInt(parts[2]);
                } else if (parts[0] === 'element' && parts[1] === 'face') {
                    faceCount = parseInt(parts[2]);
                } else if (parts[0] === 'end_header') {
                    currentState = STATE.READING_VERTICES;
                }
                break;

            case STATE.READING_VERTICES:
                positions.push(parseFloat(parts[0])); // x
                positions.push(parseFloat(parts[1])); // y
                positions.push(parseFloat(parts[2])); // z
                verticesRead++;

                // Assuming normals (nx, ny, nz) are properties 3, 4, 5
                if (parts.length >= 6) {
                    normals.push(parseFloat(parts[3])); // nx
                    normals.push(parseFloat(parts[4])); // ny
                    normals.push(parseFloat(parts[5])); // nz
                    foundNormals = true;
                } else {
                    // No normal data found. Push a default (0,0,0).
                    // This will look bad, but won't crash.
                    normals.push(0.0);
                    normals.push(0.0);
                    normals.push(0.0);
                }

                if (verticesRead === vertexCount) {
                    currentState = STATE.READING_FACES;
                }
                break;

            case STATE.READING_FACES:
                const numVerticesInFace = parseInt(parts[0]);

                if (numVerticesInFace === 3) {
                    // It's a triangle.
                    indices.push(parseInt(parts[1]));
                    indices.push(parseInt(parts[2]));
                    indices.push(parseInt(parts[3]));

                } else if (numVerticesInFace === 4) {
                    // It's a quad. must tessellate it (split into two triangles).
                    // Quad vertices: v0, v1, v2, v3
                    // Triangle 1: (v0, v1, v2)
                    indices.push(parseInt(parts[1])); // v0
                    indices.push(parseInt(parts[2])); // v1
                    indices.push(parseInt(parts[3])); // v2

                    // Triangle 2: (v0, v2, v3) 
                    indices.push(parseInt(parts[1])); // v0
                    indices.push(parseInt(parts[3])); // v2
                    indices.push(parseInt(parts[4])); // v3
                }

                facesRead++;

                if (facesRead === faceCount) {
                    break;
                }
                break;
        }
    }

    // Convert to TypedArrays first
    const posArray = new Float32Array(positions);
    const idxArray = new Uint16Array(indices);
    let normArray = new Float32Array(normals);

    normalizeGeometry(posArray);

    // If the file didn't have normals, calculate them now
    if (!foundNormals) {
        console.log("Generating missing normals...");
        normArray = recalculateNormals(posArray, idxArray);
        console.log("Normals generated.");
    }

    return {
        positions: posArray,
        indices: idxArray,
        normals: normArray,
    };
}

/**
 * Fetches a .ply file from the given URL and parses it.
 *
 * @param {string} url - The path to the .ply file.
 * @returns {Promise<object>} A promise that resolves with the parsed geometry
 * { positions: Float32Array, indices: Uint16Array, normals: Float32Array }.
 */
export async function loadPLY(url) {
    try {
        console.log(`Loading PLY: ${url} `);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText} `);
        }
        const plyText = await response.text();
        return parsePLY(plyText);
    } catch (error) {
        console.error(`Error loading PLY file ${url}: `, error);
        throw error;
    }
}