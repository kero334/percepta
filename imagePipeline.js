/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Image Pipeline
   Orchestrates image analysis workflow
   ═══════════════════════════════════════════════════════════════════════════ */

import { modelRegistry } from '../core/modelRegistry.js';
import { Config } from '../core/config.js';

/**
 * Image Analysis Pipeline
 * Coordinates detection and analysis models for image input
 */
export class ImagePipeline {
    constructor() {
        this.steps = [
            { id: 'detect', name: 'Vision Scan', modelId: 'gemini-vision' },
            { id: 'analyze', name: 'Safety Analysis', modelId: 'gemini-reasoning' }
        ];
    }

    /**
     * Execute the image analysis pipeline
     * @param {HTMLImageElement} image - Image to analyze
     * @param {Object} options - Pipeline options
     * @returns {Promise<Object>} Pipeline results
     */
    async execute(image, options = {}) {
        const results = {
            startTime: Date.now(),
            steps: {},
            success: false
        };

        const onProgress = options.onProgress || (() => { });

        try {
            // Step 1: Detection
            onProgress(1, this.steps.length, 'Scanning for objects and hazards...');

            const detector = modelRegistry.get('gemini-vision');
            if (!detector) throw new Error('Vision model not available');

            const detections = await detector.analyze(image);
            results.steps.detect = {
                success: true,
                output: detections,
                duration: Date.now() - results.startTime
            };

            // Step 2: Analysis
            onProgress(2, this.steps.length, 'Analyzing safety conditions...');

            const analyzer = modelRegistry.get('gemini-reasoning');
            if (!analyzer) throw new Error('Reasoning model not available');

            const analysisStart = Date.now();
            const analysis = await analyzer.analyze(image, { detections });
            results.steps.analyze = {
                success: true,
                output: analysis,
                duration: Date.now() - analysisStart
            };

            results.success = true;
            results.duration = Date.now() - results.startTime;

            onProgress(this.steps.length, this.steps.length, 'Analysis complete', 'success');

        } catch (error) {
            results.success = false;
            results.error = error;
            onProgress(0, this.steps.length, error.message, 'error');
        }

        return results;
    }

    /**
     * Get pipeline step definitions
     * @returns {Array} Step definitions
     */
    getSteps() {
        return this.steps.map(step => ({
            ...step,
            model: modelRegistry.get(step.modelId),
            available: !!modelRegistry.get(step.modelId)
        }));
    }
}

export const imagePipeline = new ImagePipeline();
