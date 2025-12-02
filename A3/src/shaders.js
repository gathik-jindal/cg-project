// --- GOURAUD VERTEX SHADER ---
// Lighting is calculated per-vertex and interpolated across the triangle
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

uniform Light u_lights[MAX_LIGHTS];

uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;

uniform int u_texMapping; // 0=none, 1=spherical, 2=cylindrical

out vec4 v_lightingColor; // RGB: ambient+diffuse, A: specular
out vec2 v_texCoord;

const float PI = 3.14159265359;

void main() {
    // Transform position to view space
    vec4 viewPos4 = u_modelViewMatrix * vec4(a_position, 1.0);
    vec3 viewPos = viewPos4.xyz;
    
    // Transform normal to view space
    vec3 N = normalize(u_normalMatrix * a_normal);
    vec3 V = normalize(-viewPos);

    // Generate texture coordinates based on mapping type
    vec2 texCoord = vec2(0.0);
    if (u_texMapping == 1) {
        // Spherical mapping
        vec3 norm_pos = normalize(a_position);
        float theta = atan(norm_pos.x, norm_pos.z);
        float phi = acos(clamp(norm_pos.y, -1.0, 1.0));
        texCoord = vec2(theta / (2.0 * PI) + 0.5, phi / PI);
    } else if (u_texMapping == 2) {
        // Cylindrical mapping
        vec3 norm_pos = normalize(a_position);
        float theta = atan(norm_pos.x, norm_pos.z);
        float height = norm_pos.y;
        texCoord = vec2(theta / (2.0 * PI) + 0.5, height * 0.5 + 0.5);
    }
    v_texCoord = texCoord;
    
    // Calculate lighting per vertex
    vec3 totalAmbient = vec3(0.0);
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    for(int i = 0; i < MAX_LIGHTS; i++) {
        vec3 L = normalize(u_lights[i].position - viewPos);
        
        // Ambient component
        totalAmbient += (u_ka * u_lights[i].color);

        // Diffuse component
        float diff = max(dot(N, L), 0.0);
        totalDiffuse += (u_kd * diff * u_lights[i].color);

        // Specular component (Blinn-Phong)
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), u_shininess);
        totalSpecular += (u_ks * spec * u_lights[i].color);
    }

    // Pack lighting into vec4: RGB for ambient+diffuse, A for specular intensity
    vec3 ambientDiffuse = totalAmbient + totalDiffuse;
    float specularIntensity = (totalSpecular.r + totalSpecular.g + totalSpecular.b) / 3.0;
    v_lightingColor = vec4(ambientDiffuse, specularIntensity);

    gl_Position = u_projectionMatrix * viewPos4;
}
`;

export const fsGouraud = `#version 300 es
precision mediump float;

in vec4 v_lightingColor;
in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform vec3 u_objectColor;
uniform bool u_useTexture; // Pass this instead of u_texMapping

out vec4 fragColor;

void main() {
    // Get base color from texture or uniform
    vec3 baseColor = u_objectColor;
    if (u_useTexture) {
        baseColor = texture(u_texture, v_texCoord).rgb;
    }

    // Unpack interpolated lighting
    vec3 ambientDiffuse = v_lightingColor.rgb;
    float specularIntensity = v_lightingColor.a;

    // Combine: (ambient + diffuse) * baseColor + specular
    vec3 result = ambientDiffuse * baseColor + vec3(specularIntensity);
    fragColor = vec4(result, 1.0);
}
`;


// --- PHONG VERTEX SHADER ---
// Just passes data to fragment shader where lighting is calculated per-pixel
export const vsPhong = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat3 u_normalMatrix;
uniform int u_texMapping; // 0=none, 1=spherical, 2=cylindrical

out vec3 v_normal;
out vec3 v_viewPosition;
out vec2 v_texCoord;

const float PI = 3.14159265359;

void main() {
    // Transform to view space
    vec4 viewPos4 = u_modelViewMatrix * vec4(a_position, 1.0);
    v_viewPosition = viewPos4.xyz;
    v_normal = u_normalMatrix * a_normal;

    // Generate texture coordinates
    vec2 texCoord = vec2(0.0);
    if (u_texMapping == 1) {
        // Spherical mapping
        vec3 norm_pos = normalize(a_position);
        float theta = atan(norm_pos.x, norm_pos.z);
        float phi = acos(clamp(norm_pos.y, -1.0, 1.0));
        texCoord = vec2(theta / (2.0 * PI) + 0.5, phi / PI);
    } else if (u_texMapping == 2) {
        // Cylindrical mapping
        vec3 norm_pos = normalize(a_position);
        float theta = atan(norm_pos.x, norm_pos.z);
        float height = norm_pos.y;
        texCoord = vec2(theta / (2.0 * PI) + 0.5, height * 0.5 + 0.5);
    }
    v_texCoord = texCoord;

    gl_Position = u_projectionMatrix * viewPos4;
}
`;

// --- PHONG FRAGMENT SHADER ---
// Lighting calculated per-pixel for higher quality
export const fsPhong = `#version 300 es
precision mediump float;
#define MAX_LIGHTS 2

struct Light {
    vec3 position; // View Space
    vec3 color;
};

in vec3 v_normal;
in vec3 v_viewPosition;
in vec2 v_texCoord;

uniform Light u_lights[MAX_LIGHTS];
uniform vec3 u_objectColor;
uniform sampler2D u_texture;
uniform bool u_useTexture; // Use bool instead of int

// Material properties
uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;

// Specular model: false = Standard Phong, true = Blinn-Phong
uniform bool u_useBlinn;

out vec4 fragColor;

void main() {
    // Normalize interpolated values
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition);

    // Accumulate lighting from all lights
    vec3 totalAmbient = vec3(0.0);
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    for(int i = 0; i < MAX_LIGHTS; i++) {
        vec3 L = normalize(u_lights[i].position - v_viewPosition);

        // Ambient component
        totalAmbient += (u_ka * u_lights[i].color);

        // Diffuse component
        float diff = max(dot(N, L), 0.0);
        totalDiffuse += (u_kd * diff * u_lights[i].color);

        // Specular component
        float spec = 0.0;
        if(u_useBlinn) {
            // Blinn-Phong: use halfway vector
            vec3 H = normalize(L + V);
            spec = pow(max(dot(N, H), 0.0), u_shininess);
        } else {
            // Standard Phong: use reflection vector
            vec3 R = reflect(-L, N);
            spec = pow(max(dot(R, V), 0.0), u_shininess);
        }
        totalSpecular += (u_ks * spec * u_lights[i].color);
    }

    // Get base color
    vec3 baseColor = u_objectColor;
    if (u_useTexture) {
        baseColor = texture(u_texture, v_texCoord).rgb;
    }

    // Final color: (ambient + diffuse) * baseColor + specular
    vec3 result = (totalAmbient + totalDiffuse) * baseColor + totalSpecular;
    fragColor = vec4(result, 1.0);
}
`;

// --- SIMPLE SHADERS (for wireframe, normals, etc.) ---
export const vsSimple = `#version 300 es
layout(location = 0) in vec3 a_position;

uniform mat4 u_modelViewMatrix;
uniform mat4 u_projectionMatrix;

void main() {
    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
}
`;

export const fsSimple = `#version 300 es
precision mediump float;

uniform vec3 u_color;

out vec4 fragColor;

void main() {
    fragColor = vec4(u_color, 1.0);
}
`;