export class ShapeGenerator {
    constructor(scene) {
        this.scene = scene;
        this.shapeObjects = new Set();
        this.currentShapeSize = 0.5;
        this.enabledShapes = {
            circle: true,
            square: true,
            triangle: true
        };
    }

    createShapeGeometry(type, size) {
        switch(type) {
            case 'circle':
                return new THREE.CircleGeometry(size, 32);
            case 'square':
                return new THREE.PlaneGeometry(size * 2, size * 2);
            case 'triangle':
                const triangleGeo = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    -size, -size, 0,
                    size, -size, 0,
                    0, size, 0
                ]);
                triangleGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                return triangleGeo;
            default:
                return new THREE.CircleGeometry(size, 32);
        }
    }

    getRandomShape() {
        const availableShapes = Object.entries(this.enabledShapes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type);
        
        if (availableShapes.length === 0) return 'circle';
        return availableShapes[Math.floor(Math.random() * availableShapes.length)];
    }

    createShapeAtVertex(position, color, amplitude) {
        const shapeType = this.getRandomShape();
        const geometry = this.createShapeGeometry(shapeType, this.currentShapeSize * 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color[0], color[1], color[2]),
            side: THREE.DoubleSide
        });
        
        const shape = new THREE.Mesh(geometry, material);
        shape.position.copy(position);
        shape.lookAt(new THREE.Vector3(0, 0, 0));
        shape.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
        
        this.scene.add(shape);
        this.shapeObjects.add(shape);
        return shape;
    }

    updateShapePosition(shape, position) {
        shape.position.copy(position);
        shape.lookAt(new THREE.Vector3(0, 0, 0));
    }

    setShapeSize(size) {
        this.currentShapeSize = size;
    }

    setEnabledShapes(shapes) {
        this.enabledShapes = { ...shapes };
    }

    removeShape(shape) {
        this.scene.remove(shape);
        this.shapeObjects.delete(shape);
    }

    clear() {
        this.shapeObjects.forEach(shape => {
            this.scene.remove(shape);
        });
        this.shapeObjects.clear();
    }
}
