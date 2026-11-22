/**
 * Camera Guidance & Glare / Distance Detection Engine
 * DESIGN.md § 5.2 / TRD § 5.1
 * Provides real-time guidance cues to cashiers scanning payment QRs on customer phone screens.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraFrameMetrics {
  qrBoundingBox?: BoundingBox;
  viewfinderWidth: number;
  viewfinderHeight: number;
  overexposedPixelRatio: number; // 0.0 to 1.0 (pixels with luminance > 0.90 representing screen glare/reflection)
  motionVariance: number; // Lower is steadier (e.g. gyroscope/accelerometer or optical flow delta)
}

export type GuidanceCue =
  | 'MOVE_CLOSER'
  | 'MOVE_FURTHER'
  | 'AVOID_GLARE'
  | 'HOLD_STEADY'
  | 'READY_TO_SCAN'
  | 'NO_QR_DETECTED';

export interface GuidanceResult {
  cue: GuidanceCue;
  message: string;
  canCapture: boolean;
}

export class CameraGuidanceEngine {
  private steadyFrameCount: number = 0;
  private readonly requiredSteadyFrames: number = 3; // ~250ms at 12 fps guidance loop

  /**
   * Evaluates current camera frame metrics and returns actionable guidance for the cashier.
   */
  public evaluateFrame(metrics: CameraFrameMetrics): GuidanceResult {
    // 1. Check for absence of QR code in viewfinder
    if (!metrics.qrBoundingBox) {
      this.steadyFrameCount = 0;
      return {
        cue: 'NO_QR_DETECTED',
        message: 'Align customer payment QR inside the frame',
        canCapture: false,
      };
    }

    const { qrBoundingBox, viewfinderWidth, viewfinderHeight } = metrics;
    const viewfinderArea = viewfinderWidth * viewfinderHeight;
    const qrArea = qrBoundingBox.width * qrBoundingBox.height;
    const areaRatio = viewfinderArea > 0 ? qrArea / viewfinderArea : 0;

    // 2. Check for severe glare / reflection on customer screen (overexposed pixels in QR region)
    if (metrics.overexposedPixelRatio > 0.15) {
      this.steadyFrameCount = 0;
      return {
        cue: 'AVOID_GLARE',
        message: 'Tilt phone to avoid reflection / glare',
        canCapture: false,
      };
    }

    // 3. Check for distance: too far away (< 25% of viewfinder area)
    if (areaRatio < 0.25) {
      this.steadyFrameCount = 0;
      return {
        cue: 'MOVE_CLOSER',
        message: 'Move closer to the QR code',
        canCapture: false,
      };
    }

    // 4. Check for distance: too close or clipping edges (> 85% area or within 5% edge padding)
    const marginX = viewfinderWidth * 0.05;
    const marginY = viewfinderHeight * 0.05;
    const isClipping =
      qrBoundingBox.x < marginX ||
      qrBoundingBox.y < marginY ||
      qrBoundingBox.x + qrBoundingBox.width > viewfinderWidth - marginX ||
      qrBoundingBox.y + qrBoundingBox.height > viewfinderHeight - marginY;

    if (areaRatio > 0.85 || isClipping) {
      this.steadyFrameCount = 0;
      return {
        cue: 'MOVE_FURTHER',
        message: 'Move slightly further away',
        canCapture: false,
      };
    }

    // 5. Check for phone shaking / motion blur
    if (metrics.motionVariance > 0.35) {
      this.steadyFrameCount = 0;
      return {
        cue: 'HOLD_STEADY',
        message: 'Hold steady',
        canCapture: false,
      };
    }

    // 6. Frame is stable, correctly sized, and glare-free
    this.steadyFrameCount += 1;
    const isReady = this.steadyFrameCount >= this.requiredSteadyFrames;

    return {
      cue: 'READY_TO_SCAN',
      message: isReady ? 'Scanning payment...' : 'Hold steady...',
      canCapture: isReady,
    };
  }

  public reset(): void {
    this.steadyFrameCount = 0;
  }
}
