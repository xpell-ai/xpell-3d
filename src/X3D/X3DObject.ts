// xpell-3d/src/X3D/X3DObject.ts
import { _xu, _xlog, _xd, _x, XObject, type XObjectData, type XEventListenerOptions } from "@xpell/ui";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { threeToCannon, ShapeType } from "three-to-cannon";

import X3D from "./X3D";
import X3DLoader from "./X3DLoader";
import _x3dobject_nano_commands from "./X3DNanoCommands";

// Keep reservedWords minimal in xpell2
const reservedWords = { _children: "child objects" };

export type XVector3Data = { x: number; y: number; z: number };
export type X3DListener = (x3dObject: X3DObject, event?: any) => void;
export type X3DHandler = Function | string | any | any[];

export interface IX3DObjectData extends XObjectData {
  _enable_physics?: boolean;
  _mass?: number;
  _position?: XVector3Data;
  _rotation?: XVector3Data & { order?: THREE.EulerOrder };
  _scale?: XVector3Data;
  _visible?: boolean;

  _fade_duration?: number;
  _disable_frame_3d_state?: boolean;
  _3d_set_once?: boolean;

  _model_url?: string;

  // physics options
  _cannon_shape?: any;
  _collider?: "sphere" | "box" | "cylinder" | "hull" | "mesh";

  // audio / anim
  _positional_audio_source?: string;
  _load_animations?: boolean;
  _auto_play_animation?: boolean;

  _on_load?: X3DHandler;
  _on_click?: X3DHandler;
}

export class X3DObject extends XObject {
  // Runtime objects (never exported)
  private __three_obj: THREE.Object3D | null = null;
  private __cannon_obj: CANNON.Body | null = null;
  private __cannon_shape: CANNON.Shape | null = null;

  // 3D state (owned by xpell unless disabled)
  private __position = new THREE.Vector3(0, 0, 0);
  private __rotation = new THREE.Euler(0, 0, 0, "XYZ");
  private __scale = new THREE.Vector3(1, 1, 1);
  private __visible = true;

  private __mass = 0;
  private __enable_physics = false;
  private __fade_duration = 0.25;
  private __disable_frame_3d_state = false;
  private __3d_set_once = true;

  private __model_url = "";
  private __positional_audio_source = "";
  private __load_animations = false;
  private __auto_play_animation = false;

  private __on_load?: X3DHandler;
  private __on_click?: X3DHandler;

  protected _xem_options: XEventListenerOptions = { _once: false };

  // animation
  private __animation_mixer: THREE.AnimationMixer | null = null;
  private __animation_clips: Record<string, THREE.AnimationAction> = {};
  private __clock = new THREE.Clock();
  private __current_action: string | null = null;

  constructor(data: IX3DObjectData, defaults?: Partial<IX3DObjectData>, skipParse = false) {
    super(data, defaults, true);
    if (!skipParse) this.parse(data, true);
  }

  override parse(data: XObjectData, init = true) {
    super.parse(data as any, reservedWords);
    this.parse3D(data as IX3DObjectData);
    if (init) this.init();
  }

    init() {
    this.addNanoCommandPack(_x3dobject_nano_commands);

    // Ignore runtime-only fields during export
    this.addXporterDataIgnoreFields([
      "__three_obj",
      "__cannon_obj",
      "__cannon_shape",
      "__animation_mixer",
      "__animation_clips",
      "__clock",
      "__current_action"
    ]);

    // Export THREE vectors as {x,y,z}
    const v3 = (o: THREE.Vector3 | THREE.Euler) => ({ x: o.x, y: o.y, z: o.z });
    this.addXporterInstanceXporter(THREE.Vector3, v3);
    this.addXporterInstanceXporter(THREE.Euler, v3);

    if (this._positional_audio_source) {
      // TODO: attach via X3D world audio listener (keep your old method)
    }
  }

