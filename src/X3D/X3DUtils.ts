// xpell-3d/src/X3D/X3DUtils.ts
/**
 * X3D Utils
 */

import * as THREE from "three";
import * as CANNON from "cannon-es";

/**
 * CannonDebugRenderer
 *
 * xpell2 notes:
 * - Stronger typings (meshes can be null while recycling).
 * - Avoid mutating shape.id (cannon-es uses numeric ids; don’t overload).
 *   Instead keep a WeakMap<shape, geometry.id> for type matching on Trimesh/Heightfield.
 * - Keep behavior identical otherwise.
 */
export class CannonDebugRenderer {
  public scene: THREE.Scene;
  public world: CANNON.World;

  private _meshes: Array<THREE.Mesh | THREE.Points> = [];

  private _material: THREE.MeshBasicMaterial;
  private _particleMaterial: THREE.PointsMaterial;

  private _sphereGeometry: THREE.SphereGeometry;
  private _boxGeometry: THREE.BoxGeometry;
  private _cylinderGeometry: THREE.CylinderGeometry;
  private _planeGeometry: THREE.PlaneGeometry;
  private _particleGeometry: THREE.BufferGeometry;

  private tmpVec0: CANNON.Vec3 = new CANNON.Vec3();
  private tmpVec1: CANNON.Vec3 = new CANNON.Vec3();
  private tmpVec2: CANNON.Vec3 = new CANNON.Vec3();
  private tmpQuat0: CANNON.Quaternion = new CANNON.Quaternion();

  // Keep per-shape geometry ids for Trimesh/Heightfield without touching shape.id
  private _shapeGeoId = new WeakMap<CANNON.Shape, number>();

