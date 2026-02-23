// xpell-3d/src/X3D/X3DPrimitives.ts
import * as THREE from "three";
import * as CANNON from "cannon-es";

import X3DObject, { type IX3DObjectData } from "./X3DObject";
import { XObjectPack } from "@xpell/ui";
import { XCamera, XGeometry, XLight, XMaterial, XMesh, XGroup } from "./X3DCoreObjects";

// =====================================================================================
// Helpers
// =====================================================================================

function toNumber(v: any, fallback?: number): number | undefined {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * IMPORTANT: In Three.js, geometry params are not meant to be mutated directly
 * (e.g. geometry.width = ...). You must rebuild geometry and assign a new one.
 * These setters do that, so runtime updates won't silently do nothing.
 */
function rebuildMeshGeometry(mesh: any, makeGeo: () => THREE.BufferGeometry) {
  const threeMesh = mesh?._three_obj as THREE.Mesh | undefined;
  if (!threeMesh) return;
  const old = threeMesh.geometry as any;
  threeMesh.geometry = makeGeo();
  if (old?.dispose) old.dispose();
}

// =====================================================================================
// Plane
// =====================================================================================

export class XPlane extends XMesh {
  static _xtype = "plane";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "plane",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "plane-geometry",
          width: 2,
          height: 2,
          widthSegments: 20,
          heightSegments: 20,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    // Normalize and bake geometry args
    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const w = toNumber((data as any)._width, toNumber(g.width, 2))!;
    const h = toNumber((data as any)._height, toNumber(g.height, 2))!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;

    // Ensure geometry object exists & has correct signature
    data._geometry = {
      ...g,
      _type: "plane-geometry",
      width: w,
      height: h,
      _threes_class_args: [w, h, ws, hs],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) {
      this._cannon_shape = new CANNON.Plane();
    }
  }

  set _width(val: number) {
    const g = this._geometry as any;
    g.width = val;
    const h = toNumber(g.height, 2)!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    g._threes_class_args = [val, h, ws, hs];

    rebuildMeshGeometry(this, () => new THREE.PlaneGeometry(val, h, ws, hs));
  }

  get _width(): number | undefined {
    return (this._geometry as any)?.width;
  }

  set _height(val: number) {
    const g = this._geometry as any;
    g.height = val;
    const w = toNumber(g.width, 2)!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    g._threes_class_args = [w, val, ws, hs];

    rebuildMeshGeometry(this, () => new THREE.PlaneGeometry(w, val, ws, hs));
  }

  get _height(): number | undefined {
    return (this._geometry as any)?.height;
  }
}

// =====================================================================================
// Box
// =====================================================================================

export class XBox extends XMesh {
  static _xtype = "box";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "box",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "box-geometry",
          width: 10,
          height: 10,
          depth: 0.3,
          widthSegments: 1,
          heightSegments: 1,
          depthSegments: 1,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const w = toNumber((data as any)._width, toNumber(g.width, 10))!;
    const h = toNumber((data as any)._height, toNumber(g.height, 10))!;
    const d = toNumber((data as any)._depth, toNumber(g.depth, 1))!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    const ds = toNumber(g.depthSegments, 1)!;

