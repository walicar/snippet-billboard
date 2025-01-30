/**
* 1. make a program by compiling shaders
* 2. make VBOs and VAOs, and their attributes, uniforms
* 3. initialize any textures
* 4. start drawing
 */
import { mat4, vec4 } from "gl-matrix";

// initialization
const root = document.getElementById("snippet-1"); // div element
root.style.position = "relative";
root.style.height = "500px";

// shaders
const vertSrc = `#version 300 es
precision mediump float;
in vec3 a_pos;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;
out vec3 v_pos;

void main() {
  gl_Position = u_proj * u_view * u_model * vec4(a_pos, 1.0);
  v_pos = (u_model * vec4(a_pos, 1.0)).xyz;
}
`;

const fragSrc = `#version 300 es
precision mediump float;
in vec3 v_pos;
out vec4 outColor;

void main() {
    outColor = vec4(v_pos.x,v_pos.y,v_pos.z,1.0);
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
    1.0, -1.0, 0.0,
    // bottom left
    -1.0, -1.0, 0.0,
    // top left
    -1.0, 1.0, 0.0,
    // top right
    1.0, 1.0, 0.0,
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
let isBillboardOn = false;
function main() {
    // setup UI
    const slider = document.createElement("input");
    slider.type = "range";
    const samples = 50;
    slider.min = -samples;
    slider.max = samples;
    slider.value = 0;
    slider.style.position = "absolute";
    slider.style.zIndex = 1;
    root.appendChild(slider);
    const button = document.createElement("button");
    button.textContent = "Enable Billboarding";
    button.style.position = "absolute";
    button.style.zIndex = 1;
    root.appendChild(button);
    button.style.marginTop = "30px";
    button.style.marginLeft = "15px";
    button.style.background = "#020617"
    button.style.color = "#f9fafb"
    button.style.padding = "5px";
    button.style.boxShadow = "5px";
    button.style.borderRadius = "2%"
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.zIndex = 0;
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
    gl.vertexAttribPointer(posAttribLoc, 3, gl.FLOAT, false, 3 * 4, 0);

    let modelUniformLoc = gl.getUniformLocation(program, "u_model");
    let viewUniformLoc = gl.getUniformLocation(program, "u_view");
    let projUniformLoc = gl.getUniformLocation(program, "u_proj");

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

    // start drawing
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);

    let model = mat4.create();

    let floorModel = mat4.create();

    mat4.translate(floorModel, floorModel, [0,-1.0,0]);
    mat4.rotateX(floorModel, floorModel, Math.PI/2);

    // view matrix
    let view = mat4.create();
    let camPos = [2.5, 3, 5];
    mat4.lookAt(view, camPos, [0, 0, 0], [0, 1, 0]);
    let initView = mat4.clone(view);

    // projection matrix
    let proj = mat4.create();
    mat4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    slider.addEventListener("input", () => {
        mat4.copy(view, initView);
        const angle = (slider.value / slider.max) * Math.PI * 2;
        mat4.rotateY(view, view, angle);
        draw()
    })

    button.onclick = () => {
        isBillboardOn = !isBillboardOn;
        if (!isBillboardOn) {
            model = mat4.create();
            button.textContent = "Enable Billboarding";
        } else {
            button.textContent = "Disable Billboarding";
        }
    };

    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        // sprite
        gl.bindVertexArray(vao);
        gl.useProgram(program);

        if (isBillboardOn) {
            let camModel = mat4.clone(view);
            mat4.invert(camModel, camModel);
            // x axis
            model[0] = camModel[0];
            model[1] = camModel[1];
            model[2] = camModel[2];
            // y axis
            model[4] = camModel[4];
            model[5] = camModel[5];
            model[6] = camModel[6];
            // z axis
            model[8] = camModel[8];
            model[9] = camModel[9];
            model[10] = camModel[10];
        }

        gl.uniformMatrix4fv(modelUniformLoc, false, model);
        gl.uniformMatrix4fv(viewUniformLoc, false, view);
        gl.uniformMatrix4fv(projUniformLoc, false, proj);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        // floor object
        gl.bindVertexArray(floorVao);
        gl.useProgram(floorProgram);
        gl.uniformMatrix4fv(modelUniformLocFloor, false, floorModel);
        gl.uniformMatrix4fv(viewUniformLocFloor, false, view);
        gl.uniformMatrix4fv(projUniformLocFloor, false, proj);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
    draw();
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

main();