  private parse3D(data: IX3DObjectData) {
    if (data._position) this.setPosition(data._position);
    if (data._scale) this.setScale(data._scale);
    if (data._rotation) this.setRotation(data._rotation);

    if (typeof data._visible === "boolean") this._visible = data._visible;

    if (typeof data._mass === "number") this._mass = data._mass;
    if (typeof data._enable_physics === "boolean") this._enable_physics = data._enable_physics;

    if (typeof data._fade_duration === "number") this._fade_duration = data._fade_duration;
    if (typeof data._disable_frame_3d_state === "boolean") this._disable_frame_3d_state = data._disable_frame_3d_state;
    if (typeof data._3d_set_once === "boolean") this._3d_set_once = data._3d_set_once;

    if (data._model_url) this._model_url = data._model_url;

    if (data._on_load) this._on_load = data._on_load;
    if (data._on_click) this._on_click = data._on_click;
  }

  // --- public API
  // Public snapshots/mutators keep runtime state private.

  get _position(): XVector3Data {
    return { x: this.__position.x, y: this.__position.y, z: this.__position.z };
  }

  set _position(p: XVector3Data) {
    this.setPosition(p);
  }

  get _rotation(): XVector3Data & { order: THREE.EulerOrder } {
    return { x: this.__rotation.x, y: this.__rotation.y, z: this.__rotation.z, order: this.__rotation.order };
  }

  set _rotation(r: { x: number; y: number; z: number; order?: THREE.EulerOrder }) {
    this.setRotation(r);
  }

  get _scale(): XVector3Data {
    return { x: this.__scale.x, y: this.__scale.y, z: this.__scale.z };
  }

  set _scale(s: XVector3Data) {
    this.setScale(s);
  }

  getScaleData(): XVector3Data {
    return { x: this.__scale.x, y: this.__scale.y, z: this.__scale.z };
  }

  get _visible(): boolean {
    return this.__visible;
  }

  set _visible(v: boolean) {
    this.__visible = v;
    if (this.__three_obj) this.__three_obj.visible = v;
  }

  get _threeSync(): THREE.Object3D | null {
    return this.__three_obj;
  }

  protected get _three_obj(): THREE.Object3D | null {
    return this.__three_obj;
  }

  protected set _three_obj(value: THREE.Object3D | null) {
    this.__three_obj = value;
  }

  protected _set_three_obj(obj: THREE.Object3D): void {
    this.__three_obj = obj;
    this.__three_obj.name = this._name ?? this._id;
    this.apply3DStateToThree();
  }

  protected get _cannon_obj(): CANNON.Body | null {
    return this.__cannon_obj;
  }

  protected set _cannon_obj(value: CANNON.Body | null) {
    this.__cannon_obj = value;
  }

  protected get _cannon_shape(): CANNON.Shape | null {
    return this.__cannon_shape;
  }

  protected set _cannon_shape(value: CANNON.Shape | null) {
    this.__cannon_shape = value;
  }

  protected get _enable_physics(): boolean {
    return this.__enable_physics;
  }

  protected set _enable_physics(value: boolean) {
    this.__enable_physics = value;
  }

  protected get _mass(): number {
    return this.__mass;
  }

  protected set _mass(value: number) {
    this.__mass = value;
  }

  protected get _fade_duration(): number {
    return this.__fade_duration;
  }

  protected set _fade_duration(value: number) {
    this.__fade_duration = value;
  }

  protected get _disable_frame_3d_state(): boolean {
    return this.__disable_frame_3d_state;
  }

  protected set _disable_frame_3d_state(value: boolean) {
    this.__disable_frame_3d_state = value;
  }

  protected get _3d_set_once(): boolean {
    return this.__3d_set_once;
  }

  protected set _3d_set_once(value: boolean) {
    this.__3d_set_once = value;
  }

  protected get _model_url(): string {
    return this.__model_url;
  }

  protected set _model_url(value: string) {
    this.__model_url = value;
  }

  protected get _positional_audio_source(): string {
    return this.__positional_audio_source;
  }

  protected set _positional_audio_source(value: string) {
    this.__positional_audio_source = value;
  }

  protected get _load_animations(): boolean {
    return this.__load_animations;
  }

  protected set _load_animations(value: boolean) {
    this.__load_animations = value;
  }

  protected get _auto_play_animation(): boolean {
    return this.__auto_play_animation;
  }

