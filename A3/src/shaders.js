const LIGHT_LOOP_LOGIC = `
    vec3 totalAmbient = vec3(0.0);
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    for(int i = 0; i < MAX_LIGHTS; i++) {
        // Position is already in View Space
        vec3 L = normalize(u_lights[i].position - viewPos);
        
        // Attenuation (Optional: 1.0 for now for simple direction/point logic)
        // If we want point lights to fade, we'd divide by distance squared here.

        // Ambient
        totalAmbient += (u_ka * u_lights[i].color);

        // Diffuse
        float diff = max(dot(N, L), 0.0);
        totalDiffuse += (u_kd * diff * u_lights[i].color);

        // Specular (Blinn-Phong)
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), u_shininess);
        totalSpecular += (u_ks * spec * u_lights[i].color);
    }
`;

// --- GOURAUD VERTEX SHADER ---
export const vsGouraud = `#version 300 es
#define MAX_LIGHTS 2
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

struct Light {
    vec3 position; // View Space
    vec3 color;
};

uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

uniform Light u_lights[MAX_LIGHTS]; // <--- Array of Lights
uniform vec3 u_objectColor;

uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;

out vec4 v_color;

void main() {
    vec4 viewPos4 = u_modelViewMatrix * vec4(a_position, 1.0);
    vec3 viewPos = viewPos4.xyz;
    vec3 N = normalize(u_normalMatrix * a_normal);
    vec3 V = normalize(-viewPos);

    ${LIGHT_LOOP_LOGIC}

    // Combine: (SumAmbient + SumDiffuse) * ObjectColor + SumSpecular
    vec3 finalColor = (totalAmbient + totalDiffuse) * u_objectColor + totalSpecular;

    v_color = vec4(finalColor, 1.0);
    gl_Position = u_projectionMatrix * viewPos4;
}
`;

export const fsGouraud = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;
void main() {
    fragColor = v_color;
}
`;


// --- PHONG VERTEX SHADER (Standard Pass-through) ---
export const vsPhong = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;

out vec3 v_normal;
out vec3 v_viewPosition;

void main() {
    vec4 viewPos4 = u_modelViewMatrix * vec4(a_position, 1.0);
    v_viewPosition = viewPos4.xyz;
    v_normal = u_normalMatrix * a_normal;
    gl_Position = u_projectionMatrix * viewPos4;
}
`;

// --- PHONG FRAGMENT SHADER ---
export const fsPhong = `#version 300 es
precision mediump float;
#define MAX_LIGHTS 2

struct Light {
    vec3 position;
    vec3 color;
};

in vec3 v_normal;
in vec3 v_viewPosition;

uniform Light u_lights[MAX_LIGHTS]; // <--- Array of Lights
uniform vec3 u_objectColor;

uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;

out vec4 fragColor;

void main() {
    vec3 N = normalize(v_normal);
    vec3 viewPos = v_viewPosition;
    vec3 V = normalize(-viewPos);

    ${LIGHT_LOOP_LOGIC}

    vec3 result = (totalAmbient + totalDiffuse) * u_objectColor + totalSpecular;
    fragColor = vec4(result, 1.0);
}
`;