/**
* 1. make a program by compiling shaders
* 2. make VBOs and VAOs, and their attributes, uniforms
* 3. initialize any textures
* 4. start drawing
 */
import { mat4, vec4 } from "gl-matrix";

// initialization
const root = document.getElementById("snippet"); // div element

let image = document.createElement("img"); // new Image() will auto append the img elm
image.src = "/smile.png";
image.onload = main;

// shaders
const vertShaderSrc = `#version 300 es
precision mediump float;
in vec3 a_pos;
in vec2 a_tex; // texture coords
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
out vec2 v_tex;

void main() {
  gl_Position = u_proj * u_view * u_model * vec4(a_pos, 1.0);
  v_tex = a_tex;
}
`;

const fragShaderSrc = `#version 300 es
precision mediump float;
in vec2 v_tex;
uniform sampler2D u_tex;
out vec4 outColor;

void main() {
    outColor = texture(u_tex, 1.0 - v_tex);
}
`;

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
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSrc);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);
    const program = createProgram(gl, vertShader, fragShader);

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

    // create the texture
    let texture = gl.createTexture();
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

    // view matrix
    let view = mat4.create();
    let camPos = [0,0,5];
    mat4.lookAt(view, camPos, [0,0,0], [0,1,0]);

    // projection matrix
    let proj = mat4.create();
    mat4.perspective(proj, Math.PI/4, canvas.width/canvas.height, 0.1, 100);

    // start loop
    function loop(time) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniformMatrix4fv(modelUniformLoc, false, model);
        gl.uniformMatrix4fv(viewUniformLoc, false, view);
        gl.uniformMatrix4fv(projUniformLoc, false, proj);
        gl.uniform1i(texUniformLoc, 0);
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
