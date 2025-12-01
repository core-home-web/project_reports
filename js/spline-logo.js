/**
 * Spline Logo Integration with Dynamic Color Support
 * Uses Spline Runtime API to change 3D logo colors based on color picker selection
 */

import { Application } from 'https://unpkg.com/@splinetool/runtime@1.0.54/build/runtime.js';

let splineApp = null;

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
    splineApp = new Application(canvas);
    await splineApp.load(sceneUrl);
    
    console.log('Spline logo loaded successfully');
    
    // Apply current theme color on load
    applySplineColor();
  } catch (error) {
    console.error('Failed to load Spline scene:', error);
  }
}

/**
 * Apply the current theme color to all Spline logo objects
 */
function applySplineColor() {
  if (!splineApp) return;
  
  // Get the current theme color from CSS variable
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--eoyr-neon-green').trim() || '#00ff41';
  
  console.log('Applying Spline color:', themeColor);
  
  // Update Ellipse (outer ring)
  updateObjectColor('Ellipse', themeColor);
  
  // Update Core Home SVG parent group
  updateObjectColor('Core Home SVG', themeColor);
  
  // Update all Shape objects (0-12) - the individual letter shapes
  for (let i = 0; i <= 12; i++) {
    updateObjectColor(`Shape ${i}`, themeColor);
  }
}

/**
 * Update the color of a specific Spline object
 * @param {string} objectName - Name of the object in Spline
 * @param {string} hexColor - Hex color code to apply
 */
function updateObjectColor(objectName, hexColor) {
  if (!splineApp) return;
  
  const obj = splineApp.findObjectByName(objectName);
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

