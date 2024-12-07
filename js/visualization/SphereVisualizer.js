export class SphereVisualizer {
    constructor(scene) {
        this.scene = scene;
        this.setupSphere();
        this.lockedVertices = new Set();
        this.lockedPositions = {};
        this.sensitivity = 0.8;
        this.wireframeThickness = 2;
        this.features = {
            shapeGeneration: true,
            colorTransition: true,
            vertexLocking: true,
            rotation: true
        };
    }

    setupSphere() {
        this.geometry = new THREE.SphereGeometry(2, 128, 128);
        this.material = new THREE.MeshPhongMaterial({
            color: 0x444444,
            wireframe: true,
            wireframeLinewidth: this.wireframeThickness
        });
        this.sphere = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.sphere);

        // Create vertex colors array
        const colors = new Float32Array(this.geometry.attributes.position.count * 3);
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    updateColors(baseColor, peakColor) {
        const colors = this.geometry.attributes.color.array;
        const positions = this.geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            if (!this.lockedVertices.has(i)) {
                colors[i] = baseColor[0];
                colors[i + 1] = baseColor[1];
                colors[i + 2] = baseColor[2];
            }
        }

        this.geometry.attributes.color.needsUpdate = true;
    }

    setSensitivity(value) {
        this.sensitivity = value;
    }

    setWireframeThickness(value) {
        this.wireframeThickness = value;
        this.material.wireframeLinewidth = value;
    }

    toggleFeature(feature, enabled) {
        this.features[feature] = enabled;
    }

    update(audioData, deltaTime) {
        if (!this.features.colorTransition) return [];

        const positions = this.geometry.attributes.position;
        const vertices = positions.array;
        const originalPositions = positions.array.slice();
        const colors = this.geometry.attributes.color.array;
        const extremePoints = [];

        // Update vertices based on audio data
        for (let i = 0; i < vertices.length; i += 3) {
            if (this.lockedVertices.has(i)) continue;

            const freqIndex = Math.floor((i / vertices.length) * audioData.length);
            const amplitude = audioData[freqIndex] / 255;
            
            if (this.features.vertexLocking) {
                // Update vertex position
                const displacement = this.sensitivity * amplitude;
                const vertex = new THREE.Vector3(
                    originalPositions[i],
                    originalPositions[i + 1],
                    originalPositions[i + 2]
                );
                vertex.normalize().multiplyScalar(2 + displacement);
                
                vertices[i] = vertex.x;
                vertices[i + 1] = vertex.y;
                vertices[i + 2] = vertex.z;

                // Check for extreme points (high amplitude)
                if (amplitude > 0.8) {
                    extremePoints.push({
                        position: vertex.clone(),
                        color: [colors[i], colors[i + 1], colors[i + 2]]
                    });
                    
                    // Lock vertex if not already locked
                    if (!this.lockedVertices.has(i)) {
                        this.lockVertex(i, [vertex.x, vertex.y, vertex.z], 
                            [colors[i], colors[i + 1], colors[i + 2]]);
                    }
                }
            }
        }

        positions.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;

        if (this.features.rotation) {
            this.sphere.rotation.x += 0.005;
            this.sphere.rotation.y += 0.005;
        }

        return extremePoints;
    }

    lockVertex(index, position, color) {
        this.lockedVertices.add(index);
        this.lockedPositions[index] = {
            position: [...position],
            color: [...color]
        };
    }

    getLockedVertices() {
        return this.lockedVertices;
    }

    getLockedPositions() {
        return this.lockedPositions;
    }
}
