/**
 * Spline Logo Integration with Dynamic Color Support
 * Uses Spline Runtime API to change 3D logo colors based on color picker selection
 */

import { Application } from 'https://unpkg.com/@splinetool/runtime@1.0.54/build/runtime.js';

// Store multiple Spline app instances
const splineApps = {};

/**
 * Initialize the Spline logo on a canvas element
 * @param {string} canvasId - The ID of the canvas element
 * @param {string} sceneUrl - URL to the Spline scene file
 */
async function initSplineLogo(canvasId, sceneUrl) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn('Spline canvas not found:', canvasId);
    return;
  }
  
  try {
    const app = new Application(canvas);
    await app.load(sceneUrl);
    
    // Store the app instance by canvas ID
    splineApps[canvasId] = app;
    
    console.log('Spline logo loaded successfully:', canvasId);
    
    // Apply current theme color on load
    applySplineColor();
  } catch (error) {
    console.error('Failed to load Spline scene:', canvasId, error);
  }
}

/**
 * Apply the current theme color to all Spline logo objects in all instances
 */
function applySplineColor() {
  // Get the current theme color from CSS variable
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--eoyr-neon-green').trim() || '#00ff41';
  
  console.log('Applying Spline color:', themeColor);
  
  // Apply to all Spline app instances
  Object.keys(splineApps).forEach(canvasId => {
    const app = splineApps[canvasId];
    if (!app) return;
    
    // Update Ellipse (outer ring)
    updateObjectColorInApp(app, 'Ellipse', themeColor);
    
    // Update Core Home SVG parent group
    updateObjectColorInApp(app, 'Core Home SVG', themeColor);
    
    // Update all Shape objects (0-12) - the individual letter shapes
    for (let i = 0; i <= 12; i++) {
      updateObjectColorInApp(app, `Shape ${i}`, themeColor);
    }
  });
}

/**
 * Update the color of a specific Spline object in a specific app instance
 * @param {Application} app - Spline Application instance
 * @param {string} objectName - Name of the object in Spline
 * @param {string} hexColor - Hex color code to apply
 */
function updateObjectColorInApp(app, objectName, hexColor) {
  if (!app) return;
  
  const obj = app.findObjectByName(objectName);
  if (obj) {
    // Try different material color properties
    if (obj.material) {
      if (obj.material.color) {
        obj.material.color.set(hexColor);
      }
      // Some materials use emissive color
      if (obj.material.emissive) {
        obj.material.emissive.set(hexColor);
      }
    }
  }
}

// Make functions available globally
window.initSplineLogo = initSplineLogo;
window.applySplineColor = applySplineColor;

