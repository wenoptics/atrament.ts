import { Mouse, Point } from './mouse';
import * as Constants from './constants';
import * as Pixels from './pixels';
import { AtramentEventTarget } from './events';
import { ColorPixelRGBA } from './pixels';
import { includes, unpackOffsetXY } from './utils';


enum DrawingMode {
  DRAW = 'draw',
  ERASE = 'erase',
  FILL = 'fill',
  DISABLED = 'disabled',
}

const PathDrawingModes = [DrawingMode.DRAW, DrawingMode.ERASE];

type AtramentConfig = {
  width?: number
  height?: number
  color?: string
  weight?: number
  smoothing?: number
  adaptiveStroke?: boolean
  mode?: DrawingMode
}


class Atrament extends AtramentEventTarget {

  canvas: HTMLCanvasElement;
  mouse: Mouse;

  private context: CanvasRenderingContext2D;
  private _filling: boolean;
  private _fillStack: [number, number, ColorPixelRGBA][];
  recordStrokes: boolean;
  strokeTimestamp: number;
  strokeMemory: { point: Point, time: number }[];

  private _dirty: boolean;
  private smoothing: number;
  private _thickness: number;
  private _targetThickness: number;
  private _weight: number;
  private _maxWeight: number;

  public destroy: () => void;
  _mode: DrawingMode;
  adaptiveStroke: boolean;


  constructor(selector: string | HTMLCanvasElement, config: AtramentConfig = {}) {
    if (typeof window === 'undefined') {
      throw new Error('Looks like we\'re not running in a browser');
    }

    super();

    // get canvas element
    if (selector instanceof window.Node && selector.tagName === 'CANVAS') this.canvas = selector;
    else if (typeof selector === 'string') this.canvas = document.querySelector(selector);
    else throw new Error(`can't look for canvas based on '${selector}'`);
    if (!this.canvas) throw new Error('canvas not found');

    // set external canvas params
    this.canvas.width = config.width || this.canvas.width;
    this.canvas.height = config.height || this.canvas.height;

    // create a mouse object
    this.mouse = new Mouse();

    // mousemove handler
    const mouseMove = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }

      const rect = this.canvas.getBoundingClientRect();
      const { x, y } = unpackOffsetXY(event, rect);

