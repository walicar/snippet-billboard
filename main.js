/**
* 1. make a program by compiling shaders
* 2. make VBOs and VAOs, and their attributes, uniforms
* 3. initialize any textures
* 4. start drawing
 */
import { mat4, vec4 } from "gl-matrix";

// initialization
const root = document.getElementById("snippet"); // div element

let images = await loadImages(["/smile.png"]);
let image = images[0];

// shaders
const vertSrc = `#version 300 es
precision mediump float;
in vec3 a_pos;
in vec2 a_tex; // texture coords
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
out vec2 v_tex;
out vec2 v_pos;

void main() {
  gl_Position = u_proj * u_view * u_model * vec4(a_pos, 1.0);
  v_tex = a_tex;
}
`;

const fragSrc = `#version 300 es
precision mediump float;
in vec2 v_tex;
uniform sampler2D u_tex;
out vec4 outColor;

void main() {
    outColor = texture(u_tex, 1.0 - v_tex);
}
`;

const floorVertSrc =`#version 300 es
precision mediump float;

in vec3 a_pos;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
out vec3 v_worldPos;

void main() {
    vec4 worldPos = u_model * vec4(a_pos, 1.0);
    v_worldPos = worldPos.xyz;
    gl_Position = u_proj * u_view * worldPos;
}
`

const floorFragSrc = `#version 300 es
precision mediump float;

in vec3 v_worldPos;
out vec4 outColor;

void main() {
    float scale = 4.0;
    vec2 tilePos = floor(v_worldPos.xz * scale);
    float checker = mod(tilePos.x + tilePos.y, 2.0);
    vec3 color = checker < 1.0 ? vec3(0.8, 0.8, 0.8) : vec3(0.2, 0.2, 0.2);
    outColor = vec4(color, 1.0);
}
`

// a flat 2d box in 3d space
const vertData = [
    // bottom right
    1.0, -1.0, 0.0, 1.0, 0.0,
    // bottom left
    -1.0, -1.0, 0.0, 0.0, 0.0,
    // top left
    -1.0, 1.0, 0.0, 0.0, 1.0,
    // top right
    1.0, 1.0, 0.0, 1.0, 1.0,
]

const floorVertData = [
    // bottom right
    100.0, -100.0, 0.0,
    // bottom left
    -100.0, -100.0, 0.0,
    // top left
    -100.0, 100.0, 0.0,
    // top right
    100.0, 100.0, 0.0,
]

// gl context
function main() {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    root.appendChild(canvas);
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        canvas.textContent = "WebGL is not supported!"
        return;
    }

    // make program and compile shaders
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = createProgram(gl, vertShader, fragShader);

    const floorVertShader = createShader(gl, gl.VERTEX_SHADER, floorVertSrc);
    const floorFragShader = createShader(gl, gl.FRAGMENT_SHADER, floorFragSrc);
    const floorProgram = createProgram(gl, floorVertShader, floorFragShader);

    // make VBOs, VAOs, attributes and uniforms
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertData), gl.STATIC_DRAW);

    let posAttribLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posAttribLoc);
    gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 5 * 4, 0);

    let texAttribLoc = gl.getAttribLocation(program, "a_tex");
    gl.enableVertexAttribArray(texAttribLoc);
    gl.vertexAttribPointer(texAttribLoc, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

    let modelUniformLoc = gl.getUniformLocation(program, "u_model");
    let viewUniformLoc = gl.getUniformLocation(program, "u_view");
    let projUniformLoc = gl.getUniformLocation(program, "u_proj");
    let texUniformLoc = gl.getUniformLocation(program, "u_tex");

    let floorVao = gl.createVertexArray();
    gl.bindVertexArray(floorVao);

    let floorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floorVertData), gl.STATIC_DRAW);

    let posAttribLocFloor = gl.getAttribLocation(floorProgram, "a_pos");
    gl.enableVertexAttribArray(posAttribLocFloor);
    gl.vertexAttribPointer(posAttribLocFloor, 3, gl.FLOAT, false, 3 * 4, 0);

    let modelUniformLocFloor = gl.getUniformLocation(floorProgram, "u_model");
    let viewUniformLocFloor = gl.getUniformLocation(floorProgram, "u_view");
    let projUniformLocFloor = gl.getUniformLocation(floorProgram, "u_proj");

    // create the textures
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // start drawing
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);

    let pos = vec4.create();
    let model = mat4.create();

    let floorModel = mat4.create();

    mat4.translate(floorModel, floorModel, [0,-1.0,0]);
    mat4.rotateX(floorModel, floorModel, Math.PI/2);

    // view matrix
    let view = mat4.create();
    let camPos = [0, 3, 5];
    mat4.lookAt(view, camPos, [0, 0, 0], [0, 1, 0]);

    // projection matrix
    let proj = mat4.create();
    mat4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    // start loop
    function loop(time) {
        gl.clear(gl.COLOR_BUFFER_BIT);

        // sprite
        gl.bindVertexArray(vao);
        gl.useProgram(program);
        gl.uniformMatrix4fv(modelUniformLoc, false, model);
        gl.uniformMatrix4fv(viewUniformLoc, false, view);
        gl.uniformMatrix4fv(projUniformLoc, false, proj);
        gl.uniform1i(texUniformLoc, 0);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        // floor object
        gl.bindVertexArray(floorVao);
        gl.useProgram(floorProgram);
        gl.uniformMatrix4fv(modelUniformLocFloor, false, floorModel);
        gl.uniformMatrix4fv(viewUniformLocFloor, false, view);
        gl.uniformMatrix4fv(projUniformLocFloor, false, proj);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        requestAnimationFrame(loop);
    }
    loop();
}

// utils
function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertShader, fragShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

async function loadImages(urls) {
    let promises = []
    for (const url of urls) promises.push(loadImage(url));
    return await Promise.all(promises);
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        let image = document.createElement("img")
        image.src = url;
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(new Error(`Failed to load image ${url}: ${e.message}`))
    });
}

main();