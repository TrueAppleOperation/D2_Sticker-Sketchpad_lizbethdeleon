import IconUrl from "./drawing.jpg";
import "./style.css";

const availableStickers = [
  { emoji: "☄️", buttonId: "cometStickerButton" },
  { emoji: "🪐", buttonId: "saturnStickerButton" },
  { emoji: "⭐", buttonId: "starStickerButton" },
  { emoji: "🌌", buttonId: "spaceStickerButton" },
  { emoji: "🌑", buttonId: "moonStickerButton" },
];

const allStickers = [...availableStickers];

const currentMarkerColors: { [key: string]: string } = { // Current random variations for tools gets stored
  thinMarkerButton: getRandomColor(),
  thickMarkerButton: getRandomColor(),
};

const currentStickerRotations: { [key: string]: number } = {};

availableStickers.forEach((sticker) => { // Random rotations for all stickers
  currentStickerRotations[sticker.buttonId] = getRandomRotation();
});

document.body.innerHTML = `
  <p><img src="${IconUrl}" class="icon" /></p>
  <canvas id="canvas" width="256" height="256"></canvas>
  <div class="all-buttons">
    <button id="clearButton">Clear</button>
    <button id="undoButton">Undo</button>
    <button id="redoButton">Redo</button>
    <br>
    <br>
    <button id="thinMarkerButton">Thin</button>
    <button id="thickMarkerButton">Thick</button>
    <br>
    <br>
    <button id="exportButton">Export</button>
    <br>
    <br>
    <div class="stickers-container">
      <div class="sticker-buttons">
        ${
  availableStickers.map((sticker) =>
    `<button id="${sticker.buttonId}">${sticker.emoji}</button>`
  ).join("")
}
      </div>
      <button id="customStickerButton">+</button>
    </div>
  </div>
`;

// cursor variations
const smallCursor =
  `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="black" stroke="white" stroke-width="0.5"/></svg>') 2 2, auto`;
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
  private color: string;

  constructor(
    initialPoint: Point,
    thickness: number = 2,
    color: string = "black",
  ) {
    this.points.push(initialPoint);
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number): void {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = this.color;
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
  private rotation: number = 0;

  constructor(position: Point, emoji: string, rotation: number = 0) {
    this.position = position;
    this.emoji = emoji;
    this.rotation = rotation;
  }

  drag(x: number, y: number): void {
    this.position = { x, y };
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
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
  private rotation: number = 0;

  constructor(position: Point, emoji: string, rotation: number = 0) {
    this.position = position;
    this.emoji = emoji;
    this.rotation = rotation;
  }

  drag(x: number, y: number): void {
    this.position = { x, y };
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.stickerSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.4;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();

    ctx.globalAlpha = 1.0;
  }
}

let drawingData: DrawableCommand[] = [];
let undoneStrokes: DrawableCommand[] = [];
let currentStroke: MarkerLine | null = null;
let currentStickerPreview: StickerPreview | null = null;
let selectedStickerEmoji: string | null = null;
let selectedStickerButtonId: string | null = null;
let isDrawing = false;
let isPlacingSticker = false;
let isDraggingSticker = false;
let draggedSticker: Sticker | null = null;
let currentThickness: number = 2;

canvas.style.cursor = smallCursor; // Default cursor

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
  } else if (currentThickness === 2) {
    canvas.style.cursor = smallCursor;
  } else {
    canvas.style.cursor = bigCursor;
  }
}

function setSelectedTool(selectedButton: HTMLButtonElement) {
  const allToolButtons = document.querySelectorAll(
    "#thinMarkerButton, #thickMarkerButton, [id^='starStickerButton'], [id^='saturnStickerButton'], [id^='cometStickerButton'], [id^='customStickerButton_']",
  );
  allToolButtons.forEach((button) => {
    button.classList.remove("selectedTool");
  });

  selectedButton.classList.add("selectedTool");
}

// Colors
function getRandomColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
    "#F1948A",
    "#85C1E9",
    "#D7BDE2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomRotation(): number {
  return (Math.random() - 0.5) * 0.5; // Random rotation between -0.25 and 0.25 radians
}

function updateToolPreview(button: HTMLButtonElement, toolType: string) {
  if (toolType === "thin-marker" || toolType === "thick-marker") {
    const color = currentMarkerColors[button.id];
    button.style.borderColor = color;
    button.style.background = `linear-gradient(${color}20, ${color}40)`;
  } else if (toolType.startsWith("sticker")) {
    const rotation = currentStickerRotations[button.id];
    button.style.transform = `rotate(${rotation}rad)`;
  }
}

