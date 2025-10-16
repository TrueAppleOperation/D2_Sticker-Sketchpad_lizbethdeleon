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

const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

let isDrawing = false;
let x = 0;
let y = 0;

canvas.addEventListener("mousedown", (e) => {
  x = e.offsetX;
  y = e.offsetY;
  isDrawing = true;
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    drawLine(ctx, x, y, e.offsetX, e.offsetY);
    x = e.offsetX;
    y = e.offsetY;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    drawLine(ctx, x, y, e.offsetX, e.offsetY);
    x = 0;
    y = 0;
    isDrawing = false;
  }
});

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}
