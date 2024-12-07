export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.audio = null;
        this.source = null;
        this.isPlaying = false;
        this.initialized = false;
    }

    async setup(audioFile) {
        // Create audio elements
        this.audio = new Audio();
        this.audio.src = audioFile;
        this.audio.crossOrigin = "anonymous";

        // Wait for audio to be loaded
        await new Promise((resolve) => {
            this.audio.addEventListener('canplaythrough', resolve, { once: true });
            this.audio.load();
        });
    }

    async initializeAudioContext() {
        if (this.initialized) return;

        // Create audio context on user interaction
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Connect audio nodes
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.initialized = true;
    }

    async play() {
        try {
            await this.initializeAudioContext();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            await this.audio.play();
            this.isPlaying = true;
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    }

    pause() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
        }
    }

    getCurrentTime() {
        return this.audio ? this.audio.currentTime : 0;
    }

    getFrequencyData() {
        if (!this.analyser || !this.dataArray) return new Uint8Array(128).fill(0);
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }
}
