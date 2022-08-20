// first, we need to set up the canvas
const canvas = document.getElementById('sketcher');
canvas.style.cursor = 'crosshair';

// instantiate Atrament
const atm = new atrament.Atrament(canvas, {
  width: canvas.offsetWidth,
  height: canvas.offsetHeight
});


// a little helper tool for logging events
const eventsLog = [];
const logElement = document.getElementById('events');
const log = (...messages) => {
  if (eventsLog.push(messages.map(m => JSON.stringify(m)).join()) > 5) {
    eventsLog.shift();
  }

  logElement.innerText = eventsLog.join('\n');
  console.log(...messages);
};

// we only display the Clear button if canvas is dirty
const clearButton = document.getElementById('clear');
atm.addEventListener('dirty', () => {
  log('event: dirty');
  clearButton.style.display = atm.isDirty ? 'inline-block' : 'none';
});

atm.addEventListener('clean', () => {
  log('event: clean');
});

atm.addEventListener('fillstart', ({ x, y }) => {
  canvas.style.cursor = 'wait';
  log(`event: fillstart x: ${x} y: ${y}`);
});

atm.addEventListener('fillend', () => {
  canvas.style.cursor = 'crosshair';
  log('event: fillend');
});

atm.addEventListener('strokestart', () => log('event: strokestart'));
atm.addEventListener('strokeend', () => log('event: strokeend'));

atm.addEventListener('strokerecorded', ({ stroke }) => {
  log(`event: strokerecorded - ${stroke.points.length} points`);
});

// utility to add delay to drawing steps
const sleep = async time => new Promise(r => setTimeout(r, time));

const waitUntil = function (reference, time) {
  const time_elapsed = performance.now() - reference;
  const time_to_wait = time - time_elapsed;
  return new Promise(resolve => setTimeout(resolve, time_to_wait));
};

function recordAStroke() {
  atm.recordStrokes = true;
  document.querySelector('#recordButton').value = 'Recording...';
}

let recordedStroke;
atm.addEventListener('strokerecorded', (stroke) => {
  recordedStroke = stroke.stroke;
  atm.recordStrokes = false;
  document.querySelector('#recordButton').value = 'Record a stroke';
  document.querySelector('#playButton').style.display = 'inline';
});

async function playRecorded() {
  // offset the drawing to avoid drawing at the exact same place
  const offset_x = Math.floor(Math.random() * 100) - 50;
  const offset_y = Math.floor(Math.random() * 100) - 50;

  // set drawing options
  atm.weight = recordedStroke.weight;
  atm.mode = recordedStroke.mode;
  atm.smoothing = recordedStroke.smoothing;
  atm.color = recordedStroke.color;
  atm.adaptiveStroke = recordedStroke.adaptiveStroke;

  // add a time reference
  const reference = performance.now();

  // wait for the first point
  await waitUntil(reference, recordedStroke.points[0].time);

  let prev_point = recordedStroke.points[0].point;
  atm.beginStroke(prev_point.x, prev_point.y);

  for (const point of recordedStroke.points.slice(1)) {
    // waiting for time from reference
    await waitUntil(reference, point.time);

    // the `draw` method accepts the current real coordinates
    // (i. e. actual cursor position), and the previous processed (filtered)
    // position. It returns an object with the current processed position.
    prev_point = atm.draw(point.point.x + offset_x, point.point.y + offset_y, prev_point.x, prev_point.y);
  }

  atm.endStroke(prev_point.x, prev_point.y);
}

// Simple example, see optional options for more configuration.
const pickr = Pickr.create({
  el: '#color-picker',
  theme: 'classic',
  default: 'rgb(0,0,0)',
  swatches: [
    'rgb(244, 67, 54)',
    'rgb(233, 30, 99)',
    'rgb(156, 39, 176)',
    'rgb(103, 58, 183)',
    'rgb(63, 81, 181)',
    'rgb(33, 150, 243)',
    'rgb(3, 169, 244)',
    'rgb(0, 188, 212)',
    'rgb(0, 150, 136)',
    'rgb(76, 175, 80)',
    'rgb(139, 195, 74)',
    'rgb(205, 220, 57)',
    'rgb(255, 235, 59)',
    'rgb(255, 193, 7)'
  ],
  components: {
    // Main components
    preview: true,
    opacity: true,
    hue: true,
    // Input / output Options
    interaction: {
      hex: true,
      rgb: true,
      hsla: true,
      hsva: true,
      cmyk: true,
      input: true,
      clear: true,
      save: true
    }
  }
});

pickr.on('save', (color) => {
  atm.color = color.toRGBA().toString();
});
