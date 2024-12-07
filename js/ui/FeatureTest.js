export class FeatureTest {
    constructor(container) {
        this.container = container;
        this.setupPanel();
        this.tests = new Map();
    }

    setupPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'feature-test-panel';
        this.panel.innerHTML = `
            <h3>Feature Checklist</h3>
            <div class="test-list"></div>
        `;
        this.container.appendChild(this.panel);
        this.testList = this.panel.querySelector('.test-list');
    }

    addTest(name, checkFn) {
        const testItem = document.createElement('div');
        testItem.className = 'test-item';
        testItem.innerHTML = `
            <span class="test-name">${name}</span>
            <span class="test-status">⏳</span>
        `;
        this.testList.appendChild(testItem);
        
        this.tests.set(name, {
            element: testItem,
            checkFn: checkFn,
            status: 'pending'
        });
    }

    updateTest(name, passed) {
        const test = this.tests.get(name);
        if (test) {
            test.status = passed ? 'passed' : 'failed';
            const statusElement = test.element.querySelector('.test-status');
            statusElement.textContent = passed ? '✅' : '❌';
        }
    }

    async runTests() {
        for (const [name, test] of this.tests) {
            try {
                const result = await test.checkFn();
                this.updateTest(name, result);
            } catch (error) {
                console.error(`Test "${name}" failed:`, error);
                this.updateTest(name, false);
            }
        }
    }
}
