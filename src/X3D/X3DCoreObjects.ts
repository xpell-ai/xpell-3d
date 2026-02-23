// xpell-3d/src/X3D/X3DCoreObjects.ts
import * as THREE from "three";
import { X3DObject, type IX3DObjectData } from "./X3DObject";

// -----------------------------------------------------------------------------// Maps
// -----------------------------------------------------------------------------

export const threeCameras: Record<string, any> = {
  "perspective-camera": THREE.PerspectiveCamera,
  perspective: THREE.PerspectiveCamera, // alias
  camera: THREE.PerspectiveCamera, // alias for default camera
  "orthographic-camera": THREE.OrthographicCamera,
  orthographic: THREE.OrthographicCamera, // alias
};

export const threeLights: Record<string, any> = {
  ambient: THREE.AmbientLight,
  directional: THREE.DirectionalLight,
  spotlight: THREE.SpotLight,
  hemisphere: THREE.HemisphereLight,
  point: THREE.PointLight,
  rectArea: THREE.RectAreaLight,
  light: THREE.Light, // fix: "lightE" -> "light"
  lightProbe: THREE.LightProbe,
};

// NOTE: BufferGeometry subclasses were renamed in newer three versions.
// Prefer Geometry (not *BufferGeometry) names.
export const threeGeometries: Record<string, any> = {
  // 2D
  "plane-geometry": THREE.PlaneGeometry,
  "circle-geometry": THREE.CircleGeometry,

  // 3D
  "box-geometry": THREE.BoxGeometry,
  "sphere-geometry": THREE.SphereGeometry,
  "cylinder-geometry": THREE.CylinderGeometry,
  "torus-geometry": THREE.TorusGeometry,
  "cone-geometry": THREE.ConeGeometry,

  // base
  "buffer-geometry": THREE.BufferGeometry,
};

export const threeMaterials: Record<string, any> = {
  "basic-material": THREE.MeshBasicMaterial,
  "shader-material": THREE.ShaderMaterial,
  "phong-material": THREE.MeshPhongMaterial,
  "lambert-material": THREE.MeshLambertMaterial,
  "toon-material": THREE.MeshToonMaterial,
  "line-material": THREE.LineBasicMaterial,
  "line-dashed-material": THREE.LineDashedMaterial,
  "points-material": THREE.PointsMaterial,
  "sprite-material": THREE.SpriteMaterial,
  "physical-material": THREE.MeshPhysicalMaterial,
  "depth-material": THREE.MeshDepthMaterial,
  "normal-material": THREE.MeshNormalMaterial,
  "standard-material": THREE.MeshStandardMaterial,
  "matcap-material": THREE.MeshMatcapMaterial,
};

// -----------------------------------------------------------------------------// Camera
// -----------------------------------------------------------------------------

export type XCameraTypes =
  | "perspective-camera"
  | "perspective"
  | "camera"
  | "orthographic-camera"
  | "orthographic";

export interface XCameraData extends IX3DObjectData {
  _camera?: XCameraTypes;

  // Perspective
  _fov?: number;
  _ratio?: number;
  _far?: number;
  _near?: number;

  // Back-compat
  _close?: number; // legacy alias for _near (kept to not break old data)

  _positional_audio_listener?: boolean;
  _helper?: boolean;

  // Orthographic (optional future support)
  _left?: number;
  _right?: number;
  _top?: number;
  _bottom?: number;
}

/**
 * XCamera — Three Camera wrapper
 *
 * xpell2 fixes:
 * - static _xtype (not xtype) + export pack typically reads _xtype.
 * - _near instead of _close internally (keep legacy alias).
 * - don't call super.parse twice; call super(data,...,skipParse=true) then parse once.
 * - keep camera args correct for perspective/ortho.
 */
export class XCamera extends X3DObject {
  static _xtype = "camera";
  readonly _is_camera = true;

  _camera: XCameraTypes = "perspective-camera";
  _fov = 50;
  _ratio = 16 / 9;
  _far = 2000;
  _near = 0.01;

  _positional_audio_listener = false;
  _helper?: boolean;

  constructor(data: XCameraData) {
    // Backwards compatibility: un-prefixed -> prefixed
    const fieldsToReplace = ["fov", "ratio", "far", "near", "close", "positional_audio_listener", "camera"] as const;
    for (const field of fieldsToReplace) {
      const v = (data as any)[field];
      if (v !== undefined) {
        (data as any)["_" + field] = v;
        delete (data as any)[field];
      }
    }

    super(data, {}); // skipParse=true
    super.parse(data);

    // legacy _close -> _near
    if (data._near === undefined && data._close !== undefined) data._near = data._close;

    this._type = XCamera._xtype;

    const camType = (data._camera ?? this._camera) as XCameraTypes;
    this._camera = camType;

    this._fov = data._fov ?? this._fov;
    this._ratio = data._ratio ?? this._ratio;
    this._far = data._far ?? this._far;
    this._near = data._near ?? this._near;

    this._positional_audio_listener = data._positional_audio_listener ?? this._positional_audio_listener;
    this._helper = data._helper;

    this._three_obj = null;

    if (camType === "orthographic" || camType === "orthographic-camera") {
      // Provide reasonable defaults; can be overridden by data._left/_right/_top/_bottom
      const left = data._left ?? -10;
      const right = data._right ?? 10;
      const top = data._top ?? 10;
      const bottom = data._bottom ?? -10;

      this._three_class = threeCameras[camType];
      this._threes_class_args = [left, right, top, bottom, this._near, this._far];
    } else {
      this._three_class = threeCameras[camType] ?? THREE.PerspectiveCamera;
      this._threes_class_args = [this._fov, this._ratio, this._near, this._far];
    }
  }
}

