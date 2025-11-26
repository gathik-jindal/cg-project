export const vsGouraud = `#version 300 es
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_normal;

    // Matrices
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat3 u_normalMatrix;

    // Light Properties
    uniform vec3 u_lightPosition; // In View Space
    uniform vec3 u_lightColor;

    // Material Properties
    uniform float u_ka; // Ambient constant
    uniform float u_kd; // Diffuse constant
    uniform float u_ks; // Specular constant
    uniform float u_shininess;

    // Output to Fragment Shader
    out vec4 v_color;

    void main() {
        // 1. Transform Position and Normal to View Space
        vec4 viewPos4 = u_modelViewMatrix * vec4(a_position, 1.0);
        vec3 viewPos = viewPos4.xyz;
        
        // Transform normal and normalize it
        vec3 N = normalize(u_normalMatrix * a_normal);

        // 2. Light Direction (from vertex to light)
        vec3 L = normalize(u_lightPosition - viewPos);

        // 3. View Direction (from vertex to camera/eye)
        // In View Space, the camera is at (0,0,0), so ViewDir is just -viewPos
        vec3 V = normalize(-viewPos);

        // 4. Calculate Lighting Components
        
        // Ambient
        vec3 ambient = u_ka * u_lightColor;

        // Diffuse (Lambertian)
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = u_kd * diff * u_lightColor;

        // Specular (Blinn-Phong)
        // Halfway vector between Light and View
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), u_shininess);
        vec3 specular = u_ks * spec * u_lightColor;

        // 5. Combine
        vec3 finalColor = ambient + diffuse + specular;

        // Output with full opacity
        v_color = vec4(finalColor, 1.0);
        
        // Standard position output
        gl_Position = u_projectionMatrix * viewPos4;
    }
`;

export const fsGouraud = `#version 300 es
    precision mediump float;

    in vec4 v_color;
    out vec4 fragColor;

    void main() {
        // Gouraud shading just passes the interpolated color
        fragColor = v_color;
    }
`;