      const { mouse } = this;
      // draw if we should draw
      if (mouse.down && includes(PathDrawingModes, this.mode)) {
        const { x: newX, y: newY } = this.draw(x, y, mouse.previous.x, mouse.previous.y);

        if (!this._dirty && this.mode === DrawingMode.DRAW && (x !== mouse.x || y !== mouse.y)) {
          this._dirty = true;
          this.fireDirty();
        }

        mouse.set(x, y);
        mouse.previous.set(newX, newY);
      }
 else {
        mouse.set(x, y);
      }
    };

    // mousedown handler
    const mouseDown = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      // update position just in case
      mouseMove(event);

      // if we are filling - fill and return
      if (this.mode === DrawingMode.FILL) {
        this.fill();
        return;
      }
      // remember it
      const { mouse } = this;
      mouse.previous.set(mouse.x, mouse.y);
      mouse.down = true;

      this.beginStroke(mouse.previous.x, mouse.previous.y);
    };

    const mouseUp = (event: MouseEvent | TouchEvent) => {
      if (this.mode === DrawingMode.FILL) {
        return;
      }

      const { mouse } = this;

      if (!mouse.down) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const { x, y } = unpackOffsetXY(event, rect);
      mouse.down = false;

      if (mouse.x === x && mouse.y === y && includes(PathDrawingModes, this.mode)) {
        const { x: nx, y: ny } = this.draw(mouse.x, mouse.y, mouse.previous.x, mouse.previous.y);
        mouse.previous.set(nx, ny);
      }

      this.endStroke(mouse.x, mouse.y);
    };

    // attach listeners
    this.canvas.addEventListener('mousemove', mouseMove);
    this.canvas.addEventListener('mousedown', mouseDown);
    document.addEventListener('mouseup', mouseUp);
    this.canvas.addEventListener('touchstart', mouseDown);
    this.canvas.addEventListener('touchend', mouseUp);
    this.canvas.addEventListener('touchmove', mouseMove);

    // helper for destroying Atrament (removing event listeners)
    this.destroy = () => {
      this.clear();
      this.canvas.removeEventListener('mousemove', mouseMove);
      this.canvas.removeEventListener('mousedown', mouseDown);
      document.removeEventListener('mouseup', mouseUp);
      this.canvas.removeEventListener('touchstart', mouseDown);
      this.canvas.removeEventListener('touchend', mouseUp);
      this.canvas.removeEventListener('touchmove', mouseMove);
    };

    // set internal canvas params
    this.context = this.canvas.getContext('2d');
    this.context.globalCompositeOperation = 'source-over';
    this.context.globalAlpha = 1;
    this.context.strokeStyle = config.color || 'rgba(0,0,0,1)';
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.translate(0.5, 0.5);

    this._filling = false;
    this._fillStack = [];

    // set drawing params
    this.recordStrokes = false;
    this.strokeMemory = [];

    this.smoothing = Constants.initialSmoothingFactor;
    this._thickness = Constants.initialThickness;
    this._targetThickness = this._thickness;
    this._weight = this._thickness;
    this._maxWeight = this._thickness + Constants.weightSpread;

    this._mode = DrawingMode.DRAW;
    this.adaptiveStroke = true;

    if (config.weight !== undefined) {
      this.weight = config.weight;
    }
    if (config.smoothing !== undefined) {
      this.smoothing = config.smoothing;
    }
    if (config.adaptiveStroke !== undefined) {
      this.adaptiveStroke = config.adaptiveStroke;
    }
    if (config.mode !== undefined) {
      this.mode = config.mode;
    }
  }

  /**
   * Begins a stroke at a given position
   *
   * @param {number} x
   * @param {number} y
   */
  beginStroke(x: number, y: number) {
    this.context.beginPath();
    this.context.moveTo(x, y);

    if (this.recordStrokes) {
      this.strokeTimestamp = performance.now();
      this.strokeMemory.push({ point: new Point(x, y), time: performance.now() - this.strokeTimestamp });
    }
    this.dispatchEvent('strokestart', { x, y });
  }

  /**
   * Ends a stroke at a given position
   *
   * @param {number} x
   * @param {number} y
   */
  endStroke(x: number, y: number) {
    this.context.closePath();

    if (this.recordStrokes) {
      this.strokeMemory.push({ point: new Point(x, y), time: performance.now() - this.strokeTimestamp });
    }
    this.dispatchEvent('strokeend', { x, y });

    if (this.recordStrokes) {
      const stroke = {
        points: this.strokeMemory.slice(),
        mode: this.mode,
        weight: this.weight,
        smoothing: this.smoothing,
        color: this.color,
        adaptiveStroke: this.adaptiveStroke
      };

      this.dispatchEvent('strokerecorded', { stroke });
    }
    this.strokeMemory = [];
    delete (this.strokeTimestamp);
  }

  /**
   * Draws a smooth quadratic curve with adaptive stroke thickness
   * between two points
   *
   * @param {number} x current X coordinate
   * @param {number} y current Y coordinate
   * @param {number} prevX previous X coordinate
   * @param {number} prevY previous Y coordinate
   */
  draw(x: number, y: number, prevX: number, prevY: number) {
    if (this.recordStrokes) {
      this.strokeMemory.push({ point: new Point(x, y), time: performance.now() - this.strokeTimestamp });
    }

    const { context } = this;
    // calculate distance from previous point
    const rawDist = Pixels.lineDistance(x, y, prevX, prevY);

    // now, here we scale the initial smoothing factor by the raw distance
    // this means that when the mouse moves fast, there is more smoothing
    // and when we're drawing small detailed stuff, we have more control
    // also we hard clip at 1
    const smoothingFactor = Math.min(Constants.minSmoothingFactor, this.smoothing + (rawDist - 60) / 3000);

    // calculate processed coordinates
    const procX = x - (x - prevX) * smoothingFactor;
    const procY = y - (y - prevY) * smoothingFactor;

    // recalculate distance from previous point, this time relative to the smoothed coords
    const dist = Pixels.lineDistance(procX, procY, prevX, prevY);

    if (this.adaptiveStroke) {
      // calculate target thickness based on the new distance
      this._targetThickness = (dist - Constants.minLineThickness)
        / Constants.lineThicknessRange * (this._maxWeight - this._weight) + this._weight;
      // approach the target gradually
      if (this._thickness > this._targetThickness) {
        this._thickness -= Constants.thicknessIncrement;
      }
      else if (this._thickness < this._targetThickness) {
        this._thickness += Constants.thicknessIncrement;
      }
      // set line width
      context.lineWidth = this._thickness;
    }
    else {
      // line width is equal to default weight
      context.lineWidth = this._weight;
    }

    // draw using quad interpolation
    context.quadraticCurveTo(prevX, prevY, procX, procY);
    context.stroke();

    return { x: procX, y: procY };
  }

  get color() {
    return this.context.strokeStyle.toString();
  }

  set color(c) {
    if (typeof c !== 'string') throw new Error('wrong argument type');
    this.context.strokeStyle = c;
  }

  get weight() {
    return this._weight;
  }

  set weight(w) {
    if (typeof w !== 'number') throw new Error('wrong argument type');
    this._weight = w;
    this._thickness = w;
    this._targetThickness = w;
    this._maxWeight = w + Constants.weightSpread;
  }

  get mode() {
    return this._mode;
  }

  set mode(m) {
    if (typeof m !== 'string') throw new Error('wrong argument type');
    switch (m) {
      case DrawingMode.ERASE:
        this._mode = DrawingMode.ERASE;
        this.context.globalCompositeOperation = 'destination-out';
        break;
      case DrawingMode.FILL:
        this._mode = DrawingMode.FILL;
        this.context.globalCompositeOperation = 'source-over';
        break;
      case DrawingMode.DISABLED:
        this._mode = DrawingMode.DISABLED;
        break;
      default:
        this._mode = DrawingMode.DRAW;
        this.context.globalCompositeOperation = 'source-over';
        break;
    }
  }

  isDirty() {
    return !!this._dirty;
  }

  fireDirty() {
    this.dispatchEvent('dirty');
  }

  clear() {
    if (!this.isDirty) {
      return;
    }

    this._dirty = false;
    this.dispatchEvent('clean');

    // make sure we're in the right compositing mode, and erase everything
    if (this.mode === DrawingMode.ERASE) {
      this.mode = DrawingMode.DRAW;
      this.context.clearRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);
      this.mode = DrawingMode.ERASE;
    }
    else {
      this.context.clearRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);
    }
  }

  toImage() {
    return this.canvas.toDataURL();
  }

  fill() {
    const { mouse } = this;
    const { context } = this;
    // converting to Array because Safari 9
    const startColor = Array.from(context.getImageData(mouse.x, mouse.y, 1, 1).data) as ColorPixelRGBA;
    if (startColor.length !== 4) throw new Error('Expect pixel format of RGBA');

    if (!this._filling) {
      const { x, y } = mouse;
      this.dispatchEvent('fillstart', { x, y });
      this._filling = true;
      setTimeout(() => { this._floodFill(mouse.x, mouse.y, startColor); }, Constants.floodFillInterval);
    }
    else {
      this._fillStack.push([
        mouse.x,
        mouse.y,
        startColor
      ]);
    }
  }

  _floodFill(_startX: number, _startY: number, startColor: ColorPixelRGBA) {
    const { context } = this;
    const startX = Math.floor(_startX);
    const startY = Math.floor(_startY);
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;
    const pixelStack = [[startX, startY]];

    // hex needs to be trasformed to rgb since colorLayer accepts RGB
    const fillColor = Pixels.hexToRgb(this.color);

    // Need to save current context with colors, we will update it
    const colorLayer = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

    const colorLayerData = Array.from(colorLayer.data);
    const alpha = Math.min(context.globalAlpha * 10 * 255, 255);
    const colorPixel = Pixels.colorPixel(colorLayerData, ...fillColor, startColor, alpha);
    const matchColor = Pixels.matchColor(colorLayerData, ...startColor);
    const matchFillColor = Pixels.matchColor(colorLayerData, ...fillColor, 255);

    // check if we're trying to fill with the same colour, if so, stop
    if (matchFillColor((startY * context.canvas.width + startX) * 4)) {
      this._filling = false;
      this.dispatchEvent('fillend', {});
      return;
    }

    while (pixelStack.length) {
      const newPos = pixelStack.pop();
      const x = newPos[0];
      let y = newPos[1];

      let pixelPos = (y * canvasWidth + x) * 4;

      while (y-- >= 0 && matchColor(pixelPos)) {
        pixelPos -= canvasWidth * 4;
      }
      pixelPos += canvasWidth * 4;

      ++y;

      let reachLeft = false;
      let reachRight = false;

      while (y++ < canvasHeight - 1 && matchColor(pixelPos)) {
        colorPixel(pixelPos);

        if (x > 0) {
          if (matchColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          }
          else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < canvasWidth - 1) {
          if (matchColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          }
          else if (reachRight) {
            reachRight = false;
          }
        }

        pixelPos += canvasWidth * 4;
      }
    }

    // Update context with filled bucket!
    context.putImageData(colorLayer, 0, 0);

    if (this._fillStack.length) {
      this._floodFill(...this._fillStack.shift());
    }
    else {
      this._filling = false;
      this.dispatchEvent('fillend', {});
    }
  }
}

export { Atrament };
