# CG Project

A Computer Graphics project repository containing WebGL and Three.js-based assignments demonstrating various rendering techniques and interactive 3D graphics.

## Table of Contents

- [Overview](#overview)
- [Assignments](#assignments)
  - [Assignment 3 (A3)](#assignment-3-a3)
  - [Assignment 4 (A4)](#assignment-4-a4)
- [Getting Started](#getting-started)
- [Technologies Used](#technologies-used)

## Overview

This repository contains a series of computer graphics assignments that explore different aspects of 3D rendering, shading models, lighting, scene graphs, and physics simulations.

## Assignments

### Assignment 3 (A3)

A WebGL application demonstrating 3D object rendering with various shading techniques including Gouraud and Phong shading, along with the Blinn-Phong lighting model.

**Features:**

- Load and display PLY 3D model files
- Toggle between Gouraud (Vertex) and Phong (Pixel) shading
- Toggle between Standard Phong and Blinn-Phong lighting models
- Multiple light sources with individual toggle controls
- Adjustable diffuse and specular lighting strengths
- Interactive camera controls (rotation and zoom)

**Screenshot:**

![A3 Screenshot](A3/ss.png)

For more details and instructions, see the [A3 README](A3/readme.md).

---

### Assignment 4 (A4)

A Three.js-based application featuring a scene graph implementation with physics-based animations, multiple lighting types, and interactive controls.

**Features:**

- Custom scene graph implementation for hierarchical 3D transformations
- Physics-based ball simulation with gravity and collisions
- Multiple lighting types (point lights and spotlights)
- Interactive camera controls with follow mode
- Custom Phong shading with GLSL shaders
- Object interactions including ramps, walls, and dominoes

For more details and instructions, see the [A4 README](A4/readme.md).

---

## Getting Started

1. Clone this repository:

   ```bash
   git clone https://github.com/gathik-jindal/cg-project.git
   ```

2. Navigate to the desired assignment folder (e.g., `A3` or `A4`).

3. Start a local server and open the application in your browser. See individual assignment READMEs for specific instructions.

## Technologies Used

- **WebGL** - Low-level graphics API for rendering
- **Three.js** - 3D JavaScript library
- **GLSL** - Shader programming language
- **JavaScript (ES6)** - Core programming language