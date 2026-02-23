// xpell-3d/src/X3D/X3DWorld.ts
import * as THREE from "three";
import * as CANNON from "cannon-es";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import { CannonDebugRenderer } from "./X3DUtils";

import { _xlog, _xu, _xd, _xem } from "@xpell/ui";

import X3DLoader from "./X3DLoader";
import type { X3DApp } from "./X3DApp";
import type X3DObject from "./X3DObject";
import { X3D } from "./X3D";

import type {
  X3DSceneBackground,
  X3DSceneBackgroundHandler,
} from "./X3DWorldSceneBackground";
import { createSceneBackgroundBasicHandlers } from "./X3DWorldSceneBackground";

/**
 * X3DWorld
 */

export const XWorldStatus = {
  New: 0,
  Running: 1,
  Paused: 2,
} as const;

const CWORLD_STEP = 1.0 / 60.0;

export class X3DWorld {
  status: number;
  worldRowData: X3DApp;

  scene: THREE.Scene;
  clock: THREE.Clock;
  renderer: THREE.WebGLRenderer;

  frameNumber: number;
  raycaster: THREE.Raycaster;

  transformControls!: TransformControls;
  private transformControlX3dObject: X3DObject | null = null;
  private transformControlsListenerAdded = false;

  lights: Record<string, any>;
  x3dObjects: Record<string, X3DObject>;

  defaultCamera: any; // (THREE.Camera-ish)
  controls!: OrbitControls | PointerLockControls | FirstPersonControls;

  frameProcessTime!: number;

  audioListener!: THREE.AudioListener;

  enablePhysics = true;
  private _physics_world!: CANNON.World;

  private _cannon_debug_renderer!: CannonDebugRenderer;

  private _bg_handlers: Record<string, X3DSceneBackgroundHandler> = {};

  _log_rules: { _add: boolean; _remove: boolean } = {
    _add: false,
    _remove: false,
  };

  constructor(xworld: X3DApp) {
    this.status = XWorldStatus.New;
    this.worldRowData = xworld;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);

    // three r152+ uses outputColorSpace; older uses outputEncoding
    // @ts-ignore
    if ("outputColorSpace" in this.renderer) (this.renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace;
    else (this.renderer as any).outputEncoding = (THREE as any).sRGBEncoding;

    this.renderer.setClearColor(0x000000, 0);

    this.frameNumber = 0;
    this.raycaster = new THREE.Raycaster();

    this.lights = {};
    this.x3dObjects = {};
    this.defaultCamera = null;

    this.enablePhysics = xworld?._physics ? !!xworld._physics._active : false;

    if (this.enablePhysics) {
      _xlog.log("Physics engine (Cannon.JS) is active");

      this._physics_world = new CANNON.World();

      // Contact stiffness - softer/harder contacts
      this._physics_world.defaultContactMaterial.contactEquationStiffness = 1e9;
      // Stabilization time in number of timesteps
      this._physics_world.defaultContactMaterial.contactEquationRelaxation = 4;

      const solver = new CANNON.GSSolver();
      solver.iterations = 7;
      solver.tolerance = 0.1;
      this._physics_world.solver = new CANNON.SplitSolver(solver);

      this._physics_world.gravity.set(0, -9.83, 0);
      this._physics_world.broadphase = new CANNON.NaiveBroadphase();

      if (xworld._physics?._debug) {
        this._cannon_debug_renderer = new CannonDebugRenderer(this.scene, this._physics_world);
      }
    } else {
      _xlog.log("Physics engine is NOT Active");
    }

    X3DLoader.loadDraco();
    createSceneBackgroundBasicHandlers(this);
  }

