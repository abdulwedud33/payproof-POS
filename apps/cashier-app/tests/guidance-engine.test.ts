import { describe, it, expect, beforeEach } from 'vitest';
import { CameraGuidanceEngine, CameraFrameMetrics } from '../src/camera/guidance-engine.js';

describe('Camera Guidance & Glare / Distance Detection Engine (DESIGN § 5.2)', () => {
  let engine: CameraGuidanceEngine;

  beforeEach(() => {
    engine = new CameraGuidanceEngine();
  });

  it('cues NO_QR_DETECTED when no QR bounding box is present', () => {
    const metrics: CameraFrameMetrics = {
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.05,
    };

    const res = engine.evaluateFrame(metrics);
    expect(res.cue).toBe('NO_QR_DETECTED');
    expect(res.canCapture).toBe(false);
  });

  it('cues MOVE_CLOSER when QR is too small relative to viewfinder (<25% area)', () => {
    const metrics: CameraFrameMetrics = {
      qrBoundingBox: { x: 400, y: 400, width: 200, height: 200 }, // area = 40,000 / 1,000,000 = 4%
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.05,
    };

    const res = engine.evaluateFrame(metrics);
    expect(res.cue).toBe('MOVE_CLOSER');
    expect(res.message).toBe('Move closer to the QR code');
    expect(res.canCapture).toBe(false);
  });

  it('cues MOVE_FURTHER when QR exceeds 85% area or clips viewfinder boundary', () => {
    // 1. Too large
    const metricsTooLarge: CameraFrameMetrics = {
      qrBoundingBox: { x: 50, y: 50, width: 950, height: 950 }, // area = 90.25%
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.05,
    };
    const resLarge = engine.evaluateFrame(metricsTooLarge);
    expect(resLarge.cue).toBe('MOVE_FURTHER');
    expect(resLarge.message).toBe('Move slightly further away');

    // 2. Clipping boundary (< 5% margin)
    const metricsClipping: CameraFrameMetrics = {
      qrBoundingBox: { x: 10, y: 200, width: 600, height: 600 }, // x=10 is < 50px margin
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.05,
    };
    const resClip = engine.evaluateFrame(metricsClipping);
    expect(resClip.cue).toBe('MOVE_FURTHER');
  });

  it('cues AVOID_GLARE when overexposed pixel ratio exceeds 15% (screen reflection)', () => {
    const metricsGlare: CameraFrameMetrics = {
      qrBoundingBox: { x: 250, y: 250, width: 500, height: 500 }, // area = 25%
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.22, // 22% glare
      motionVariance: 0.05,
    };

    const res = engine.evaluateFrame(metricsGlare);
    expect(res.cue).toBe('AVOID_GLARE');
    expect(res.message).toBe('Tilt phone to avoid reflection / glare');
    expect(res.canCapture).toBe(false);
  });

  it('cues HOLD_STEADY when device is shaking (motion variance > 0.35)', () => {
    const metricsShaking: CameraFrameMetrics = {
      qrBoundingBox: { x: 250, y: 250, width: 500, height: 500 },
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.65, // excessive motion
    };

    const res = engine.evaluateFrame(metricsShaking);
    expect(res.cue).toBe('HOLD_STEADY');
    expect(res.message).toBe('Hold steady');
    expect(res.canCapture).toBe(false);
  });

  it('cues READY_TO_SCAN and enables capture after holding steady for required frame duration (~250ms)', () => {
    const idealMetrics: CameraFrameMetrics = {
      qrBoundingBox: { x: 250, y: 250, width: 500, height: 500 }, // 25% area, centered
      viewfinderWidth: 1000,
      viewfinderHeight: 1000,
      overexposedPixelRatio: 0.02,
      motionVariance: 0.05, // calm
    };

    // Frame 1
    const res1 = engine.evaluateFrame(idealMetrics);
    expect(res1.cue).toBe('READY_TO_SCAN');
    expect(res1.canCapture).toBe(false);

    // Frame 2
    const res2 = engine.evaluateFrame(idealMetrics);
    expect(res2.canCapture).toBe(false);

    // Frame 3 (Threshold met)
    const res3 = engine.evaluateFrame(idealMetrics);
    expect(res3.canCapture).toBe(true);
    expect(res3.message).toBe('Scanning payment...');
  });
});