function selectSticker(emoji: string, button: HTMLButtonElement) {
  selectedStickerEmoji = emoji;
  selectedStickerButtonId = button.id;
  setSelectedTool(button);
  updateCursor();
  updateToolPreview(button, `sticker:${emoji}`);
  dispatchToolMoved(`sticker:${emoji}`);
}

function addCustomSticker() {
  const text = prompt("Custom sticker text", "👾");
  if (text && text.trim() !== "") {
    const buttonId = `customStickerButton_${Date.now()}`; // Create unique id for customed sticker
    const newSticker = { emoji: text.trim(), buttonId };

    allStickers.push(newSticker);
    currentStickerRotations[buttonId] = getRandomRotation();

    const button = document.createElement("button");
    button.id = buttonId;
    button.textContent = text.trim();
    button.addEventListener("click", () => {
      selectSticker(newSticker.emoji, button);
    });

    const stickerButtons = document.querySelector(".sticker-buttons"); // add stickers to sticker container | five sticker per row
    stickerButtons?.appendChild(button);

    selectSticker(newSticker.emoji, button);
  }
}

const thinButton = document.getElementById(
  "thinMarkerButton",
) as HTMLButtonElement;
thinButton.addEventListener("click", () => {
  currentThickness = 2;
  selectedStickerEmoji = null;
  selectedStickerButtonId = null;

  currentMarkerColors.thinMarkerButton = getRandomColor(); // Randomize color for next use

  setSelectedTool(thinButton);
  updateCursor();
  updateToolPreview(thinButton, "thin-marker");
  dispatchToolMoved("thin-marker");
});

const thickButton = document.getElementById(
  "thickMarkerButton",
) as HTMLButtonElement;
thickButton.addEventListener("click", () => {
  currentThickness = 5;
  selectedStickerEmoji = null;
  selectedStickerButtonId = null;

  currentMarkerColors.thickMarkerButton = getRandomColor(); // Randomize color for next use

  setSelectedTool(thickButton);
  updateCursor();
  updateToolPreview(thickButton, "thick-marker");
  dispatchToolMoved("thick-marker");
});

const exportButton = document.getElementById(
  "exportButton",
) as HTMLButtonElement;
exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas"); // Create temp new canvas
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;

  const ctxExport = exportCanvas.getContext("2d")!; // Appiled scaling
  ctxExport.scale(4, 4);

  drawingData.forEach((command) => { // Move drawing data from ctx to ctxExport
    command.display(ctxExport);
  });

  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png"); // Exports image
  anchor.download = "sketchpad.png";
  anchor.click();
});

availableStickers.forEach((sticker) => {
  const button = document.getElementById(sticker.buttonId) as HTMLButtonElement;
  button.addEventListener("click", () => {
    currentStickerRotations[sticker.buttonId] = getRandomRotation(); // Randomize rotation for next use
    selectSticker(sticker.emoji, button);
  });
});

const customStickerButton = document.getElementById(
  "customStickerButton",
) as HTMLButtonElement;
customStickerButton.addEventListener("click", addCustomSticker);

// Tool previews
updateToolPreview(thinButton, "thin-marker");
updateToolPreview(thickButton, "thick-marker");
availableStickers.forEach((sticker) => {
  const button = document.getElementById(sticker.buttonId) as HTMLButtonElement;
  updateToolPreview(button, `sticker:${sticker.emoji}`);
});

setSelectedTool(thinButton);

const undoButton = document.getElementById("undoButton") as HTMLButtonElement;
undoButton.addEventListener("click", () => {
  if (drawingData.length > 0) {
    const lastStroke = drawingData.pop()!; // takes the latest popped off drawing data and saves it to lastStroke
    undoneStrokes.push(lastStroke); // and undoneStrokes stores as the latest
    dispatchDrawingChanged();
  }
});

const redoButton = document.getElementById("redoButton") as HTMLButtonElement;
redoButton.addEventListener("click", () => {
  if (undoneStrokes.length > 0) {
    const lastUndone = undoneStrokes.pop()!; // saves the popped undone stroke to lastUndone
    drawingData.push(lastUndone); // Restores the last undone stroke to the canvas
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
    const rotation = selectedStickerButtonId
      ? currentStickerRotations[selectedStickerButtonId]
      : 0;
    currentStickerPreview = new StickerPreview(
      point,
      selectedStickerEmoji,
      rotation,
    );
    dispatchDrawingChanged();
  } else {
    isDrawing = true;
    const color = currentThickness === 2
      ? currentMarkerColors.thinMarkerButton
      : currentMarkerColors.thickMarkerButton;
    currentStroke = new MarkerLine(point, currentThickness, color);
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
    const rotation = selectedStickerButtonId
      ? currentStickerRotations[selectedStickerButtonId]
      : 0;
    const sticker = new Sticker(point, selectedStickerEmoji!, rotation);
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