  protected set _auto_play_animation(value: boolean) {
    this.__auto_play_animation = value;
  }

  protected get _on_load(): X3DHandler | undefined {
    return this.__on_load;
  }

  protected set _on_load(value: X3DHandler | undefined) {
    this.__on_load = value;
  }

  protected get _on_click(): X3DHandler | undefined {
    return this.__on_click;
  }

  protected set _on_click(value: X3DHandler | undefined) {
    this.__on_click = value;
  }

  async ensureThree(): Promise<THREE.Object3D> {
    if (this.__three_obj) return this.__three_obj;

    if (this.__model_url) {
      await this.loadModel(this.__model_url);
      if (!this.__three_obj) throw new Error(`X3DObject(${this._id}) loadModel produced null object`);
      return this.__three_obj;
    }

    // If you still support _three_class creation, keep it here (but prefer explicit factories in xpell2)
    throw new Error(`X3DObject(${this._id}) has no _model_url and no instantiated three object`);
  }

  getThreeObject(): THREE.Object3D | Promise<THREE.Object3D> | null {
    if (!this.__three_obj) {
      const threeClass = (this as any)._three_class as (new (...args: any[]) => THREE.Object3D) | undefined;
      if (threeClass) {
        const args = (this as any)._threes_class_args ?? [];
        this.__three_obj = new threeClass(...args);
        if (this.__three_obj) {
          this.__three_obj.name = this._name ?? this._id;
          this.apply3DStateToThree();
        }
      } else if (this.__model_url) {
        return this.loadModel(this.__model_url).then(() => {
          if (!this.__three_obj) {
            throw new Error(`X3DObject(${this._id}) loadModel produced null object`);
          }
          return this.__three_obj;
        });
      }
    }

    return this.__three_obj;
  }

  getCannonObject(): CANNON.Body | null {
    if (this.__cannon_obj) return this.__cannon_obj;
    if (!this.__enable_physics) return null;
    if (!this.__three_obj) throw new Error(`X3DObject(${this._id}) cannon requested before three object exists`);

    if (!this.__cannon_shape) {
      const type = this._colliderToShapeType((this as any)._collider);
      const res = threeToCannon(this.__three_obj, { type });
      if (!res?.shape) throw new Error(`threeToCannon failed for ${this._id}`);
      this.__cannon_shape = res.shape;
    }

    const body = new CANNON.Body({ mass: this.__mass, material: new CANNON.Material("physics") });
    body.addShape(this.__cannon_shape);
    body.position.set(this.__position.x, this.__position.y, this.__position.z);
    body.quaternion.setFromEuler(this.__rotation.x, this.__rotation.y, this.__rotation.z);
    body.linearDamping = 0.9;

    this.__cannon_obj = body;
    return body;
  }

  setPosition(p: XVector3Data) {
    this.__position.set(p.x, p.y, p.z);
    if (this.__three_obj) this.__three_obj.position.set(p.x, p.y, p.z);
    this.__cannon_obj?.position.set(p.x, p.y, p.z);
  }

  setRotation(r: { x: number; y: number; z: number; order?: THREE.EulerOrder }) {
    const order = r.order ?? this.__rotation.order ?? "XYZ";
    this.__rotation.set(r.x, r.y, r.z, order);
    if (this.__three_obj) this.__three_obj.rotation.set(r.x, r.y, r.z, order);
    this.__cannon_obj?.quaternion.setFromEuler(
      this.__rotation.x,
      this.__rotation.y,
      this.__rotation.z,
      this.__rotation.order
    );
  }

  setScale(s: XVector3Data) {
    this.__scale.set(s.x, s.y, s.z);
    if (this.__three_obj) this.__three_obj.scale.set(s.x, s.y, s.z);
  }

  setPositionFromVector3(v: THREE.Vector3) {
    this.setPosition({ x: v.x, y: v.y, z: v.z });
  }

  setRotationFromEuler(e: THREE.Euler) {
    this.setRotation({ x: e.x, y: e.y, z: e.z, order: e.order });
  }

  setScaleFromVector3(v: THREE.Vector3) {
    this.setScale({ x: v.x, y: v.y, z: v.z });
  }

