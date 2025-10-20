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
      <br>
      <br>
    <button id = "starStickerButton" >⭐</button>
    <button id = "saturnStickerButton" >🪐</button>
    <button id = "cometStickerButton" >☄️</button>
  </div>
`;

const smallCursor =
  `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="1" fill="black" stroke="white" stroke-width="0.5"/></svg>') 2 2, auto`;
const bigCursor =
  `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="3" fill="black" stroke="white" stroke-width="0.5"/></svg>') 6 6, auto`;

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

class Sticker implements DrawableCommand {
  private position: Point;
  private emoji: string;
  private size: number = 20;

  constructor(position: Point, emoji: string) {
    this.position = position;
    this.emoji = emoji;
  }

  drag(x: number, y: number): void {
    this.position = { x, y };
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.fillText(this.emoji, this.position.x, this.position.y);
  }

  getPosition(): Point {
    return { ...this.position };
  }

  containsPoint(point: Point): boolean {
    const halfSize = this.size / 2;
    return (
      point.x >= this.position.x - halfSize &&
      point.x <= this.position.x + halfSize &&
      point.y >= this.position.y - halfSize &&
      point.y <= this.position.y + halfSize
    );
  }
}

class StickerPreview implements DrawableCommand {
  private position: Point;
  private emoji: string;
  private stickerSize: number = 20;

  constructor(position: Point, emoji: string) {
    this.position = position;
    this.emoji = emoji;
  }

  drag(x: number, y: number): void {
    this.position = { x, y };
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.stickerSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.4;
    ctx.fillText(this.emoji, this.position.x, this.position.y);
    ctx.globalAlpha = 1.0;
  }
}

let drawingData: DrawableCommand[] = [];
let undoneStrokes: DrawableCommand[] = [];
let currentStroke: MarkerLine | null = null;
let currentStickerPreview: StickerPreview | null = null;
let selectedStickerEmoji: string | null = null;
let isDrawing = false;
let isPlacingSticker = false;
let isDraggingSticker = false;
let draggedSticker: Sticker | null = null;
let currentThickness: number = 1;

canvas.style.cursor = smallCursor;

function dispatchDrawingChanged() {
  const event = new CustomEvent("drawing-changed");
  canvas.dispatchEvent(event);
}

function dispatchToolMoved(toolType: string) {
  const event = new CustomEvent("tool-moved", { detail: { tool: toolType } });
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

  if (currentStickerPreview) {
    currentStickerPreview.display(ctx);
  }
}

function updateCursor() {
  if (selectedStickerEmoji) {
    canvas.style.cursor = "crosshair";
  } else if (currentThickness === 1) {
    canvas.style.cursor = smallCursor;
  } else {
    canvas.style.cursor = bigCursor;
  }
}

function setSelectedTool(selectedButton: HTMLButtonElement) {
  const allToolButtons = document.querySelectorAll(
    "#thinMarkerButton, #thickMarkerButton, #starButton, #saturnButton, #cometButton",
  );
  allToolButtons.forEach((button) => {
    button.classList.remove("selectedTool");
  });

  selectedButton.classList.add("selectedTool");
}

function selectSticker(emoji: string, button: HTMLButtonElement) {
  selectedStickerEmoji = emoji;
  setSelectedTool(button);
  updateCursor();
  dispatchToolMoved(`sticker:${emoji}`);
}

const thinButton = document.getElementById(
  "thinMarkerButton",
) as HTMLButtonElement;
thinButton.addEventListener("click", () => {
  currentThickness = 1;
  selectedStickerEmoji = null;
  setSelectedTool(thinButton);
  updateCursor();
  dispatchToolMoved("thin-marker");
});

const thickButton = document.getElementById(
  "thickMarkerButton",
) as HTMLButtonElement;
thickButton.addEventListener("click", () => {
  currentThickness = 5;
  selectedStickerEmoji = null;
  setSelectedTool(thickButton);
  updateCursor();
  dispatchToolMoved("thick-marker");
});

const starButton = document.getElementById(
  "starStickerButton",
) as HTMLButtonElement;
starButton.addEventListener("click", () => {
  selectSticker("⭐", starButton);
});

const saturnButton = document.getElementById(
  "saturnStickerButton",
) as HTMLButtonElement;
saturnButton.addEventListener("click", () => {
  selectSticker("🪐", saturnButton);
});

const cometButton = document.getElementById(
  "cometStickerButton",
) as HTMLButtonElement;
cometButton.addEventListener("click", () => {
  selectSticker("☄️", cometButton);
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
  currentStickerPreview = null;
  dispatchDrawingChanged();
});

canvas.addEventListener("mousedown", (e) => {
  const point = { x: e.offsetX, y: e.offsetY };

  if (!selectedStickerEmoji) {
    for (let i = drawingData.length - 1; i >= 0; i--) {
      const item = drawingData[i];
      if (item instanceof Sticker && item.containsPoint(point)) {
        isDraggingSticker = true;
        draggedSticker = item;
        dispatchDrawingChanged();
        return;
      }
    }
  }

  if (selectedStickerEmoji) {
    isPlacingSticker = true;
    currentStickerPreview = new StickerPreview(point, selectedStickerEmoji);
    dispatchDrawingChanged();
  } else {
    isDrawing = true;
    currentStroke = new MarkerLine(point, currentThickness);
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mousemove", (e) => {
  const point = { x: e.offsetX, y: e.offsetY };

  if (isDraggingSticker && draggedSticker) {
    draggedSticker.drag(point.x, point.y);
    dispatchDrawingChanged();
  } else if (isPlacingSticker && currentStickerPreview) {
    currentStickerPreview.drag(point.x, point.y);
    dispatchDrawingChanged();
  } else if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseup", (e) => {
  const point = { x: e.offsetX, y: e.offsetY };

  if (isDraggingSticker && draggedSticker) {
    draggedSticker.drag(point.x, point.y);
    drawingData.push(draggedSticker);
    draggedSticker = null;
    isDraggingSticker = false;
    dispatchDrawingChanged();
  } else if (isPlacingSticker && currentStickerPreview) {
    const sticker = new Sticker(point, selectedStickerEmoji!);
    drawingData.push(sticker);
    currentStickerPreview = null;
    isPlacingSticker = false;
    dispatchDrawingChanged();
  } else if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    drawingData.push(currentStroke);
    currentStroke = null;
    isDrawing = false;
    dispatchDrawingChanged();
  }
});

canvas.addEventListener("mouseleave", (e) => {
  if (isDraggingSticker && draggedSticker) { // Cancels drag when dragging sticker
    drawingData.push(draggedSticker);
    draggedSticker = null;
    isDraggingSticker = false;
    dispatchDrawingChanged();
  } else if (isPlacingSticker && currentStickerPreview) { // When mouse leaves canvas, it cancels the sticker
    currentStickerPreview = null;
    isPlacingSticker = false;
    dispatchDrawingChanged();
  } else if (isDrawing && currentStroke) {
    currentStroke.drag(e.offsetX, e.offsetY);
    drawingData.push(currentStroke);
    currentStroke = null;
    isDrawing = false;
    dispatchDrawingChanged();
  }
});
