import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { CameraControls } from './controls/CameraControls.js';
import { ShapeGenerator } from './visualization/ShapeGenerator.js';
import { SphereVisualizer } from './visualization/SphereVisualizer.js';
import { ControlPanel } from './ui/ControlPanel.js';

class AudioVisualizerApp {
    constructor() {
        this.setup();
        this.animate = this.animate.bind(this);
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

        // Start animation
        this.animate();
    }

    setupControlPanelListeners(controlPanel) {
        controlPanel.on('featureToggle', ({ feature, enabled }) => {
            this.sphereVisualizer.toggleFeature(feature, enabled);
        });

        controlPanel.on('wireframeThickness', (thickness) => {
            this.sphereVisualizer.setWireframeThickness(thickness);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);

        if (this.audioAnalyzer.isPlaying) {
            const audioData = this.audioAnalyzer.getFrequencyData();
            this.sphereVisualizer.update(audioData);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizerApp();
});
