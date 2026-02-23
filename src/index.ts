/**
 * Xpell - Real-Time User Interface Platform
 * Typescript Edition
 * Library Entry Point
 */

 // const XFolder = "./src/" // unused -> remove (or keep if you plan to use it)

export { X3D, X3DModule } from "./X3D/X3D";

export {
  type X3DApp,
  type X3DSceneControl,
  type X3DPhysicsEngines,
  type X3DHelpers,
  type X3AxesHelper,
  type XHelperData,
  X3DDefaultApp,         // ✅ value export (const)
  X3DAppGenerator,
} from "./X3D/X3DApp";

export {
  type X3DSceneBackground,
  X3DSceneBackgroundTypes, // ✅ value export (enum)
  type X3DSceneBackgroundHandler,
  type X3DSceneBackgroundParams,
} from "./X3D/X3DWorldSceneBackground";

export {
  type IX3DObjectData,
  type XVector3Data,
  type X3DListener,
} from "./X3D/X3DObject";

export { X3DObject } from "./X3D/X3DObject";

export {
  XGeometry,
  XGroup,
  XMaterial,
  XMesh,
  XCamera,
  type XCameraTypes,
  type XCameraData,
  XLight,
  type XLightData,
  type XLightTypes,
} from "./X3D/X3DCoreObjects";

export {
  X3DPrimitives,
  XBox,
  XCone,
  XCylinder,
  XPlane,
  XSphere,
  XTorus,
  XCircle,
} from "./X3D/X3DPrimitives";

export { X3DWorld, XWorldStatus } from "./X3D/X3DWorld";
export { X3DLoader } from "./X3D/X3DLoader";