    data._geometry = {
      ...g,
      _type: "box-geometry",
      width: w,
      height: h,
      depth: d,
      _threes_class_args: [w, h, d, ws, hs, ds],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) {
      this._cannon_shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    }
  }

  set _width(val: number) {
    const g = this._geometry as any;
    g.width = val;
    const h = toNumber(g.height, 1)!;
    const d = toNumber(g.depth, 1)!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    const ds = toNumber(g.depthSegments, 1)!;
    g._threes_class_args = [val, h, d, ws, hs, ds];

    rebuildMeshGeometry(this, () => new THREE.BoxGeometry(val, h, d, ws, hs, ds));
    if (this._enable_physics) this._cannon_shape = new CANNON.Box(new CANNON.Vec3(val / 2, h / 2, d / 2));
  }

  get _width(): number | undefined {
    return (this._geometry as any)?.width;
  }

  set _height(val: number) {
    const g = this._geometry as any;
    g.height = val;
    const w = toNumber(g.width, 1)!;
    const d = toNumber(g.depth, 1)!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    const ds = toNumber(g.depthSegments, 1)!;
    g._threes_class_args = [w, val, d, ws, hs, ds];

    rebuildMeshGeometry(this, () => new THREE.BoxGeometry(w, val, d, ws, hs, ds));
    if (this._enable_physics) this._cannon_shape = new CANNON.Box(new CANNON.Vec3(w / 2, val / 2, d / 2));
  }

  get _height(): number | undefined {
    return (this._geometry as any)?.height;
  }

  set _depth(val: number) {
    const g = this._geometry as any;
    g.depth = val;
    const w = toNumber(g.width, 1)!;
    const h = toNumber(g.height, 1)!;
    const ws = toNumber(g.widthSegments, 1)!;
    const hs = toNumber(g.heightSegments, 1)!;
    const ds = toNumber(g.depthSegments, 1)!;
    g._threes_class_args = [w, h, val, ws, hs, ds];

    rebuildMeshGeometry(this, () => new THREE.BoxGeometry(w, h, val, ws, hs, ds));
    if (this._enable_physics) this._cannon_shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, val / 2));
  }

  get _depth(): number | undefined {
    return (this._geometry as any)?.depth;
  }
}

// =====================================================================================
// Sphere
// =====================================================================================

export class XSphere extends XMesh {
  static _xtype = "sphere";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "sphere",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "sphere-geometry",
          radius: 5,
          widthSegments: 20,
          heightSegments: 20,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const r = toNumber((data as any)._radius, toNumber(g.radius, 1))!;
    const ws = toNumber(g.widthSegments, 8)!;
    const hs = toNumber(g.heightSegments, 6)!;

    data._geometry = {
      ...g,
      _type: "sphere-geometry",
      radius: r,
      _threes_class_args: [r, ws, hs],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) this._cannon_shape = new CANNON.Sphere(r);
  }

  set _radius(val: number) {
    const g = this._geometry as any;
    g.radius = val;
    const ws = toNumber(g.widthSegments, 8)!;
    const hs = toNumber(g.heightSegments, 6)!;
    g._threes_class_args = [val, ws, hs];

    rebuildMeshGeometry(this, () => new THREE.SphereGeometry(val, ws, hs));
    if (this._enable_physics) this._cannon_shape = new CANNON.Sphere(val);
  }

  get _radius(): number | undefined {
    return (this._geometry as any)?.radius;
  }
}

// =====================================================================================
// Cylinder
// =====================================================================================

export class XCylinder extends XMesh {
  static _xtype = "cylinder";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "cylinder",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "cylinder-geometry",
          radiusTop: 0.2,
          radiusBottom: 0.2,
          height: 0.5,
          radialSegments: 24,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const rt = toNumber((data as any)._radius_top, toNumber(g.radiusTop, 0.2))!;
    const rb = toNumber((data as any)._radius_bottom, toNumber(g.radiusBottom, 0.2))!;
    const h = toNumber((data as any)._height, toNumber(g.height, 1))!;
    const rs = toNumber(g.radialSegments, 8)!;

    data._geometry = {
      ...g,
      _type: "cylinder-geometry",
      radiusTop: rt,
      radiusBottom: rb,
      height: h,
      radialSegments: rs,
      _threes_class_args: [rt, rb, h, rs],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) this._cannon_shape = new CANNON.Cylinder(rt, rb, h, rs);
  }
}

// =====================================================================================
// Torus
// =====================================================================================

export class XTorus extends XMesh {
  static _xtype = "torus";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "torus",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "torus-geometry",
          radius: 0.5,
          tubeRadius: 0.25,
          radialSegments: 12,
          tubularSegments: 20,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const r = toNumber((data as any)._radius, toNumber(g.radius, 0.5))!;
    const tube = toNumber((data as any)._tube_radius, toNumber(g.tubeRadius, 0.25))!;
    const rs = toNumber(g.radialSegments, 8)!;
    const ts = toNumber(g.tubularSegments, 6)!;