  async run() {
    _xlog.log("Running 3d World");
    this.status = XWorldStatus.Running;

    const xworld = this.worldRowData;

    // Mount renderer
    if (xworld._parent_element) {
      document.getElementById(String(xworld._parent_element))?.appendChild((this.renderer as any).domElement);
    }

    // Helpers
    if (xworld._scene?._helpers) {
      for (const helperIndex of Object.keys(xworld._scene._helpers)) {
        const helper = xworld._scene._helpers[helperIndex];
        if (helper?._type === "axes" && helper._active) {
          const axesLength = helper._params?.["size"] ?? 5;
          this.scene.add(new THREE.AxesHelper(axesLength));
        }
      }
    }

    // Cameras
    if (xworld._scene?._cameras) {
      const keys = Object.keys(xworld._scene._cameras);
      for (let i = 0; i < keys.length; i++) {
        const cameraData: any = xworld._scene._cameras[keys[i]];
        const camObj: any = await X3D.create(cameraData);

        if (cameraData?._helper) {
          // camera helper wants the raw THREE camera
          this.defaultCamera = camObj.getThreeObject();
          this.scene.add(new THREE.CameraHelper(this.defaultCamera));
        } else {
          // add camera to scene through world pipeline
          this.defaultCamera = await this.addX3DObject(camObj);
        }

        if (cameraData?._positional_audio_listener) {
          this.setAudioListener();
        }
      }
    } else {
      _xlog.log("XWorld -> no Cameras defined");
    }

    // Lights (IMPORTANT: no async forEach)
    if (xworld._scene?._lights) {
      for (const light_name of Object.keys(xworld._scene._lights)) {
        const lgt: any = xworld._scene._lights[light_name];
        const light: any = await X3D.create(lgt);
        light.name = light_name;
        await this.addX3DObject(light);
      }
    } else {
      _xlog.log("X3D world -> no Lights defined");
    }

    // Objects (IMPORTANT: no async forEach)
    if (xworld._scene?._objects) {
      for (const key of Object.keys(xworld._scene._objects)) {
        const ob: any = xworld._scene._objects[key];
        ob._name = key;
        const obj: any = await X3D.create(ob);
        await this.addX3DObject(obj);
      }
    }

    // Controls (IMPORTANT: no async forEach)
    if (xworld._scene?._controls) {
      for (const ctrlKey of Object.keys(xworld._scene._controls)) {
        const control: any = xworld._scene._controls[ctrlKey];
        if (!control?._active) continue;

        if (control._type === "orbit") {
          this.controls = new OrbitControls(this.defaultCamera, (this.renderer as any).domElement);
          if (control._params) {
            Object.keys(control._params).forEach((k) => ((this.controls as any)[k] = control._params[k]));
          }
        } else if (control._type === "pointer") {
          this.controls = new PointerLockControls(this.defaultCamera, this.renderer.domElement);
        } else if (control._type === "first-person") {
          const fp = new FirstPersonControls(this.defaultCamera, this.renderer.domElement);
          fp.activeLook = true;
          fp.lookSpeed = 0.3;
          fp.movementSpeed = 50;
          fp.lookVertical = true;
          fp.constrainVertical = true;
          fp.verticalMin = Math.PI / 2;
          fp.verticalMax = 1.5;
          fp.autoForward = false;
          this.controls = fp;
        } else if (control._type === "transform") {
          _xlog.log("Transform controls enabled");
          this.transformControls = new TransformControls(this.defaultCamera, (this.renderer as any).domElement);

          this.transformControls.addEventListener("dragging-changed", (e: any) => {
            // disable orbit while dragging
            (this.controls as any).enabled = !e.value;
          });

          // Defer adding to scene until used, or add immediately:
          // this.scene.add(this.transformControls);
        }
      }
    }

    // Background
    if (xworld._scene?._background) {
      await this.setSceneBackground(xworld._scene._background);
    }

    // render first frame
    this.render();
  }

  addBackgroundHandler(type: string, handler: X3DSceneBackgroundHandler) {
    this._bg_handlers[type] = handler;
  }

  async setSceneBackground(bg: X3DSceneBackground) {
    const handler = this._bg_handlers[bg._type];
    if (handler) handler(this.scene, bg._params);
  }

  setAudioListener() {
    if (!this.defaultCamera) return;
    _xlog.log("Setting camera audio listener");
    this.audioListener = new THREE.AudioListener();
    this.defaultCamera.add(this.audioListener);
  }

  onWindowResize() {
    if (!this.defaultCamera) return;

    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;

    this.defaultCamera.aspect = w / h;
    this.defaultCamera.updateProjectionMatrix();
    (this.renderer as any).setSize(w, h);
  }

  /**
   * Adds X3DObject to the world scene
   * @returns the THREE.Object3D that was added (or undefined if ignored)
   */
  async addX3DObject(x3dObject: X3DObject): Promise<THREE.Object3D | undefined> {
    if (!x3dObject || (x3dObject as any)._ignore_world) return undefined;

    if (this._log_rules._add) _xlog.log("XWorld adding", (x3dObject as any)._id);

    this.x3dObjects[String((x3dObject as any)._id)] = x3dObject;

    const threeObject = (await (x3dObject as any).getThreeObject()) as THREE.Object3D;
    this.scene.add(threeObject);

    // physics
    if (this.enablePhysics && (x3dObject as any)._enable_physics) {
      const cannonObject = (x3dObject as any).getCannonObject?.() as CANNON.Body | undefined;
      if (cannonObject) this._physics_world.addBody(cannonObject);
    }

    // lifecycle
    (x3dObject as any).onMount?.();

    return threeObject;
  }

