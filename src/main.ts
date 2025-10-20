import IconUrl from "./drawing.jpg";
import "./style.css";

document.body.innerHTML = `
  <p><img src="${IconUrl}" class="icon" /></p>
  <canvas id = "canvas" width = "256" height = "256"></canvas>
  <div>
      <br>
    <button id = "clearButton" > Clear </button>
    <button id = "redoButton" > Undo </button>
    <button id = "undoButton" > Redo </button>
      <br>
      <br>
    <button id = "thinMarkerButton" > Thin </button>
    <button id = "thickMarkerButton" > Thick </button>
  </div>
`;

const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
document.body.insertBefore(title, canvas);
const ctx = canvas.getContext("2d")!;

type Point = { x: number; y: number };

interface DrawableCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerLine implements DrawableCommand {
  private points: Point[] = [];
  private thickness: number;

  constructor(initialPoint: Point, thickness: number = 1) {
    this.points.push(initialPoint);
    this.thickness = thickness;
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = this.thickness;
    ctx.moveTo(this.points[0].x, this.points[0].y);

    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();
    ctx.closePath();
  }

  getPoints(): Point[] {
    return [...this.points];
  }
}

let drawingData: DrawableCommand[] = [];
let undoneStrokes: DrawableCommand[] = [];
let currentStroke: MarkerLine | null = null;
let isDrawing = false;
let currentThickness: number = 1; // Default to thin marker

function dispatchDrawingChanged() {
  const event = new CustomEvent("drawing-changed");
  canvas.dispatchEvent(event);
}

canvas.addEventListener("drawing-changed", () => {
  redrawCanvas();
});

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawingData.forEach((command) => {
    command.display(ctx);
  });

  if (currentStroke) {
    currentStroke.display(ctx);
  }
}

function setSelectedTool(selectedButton: HTMLButtonElement) {
  const allToolButtons = document.querySelectorAll(
    "#thinMarkerButton, #thickMarkerButton",
  );
  allToolButtons.forEach((button) => {
    button.classList.remove("selectedTool");
  });

  selectedButton.classList.add("selectedTool");
}

const thinButton = document.getElementById(
  "thinMarkerButton",
) as HTMLButtonElement;
thinButton.addEventListener("click", () => {
  currentThickness = 1;
  setSelectedTool(thinButton);
});

const thickButton = document.getElementById(
  "thickMarkerButton",
) as HTMLButtonElement;
thickButton.addEventListener("click", () => {
  currentThickness = 5;
  setSelectedTool(thickButton);
});

setSelectedTool(thinButton);

const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
redoButton.addEventListener("click", () => {
  if (drawingData.length > 0) {
    const lastStroke = drawingData.pop()!;
    undoneStrokes.push(lastStroke);
    dispatchDrawingChanged();
  }
});

const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
undoButton.addEventListener("click", () => {
  if (undoneStrokes.length > 0) {
    const lastUndone = undoneStrokes.pop()!;
    drawingData.push(lastUndone);
    dispatchDrawingChanged();
  }
});

const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
clearButton.addEventListener("click", () => {
  drawingData = [];
  undoneStrokes = [];
  currentStroke = null;
  dispatchDrawingChanged();
});

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  currentStroke = new MarkerLine(
    { x: e.offsetX, y: e.offsetY },
    currentThickness,
  );
  dispatchDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    drawingData.push(currentStroke);
    currentStroke = null;
    isDrawing = false;
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseleave", (e) => {
  if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    drawingData.push(currentStroke);
    currentStroke = null;
    isDrawing = false;
    dispatchDrawingChanged();
  }
});
