export class ControlPanel {
    constructor(container) {
        this.container = container;
        this.callbacks = {};
        this.setupPanel();
    }

    setupPanel() {
        // Features panel
        const featuresPanel = document.createElement('div');
        featuresPanel.className = 'control-group';
        featuresPanel.innerHTML = `
            <h3>Features</h3>
            <div class="checkbox-group">
                <label><input type="checkbox" id="featureShapes" checked> Shape Generation</label>
                <label><input type="checkbox" id="featureColors" checked> Color Transitions</label>
                <label><input type="checkbox" id="featureLocking" checked> Vertex Locking</label>
                <label><input type="checkbox" id="featureRotation" checked> Sphere Rotation</label>
            </div>
        `;

        // Mesh controls
        const meshPanel = document.createElement('div');
        meshPanel.className = 'control-group';
        meshPanel.innerHTML = `
            <h3>Mesh Controls</h3>
            <div class="slider-control">
                <label>Wireframe Thickness:</label>
                <input type="range" id="wireframeThickness" min="1" max="5" step="0.5" value="2">
                <div class="slider-value">2</div>
            </div>
        `;

        this.container.appendChild(featuresPanel);
        this.container.appendChild(meshPanel);

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const features = ['Shapes', 'Colors', 'Locking', 'Rotation'];
        features.forEach(feature => {
            const checkbox = document.getElementById(`feature${feature}`);
            checkbox.addEventListener('change', (e) => {
                this.triggerCallback('featureToggle', {
                    feature: feature.toLowerCase(),
                    enabled: e.target.checked
                });
            });
        });

        const wireframeSlider = document.getElementById('wireframeThickness');
        const wireframeValue = wireframeSlider.nextElementSibling;
        wireframeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            wireframeValue.textContent = value.toFixed(1);
            this.triggerCallback('wireframeThickness', value);
        });
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    triggerCallback(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }
}
