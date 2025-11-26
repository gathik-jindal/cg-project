# Assignment 3

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

- **Mouse Drag**: Rotate the 3D object.
- **'S' Key**: Toggle between Gouraud and Phong shading models.
- **Mouse Wheel**: Zoom in and out.
