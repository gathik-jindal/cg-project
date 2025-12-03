# Computer Graphics Portfolio

<p align="center">
  <img src="https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL"/>
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js"/>
  <img src="https://img.shields.io/badge/GLSL-5586A4?style=for-the-badge&logo=opengl&logoColor=white" alt="GLSL"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
</p>

A collection of real-time 3D graphics applications showcasing advanced rendering techniques, custom shader development, physics simulation, and scene graph architecture.

## 🎯 Key Skills Demonstrated

- **Custom Shader Development** — Implemented Gouraud (per-vertex) and Phong (per-pixel) shading models from scratch in GLSL
- **Lighting Models** — Built both Standard Phong and Blinn-Phong specular reflection algorithms with multiple light source support
- **Scene Graph Architecture** — Designed and implemented a hierarchical node-based system for managing complex 3D transformations
- **Physics Simulation** — Developed a real-time physics engine with gravity, elastic collisions, and momentum transfer
- **3D Math & Linear Algebra** — Applied matrix transformations, vector operations, and collision detection algorithms
- **Real-time Rendering Pipeline** — Managed vertex/fragment shader communication, uniform passing, and render state

---

## 📂 Table of Contents

- [Projects](#projects)
  - [WebGL Shader Renderer (A3)](#webgl-shader-renderer-a3)
  - [Physics Simulation Engine (A4)](#physics-simulation-engine-a4)
- [Getting Started](#getting-started)
- [Technical Stack](#technical-stack)
- [Architecture Highlights](#architecture-highlights)

---

## Projects

### WebGL Shader Renderer (A3)

A from-scratch WebGL application demonstrating 3D rendering with custom GLSL shaders, multiple lighting models, and texture mapping techniques.

<p align="center">
  <img src="A3/ss.png" alt="WebGL Shader Renderer Screenshot" width="600"/>
</p>

#### ✨ Features

| Feature | Description |
|---------|-------------|
| **Custom PLY Loader** | Parses and renders PLY 3D model files with vertex positions and normals |
| **Dual Shading Modes** | Toggle between Gouraud (vertex-based) and Phong (pixel-based) shading |
| **Specular Models** | Switch between Standard Phong reflection and Blinn-Phong half-vector calculation |
| **Multi-Light System** | Support for multiple configurable light sources with individual controls |
| **Texture Mapping** | Spherical and cylindrical UV mapping with procedural textures |
| **Interactive Camera** | Mouse-driven rotation and zoom controls |

#### 🛠️ Technical Implementation

- **Vertex Shader**: Transforms vertices to view space, computes per-vertex lighting (Gouraud), generates UV coordinates
- **Fragment Shader**: Performs per-pixel lighting calculations, handles texture sampling, implements specular highlights
- **Uniform System**: Dynamic shader parameter control for lighting coefficients (ka, kd, ks, shininess)

📄 [View A3 Documentation](A3/readme.md)

---

### Physics Simulation Engine (A4)

A Three.js-based 3D physics playground featuring a custom scene graph, real-time collision detection, and interactive lighting.

<p align="center">
  <img src="A4/ss.png" alt="Physics Simulation Screenshot" width="600"/>
</p>

#### ✨ Features

| Feature | Description |
|---------|-------------|
| **Scene Graph System** | Custom `SGNode` class for hierarchical transformations and animation callbacks |
| **Physics Engine** | Real-time simulation with gravity, momentum, and energy conservation |
| **Collision Detection** | Sphere-sphere, sphere-AABB, and sphere-line segment collision algorithms |
| **Dynamic Lighting** | Point lights and spotlights with real-time shadow cone calculations |
| **Interactive Objects** | Rotating mechanisms, ramps, walls, and domino chain reactions |
| **Camera Modes** | Global view and ball-tracking follow camera |

#### 🛠️ Technical Implementation

- **Scene Graph**: Tree-structured node hierarchy with local/world transformation propagation
- **Physics System**: Fixed-timestep simulation with collision response using impulse-based resolution
- **Kinematics**: Computes relative velocities for rotating objects (disc + swing arm compound rotation)
- **Shader Pipeline**: Custom Phong shader with spotlight cutoff angles and attenuation

```text
A4/src/
├── index.js          # Main application, render loop, physics integration
├── SceneGraph.js     # SGNode class with hierarchical transformations
├── Physics.js        # Collision detection and response algorithms
├── shaders.js        # GLSL vertex/fragment shaders
├── CreateSceneObjects.js  # Scene geometry and setup
└── Decorations.js    # Environment and visual elements
```

📄 [View A4 Documentation](A4/readme.md)

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gathik-jindal/cg-project.git
   cd cg-project
   ```

2. **Start a local server** (required for ES6 modules):
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Or using Node.js
   npx serve
   ```

3. **Open in browser**:
   - A3: `http://localhost:8000/A3/`
   - A4: `http://localhost:8000/A4/`

---

## Technical Stack

| Technology | Usage |
|------------|-------|
| **WebGL 2.0** | Low-level GPU rendering, buffer management, shader compilation |
| **Three.js** | 3D scene management, geometry primitives, camera controls |
| **GLSL ES 3.0** | Custom vertex and fragment shaders for lighting calculations |
| **JavaScript ES6** | Modules, classes, and modern language features |

---

## Architecture Highlights

### Shader Architecture (A3)
```text
┌─────────────────┐     ┌─────────────────┐
│  Vertex Shader  │────▶│ Fragment Shader │
├─────────────────┤     ├─────────────────┤
│ • Transform     │     │ • Per-pixel     │
│   vertices      │     │   lighting      │
│ • Compute       │     │ • Texture       │
│   normals       │     │   sampling      │
│ • UV mapping    │     │ • Specular      │
│ • Per-vertex    │     │   highlights    │
│   lighting      │     │                 │
│   (Gouraud)     │     │                 │
└─────────────────┘     └─────────────────┘
```

### Scene Graph Architecture (A4)
```text
Root (Scene)
├── Camera
├── Lights
│   ├── PointLight
│   └── SpotLight (tracking)
├── Environment
│   ├── Ground
│   ├── Walls
│   └── Ramps
└── Dynamic Objects
    ├── Ball (physics-enabled)
    ├── Disc (rotating)
    │   └── SwingArm
    │       └── Bar (collision source)
    └── Dominoes
```

---

<p align="center">
  <i>Built as part of Computer Graphics coursework</i>
</p>