// -----------------------------------------------------------------------------// Light
// -----------------------------------------------------------------------------

export type XLightTypes =
  | "ambient"
  | "directional"
  | "spotlight"
  | "hemisphere"
  | "point"
  | "rectArea"
  | "light"
  | "lightProbe";

export interface XLightData extends IX3DObjectData {
  _light?: XLightTypes;
  _color?: any;
  _intensity?: number;

  // hemisphere extension (optional)
  _skyColor?: any;
  _groundColor?: any;
}

/**
 * XLight — Xpell wrapper for Three Light
 *
 * xpell2 fixes:
 * - static _xtype naming
 * - remove subclass HemisphereLight that reconfigures _three_class post-parse (that pattern is fragile).
 *   Instead, support _skyColor/_groundColor when _light === "hemisphere".
 * - keep _color/_intensity as public fields (no private #) so XObject parsing/exporting is predictable.
 */
export class XLight extends X3DObject {
  static _xtype = "light";
  readonly _is_light = true;

  _light: XLightTypes = "ambient";
  _color: number | string | THREE.Color = 0xffffff;
  _intensity = 0.5;

  // hemisphere only
  _skyColor?: number | string | THREE.Color;
  _groundColor?: number | string | THREE.Color;

  constructor(data: XLightData) {
    // Backwards compatibility
    const fieldsToReplace = ["light", "color", "intensity", "skyColor", "groundColor"] as const;
    for (const field of fieldsToReplace) {
      const v = (data as any)[field];
      if (v !== undefined) {
        (data as any)["_" + field] = v;
        delete (data as any)[field];
      }
    }

    super(data, {}, true); // skipParse=true
    super.parse(data);

    this._type = XLight._xtype;

    this._light = (data._light ?? this._light) as XLightTypes;
    this._color = data._color ?? this._color;
    this._intensity = data._intensity ?? this._intensity;

    this._skyColor = data._skyColor;
    this._groundColor = data._groundColor;

    this._three_class = threeLights[this._light] ?? THREE.AmbientLight;

    // HemisphereLight ctor signature differs
    if (this._light === "hemisphere") {
      const sky = this._skyColor ?? 0xffffff;
      const ground = this._groundColor ?? 0xffffff;
      this._threes_class_args = [sky, ground, this._intensity];
    } else if (this._light === "lightProbe") {
      // LightProbe: (color, intensity) isn't the same; keep minimal args
      this._threes_class_args = [];
    } else {
      this._threes_class_args = [this._color, this._intensity];
    }

    // Example nano command (kept), but ensure it touches runtime fields
    this.addNanoCommand("rotate-color", (_xcmd, xobj: any) => {
      xobj._color = `hsl(${xobj._frame_number},100%,50%)`;
    });
  }

  override getThreeObject(): THREE.Object3D | Promise<THREE.Object3D> | null {
    const obj = super.getThreeObject();
    if (!obj) return obj;
    if (obj instanceof Promise) {
      return obj.then((o) => {
        this._syncLightProps(o as any);
        return o;
      });
    }
    this._syncLightProps(obj as any);
    return obj;
  }

  private _syncLightProps(light: THREE.Light | null) {
    if (!light) return;

    if ((light as any).color) (light as any).color = new THREE.Color(this._color as any);
    (light as any).intensity = this._intensity;

    // Hemisphere specifics after create
    if (this._light === "hemisphere") {
      const hl = light as THREE.HemisphereLight;
      if (this._skyColor !== undefined) hl.color = new THREE.Color(this._skyColor as any);
      if (this._groundColor !== undefined) hl.groundColor = new THREE.Color(this._groundColor as any);
    }
  }
}

// -----------------------------------------------------------------------------// Geometry + Material + Mesh + Group
// -----------------------------------------------------------------------------

export class XGeometry extends X3DObject {
  static _xtype = "geometry";

  // Back-compat fields
  width = 0;
  height = 0;
  depth = 0;

