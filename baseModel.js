/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Base Model Class
   Abstract interface for all AI models
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Abstract base class for AI models
 * All model implementations must extend this class
 */
export class BaseModel {
    constructor(config = {}) {
        if (new.target === BaseModel) {
            throw new Error('BaseModel is abstract and cannot be instantiated directly');
        }

        this.config = config;
        this.initialized = false;
        this.lastError = null;
    }

    /**
     * Initialize the model (load weights, establish connections, etc.)
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('Subclass must implement initialize()');
    }

    /**
     * Run analysis on input data
     * @param {*} input - Input data (image, video frame, etc.)
     * @param {Object} context - Additional context from previous pipeline steps
     * @returns {Promise<*>} Analysis result
     */
    async analyze(input, context = {}) {
        throw new Error('Subclass must implement analyze()');
    }

    /**
     * Check if the model is healthy and ready
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        throw new Error('Subclass must implement healthCheck()');
    }

    /**
     * Get model capabilities
     * @returns {Object} Capability descriptor
     */
    getCapabilities() {
        return {
            type: 'unknown',  // 'image' | 'video'
            role: 'unknown',  // 'detection' | 'analysis'
            priority: 1,
            supports: []
        };
    }

    /**
     * Standardized error handling
     * @param {Error} error - The error that occurred
     * @param {string} context - Context where error occurred
     * @returns {Error} Enriched error
     */
    handleError(error, context = '') {
        this.lastError = {
            message: error.message,
            context,
            timestamp: Date.now()
        };

        console.error(`[${this.constructor.name}] Error in ${context}:`, error);
        return error;
    }

    /**
     * Convert image element to base64
     * @param {HTMLImageElement} img - Image element
     * @param {number} quality - JPEG quality (0-1)
     * @returns {string} Base64 encoded image data
     */
    imageToBase64(img, quality = 0.8) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas.toDataURL('image/jpeg', quality).split(',')[1];
    }
}
