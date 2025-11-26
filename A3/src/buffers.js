/**
 * Initializes the Vertex Array Object (VAO) and buffers for the mesh.
 * @param {WebGL2RenderingContext} gl
 * @param {object} plyData - Contains { positions, normals, indices } from PLYLoader
 * @returns {object} { vao, elementCount }
 */
export function initBuffers(gl, plyData) {
    // 1. Create a Vertex Array Object (VAO)
    // The VAO remembers all the attribute states we set below.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // --- Position Buffer (Attribute Location 0) ---
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plyData.positions, gl.STATIC_DRAW);

    // Enable attribute 0 (a_position)
    gl.enableVertexAttribArray(0);
    // Tell WebGL how to read 3 floats (x, y, z) from the buffer
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);


    // --- Normal Buffer (Attribute Location 1) ---
    // Critical for Gouraud/Phong shading
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plyData.normals, gl.STATIC_DRAW);

    // Enable attribute 1 (a_normal)
    gl.enableVertexAttribArray(1);
    // Tell WebGL how to read 3 floats (nx, ny, nz)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);


    // --- Index Buffer (Element Array Buffer) ---
    // This allows us to reuse vertices using the indices array
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plyData.indices, gl.STATIC_DRAW);

    // Unbind the VAO to prevent accidental modification
    gl.bindVertexArray(null);

    return {
        vao: vao,
        elementCount: plyData.indices.length
    };
}