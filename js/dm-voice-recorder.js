/**
 * Voice Recorder for DM module
 * Provides functionality to record, preview, and send voice notes
 */

class DMVoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.stream = null;
        this.isRecording = false;
        this.recordingTimer = null;
        this.recordingDuration = 0;
        this.maxDuration = 60; // Max recording duration in seconds
        
        // DOM elements will be set in the init method
        this.recordButton = null;
        this.stopButton = null;
        this.cancelButton = null;
        this.timerElement = null;
        this.audioPreview = null;
        this.recordingControls = null;
        
        // Recording constraints
        this.constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
    }
    
    /**
     * Initialize the voice recorder
     * @param {HTMLElement} container - Container element to add recorder controls
     * @param {Function} onComplete - Callback when recording is complete with audio blob
     */
    init(container, onComplete) {
        // Create recorder UI
        this.createRecorderUI(container);
        
        // Set up event listeners
        this.recordButton.addEventListener('click', () => this.startRecording());
        this.stopButton.addEventListener('click', () => {
            this.stopRecording();
            if (typeof onComplete === 'function' && this.audioBlob) {
                onComplete(this.audioBlob);
            }
        });
        this.cancelButton.addEventListener('click', () => this.cancelRecording());
        
        // Check if browser supports MediaRecorder
        if (!window.MediaRecorder) {
            dmNotifications.warning('Your browser does not support voice recording');
            this.disableRecording();
        }
    }
    
    /**
     * Create recorder UI elements
     * @param {HTMLElement} container - Container element
     */
    createRecorderUI(container) {
        // Create recording controls container
        this.recordingControls = document.createElement('div');
        this.recordingControls.className = 'dm-voice-recorder';
        
        // Record button
        this.recordButton = document.createElement('button');
        this.recordButton.className = 'dm-record-btn';
        this.recordButton.innerHTML = '<i class="fas fa-microphone"></i>';
        this.recordButton.title = 'Record voice message';
        
        // Stop button
        this.stopButton = document.createElement('button');
        this.stopButton.className = 'dm-stop-btn';
        this.stopButton.innerHTML = '<i class="fas fa-stop"></i>';
        this.stopButton.title = 'Stop recording';
        this.stopButton.style.display = 'none';
        
        // Cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.className = 'dm-cancel-btn';
        this.cancelButton.innerHTML = '<i class="fas fa-times"></i>';
        this.cancelButton.title = 'Cancel recording';
        this.cancelButton.style.display = 'none';
        
        // Recording timer
        this.timerElement = document.createElement('span');
        this.timerElement.className = 'dm-recording-timer';
        this.timerElement.textContent = '00:00';
        this.timerElement.style.display = 'none';
        
        // Audio preview
        this.audioPreview = document.createElement('audio');
        this.audioPreview.controls = true;
        this.audioPreview.className = 'dm-audio-preview';
        this.audioPreview.style.display = 'none';
        
        // Add elements to container
        this.recordingControls.appendChild(this.recordButton);
        this.recordingControls.appendChild(this.stopButton);
        this.recordingControls.appendChild(this.cancelButton);
        this.recordingControls.appendChild(this.timerElement);
        this.recordingControls.appendChild(this.audioPreview);
        
        // Add recording controls to container
        container.appendChild(this.recordingControls);
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Add CSS styles for recorder UI
     */
    addStyles() {
        if (document.getElementById('dm-voice-recorder-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dm-voice-recorder-styles';
        style.textContent = `
            .dm-voice-recorder {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 5px 0;
            }
            
            .dm-record-btn, .dm-stop-btn, .dm-cancel-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .dm-record-btn {
                background-color: #f0f0f0;
                color: #333;
            }
            
            .dm-record-btn:hover {
                background-color: #e0e0e0;
            }
            
            .dm-record-btn.recording {
                background-color: #ff4136;
                color: white;
                animation: pulse 1.5s infinite;
            }
            
            .dm-stop-btn {
                background-color: #333;
                color: white;
            }
            
            .dm-stop-btn:hover {
                background-color: #555;
            }
            
            .dm-cancel-btn {
                background-color: #f0f0f0;
                color: #333;
            }
            
            .dm-cancel-btn:hover {
                background-color: #e0e0e0;
            }
            
            .dm-recording-timer {
                font-family: monospace;
                font-size: 14px;
                color: #666;
                min-width: 60px;
            }
            
            .dm-audio-preview {
                flex: 1;
                height: 32px;
                border-radius: 16px;
            }
            
            @keyframes pulse {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.05);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Start recording audio
     */
    async startRecording() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            
            // Create MediaRecorder instance
            this.mediaRecorder = new MediaRecorder(this.stream);
            
            // Clear previous recording data
            this.audioChunks = [];
            this.audioBlob = null;
            this.recordingDuration = 0;
            
            // Set up event handlers
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                // Create audio blob when recording stops
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                
                // Create audio URL for preview
                const audioURL = URL.createObjectURL(this.audioBlob);
                this.audioPreview.src = audioURL;
                this.audioPreview.style.display = 'block';
                
                // Stop and release the microphone stream
                this.stopStream();
                
                // Update UI
                this.recordButton.style.display = 'block';
                this.stopButton.style.display = 'none';
                this.cancelButton.style.display = 'none';
                this.timerElement.style.display = 'none';
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            this.recordButton.classList.add('recording');
            this.recordButton.style.display = 'none';
            this.stopButton.style.display = 'block';
            this.cancelButton.style.display = 'block';
            this.timerElement.style.display = 'inline-block';
            this.audioPreview.style.display = 'none';
            
            // Start timer
            this.startTimer();
            
            dmNotifications.info('Recording started. Press stop when finished.');
        } catch (error) {
            console.error('Error starting recording:', error);
            dmNotifications.error('Failed to access microphone. Please check permissions.');
            this.disableRecording();
        }
    }
    
    /**
     * Stop recording audio
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        // Stop recording
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Stop timer
        this.stopTimer();
        
        dmNotifications.success('Recording saved.');
    }
    
    /**
     * Cancel recording
     */
    cancelRecording() {
        if (this.isRecording && this.mediaRecorder) {
            // Stop recording but discard result
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Discard audio data
            this.audioChunks = [];
            this.audioBlob = null;
            
            // Stop timer
            this.stopTimer();
        }
        
        // Stop and release the microphone stream
        this.stopStream();
        
        // Reset UI
        this.recordButton.classList.remove('recording');
        this.recordButton.style.display = 'block';
        this.stopButton.style.display = 'none';
        this.cancelButton.style.display = 'none';
        this.timerElement.style.display = 'none';
        this.audioPreview.style.display = 'none';
        
        dmNotifications.info('Recording cancelled.');
    }
    
    /**
     * Stop and release the microphone stream
     */
    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    /**
     * Start the recording timer
     */
    startTimer() {
        // Reset timer
        this.recordingDuration = 0;
        this.updateTimerDisplay();
        
        // Start timer interval
        this.recordingTimer = setInterval(() => {
            this.recordingDuration++;
            this.updateTimerDisplay();
            
            // Stop recording if max duration reached
            if (this.recordingDuration >= this.maxDuration) {
                this.stopRecording();
                dmNotifications.warning(`Maximum recording time of ${this.maxDuration} seconds reached.`);
            }
        }, 1000);
    }
    
    /**
     * Stop the recording timer
     */
    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
    
    /**
     * Update the timer display
     */
    updateTimerDisplay() {
        const minutes = Math.floor(this.recordingDuration / 60);
        const seconds = this.recordingDuration % 60;
        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Disable recording functionality
     */
    disableRecording() {
        this.recordButton.disabled = true;
        this.recordButton.title = 'Voice recording not supported in this browser';
        this.recordButton.style.opacity = 0.5;
    }
    
    /**
     * Get the recorded audio blob
     * @returns {Blob|null} Audio blob or null if no recording
     */
    getAudioBlob() {
        return this.audioBlob;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.stopRecording();
        this.stopStream();
        this.stopTimer();
        
        // Remove event listeners and elements
        if (this.recordingControls && this.recordingControls.parentNode) {
            this.recordingControls.parentNode.removeChild(this.recordingControls);
        }
    }
}

// Export the voice recorder
window.DMVoiceRecorder = DMVoiceRecorder;
