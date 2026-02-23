import * as THREE from "three";

import {
  _x,
  _xd,
  _xlog,
  _xem,
  XModule,
  type XObjectData
} from "@xpell/ui";

import X3DObject, { type IX3DObjectData } from "./X3DObject";
import X3DPrimitives from "./X3DPrimitives";
import X3DWorld from "./X3DWorld";
import { type X3DApp, X3DAppGenerator } from "./X3DApp";

const X3DEngineStatus = { New: 0, Ready: 1, Running: 2, Stopped: 3 };

export class X3DModule extends XModule {
  world!: X3DWorld;
  x3dObjects: Record<string, X3DObject> = {};
  status = X3DEngineStatus.New;

  private _raycast_event = "click";
  private _player_element: HTMLDivElement | null = null;

  constructor() {
    super({ _name: "x3d" });

    this.importObjectPack(X3DPrimitives);

    // xpell2 shared memory convention (if you still need it)
    _xd.set("x3d-om", this._object_manager);

    _xem.fire("x3d:init");
  }

  createPlayer(playerId = "x3d-player", cssClass?: string, parentElementId?: string): HTMLDivElement {
    const parent = parentElementId ? document.getElementById(parentElementId) : document.body;
    const div = document.createElement("div");
    div.id = playerId;
    div.className = cssClass ?? playerId;

    if (!cssClass) {
      div.style.width = "100%";
      div.style.height = "100%";
      div.style.position = "absolute";
      div.style.top = "0";
      div.style.left = "0";
    }

    this._player_element = div;

    if (parent) {
      (parent as HTMLElement).style.margin = "0";
      (parent as HTMLElement).style.padding = "0";
      parent.appendChild(div);
    }
    return div;
  }

  async loadDefaultApp(orbitControls = true, bgColor = "black", enablePhysics?: boolean): Promise<X3DApp> {
    const app = X3DAppGenerator.getDefaultApp(orbitControls, bgColor, enablePhysics);
    await this.loadApp(app);
    return app;
  }

  async loadApp(x3dApp: X3DApp, autoRun = true) {
    this.world = new X3DWorld(x3dApp);
    this.status = X3DEngineStatus.Ready;

    if (x3dApp._scene._raycast) this.enableRaycast();

    window.addEventListener("resize", () => this.onWindowResize(), false);

    if (autoRun) await this.start();
  }

  async create(data: IX3DObjectData) {
    if ((this as any)._log_rules?.createObject) _xlog.log("X3D | creating");
    return await super.create(data as unknown as XObjectData);
  }

  async remove(objectId: string) {
    if ((this as any)._log_rules?.removeObject) _xlog.log("X3D remove object " + objectId);
    await this.world?.removeX3DObject(objectId);
    super.remove(objectId);
  }

  async add(x3dObject: X3DObject | IX3DObjectData): Promise<X3DObject> {
    if (!(x3dObject instanceof X3DObject)) {
      x3dObject = await this.create(x3dObject as IX3DObjectData);
    }

    // use the canonical OM name consistently
    this.om.addObject(x3dObject as any);

    await this.world?.addX3DObject(x3dObject as X3DObject);
    return x3dObject as X3DObject;
  }

  onWindowResize() {
    this.world?.onWindowResize();
  }

  async start() {
    _xlog.log("Running 3d engine");
    this.status = X3DEngineStatus.Running;
    await this.world?.run();
    _xem.fire("x3d:world:load");
  }

  enableRaycast(event = "click") {
    this._raycast_event = event;
    document.addEventListener(event, this.raycast, false);
  }

  disableRaycast() {
    document.removeEventListener(this._raycast_event, this.raycast, false);
  }

  // IMPORTANT: arrow fn binds this
  raycast = (e: any) => {
    const cam = this.world?.defaultCamera;
    if (!cam || !this.world?.renderer?.domElement) return;

    const target = e.target as HTMLElement;
    if (target?.tagName?.toLowerCase() !== this.world.renderer.domElement.tagName.toLowerCase()) return;
    if (e.which !== 1) return;

    const mouse = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1
    };

    this.world.raycaster.setFromCamera(mouse as any, cam);
    const intersects = this.world.raycaster.intersectObjects(this.world.scene.children, true);

    const hitRoots: Record<string, X3DObject> = {};
    intersects?.forEach((ints) => {
      let obj = ints.object as THREE.Object3D;
      while (obj.parent) {
        if (obj.parent.type === "Scene") {
          const x3dObj = this.getObject(obj.name) as any as X3DObject;
          if (x3dObj) hitRoots[x3dObj._id] = x3dObj;
          break;
        }
        obj = obj.parent;
      }
    });

    Object.values(hitRoots).forEach((o) => {
      if (o.onClick && typeof o.onClick === "function") {
        o.onClick(e);
      }
    });
  };

  addEnvironmentMap(path: string, images?: string[]) {
    images ??= ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"];
    const loader = new THREE.CubeTextureLoader();
    const env = loader.setPath(path).load(images);
    this.world?.addBackground(env);
  }

  async onFrame(frameNumber: number) {
    if (this.status === X3DEngineStatus.Running) this.world?.onFrame(frameNumber);
    super.onFrame(frameNumber);
  }
}

const X3D = new X3DModule();
export default X3D;
export { X3D, X3DEngineStatus, X3DObject };