  setPositionXYZ(x?: number, y?: number, z?: number) {
    this.setPosition({
      x: x ?? this.__position.x,
      y: y ?? this.__position.y,
      z: z ?? this.__position.z,
    });
  }

  translate(dx: number, dy: number, dz: number) {
    this.setPosition({
      x: this.__position.x + dx,
      y: this.__position.y + dy,
      z: this.__position.z + dz,
    });
  }

  rotate(dx: number, dy: number, dz: number) {
    this.setRotation({
      x: this.__rotation.x + dx,
      y: this.__rotation.y + dy,
      z: this.__rotation.z + dz,
      order: this.__rotation.order,
    });
  }

  scaleBy(kx: number, ky: number, kz: number) {
    this.setScale({
      x: this.__scale.x * kx,
      y: this.__scale.y * ky,
      z: this.__scale.z * kz,
    });
  }

  apply3DStateToThree() {
    if (!this.__three_obj) return;
    this.__three_obj.position.copy(this.__position);
    this.__three_obj.rotation.copy(this.__rotation);
    this.__three_obj.scale.copy(this.__scale);
    this.__three_obj.visible = this.__visible;
  }

  async loadModel(url?: string) {
    const modelUrl = url ?? this.__model_url;
    if (!modelUrl) throw new Error(`X3DObject(${this._id}) loadModel called with empty url`);

    const model = await X3DLoader.loadModelFromGLTF(modelUrl);
    this.__three_obj = model;
    this.__three_obj.name = this._name ?? this._id;

    await this.onLoad();
  }

  async onLoad(event?: any) {
    if (this.__on_load) await this.checkAndRunInternalFunction(this.__on_load, event);
  }

  async onClick(event?: any) {
    if (this.__on_click) await this.checkAndRunInternalFunction(this.__on_click, event);
  }

  importAnimations(obj: THREE.Object3D, name?: string) {
    if (!this.__three_obj || !obj?.animations?.length) return;

    if (!this.__animation_mixer) {
      this.__animation_mixer = new THREE.AnimationMixer(this.__three_obj);
    }

    let index = 1;
    obj.animations.forEach((clip) => {
      const cloned = clip.clone();
      if (name) cloned.name = index === 1 ? name : `${name}-${index}`;
      index += 1;
      this.__three_obj?.animations.push(cloned);
      if (this.__animation_mixer) {
        this.__animation_clips[cloned.name] = this.__animation_mixer.clipAction(cloned);
      }
    });
  }

  override async onMount(): Promise<void> {
    // if auto-play animations etc...
    await super.onMount();
  }

  override async onFrame(frameNumber: number) {
    if (!this.__disable_frame_3d_state) {
      this.apply3DStateToThree();
    } else if (this.__3d_set_once) {
      this.apply3DStateToThree();
      this.__3d_set_once = false;
    }

    // animation updates
    if (this.__animation_mixer && this.__current_action) {
      const dt = this.__clock.getDelta();
      this.__animation_mixer.update(dt);
    }

    // physics sync to three
    if (this.__cannon_obj && this.__three_obj && this.__enable_physics) {
      const cp = this.__cannon_obj.position;
      this.__position.set(cp.x, cp.y, cp.z);
      this.__three_obj.quaternion.copy(this.__cannon_obj.quaternion as any);
    }

    await super.onFrame(frameNumber);
  }

  // Physics: underscore accessor keeps runtime state private.
  get _cannon(): CANNON.Body | null {
    return this.getCannonObject();
  }

  private _colliderToShapeType(collider?: string): ShapeType {
    switch ((collider ?? "box").toLowerCase()) {
      case "sphere": return ShapeType.SPHERE;
      case "cylinder": return ShapeType.CYLINDER;
      case "hull": return ShapeType.HULL;
      case "mesh": return ShapeType.MESH;
      default: return ShapeType.BOX;
    }
  }

  override async dispose() {
    // Clear references
    this.__three_obj = null;
    this.__cannon_obj = null;
    this.__cannon_shape = null;
    this.__animation_mixer = null;

    await super.dispose();
  }
}

export default X3DObject;