  constructor(scene: THREE.Scene, world: CANNON.World, _options?: object) {
    this.scene = scene;
    this.world = world;

    this._material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
    });

    this._particleMaterial = new THREE.PointsMaterial({
      color: 0xff0000,
      size: 10,
      sizeAttenuation: false,
      depthTest: false,
    });

    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._cylinderGeometry = new THREE.CylinderGeometry(1, 1, 2, 8);
    this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);

    this._particleGeometry = new THREE.BufferGeometry();
    this._particleGeometry.setFromPoints([new THREE.Vector3(0, 0, 0)]);
  }

  public update() {
    const bodies = this.world.bodies;
    const meshes = this._meshes;

    const shapeWorldPosition = this.tmpVec0;
    const shapeWorldQuaternion = this.tmpQuat0;

    let meshIndex = 0;

    for (let i = 0; i !== bodies.length; i++) {
      const body = bodies[i];

      for (let j = 0; j !== body.shapes.length; j++) {
        const shape = body.shapes[j];

        this._updateMesh(meshIndex, shape);

        const mesh = meshes[meshIndex];
        if (mesh) {
          // Get world position
          body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition);
          body.position.vadd(shapeWorldPosition, shapeWorldPosition);

          // Get world quaternion
          body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion);

          // Copy to mesh
          mesh.position.set(shapeWorldPosition.x, shapeWorldPosition.y, shapeWorldPosition.z);
          mesh.quaternion.set(shapeWorldQuaternion.x, shapeWorldQuaternion.y, shapeWorldQuaternion.z, shapeWorldQuaternion.w);
        }

        meshIndex++;
      }
    }

    // Remove unused meshes
    for (let i = meshIndex; i < meshes.length; i++) {
      const mesh = meshes[i];
      if (mesh) this.scene.remove(mesh);
    }
    meshes.length = meshIndex;
  }

  private _updateMesh(index: number, shape: CANNON.Shape) {
    let mesh = this._meshes[index];

    if (!this._typeMatch(mesh, shape)) {
      if (mesh) this.scene.remove(mesh);
      mesh = this._meshes[index] = this._createMesh(shape);
    }

    if (mesh) this._scaleMesh(mesh, shape);
  }

  private _typeMatch(mesh: THREE.Mesh | THREE.Points | undefined, shape: CANNON.Shape): boolean {
    if (!mesh) return false;

    const geo = mesh.geometry as THREE.BufferGeometry;

    // Primitive re-use
    if (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Sphere) return true;
    if (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box) return true;
    if (geo instanceof THREE.CylinderGeometry && shape instanceof CANNON.Cylinder) return true;
    if (geo instanceof THREE.PlaneGeometry && shape instanceof CANNON.Plane) return true;

    // Convex poly creates its own geometry but can be re-used by class check
    if (shape instanceof CANNON.ConvexPolyhedron) return true;

    // Trimesh / Heightfield: match by remembered geometry id
    if (shape instanceof CANNON.Trimesh || shape instanceof CANNON.Heightfield) {
      const remembered = this._shapeGeoId.get(shape);
      return remembered !== undefined && remembered === geo.id;
    }

    return false;
  }

  private _createMesh(shape: CANNON.Shape): THREE.Mesh | THREE.Points {
    let mesh: THREE.Mesh | THREE.Points;
    let geometry: THREE.BufferGeometry;
    let points: THREE.Vector3[] = [];

    switch (shape.type) {
      case CANNON.Shape.types.SPHERE:
        mesh = new THREE.Mesh(this._sphereGeometry, this._material);
        break;

      case CANNON.Shape.types.BOX:
        mesh = new THREE.Mesh(this._boxGeometry, this._material);
        break;

      case CANNON.Shape.types.CYLINDER: {
        const cyl = shape as CANNON.Cylinder;
        geometry = new THREE.CylinderGeometry(cyl.radiusTop, cyl.radiusBottom, cyl.height, cyl.numSegments);
        mesh = new THREE.Mesh(geometry, this._material);
        break;
      }

      case CANNON.Shape.types.PLANE:
        mesh = new THREE.Mesh(this._planeGeometry, this._material);
        break;

      case CANNON.Shape.types.PARTICLE:
        mesh = new THREE.Points(this._particleGeometry, this._particleMaterial);
        break;

      case CANNON.Shape.types.CONVEXPOLYHEDRON: {
        geometry = new THREE.BufferGeometry();
        points = [];

        const cp = shape as CANNON.ConvexPolyhedron;
        for (let i = 0; i < cp.vertices.length; i++) {
          const v = cp.vertices[i];
          points.push(new THREE.Vector3(v.x, v.y, v.z));
        }

        geometry.setFromPoints(points);

        const indices: number[] = [];
        for (let i = 0; i < cp.faces.length; i++) {
          const face = cp.faces[i];
          const a = face[0];
          for (let j = 1; j < face.length - 1; j++) {
            const b = face[j];
            const c = face[j + 1];
            indices.push(a, b, c);
          }
        }
        geometry.setIndex(indices);

        mesh = new THREE.Mesh(geometry, this._material);
        break;
      }

      case CANNON.Shape.types.TRIMESH: {
        geometry = new THREE.BufferGeometry();
        points = [];

        const tm = shape as CANNON.Trimesh;
        for (let i = 0; i < tm.vertices.length; i += 3) {
          points.push(new THREE.Vector3(tm.vertices[i], tm.vertices[i + 1], tm.vertices[i + 2]));
        }

        geometry.setFromPoints(points);
        mesh = new THREE.Mesh(geometry, this._material);

        this._shapeGeoId.set(shape, geometry.id);
        break;
      }

      case CANNON.Shape.types.HEIGHTFIELD: {
        geometry = new THREE.BufferGeometry();
        points = [];

        const hf = shape as CANNON.Heightfield;
        const v0 = this.tmpVec0;
        const v1 = this.tmpVec1;
        const v2 = this.tmpVec2;

        for (let xi = 0; xi < hf.data.length - 1; xi++) {
          for (let yi = 0; yi < hf.data[xi].length - 1; yi++) {
            for (let k = 0; k < 2; k++) {
              hf.getConvexTrianglePillar(xi, yi, k === 0);

              v0.copy(hf.pillarConvex.vertices[0]);
              v1.copy(hf.pillarConvex.vertices[1]);
              v2.copy(hf.pillarConvex.vertices[2]);

              v0.vadd(hf.pillarOffset, v0);
              v1.vadd(hf.pillarOffset, v1);
              v2.vadd(hf.pillarOffset, v2);

              points.push(
                new THREE.Vector3(v0.x, v0.y, v0.z),
                new THREE.Vector3(v1.x, v1.y, v1.z),
                new THREE.Vector3(v2.x, v2.y, v2.z)
              );
            }
          }
        }

        geometry.setFromPoints(points);
        mesh = new THREE.Mesh(geometry, this._material);

        this._shapeGeoId.set(shape, geometry.id);
        break;
      }

      default:
        mesh = new THREE.Mesh();
        break;
    }

    if (mesh && (mesh as any).geometry) this.scene.add(mesh);
    return mesh;
  }

  private _scaleMesh(mesh: THREE.Mesh | THREE.Points, shape: CANNON.Shape) {
    switch (shape.type) {
      case CANNON.Shape.types.SPHERE: {
        const radius = (shape as CANNON.Sphere).radius;
        mesh.scale.set(radius, radius, radius);
        break;
      }

      case CANNON.Shape.types.BOX: {
        const halfExtents = (shape as CANNON.Box).halfExtents;
        mesh.scale.set(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
        break;
      }

      case CANNON.Shape.types.CONVEXPOLYHEDRON:
      case CANNON.Shape.types.HEIGHTFIELD:
        mesh.scale.set(1, 1, 1);
        break;

      case CANNON.Shape.types.TRIMESH: {
        const scale = (shape as CANNON.Trimesh).scale;
        mesh.scale.set(scale.x, scale.y, scale.z);
        break;
      }

      case CANNON.Shape.types.CYLINDER: {
        // Cylinder geometry already created at the right size; keep scale neutral.
        mesh.scale.set(1, 1, 1);
        break;
      }

      case CANNON.Shape.types.PLANE: {
        mesh.scale.set(1, 1, 1);
        break;
      }
    }
  }
}
