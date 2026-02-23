// xpell-3d/src/X3D/X3DWorldSceneBackground.ts
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import type X3DWorld from "./X3DWorld";
import { _xlog } from "@xpell/ui";

export enum X3DSceneBackgroundTypes {
  _solid_color = "solid-color",
  _gradient = "gradient",
  _image = "image",
  _video = "video",
  _cube_texture = "cube-texture",
  _sphere_texture = "sphere-texture",
  _hdri = "hdri",
}

export type X3DSceneBackgroundParams = {
  [k: string]: any;
  _color?: string;
  _color1?: string;
  _color2?: string;
  _direction_deg?: number;
  _url?: string;
  _px?: string;
  _nx?: string;
  _py?: string;
  _ny?: string;
  _pz?: string;
  _nz?: string;
  _path?: string;
};

export type X3DSceneBackground = {
  _type: X3DSceneBackgroundTypes;
  _params: X3DSceneBackgroundParams;
};

export type X3DSceneBackgroundHandler = (scene: THREE.Scene, params: X3DSceneBackgroundParams) => void;

/**
 * Registers built-in background handlers on the provided world.
 *
 * Notes / xpell2 fixes:
 * - Import _xlog from "@xpell/ui" (umbrella).
 * - Avoid window.innerWidth/innerHeight dependency for gradient.
 *   Use a fixed canvas size (or params override) so it works even if window sizes change.
 * - Use THREE loaders in a safe way; add minimal logging for missing params.
 */
export const createSceneBackgroundBasicHandlers = (world: X3DWorld) => {
  const types = X3DSceneBackgroundTypes;

  world.addBackgroundHandler(types._solid_color, (scene, params) => {
    const color = params._color ?? params._color1 ?? "black";
    if (color === "clear" || color === "transparent") {
      scene.background = null;
      _xlog.log("X3D Scene Background is transparent");
      return;
    }
    scene.background = new THREE.Color(color);
  });

  world.addBackgroundHandler(types._gradient, (scene:any, params) => {
    const color1Param = params._color1 ?? "black";
    const color2Param = params._color2 ?? "white";
    const directionDeg = params._direction_deg ?? 45;

    // Do NOT rely on window sizes; keep stable canvas resolution.
    const width = params._width ?? 1024;
    const height = params._height ?? 1024;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      _xlog.log("X3DSceneBackground: failed to get 2D canvas context for gradient");
      return;
    }

    const directionRad = (directionDeg * Math.PI) / 180;
    const x0 = 0;
    const y0 = 0;
    const x1 = Math.cos(directionRad) * width;
    const y1 = Math.sin(directionRad) * height;

    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, new THREE.Color(color1Param).getStyle());
    gradient.addColorStop(1, new THREE.Color(color2Param).getStyle());

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;
  });

  world.addBackgroundHandler(types._image, (scene, params) => {
    const url = params._url;
    if (!url) {
      _xlog.log("X3DSceneBackground: no _url provided for image background");
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.needsUpdate = true;
        scene.background = tex;
      },
      undefined,
      (err) => _xlog.error?.("X3DSceneBackground: failed to load image background", err)
    );
  });

  world.addBackgroundHandler(types._video, (scene, params) => {
    const url = params._url;
    if (!url) {
      _xlog.log("X3DSceneBackground: no _url provided for video background");
      return;
    }

    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    // Autoplay policies may block; ignore promise rejection.
    void video.play().catch(() => {});

    const texture = new THREE.VideoTexture(video);
    texture.needsUpdate = true;
    scene.background = texture;
  });

  world.addBackgroundHandler(types._cube_texture, (scene, params) => {
    const urls = [
      params._px ?? "",
      params._nx ?? "",
      params._py ?? "",
      params._ny ?? "",
      params._pz ?? "",
      params._nz ?? "",
    ];

    if (urls.some((u) => !u) && !params._path) {
      _xlog.log("X3DSceneBackground: cube-texture missing face urls (_px.._nz) and no _path provided");
    }

    const loader = new THREE.CubeTextureLoader();
    if (params._path) {
      const endSlash = params._path.endsWith("/") ? "" : "/";
      loader.setPath(params._path + endSlash);
    }

    scene.background = loader.load(
      urls,
      undefined,
      undefined,
      (err) => _xlog.error?.("X3DSceneBackground: failed to load cube texture background", err)
    );
  });

  world.addBackgroundHandler(types._sphere_texture, (scene, params) => {
    const url = params._url;
    if (!url) {
      _xlog.log("X3DSceneBackground: no _url provided for sphere texture background");
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.needsUpdate = true;
        scene.background = tex;
      },
      undefined,
      (err) => _xlog.error?.("X3DSceneBackground: failed to load sphere texture background", err)
    );
  });

  world.addBackgroundHandler(types._hdri, async (scene, params) => {
    const url = params._url;
    if (!url) {
      _xlog.log("X3DSceneBackground: no _url provided for hdri background");
      return;
    }

    try {
      const tex = await new RGBELoader().loadAsync(url);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = tex;
      scene.environment = tex;
    } catch (err) {
      _xlog.error?.("X3DSceneBackground: failed to load HDRI background", err);
    }
  });
};
