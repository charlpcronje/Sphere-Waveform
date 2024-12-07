document.addEventListener('DOMContentLoaded', () => {
    // Audio setup
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Load and play audio
    const audio = new Audio();
    audio.src = 'music.mp3';  // You'll need to add your music file
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Three.js setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create sphere with more vertices for better deformation
    const geometry = new THREE.SphereGeometry(2, 128, 128);  // Doubled size and increased detail
    const material = new THREE.MeshPhongMaterial({
        color: 0x444444,
        wireframe: true,
        wireframeLinewidth: 2,
        vertexColors: true  // Enable vertex colors
    });

    // Create vertex colors array
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Track locked vertices and their positions
    const lockedVertices = new Set();
    const lockedPositions = {};
    let lastCaptureTime = 0;
    let maxAmplitude = 0;
    let minAmplitude = 1;
    let maxVertex = null;
    let minVertex = null;
    let isPaused = false;
    let currentCalcs = [];

    // UI Elements
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const savedPointsList = document.getElementById('savedPointsList');
    const currentCalcsList = document.getElementById('currentCalcsList');
    const baseColorInput = document.getElementById('baseColor');
    const peakColorInput = document.getElementById('peakColor');
    const troughColorInput = document.getElementById('troughColor');
    const sensitivityInput = document.getElementById('sensitivity');
    const sensitivityValue = sensitivityInput.nextElementSibling;
    const shapeSizeInput = document.getElementById('shapeSize');
    const shapeCircle = document.getElementById('shapeCircle');
    const shapeSquare = document.getElementById('shapeSquare');
    const shapeTriangle = document.getElementById('shapeTriangle');

    let currentSensitivity = parseFloat(sensitivityInput.value);
    let baseColor = hexToRgb(baseColorInput.value);
    let peakColor = hexToRgb(peakColorInput.value);
    let troughColor = hexToRgb(troughColorInput.value);
    let currentShapeSize = parseFloat(shapeSizeInput.value);
    shapeSizeInput.nextElementSibling.textContent = currentShapeSize.toFixed(1);

    // Color management
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : null;
    }

    // Shape generation functions
    function createShapeGeometry(type, size) {
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

    function getRandomShape() {
        const availableShapes = [];
        if (shapeCircle.checked) availableShapes.push('circle');
        if (shapeSquare.checked) availableShapes.push('square');
        if (shapeTriangle.checked) availableShapes.push('triangle');
        
        if (availableShapes.length === 0) return 'circle';
        return availableShapes[Math.floor(Math.random() * availableShapes.length)];
    }

    // Store shapes for each vertex
    const vertexShapes = new Map();
    const shapeObjects = new Set();

    // Event listeners for controls
    baseColorInput.addEventListener('input', (e) => {
        baseColor = hexToRgb(e.target.value);
        material.color.setHex(parseInt(e.target.value.substring(1), 16));
    });

    sensitivityInput.addEventListener('input', (e) => {
        currentSensitivity = parseFloat(e.target.value);
        sensitivityValue.textContent = currentSensitivity.toFixed(1);
    });

    peakColorInput.addEventListener('input', (e) => {
        peakColor = hexToRgb(e.target.value);
    });

    troughColorInput.addEventListener('input', (e) => {
        troughColor = hexToRgb(e.target.value);
    });

    shapeSizeInput.addEventListener('input', (e) => {
        currentShapeSize = parseFloat(e.target.value);
        shapeSizeInput.nextElementSibling.textContent = currentShapeSize.toFixed(1);
    });

    // Update info panels
    function updateSavedPoints() {
        const points = Array.from(lockedVertices).map((vertex, index) => {
            const pos = lockedPositions[vertex];
            const colorType = pos.color[0] === peakColor[0] ? 'Peak' : 'Trough';
            const colorHex = `#${pos.color.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
            return `Point ${index + 1}: ${colorType} at (${pos.position.map(p => p.toFixed(2)).join(', ')}) - Color: ${colorHex}`;
        });
        savedPointsList.innerHTML = points.join('<br>');
    }

    function updateCurrentCalcs(amplitude, vertex) {
        currentCalcs.push(`Time: ${audio.currentTime.toFixed(2)}s - Amplitude: ${amplitude.toFixed(3)} at vertex ${vertex}`);
        if (currentCalcs.length > 10) {
            currentCalcs = currentCalcs.slice(-10);
        }
        currentCalcsList.innerHTML = currentCalcs.join('<br>');
    }

    // Play/Pause controls
    playButton.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audio.play();
        isPaused = false;
    });

    pauseButton.addEventListener('click', () => {
        if (!audio.paused) {
            audio.pause();
        } else {
            audio.play();
        }
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    camera.position.z = 5;

    // Function to create shape at vertex
    function createShapeAtVertex(position, color, amplitude) {
        const shapeType = getRandomShape();
        const geometry = createShapeGeometry(shapeType, currentShapeSize * 0.2);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color[0], color[1], color[2]),
            side: THREE.DoubleSide
        });
        
        const shape = new THREE.Mesh(geometry, material);
        shape.position.copy(position);
        
        // Orient shape to face outward from sphere center
        shape.lookAt(new THREE.Vector3(0, 0, 0));
        shape.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
        
        return shape;
    }

    function updateShapePosition(shape, position, amplitude) {
        shape.position.copy(position);
        shape.lookAt(new THREE.Vector3(0, 0, 0));
    }

    // Animation
    const animate = function () {
        requestAnimationFrame(animate);

        if (isPaused) {
            return;
        }

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        const currentTime = audio.currentTime;
        const positions = geometry.attributes.position;
        const vertices = positions.array;
        const originalPositions = geometry.attributes.position.array.slice();
        const colors = geometry.attributes.color.array;

        // Clear old shapes that aren't locked
        shapeObjects.forEach(shape => {
            if (!lockedVertices.has(shape.userData.vertexIndex)) {
                scene.remove(shape);
                shapeObjects.delete(shape);
            }
        });

        if (Math.floor(currentTime / 10) > Math.floor(lastCaptureTime / 10)) {
            if (maxVertex !== null && minVertex !== null) {
                const maxPos = new THREE.Vector3(
                    vertices[maxVertex],
                    vertices[maxVertex + 1],
                    vertices[maxVertex + 2]
                );
                const minPos = new THREE.Vector3(
                    vertices[minVertex],
                    vertices[minVertex + 1],
                    vertices[minVertex + 2]
                );

                // Create and add shapes for locked vertices
                const maxShape = createShapeAtVertex(maxPos, peakColor, maxAmplitude);
                const minShape = createShapeAtVertex(minPos, troughColor, minAmplitude);
                
                maxShape.userData.vertexIndex = maxVertex;
                minShape.userData.vertexIndex = minVertex;
                
                scene.add(maxShape);
                scene.add(minShape);
                shapeObjects.add(maxShape);
                shapeObjects.add(minShape);

                lockedVertices.add(maxVertex);
                lockedVertices.add(minVertex);
                lockedPositions[maxVertex] = {
                    position: [vertices[maxVertex], vertices[maxVertex + 1], vertices[maxVertex + 2]],
                    color: [...peakColor],
                    shape: maxShape
                };
                lockedPositions[minVertex] = {
                    position: [vertices[minVertex], vertices[minVertex + 1], vertices[minVertex + 2]],
                    color: [...troughColor],
                    shape: minShape
                };
                
                updateSavedPoints();
            }
            maxAmplitude = 0;
            minAmplitude = 1;
            maxVertex = null;
            minVertex = null;
            lastCaptureTime = currentTime;
            currentCalcs = [];
        }

        // Update vertices and shapes
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip locked vertices
            if (lockedVertices.has(i)) {
                const locked = lockedPositions[i];
                vertices[i] = locked.position[0];
                vertices[i + 1] = locked.position[1];
                vertices[i + 2] = locked.position[2];
                colors[i] = locked.color[0];
                colors[i + 1] = locked.color[1];
                colors[i + 2] = locked.color[2];
                continue;
            }

            const freqIndex = Math.floor((i / vertices.length) * bufferLength);
            const amplitude = dataArray[freqIndex] / 255;
            
            const vertex = new THREE.Vector3(
                originalPositions[i],
                originalPositions[i + 1],
                originalPositions[i + 2]
            );
            
            const displacement = currentSensitivity * amplitude;
            vertex.normalize().multiplyScalar(2 + displacement);
            
            vertices[i] = vertex.x;
            vertices[i + 1] = vertex.y;
            vertices[i + 2] = vertex.z;

            // Track max and min amplitudes
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
                maxVertex = i;
                updateCurrentCalcs(amplitude, i);
            }
            if (amplitude < minAmplitude && amplitude > 0.1) {
                minAmplitude = amplitude;
                minVertex = i;
                updateCurrentCalcs(amplitude, i);
            }

            // Color transition based on displacement
            const colorIndex = i;
            const intensity = displacement / currentSensitivity;
            if (!lockedVertices.has(i)) {
                const lerpColor = [];
                for (let c = 0; c < 3; c++) {
                    lerpColor[c] = baseColor[c] + (peakColor[c] - baseColor[c]) * intensity;
                }
                colors[colorIndex] = lerpColor[0];
                colors[colorIndex + 1] = lerpColor[1];
                colors[colorIndex + 2] = lerpColor[2];
            }
        }

        positions.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;

        // Update shapes for locked vertices
        shapeObjects.forEach(shape => {
            const vertexIndex = shape.userData.vertexIndex;
            if (lockedVertices.has(vertexIndex)) {
                const pos = new THREE.Vector3(
                    vertices[vertexIndex],
                    vertices[vertexIndex + 1],
                    vertices[vertexIndex + 2]
                );
                updateShapePosition(shape, pos);
            }
        });

        // Rotate sphere
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.005;

        renderer.render(scene, camera);
    };

    animate();
});
