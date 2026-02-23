/**
 * X3DLoader
 *
 * FIXES (aligned with your XData2 rules + xpell-ui export path):
 * 1) Stop writing to `_xd._o[...]` directly. Use `_xd.set(...)` / `_xd.patch(...)`.
 * 2) Avoid using `loader.dracoLoader = ...` (Three examples usually use `loader.setDRACOLoader(...)`).
 * 3) Respect `traverse` flag in loadModelFromGLTF (it was ignored).
 * 4) Add stable key naming: `x3d:loader` (per your namespace convention).
 * 5) Keep `_xem.fire(...)` optional hook for progress/error if you want later (not required).
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import X3DObject from "./X3DObject";
import { _xlog, _xd } from "@xpell/ui"; // <- per your note: import from xpell-ui (re-exports core + web XEM)

const X3D_LOADER_KEY = "x3d:loader";

type X3DLoaderStatus = {
  _model_url?: string;
  _loaded?: number;
  _total?: number;
  _type: "GLTF" | "FBX";
  _ts?: number;
  _error?: string;
};

class _X3DLoader {
  loading: boolean = false;
  dracoLoader!: DRACOLoader;

  constructor() {
    this.loadDraco();
  }

  loadDraco() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );
    this.dracoLoader.setDecoderConfig({ type: "js" });
    this.dracoLoader.preload();
  }

  private _patchStatus(patch: Partial<X3DLoaderStatus> & Pick<X3DLoaderStatus, "_type">) {
    const prev = (_xd.get(X3D_LOADER_KEY) ?? {}) as Partial<X3DLoaderStatus>;
    _xd.set(X3D_LOADER_KEY, {
      ...prev,
      ...patch,
      _ts: Date.now(),
    } satisfies X3DLoaderStatus);
  }

  loadFBXAnimation(
    fileName: string,
    x3dObject: X3DObject,
    onLoadCallBack?: () => void
  ) {
    const loader = new FBXLoader();

    const _onload = (obj: THREE.Object3D) => {
      x3dObject.importAnimations(obj);
      onLoadCallBack?.();
    };

    const _onprogress = (evt: ProgressEvent<EventTarget>) => {
      // ProgressEvent may not always contain total (CORS / server headers), so guard it.
      const loaded = (evt as any).loaded as number | undefined;
      const total = (evt as any).total as number | undefined;

      this._patchStatus({
        _model_url: fileName,
        _loaded: loaded,
        _total: total,
        _type: "FBX",
      });
    };

    const _onerror = (error: any) => {
      const msg = String(error?.message ?? error);
      _xlog.error(error);
      this.loading = false;
      this._patchStatus({
        _model_url: fileName,
        _type: "FBX",
        _error: msg,
      });
    };

    loader.load(fileName, _onload, _onprogress as any, _onerror);
  }

  async loadModelFromGLTF(
    modelUrl: string,
    traverse: boolean = true
  ): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      // Prefer the official method if available.
      // (Some builds still expose .dracoLoader, but setDRACOLoader is the intended API.)
      (loader as any).setDRACOLoader?.(this.dracoLoader);
      if (!(loader as any).setDRACOLoader) {
        // fallback for older builds
        (loader as any).dracoLoader = this.dracoLoader;
      }

      const _onload = (gltf: any) => {
        const root: THREE.Object3D = gltf.scene;
        root.animations = gltf.animations;

        if (traverse) {
          root.traverse((node: THREE.Object3D) => {
            node.frustumCulled = false;
          });
        }

        this.loading = false;
        this._patchStatus({
          _model_url: modelUrl,
          _type: "GLTF",
        });

        resolve(root);
      };

      const _onprogress = (evt: ProgressEvent<EventTarget>) => {
        const loaded = (evt as any).loaded as number | undefined;
        const total = (evt as any).total as number | undefined;

        this.loading = true;
        this._patchStatus({
          _model_url: modelUrl,
          _loaded: loaded,
          _total: total,
          _type: "GLTF",
        });
      };

      const _onerror = (error: any) => {
        const msg = String(error?.message ?? error);
        _xlog.error(error);
        this.loading = false;
        this._patchStatus({
          _model_url: modelUrl,
          _type: "GLTF",
          _error: msg,
        });
        reject(error);
      };

      loader.load(modelUrl, _onload, _onprogress as any, _onerror);
    });
  }
}

export const X3DLoader = new _X3DLoader();
export default X3DLoader;
export { _X3DLoader };
