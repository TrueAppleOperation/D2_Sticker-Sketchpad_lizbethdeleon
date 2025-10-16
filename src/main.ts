import IconUrl from "./drawing.jpg";
import "./style.css";

document.body.innerHTML = `
  <p><img src="${IconUrl}" class="icon" /></p>
  <canvas id = "canvas" width = "256" height = "256"></canvas>
  <div>
  <button id = "clearButton" > Clear </button>
  </div>
`;

const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
document.body.insertBefore(title, canvas);
const ctx = canvas.getContext("2d")!;

type Point = { x: number; y: number };
type Stroke = Point[];
type Drawing = Stroke[];

let drawingData: Drawing = [];
let currentStroke: Stroke = [];
let isDrawing = false;

function dispatchDrawingChanged() {
  const event = new CustomEvent("drawing-changed");
  canvas.dispatchEvent(event);
}

canvas.addEventListener("drawing-changed", () => {
  redrawCanvas();
});

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawingData.forEach((stroke) => {
    if (stroke.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.moveTo(stroke[0].x, stroke[0].y);

    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }

    ctx.stroke();
    ctx.closePath();
  });
}

const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  drawingData = [];
  currentStroke = [];
  dispatchDrawingChanged();
});

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  currentStroke = [{ x: e.offsetX, y: e.offsetY }];
  dispatchDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    currentStroke.push({ x: e.offsetX, y: e.offsetY });
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    currentStroke.push({ x: e.offsetX, y: e.offsetY });
    drawingData.push([...currentStroke]);
    currentStroke = [];
    isDrawing = false;
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseleave", (e) => {
  if (isDrawing) {
    currentStroke.push({ x: e.offsetX, y: e.offsetY });
    drawingData.push([...currentStroke]);
    currentStroke = [];
    isDrawing = false;
    dispatchDrawingChanged();
  }
});
