export class InfoPanels {
    constructor() {
        this.savedPointsPanel = document.getElementById('savedPointsList');
        this.currentCalcsPanel = document.getElementById('currentCalcsList');
        this.savedPoints = new Set();
    }

    updateSavedPoints(point) {
        const pointKey = `${point.position.toArray().join(',')}_${point.color.join(',')}`;
        if (!this.savedPoints.has(pointKey)) {
            this.savedPoints.add(pointKey);
            const pointElement = document.createElement('div');
            pointElement.textContent = `Position: (${point.position.x.toFixed(2)}, ${point.position.y.toFixed(2)}, ${point.position.z.toFixed(2)})`;
            pointElement.style.marginBottom = '5px';
            this.savedPointsPanel.appendChild(pointElement);
        }
    }

    updateCurrentCalcs(data) {
        this.currentCalcsPanel.innerHTML = `
            <div>Average Amplitude: ${data.averageAmplitude.toFixed(3)}</div>
            <div>Peak Frequency: ${data.peakFrequency} Hz</div>
            <div>Active Vertices: ${data.activeVertices}</div>
            <div>Shapes Generated: ${data.shapesCount}</div>
        `;
    }

    clearPanels() {
        this.savedPointsPanel.innerHTML = '';
        this.currentCalcsPanel.innerHTML = '';
        this.savedPoints.clear();
    }
}