  constructor(data: IX3DObjectData, defaults: IX3DObjectData = { _type: "geometry" }) {
    // Back-compat: width/height/depth on root
    if ((data as any).width !== undefined) (defaults as any).width = (data as any).width;
    if ((data as any).height !== undefined) (defaults as any).height = (data as any).height;
    if ((data as any).depth !== undefined) (defaults as any).depth = (data as any).depth;

    super(data, defaults, true);
    super.parse(data);

    // geometry type is in data._type (e.g. "box-geometry")
    const geoType = (data._type ?? "box-geometry") as string;
    this._three_class = threeGeometries[geoType] ?? THREE.BoxGeometry;

    if ((data as any)._threes_class_args) {
      this._threes_class_args = (data as any)._threes_class_args;
    } else {
      this._threes_class_args = [(data as any).width, (data as any).height, (data as any).depth].filter(
        (v) => v !== undefined
      );
    }
  }
}

export class XMaterial extends X3DObject {
  static _xtype = "material";

  _color: number | string = 0xffffff;
  _side: number = THREE.DoubleSide;

  constructor(data: IX3DObjectData) {
    // Back-compat
    const fieldsToReplace = ["color", "side"] as const;
    for (const field of fieldsToReplace) {
      const v = (data as any)[field];
      if (v !== undefined) {
        (data as any)["_" + field] = v;
        delete (data as any)[field];
      }
    }

    super(data, {}, true);
    super.parse(data);

    this._type = XMaterial._xtype;

    if ((data as any)._color !== undefined) this._color = (data as any)._color;
    if ((data as any)._side !== undefined) this._side = (data as any)._side;

    const matType = (data._type ?? "standard-material") as string;
    this._three_class = threeMaterials[matType] ?? THREE.MeshStandardMaterial;

    const s2t: Record<string, string> = {
      _normal_map: "normalMap",
      _dp_map: "displacementMap",
      _displacement_map: "displacementMap",
      _texture_map: "map",
      _roughness_map: "roughnessMap",
      _ao_map: "aoMap",
      _emissive_map: "emissiveMap",
      _light_map: "lightMap",
      _metalness_map: "metalnessMap",
      _bump_map: "bumpMap",
      _alpha_map: "alphaMap",
      _env_map: "envMap",
      _gradient_map: "gradientMap",
      _specular_map: "specularMap",
      _clearcoat_map: "clearcoatMap",
      _clearcoat_roughness_map: "clearcoatRoughnessMap",
      _clearcoat_normal_map: "clearcoatNormalMap",
    };

    const params: Record<string, any> = {
      color: this._color,
      side: this._side,
    };

    const addMap = (name: string) => {
      const lmap: any = (data as any)[name];
      if (!lmap) return;

      const dst = s2t[name];
      if (!dst) return;

      if (typeof lmap === "string") {
        params[dst] = new THREE.TextureLoader().load(lmap);
        return;
      }

      // object map config
      const keys = Object.keys(lmap);
      for (const key of keys) {
        if (key === "texture") {
          params[dst] = new THREE.TextureLoader().load(lmap.texture);
        } else if (key === "video-texture") {
          params[dst] = new THREE.VideoTexture(lmap["video-texture"]);
        } else if (typeof lmap[key] === "string" && lmap[key].startsWith("$")) {
          const ks = lmap[key].split(" ");
          if (ks[0] === "$_v2") {
            params[key] = new THREE.Vector2(Number(ks[1]), Number(ks[2]));
          } else {
            params[key] = lmap[key];
          }
        } else {
          params[key] = lmap[key];
        }
      }
    };

    addMap("_normal_map");
    addMap("_dp_map");
    addMap("_texture_map");

    this._threes_class_args = [params];
  }

  setColor(color: number | string) {
    this._color = color;
    const threeObj = this._threeSync as any;
    if (threeObj?.color) threeObj.color = new THREE.Color(color as any);
  }
}

export class XMesh extends X3DObject {
  static _xtype = "mesh";

  _geometry!: XGeometry | IX3DObjectData;
  _material!: XMaterial | IX3DObjectData;
  _wireframe = false;

  constructor(
    data: IX3DObjectData,
    defaults: IX3DObjectData = {
      _type: "mesh",
      _geometry: null,
      _material: null,
      _positional_audio_source: undefined,
    },
    skipParse = false
  ) {
    super(data, defaults, skipParse);
    this._three_class = THREE.Mesh;

    if ((data as any)._wireframe && (data as any)._material) {
      (data as any)._material.wireframe = true;
    }

    if (!skipParse) this.parse(data);
  }

  override getThreeObject(): THREE.Object3D | Promise<THREE.Object3D> | null {
    if (!this._three_obj) {
      this._geometry = new XGeometry(this._geometry as any);
      this._material = new XMaterial(this._material as any);

      this._threes_class_args = [
        (this._geometry as any).getThreeObject(),
        (this._material as any).getThreeObject(),
      ];
    }

    return super.getThreeObject();
  }
}

export class XGroup extends X3DObject {
  static _xtype = "group";

  constructor(
    data: IX3DObjectData,
    defaults: IX3DObjectData = {
      _type: "group",
      _three_class: THREE.Group,
      _three_obj: null,
    }
  ) {
    super(data, defaults);
  }
}

// Export pack
export default {
  XCamera,
  XLight,
  XGeometry,
  XMaterial,
  XMesh,
  XGroup,
};
