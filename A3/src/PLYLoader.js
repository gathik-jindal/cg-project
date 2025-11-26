/**
 * A simple .ply file parser.
 * This parser assumes the file is in ASCII format.
 * It extracts vertex positions and face indices, supporting both triangles and quads.
 *
 * @param {string} plyText - The raw text content of the .ply file.
 * @returns {object} An object with { positions: Float32Array, indices: Uint16Array }
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
                // --- THIS IS THE UPDATED LOGIC ---
                const numVerticesInFace = parseInt(parts[0]);

                if (numVerticesInFace === 3) {
                    // It's a triangle.
                    indices.push(parseInt(parts[1]));
                    indices.push(parseInt(parts[2]));
                    indices.push(parseInt(parts[3]));

                } else if (numVerticesInFace === 4) {
                    // It's a quad. We must tessellate it (split into two triangles).
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
                // --- END UPDATED LOGIC ---

                facesRead++;

                if (facesRead === faceCount) {
                    // We've read all the faces, we can stop.
                    break;
                }
                break;
        }
    }

    // console.log(`PLY Parser Results (${vertexCount}v, ${faceCount}f):
    //     - Vertices read: ${ verticesRead } (Positions: ${ positions.length })
    //   - Faces read:   ${ facesRead } (Indices: ${ indices.length })`);

    return {
        positions: new Float32Array(positions),
        indices: new Uint16Array(indices),
        normals: new Float32Array(normals),
    };
}


/**
 * Fetches a .ply file from the given URL and parses it.
 * (This function remains unchanged)
 *
 * @param {string} url - The path to the .ply file.
 * @returns {Promise<object>} A promise that resolves with the parsed geometry
 * { positions: Float32Array, indices: Uint16Array }.
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