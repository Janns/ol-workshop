// meteorites.js : membaca file csv 
// squares.js : 

import 'ol/ol.css';
import {fromLonLat} from 'ol/proj';
import {Map, View} from 'ol';
import {Vector as VectorLayer, Tile as TileLayer} from 'ol/layer';
import {Vector as VectorSource, Stamen} from 'ol/source';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
//! [imports]
import Renderer from 'ol/renderer/webgl/PointsLayer';
import {clamp} from 'ol/math';
//! [imports]

const source = new VectorSource();

const client = new XMLHttpRequest();
client.open('GET', 'data/meteorites.csv');
client.onload = function() {
  const csv = client.responseText;
  const features = [];

  let prevIndex = csv.indexOf('\n') + 1; // scan past the header line

  let curIndex;
  while ((curIndex = csv.indexOf('\n', prevIndex)) != -1) {
    const line = csv.substr(prevIndex, curIndex - prevIndex).split(',');
    prevIndex = curIndex + 1;

    const coords = fromLonLat([parseFloat(line[4]), parseFloat(line[3])]);
    if (isNaN(coords[0]) || isNaN(coords[1])) {
      // guard against bad data
      continue;
    }

    features.push(new Feature({
      mass: parseFloat(line[1]) || 0,
      year: parseInt(line[2]) || 0,
      geometry: new Point(coords)
    }));
  }
  source.addFeatures(features);
};
client.send();

//! [points]
const color = [1, 0, 0, 0.5];

// start
const minYear = 1850;
const maxYear = 2015;
const span = maxYear - minYear;
const rate = 1; // years per second

const start = Date.now();
let currentYear = minYear;
// stop


class CustomLayer extends VectorLayer {
  createRenderer() {
    return new Renderer(this, {
      colorCallback: function(feature, vertex, component) {
        return color[component];
      },
      sizeCallback: function(feature) {
        return 18 * clamp(feature.get('mass') / 200000, 0, 1) + 8;
      },
			
      //! [opacity]
      opacityCallback: function(feature) {
        // here the opacity channel of the vertices is used to store the year of impact
        return feature.get('year');
      },
      //! [opacity]
			
      //! [uniforms]
      uniforms: {
        u_currentYear: function() {
          return currentYear;
        }
      },
      //! [uniforms]

      //! [fragment]
      fragmentShader: `
        precision mediump float;

        uniform float u_currentYear;

        varying vec2 v_texCoord;
        varying vec4 v_color;
        varying float v_opacity;

        void main(void) {
          float impactYear = v_opacity;
          if (impactYear > u_currentYear) {
            discard;
          }

          vec2 texCoord = v_texCoord * 2.0 - vec2(1.0, 1.0);
          float sqRadius = texCoord.x * texCoord.x + texCoord.y * texCoord.y;
          
          float factor = pow(1.1, u_currentYear - impactYear);

          float value = 2.0 * (1.0 - sqRadius * factor);
          float alpha = smoothstep(0.0, 1.0, value);

          gl_FragColor = v_color;
          gl_FragColor.a *= alpha;
        }`
      //! [fragment]
			
    });
  }
}
//! [points]

// start
const map = new Map({
// stop
  target: 'map-container',
  layers: [
    new TileLayer({
      source: new Stamen({
        layer: 'toner'
      })
    }),
    //! [layer]
    new CustomLayer({
      source: source
    })
    //! [layer]
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

// start
const yearElement = document.getElementById('year');

function render() {
  const elapsed = rate * (Date.now() - start) / 1000;
  currentYear = minYear + (elapsed % span);
  yearElement.innerText = currentYear.toFixed(0);

  map.render();
  requestAnimationFrame(render);
}

render();
// stop
