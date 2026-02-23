/**
 * X3D Nano Commands
 *
 * Nano-commands are small xcommands that can be triggered by invoking object.execute(...)
 *
 * FIXES:
 * - Import from `xpell-ui` (not xpell-core) as requested.
 * - Move away from legacy `XData.objects / XData.variables` and use XData2-style:
 *   `_xd.get / _xd.set / _xd.delete / _xd.touch` (per your XData2 rules).
 * - Make `setAxis` safe for numbers as well as strings (++, --, plain number).
 * - Don’t assume `_rotation` exists; guard and no-op safely.
 */

import {
  _xem,
  _xlog,
  _xu,
  _xd,
  type XNanoCommandPack,
  type XCommand,
  type XCommandData,
  type XObject,
} from "@xpell/ui";

import * as THREE from "three";
import X3DObject from "./X3DObject";

// ============================================================================
// helpers
// ============================================================================

function asString(v: any): string | undefined {
  if (v === undefined || v === null) return undefined;
  return typeof v === "string" ? v : String(v);
}

function toNumber(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * setAxis(root, "x", "++0.01") / setAxis(root, "x", "--0.01") / setAxis(root, "x", "0.3") / setAxis(root, "x", 0.3)
 */
function setAxis(root: any, axis: "x" | "y" | "z", param: any) {
  if (!root) return;

  // allow direct numbers
  if (typeof param === "number") {
    root[axis] = param;
    return;
  }

  const s = asString(param);
  if (!s) return;

  if (s.startsWith("++")) {
    const step = toNumber(s.substring(2));
    if (step !== undefined) root[axis] += step;
    return;
  }

  if (s.startsWith("--")) {
    const step = toNumber(s.substring(2));
    if (step !== undefined) root[axis] -= step;
    return;
  }

  const abs = toNumber(s);
  if (abs !== undefined) root[axis] = abs;
}

// ============================================================================
// nano pack
// ============================================================================

export const _x3dobject_nano_commands: XNanoCommandPack = {
  /**
   * rotation x:0.01 y:++0.01 z:--0.01
   */
  rotation: (xCommand: XCommand | XCommandData, x3dObject?: XObject) => {
    const cmd = xCommand as XCommand;
    const obj = x3dObject as X3DObject | undefined;
    if (!obj?.setRotation) return;

    const next = obj._rotation;

    const x = _xu.getParam(cmd, "x", undefined);
    if (x !== undefined) setAxis(next, "x", x);

    const y = _xu.getParam(cmd, "y", undefined);
    if (y !== undefined) setAxis(next, "y", y);

    const z = _xu.getParam(cmd, "z", undefined);
    if (z !== undefined) setAxis(next, "z", z);

    obj.setRotation(next);
  },

  /**
   * position x:0 y:++1 z:--0.5
   */
  position: (xCommand: XCommand | XCommandData, x3dObject?: XObject) => {
    const cmd = xCommand as XCommand;
    const obj = x3dObject as X3DObject | undefined;
    if (!obj?.setPosition) return;

    const next = obj._position;

    const x = _xu.getParam(cmd, "x", undefined);
    if (x !== undefined) setAxis(next, "x", x);

    const y = _xu.getParam(cmd, "y", undefined);
    if (y !== undefined) setAxis(next, "y", y);

    const z = _xu.getParam(cmd, "z", undefined);
    if (z !== undefined) setAxis(next, "z", z);

    obj.setPosition(next);
  },

  /**
   * scale x:1 y:++0.1 z:--0.1
   */
  scale: (xCommand: XCommand | XCommandData, x3dObject?: XObject) => {
    const cmd = xCommand as XCommand;
    const obj = x3dObject as X3DObject | undefined;
    if (!obj?.setScale) return;

    const next = typeof obj.getScaleData === "function" ? obj.getScaleData() : (obj as any)._scale;
    if (!next) return;

    const x = _xu.getParam(cmd, "x", undefined);
    if (x !== undefined) setAxis(next, "x", x);

    const y = _xu.getParam(cmd, "y", undefined);
    if (y !== undefined) setAxis(next, "y", y);

    const z = _xu.getParam(cmd, "z", undefined);
    if (z !== undefined) setAxis(next, "z", z);

    obj.setScale(next);
  },

  /**
   * spin y:0.01  -> sets _on_frame to "rotation y:++0.01"
   */
  spin: (xCommand: XCommand | XCommandData, x3dObject?: XObject) => {
    const cmd = xCommand as XCommand;
    const obj = x3dObject as any;
    if (!obj) return;

    const x = _xu.getParam(cmd, "x", undefined);
    const y = _xu.getParam(cmd, "y", undefined);
    const z = _xu.getParam(cmd, "z", undefined);

    const xStr = x !== undefined ? `x:++${x}` : "";
    const yStr = y !== undefined ? `y:++${y}` : "";
    const zStr = z !== undefined ? `z:++${z}` : "";

    obj._on_frame = `rotation ${xStr} ${yStr} ${zStr}`.trim();
  },

  stop: (_cmd: XCommand | XCommandData, x3dObject?: XObject) => {
    const obj = x3dObject as any;
    if (obj) obj._on_frame = "";
  },

  /**
   * follow-joystick:
   * - reads `_xd.get("x3d:joy-move")`
   * - uses `_xd.get("x3d:control-azimuth")`
   * - writes:
   *   - `_xd.set("x3d:control-target", vec | undefined)`
   *   - `_xd.set("x3d:joystick-vector", vec)`
   *   - `_xd.set("x3d:joystick-position", "x:.. y:.. z:..")`
   *
   * NOTE: this preserves your existing behavior but migrates to XData2 semantics.
   */
  "follow-joystick": (_cmd: XCommand | XCommandData, x3dObject?: XObject) => {
    const x3do = x3dObject as unknown as X3DObject;
    if (!x3do) return;

    const jm = _xd.get("x3d:joy-move");
    if (!jm) return;

    const angle = _xd.get("x3d:control-azimuth") ?? 0;

    const power = 0.2;
    const pos = x3do._position;
    const lvector = x3do._threeSync?.position?.clone?.() ?? new THREE.Vector3(pos.x, pos.y, pos.z);

    const tempVector = new THREE.Vector3();
    const upVector = new THREE.Vector3(0, 1, 0);

    let changed = false;

    if (jm.forward > 0) {
      tempVector.set(0, 0, -jm.forward * power).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }
    if (jm.backward > 0) {
      tempVector.set(0, 0, jm.backward * power).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }
    if (jm.left > 0) {
      tempVector.set(-jm.left * power, 0, 0).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }
    if (jm.right > 0) {
      tempVector.set(jm.right * power, 0, 0).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }
    if (jm.up > 0) {
      tempVector.set(0, jm.up * power, 0).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }
    if (jm.down > 0) {
      tempVector.set(0, -jm.down * power, 0).applyAxisAngle(upVector, angle);
      lvector.addScaledVector(tempVector, 1);
      changed = true;
    }

    x3do.setPositionFromVector3(lvector);
    x3do._threeSync?.updateMatrixWorld?.();

    _xd.set("x3d:control-target", changed ? lvector : undefined);
    _xd.set("x3d:joystick-vector", lvector);
    _xd.set(
      "x3d:joystick-position",
      `x:${lvector.x.toFixed(2)} y:${lvector.y.toFixed(2)} z:${lvector.z.toFixed(2)}`
    );
  },

  /**
   * orbit speed:0.2 radius:2
   */
  orbit: (cmd: any, x3dObject?: XObject) => {
    const xobj = x3dObject as X3DObject | undefined;
    if (!xobj) return;

    const radius = cmd?._params?.radius ?? 1;
    const speed = cmd?._params?.speed ?? 0.02;

    const angle = (xobj as any)._frame_number * speed;

    xobj.setPosition({
      x: radius * Math.cos(angle),
      z: radius * Math.sin(angle),
      y: 3 + Math.sin(angle),
    });
  },
};

export default _x3dobject_nano_commands;