  async removeX3DObject(objectId: string) {
    if (this._log_rules._remove) _xlog.log("XWorld Removing " + objectId);

    const x3dObject = this.x3dObjects[objectId];
    if (!x3dObject) {
      if (this._log_rules._remove) _xlog.log("XWorld has no X3DObject => " + objectId);
      return;
    }

    const threeObj = (x3dObject as any).getThreeObject?.() as THREE.Object3D;
    if (threeObj?.removeFromParent) threeObj.removeFromParent();

    const cannonBody = (x3dObject as any)._cannon_obj as CANNON.Body | undefined;
    if (cannonBody && this.enablePhysics) this._physics_world.removeBody(cannonBody);

    delete this.x3dObjects[objectId];
  }

  removeTransformControls() {
    if (!this.transformControls) return;
    this.transformControlX3dObject = null;
    this.transformControls.detach();
  }

  setTransformControls(x3dObject: X3DObject) {
    if (!this.transformControls) {
      throw new Error("TransformControls not enabled. Enable it via app _scene._controls.");
    }
    if (!(this.transformControls as any).isObject3D || typeof (this.transformControls as any).attach !== "function") {
      _xlog.warn("TransformControls invalid instance; skipping attach");
      return;
    }

    this.transformControlX3dObject = x3dObject;
    this.transformControls.attach((x3dObject as any).getThreeObject() as THREE.Object3D);

    if (!this.transformControlsListenerAdded) {
      this.transformControlsListenerAdded = true;

      this.transformControls.addEventListener("objectChange", () => {
        const obj = this.transformControls.object;
        if (!obj) return;

        this.transformControlX3dObject?.setPositionFromVector3?.(obj.position);
        this.transformControlX3dObject?.setRotationFromEuler?.(obj.rotation);
        this.transformControlX3dObject?.setScaleFromVector3?.(obj.scale);
      });

      // XData2: subscribe or react on event then read key
      _xem.on("xtransform-controls-state-changed", () => {
        const mode = _xd.get("x3d:transform:mode");
        if (mode) this.transformControls.setMode(mode as "translate" | "rotate" | "scale");
      });

      this.scene.add(this.transformControls as unknown as THREE.Object3D);
    }
  }

  // called on every frame
  async onFrame(frameNumber: number) {
    if (this.status !== XWorldStatus.Running) return;

    this.frameNumber = frameNumber;

    // frame time
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;

    // render
    this.render();

    // controls update
    const dt = this.clock.getDelta();
    (this.controls as any)?.update?.(dt);

    // export useful runtime signals via XData2
    const az = (this.controls as any)?.getAzimuthalAngle?.();
    if (typeof az === "number") _xd.set("x3d:control:azimuth", az);

    // one-shot target command
    const controlTarget: any = _xd.get("x3d:control:target");
    if (controlTarget) {
      // Keep your original math (orbit controls style)
      const target = (this.controls as any)?.target;
      if (target && this.defaultCamera?.position) {
        this.defaultCamera.position.sub(target);
        target.copy(new THREE.Vector3(controlTarget.x, controlTarget.y, controlTarget.z));
        this.defaultCamera.position.add(new THREE.Vector3(controlTarget.x, controlTarget.y, controlTarget.z));
      }
      _xd.delete("x3d:control:target");
    } else {
      // path stepping (optional)
      const cp: any = _xd.get("x3d:cam:path:pos");
      if (cp && this.defaultCamera?.position) {
        this.defaultCamera.position.add(cp);
        this.defaultCamera.lookAt(new THREE.Vector3(0, 0, 0));
      }
    }

    // physics
    if (this.enablePhysics && this._physics_world) {
      this._physics_world.step(CWORLD_STEP);
      if (this._cannon_debug_renderer) this._cannon_debug_renderer.update();
    }

    // frame cost
    const t1 = typeof performance !== "undefined" ? performance.now() : 0;
    this.frameProcessTime = t0 ? t1 - t0 : dt;
  }

  /**
   * Adds background to the scene
   */
  addBackground(bgTexture: THREE.Texture) {
    this.scene.background = bgTexture;
  }

  // draw
  render() {
    if (this.defaultCamera) {
      (this.renderer as any).render(this.scene, this.defaultCamera);
    }
  }
}

export default X3DWorld;