    data._geometry = {
      ...g,
      _type: "torus-geometry",
      radius: r,
      tubeRadius: tube,
      radialSegments: rs,
      tubularSegments: ts,
      _threes_class_args: [r, tube, rs, ts],
    };

    super(data, defaults as any, true);
    this.parse(data);

    // Physics: torus is not a box. Use Sphere approximation (cheap) or Trimesh (expensive).
    if (this._enable_physics) {
      const approx = r + tube;
      this._cannon_shape = new CANNON.Sphere(approx);
    }
  }
}

// =====================================================================================
// Cone
// =====================================================================================

export class XCone extends XMesh {
  static _xtype = "cone";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "cone",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "cone-geometry",
          radius: 0.25,
          height: 0.5,
          segments: 18,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const r = toNumber((data as any)._radius, toNumber(g.radius, 0.25))!;
    const h = toNumber((data as any)._height, toNumber(g.height, 0.5))!;
    const seg = toNumber(g.segments, 8)!;

    data._geometry = {
      ...g,
      _type: "cone-geometry",
      radius: r,
      height: h,
      segments: seg,
      _threes_class_args: [r, h, seg],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) this._cannon_shape = new CANNON.Cylinder(r, 0, h, seg);
  }
}

// =====================================================================================
// Circle
// =====================================================================================

export class XCircle extends XMesh {
  static _xtype = "circle";

  constructor(data: IX3DObjectData, defaults?: IX3DObjectData) {
    if (!defaults) {
      defaults = {
        _type: "circle",
        _three_class: THREE.Mesh,
        _three_obj: null,
        _geometry: {
          _type: "circle-geometry",
          radius: 0.25,
          segments: 18,
          thetaStart: 0,
          thetaLength: Math.PI * 2,
        },
        _material: {
          _type: "standard-material",
          _color: 0xffffff,
          _side: 2,
        },
      };
    }

    const g = (data._geometry ?? (defaults as any)._geometry) as any;
    const r = toNumber((data as any)._radius, toNumber(g.radius, 0.25))!;
    const seg = toNumber(g.segments, 8)!;
    const ts = toNumber((data as any)._theta_start, toNumber(g.thetaStart, 0))!;
    const tl = toNumber((data as any)._theta_length, toNumber(g.thetaLength, Math.PI * 2))!;

    data._geometry = {
      ...g,
      _type: "circle-geometry",
      radius: r,
      segments: seg,
      thetaStart: ts,
      thetaLength: tl,
      _threes_class_args: [r, seg, ts, tl],
    };

    super(data, defaults as any, true);
    this.parse(data);

    if (this._enable_physics) {
      // Approx: thin cylinder
      this._cannon_shape = new CANNON.Cylinder(r, r, 0.1, seg);
    }
  }
}

// =====================================================================================
// Model
// =====================================================================================

/**
 * XModel
 * auto wrapper for GLB/GLTF models
 * @example {
 *   _id: "model-id",
 *   _type: "xmodel",
 *   _model_url: "/public/models/scene.gltf",
 * }
 */
export class XModel extends X3DObject {
  static _xtype = "xmodel";

  constructor(data: IX3DObjectData) {
    super(data, { _type: XModel._xtype } as any, true);
    this.parse(data);
    (this as any)._log_rules._load_model = true;
  }
}

// =====================================================================================
// Pack
// =====================================================================================

export class X3DPrimitives extends XObjectPack {
  static getObjects() {
    return {
      material: XMaterial,
      geometry: XGeometry,
      mesh: XMesh,
      group: XGroup,

      plane: XPlane,
      box: XBox,
      sphere: XSphere,
      cylinder: XCylinder,
      torus: XTorus,
      cone: XCone,
      circle: XCircle,

      xmodel: XModel,

      "perspective-camera": XCamera,
      camera: XCamera, // alias to perspective-camera

      light: XLight, // alias to ambient-light in your data
    };
  }
}

export default X3DPrimitives;
