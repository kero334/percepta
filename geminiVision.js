/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Gemini Vision Model
   Engine 1: Object Detection using Gemini 2.0 Flash
   ═══════════════════════════════════════════════════════════════════════════ */

import { BaseModel } from './baseModel.js';
import { Config } from '../core/config.js';

/**
 * Gemini Vision Model for object/hazard detection
 */
export class GeminiVisionModel extends BaseModel {
    constructor(config = {}) {
        super(config);
        this.endpoint = config.endpoint || `${Config.endpoints.gemini}/${Config.endpoints.defaultModel}:generateContent`;
    }

    getCapabilities() {
        return {
            type: 'image',
            role: 'detection',
            priority: 1,
            supports: ['bounding_boxes', 'object_labels', 'confidence_scores']
        };
    }

    async initialize() {
        // Verify API key is available
        if (!Config.keys.vision) {
            throw new Error('Vision API key not configured');
        }
        this.initialized = true;
    }

    async healthCheck() {
        return !!Config.keys.vision;
    }

    /**
     * Detect objects in an image
     * @param {HTMLImageElement} image - Image to analyze
     * @returns {Promise<Array>} Detected objects with bounding boxes
     */
    async analyze(image) {
        try {
            const base64 = this.imageToBase64(image, Config.analysis.imageQuality);

            const prompt = `
You are an industrial safety vision system. Analyze this image and identify:
1. All persons/workers visible
2. Heavy machinery and equipment
3. Vehicles (forklifts, trucks, cranes)
4. Potential hazards (open pits, elevated areas, electrical equipment)

Return ONLY valid JSON in this exact format:
{
  "objects": [
    { "label": "person", "box_2d": [ymin, xmin, ymax, xmax], "score": 0.95 },
    { "label": "machine", "box_2d": [ymin, xmin, ymax, xmax], "score": 0.90 }
  ]
}

Rules:
- Use 0-1000 scale for all box coordinates
- Labels must be: "person", "machine", "vehicle", or "hazard"
- Include confidence score between 0 and 1
- No markdown, no explanation, just JSON
`;

            const response = await fetch(`${this.endpoint}?key=${Config.keys.vision}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: 'image/jpeg', data: base64 } }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Parse response
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"objects":[]}';
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(text);
            return parsed.objects || [];

        } catch (error) {
            throw this.handleError(error, 'analyze');
        }
    }
}
