// --- PHONG VERTEX SHADER ---
// (No changes needed here, but included for completeness)
export const vsPhong = `
out vec3 v_normal;
out vec3 v_viewPosition;

void main() {
    vec4 viewPos4 = modelViewMatrix * vec4(position, 1.0);
    v_viewPosition = viewPos4.xyz;
    
    v_normal = normalize(normalMatrix * normal);
    
    gl_Position = projectionMatrix * viewPos4;
}
`;

// --- PHONG FRAGMENT SHADER ---
export const fsPhong = `
precision mediump float;

#define MAX_LIGHTS 3

struct Light {
    vec3 position;  // View Space position
    vec3 direction; // View Space direction (for spotlights)
    vec3 color;
    float enabled;
    float isSpot;   // 0.0 = Point Light, 1.0 = Spotlight
    float cutoff;   // Cosine of the cutoff angle (e.g., 0.9)
};

in vec3 v_normal;
in vec3 v_viewPosition;

uniform Light u_lights[MAX_LIGHTS];
uniform vec3 u_objectColor;

uniform float u_ka;
uniform float u_kd;
uniform float u_ks;
uniform float u_shininess;

out vec4 fragColor;

void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition);

    vec3 totalColor = vec3(0.0);

    for(int i = 0; i < MAX_LIGHTS; i++) {
        if (u_lights[i].enabled < 0.5) continue;

        vec3 L = normalize(u_lights[i].position - v_viewPosition);
        
        // --- SPOTLIGHT CALCULATION ---
        float spotFactor = 1.0;
        
        if (u_lights[i].isSpot > 0.5) {
            // Check angle between Light Direction and Vector to Fragment
            // We use dot product. u_lights[i].direction must be normalized.
            // We negate L because L points TO the light, we want vector FROM light.
            float theta = dot(normalize(u_lights[i].direction), -L);
            
            // If we are outside the cone (theta < cutoff), light is 0
            if (theta < u_lights[i].cutoff) {
                spotFactor = 0.0;
            }
        }

        if (spotFactor > 0.0) {
            // Ambient (Global ambient is usually separate, but we'll keep it per-light for now)
            vec3 ambient = u_ka * u_lights[i].color;

            // Diffuse
            float diff = max(dot(N, L), 0.0);
            vec3 diffuse = u_kd * diff * u_lights[i].color;

            // Specular
            vec3 H = normalize(L + V);
            float spec = pow(max(dot(N, H), 0.0), u_shininess);
            vec3 specular = u_ks * spec * u_lights[i].color;

            totalColor += (ambient + diffuse + specular) * spotFactor;
        }
    }

    vec3 result = totalColor * u_objectColor;
    fragColor = vec4(result, 1.0);
}
`;