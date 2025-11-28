# Assignment 3

A WebGL application demonstrating 3D object rendering with various shading techniques.

## Screenshot

<!-- TODO: Add screenshot of working A3 application below -->
<!-- Replace the path below with the actual screenshot path once added -->
*Screenshot placeholder - add screenshot.png to assets/*

<!--
![A3 Screenshot](assets/screenshot.png)
-->

## About

`assets/` already contains all the `.ply` object files we will need for this assignment (downloaded from the link the assignment provided [here](https://people.sc.fsu.edu/~jburkardt/data/ply/ply.html))

## How to run

1. Open terminal and navigate to the project directory.
2. Start a local server (alternatively one can use vscode's live server extension).

3. You can use Python's built-in server:

   - For Python 3.x:

     ```bash
     python -m http.server
     ```

   - For Python 2.x:

     ```bash
     python -m SimpleHTTPServer
     ```

4. Open your web browser and go to `http://localhost:8000` (or the port number shown in your terminal).
5. You should see the WebGL application running.

## Controls

- `S`: Toggle Gouraud (Vertex) vs Phong (Pixel).
- `B`: Toggle Standard Phong Math vs Blinn-Phong Math (Only works when in Phong mode).
- `1`: Toggle Light 1.
- `2`: Toggle Light 2.
- `Z` / `X`: Increase/Decrease Diffuse Strength.
- `C` / `V`: Increase/Decrease Specular Strength.
- `Mouse`: Rotate scene.
- `Scroll`: Zoom.