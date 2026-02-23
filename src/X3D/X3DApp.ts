/**
 * X3D Application Template
 *
 * FIXES:
 * 1) Background params: solid-color handler expects `_color`, but default used `_color1`.
 *    -> changed to `_color: "black"`
 * 2) XCameraData uses `_near` (not `_close`) — your XCamera class maps `_close` -> `_near` only via backward-compat
 *    but your XCameraData interface defines `_near`. To avoid confusion:
 *    -> use `_near: 0.01`
 * 3) AppGenerator bug: `_background._params._color = bgColor` but default had `_color1`.
 *    -> now `_params._color = bgColor`
 * 4) enablePhysics param: was `enablePhysics?: boolean` then assigned possibly `undefined`.
 *    -> default it to `false` in generator.
 */

import type { XCameraData, XLightData } from "./X3DCoreObjects";
import type { IX3DObjectData } from "./X3DObject";
import type { X3DSceneBackground } from "./X3DWorldSceneBackground";
import { X3DSceneBackgroundTypes } from "./X3DWorldSceneBackground";

export type X3DSceneControl = {
  _type: "orbit" | "pointer" | "first-person" | "transform";
  _active: boolean;
  _params?: Record<string, any>;
};

export type X3DPhysicsEngines = "cannon.js";
export type X3DHelpers = "axes" | "skeleton";

export type X3AxesHelper = {
  size: number;
};

export type XHelperData<Type> = {
  _type: X3DHelpers;
  _active: boolean;
  _params?: { [Property in keyof Type]: Type[Property] };
};

export type X3DApp = {
  _parent_element: string; // id of the 3d player html tag
  _physics: {
    _engine?: X3DPhysicsEngines;
    _active: boolean;
    _debug?: boolean; // show cannon debug shapes
  };
  _scene: {
    _helpers?: Record<string, XHelperData<X3AxesHelper>>;
    _lights?: Record<string, XLightData>;
    _cameras?: Record<string, XCameraData>;
    _background?: X3DSceneBackground;
    _controls?: Record<string, X3DSceneControl>;
    _objects?: Record<string, IX3DObjectData>;
    _raycast?: boolean;
  };
};

export const X3DDefaultApp: X3DApp = {
  _parent_element: "x3d-player",
  _physics: {
    _engine: "cannon.js",
    _active: false,
    _debug: true,
  },
  _scene: {
    _raycast: false,
    _helpers: {
      axes: {
        _type: "axes",
        _active: false,
        _params: { size: 5 },
      },
    },
    _lights: {
      main: {
        _id: "ambient-light",
        _type: "light",
        _light: "ambient",
        _color: 0xffffff,
        _intensity: 0.5,
      },
    },
    _cameras: {
      "main-cam": {
        _id: "main-cam",
        _type: "camera",
        _camera: "perspective",
        _position: { x: 0, y: 2, z: 50 },
        _rotation: { x: 0, y: 0, z: 0 },

        // engine flags
        _disable_frame_3d_state: true,
        _3d_set_once: true,

        _positional_audio_listener: false,

        // camera props
        _fov: 50,
        _ratio: window.innerWidth / window.innerHeight,
        _far: 1000,
        _near: 0.01,
      },
    },
    _controls: {
      "cam-control": {
        _type: "orbit",
        _active: false,
        _params: {
          enableDamping: true,
          minPolarAngle: Math.PI / 6,
          maxPolarAngle: Math.PI / 1.8,
          minZoom: 1,
          minDistance: 1,
          maxDistance: 16,
          rotateSpeed: 0.5,
          autoRotateSpeed: 1,
        },
      },
      transform: {
        _type: "transform",
        _active: false,
      },
    },
    _objects: {},
    _background: {
      _type: X3DSceneBackgroundTypes._solid_color,
      _params: {
        _color: "black",
      },
    },
  },
};

export class X3DAppGenerator {
  static getDefaultApp(
    orbitControls: boolean = true,
    bgColor: string = "black",
    enablePhysics: boolean = false
  ): X3DApp {
    // deep clone the default app template
    const tmpApp = JSON.parse(JSON.stringify(X3DDefaultApp)) as X3DApp;

    // update orbit controls
    tmpApp._scene._controls = tmpApp._scene._controls ?? {};
    if (tmpApp._scene._controls["cam-control"]) {
      tmpApp._scene._controls["cam-control"]._active = orbitControls;
    }

    // update background color (solid-color uses `_color`)
    if (tmpApp._scene._background) {
      tmpApp._scene._background._params = tmpApp._scene._background._params ?? {};
      (tmpApp._scene._background._params as any)._color = bgColor;
    }

    // update physics engine
    tmpApp._physics._active = enablePhysics;

    return tmpApp;
  }
}
