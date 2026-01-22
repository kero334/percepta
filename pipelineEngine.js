/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Pipeline Engine
   Orchestrates multi-model analysis workflows
   ═══════════════════════════════════════════════════════════════════════════ */

import { modelRegistry } from './modelRegistry.js';

/**
 * Pipeline execution result
 */
class PipelineResult {
    constructor() {
        this.steps = [];
        this.outputs = {};
        this.startTime = Date.now();
        this.endTime = null;
        this.success = false;
        this.error = null;
    }

    addStep(name, output, duration) {
        this.steps.push({ name, duration, success: true });
        this.outputs[name] = output;
    }

    addError(name, error, duration) {
        this.steps.push({ name, duration, success: false, error: error.message });
        this.error = error;
    }

    complete(success = true) {
        this.endTime = Date.now();
        this.success = success;
        return this;
    }

    get duration() {
        return (this.endTime || Date.now()) - this.startTime;
    }
}

/**
 * Pipeline Engine - orchestrates model execution
 */
class PipelineEngine {
    constructor() {
        this.progressCallbacks = [];
    }

    /**
     * Subscribe to progress updates
     * @param {Function} callback - Progress callback (step, total, message)
     */
    onProgress(callback) {
        this.progressCallbacks.push(callback);
        return () => {
            const index = this.progressCallbacks.indexOf(callback);
            if (index > -1) this.progressCallbacks.splice(index, 1);
        };
    }

    /**
     * Emit progress update
     */
    _emitProgress(step, total, message, status = 'loading') {
        this.progressCallbacks.forEach(cb => cb(step, total, message, status));
    }

    /**
     * Run a model with fallback support
     * @param {string} modelId - Primary model ID
     * @param {*} input - Input data
     * @param {Object} context - Additional context
     * @returns {Promise<*>} Model output
     */
    async runWithFallback(modelId, input, context = {}) {
        const model = modelRegistry.get(modelId);

        if (!model) {
            throw new Error(`Model not found: ${modelId}`);
        }

        try {
            return await model.analyze(input, context);
        } catch (error) {
            console.warn(`[Pipeline] Primary model ${modelId} failed:`, error);

            // Try fallbacks
            const fallbacks = modelRegistry.getFallbacks(modelId);
            for (const fallback of fallbacks) {
                try {
                    console.log(`[Pipeline] Trying fallback:`, fallback.constructor.name);
                    return await fallback.analyze(input, context);
                } catch (fallbackError) {
                    console.warn(`[Pipeline] Fallback failed:`, fallbackError);
                }
            }

            throw error; // All attempts failed
        }
    }

    /**
     * Execute image analysis pipeline
     * @param {HTMLImageElement} image - Image to analyze
     * @returns {Promise<PipelineResult>}
     */
    async executeImagePipeline(image) {
        const result = new PipelineResult();
        const steps = [
            { name: 'vision', message: 'Scanning image...', modelType: 'detection' },
            { name: 'reasoning', message: 'Analyzing safety...', modelType: 'analysis' }
        ];

        try {
            // Step 1: Vision Detection
            this._emitProgress(1, steps.length, steps[0].message);
            const stepStart = Date.now();

            const detections = await this.runWithFallback('gemini-vision', image);
            result.addStep('vision', detections, Date.now() - stepStart);

            // Step 2: Safety Reasoning
            this._emitProgress(2, steps.length, steps[1].message);
            const step2Start = Date.now();

            const report = await this.runWithFallback('gemini-reasoning', image, {
                detections: detections
            });
            result.addStep('reasoning', report, Date.now() - step2Start);

            this._emitProgress(steps.length, steps.length, 'Analysis complete', 'success');
            return result.complete(true);

        } catch (error) {
            this._emitProgress(0, steps.length, error.message, 'error');
            result.error = error;
            return result.complete(false);
        }
    }

    /**
     * Execute video analysis pipeline (future)
     * @param {HTMLVideoElement} video - Video to analyze
     * @returns {Promise<PipelineResult>}
     */
    async executeVideoPipeline(video) {
        const result = new PipelineResult();

        // Placeholder for future video analysis
        result.error = new Error('Video analysis not yet implemented');
        return result.complete(false);
    }
}

// Singleton instance
export const pipelineEngine = new PipelineEngine();
