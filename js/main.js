import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { CameraControls } from './controls/CameraControls.js';
import { ShapeGenerator } from './visualization/ShapeGenerator.js';
import { SphereVisualizer } from './visualization/SphereVisualizer.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { InfoPanels } from './ui/InfoPanels.js';
import { FeatureTest } from './ui/FeatureTest.js';

class AudioVisualizerApp {
    constructor() {
        this.setup();
        this.animate = this.animate.bind(this);
        this.lastUpdate = 0;
        this.updateInterval = 100; // Update panels every 100ms
    }

    async setup() {
        // Setup Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Initialize components
        this.audioAnalyzer = new AudioAnalyzer();
        await this.audioAnalyzer.setup('music.mp3');

        // Setup audio controls
        const playButton = document.getElementById('playButton');
        const pauseButton = document.getElementById('pauseButton');
        
        playButton.addEventListener('click', () => {
            this.audioAnalyzer.play();
        });
        
        pauseButton.addEventListener('click', () => {
            this.audioAnalyzer.pause();
        });

        this.cameraControls = new CameraControls(this.camera, this.renderer);
        this.sphereVisualizer = new SphereVisualizer(this.scene);
        this.shapeGenerator = new ShapeGenerator(this.scene);
        this.infoPanels = new InfoPanels();
        
        // Setup control panel
        const controlPanel = new ControlPanel(document.querySelector('.control-panel'));
        this.setupControlPanelListeners(controlPanel);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        this.camera.position.z = 5;

        // Setup feature tests
        this.setupFeatureTests();

        // Start animation
        this.animate();
    }

    setupControlPanelListeners(controlPanel) {
        // Wire up sensitivity slider
        const sensitivitySlider = document.getElementById('sensitivity');
        const sensitivityValue = sensitivitySlider.nextElementSibling;
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sensitivityValue.textContent = value.toFixed(1);
            this.sphereVisualizer.setSensitivity(value);
        });

        // Wire up wireframe thickness control
        controlPanel.on('wireframeThickness', (thickness) => {
            this.sphereVisualizer.setWireframeThickness(thickness);
        });

        // Wire up feature toggles
        controlPanel.on('featureToggle', ({ feature, enabled }) => {
            this.sphereVisualizer.toggleFeature(feature, enabled);
        });

        // Wire up color controls
        const baseColorPicker = document.getElementById('baseColor');
        const peakColorPicker = document.getElementById('peakColor');
        const troughColorPicker = document.getElementById('troughColor');

        const updateColors = () => {
            const baseColor = new THREE.Color(baseColorPicker.value);
            const peakColor = new THREE.Color(peakColorPicker.value);
            this.sphereVisualizer.updateColors([baseColor.r, baseColor.g, baseColor.b], 
                                            [peakColor.r, peakColor.g, peakColor.b]);
        };

        baseColorPicker.addEventListener('input', updateColors);
        peakColorPicker.addEventListener('input', updateColors);
        troughColorPicker.addEventListener('input', updateColors);
    }

    setupFeatureTests() {
        const featureTest = new FeatureTest(document.querySelector('.control-panel'));

        featureTest.addTest('Audio Playback', async () => {
            await this.audioAnalyzer.play();
            await new Promise(resolve => setTimeout(resolve, 100));
            const isPlaying = this.audioAnalyzer.isPlaying;
            this.audioAnalyzer.pause();
            return isPlaying;
        });

        featureTest.addTest('Camera Controls', () => {
            return this.cameraControls !== null;
        });

        featureTest.addTest('Sphere Visualization', () => {
            return this.sphereVisualizer !== null && this.scene.children.length > 0;
        });

        featureTest.addTest('Shape Generation', () => {
            return this.shapeGenerator !== null;
        });

        featureTest.addTest('Info Panels', () => {
            return this.infoPanels !== null &&
                   document.getElementById('savedPointsList') !== null &&
                   document.getElementById('currentCalcsList') !== null;
        });

        // Run the tests
        featureTest.runTests();
    }

    animate() {
        requestAnimationFrame(this.animate);

        // Update camera controls
        this.cameraControls.update();

        if (this.audioAnalyzer.isPlaying) {
            const audioData = this.audioAnalyzer.getFrequencyData();
            const extremePoints = this.sphereVisualizer.update(audioData);
            
            // Save extreme points if they exist
            if (extremePoints && extremePoints.length > 0) {
                extremePoints.forEach(point => {
                    this.infoPanels.updateSavedPoints(point);
                });
            }

            // Update info panels at specified interval
            const now = performance.now();
            if (now - this.lastUpdate > this.updateInterval) {
                const averageAmplitude = Array.from(audioData).reduce((a, b) => a + b, 0) / audioData.length;
                const peakFrequency = audioData.indexOf(Math.max(...audioData));
                
                this.infoPanels.updateCurrentCalcs({
                    averageAmplitude: averageAmplitude / 255,
                    peakFrequency: Math.round(peakFrequency * (22050 / 128)),
                    activeVertices: this.sphereVisualizer.getLockedVertices().size,
                    shapesCount: this.shapeGenerator.shapeObjects.size
                });

                this.lastUpdate = now;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizerApp();
});
