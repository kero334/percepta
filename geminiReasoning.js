/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Gemini Reasoning Model
   Engine 2: Safety Analysis and Report Generation
   ═══════════════════════════════════════════════════════════════════════════ */

import { BaseModel } from './baseModel.js';
import { Config } from '../core/config.js';

/**
 * Gemini Reasoning Model for safety analysis
 */
export class GeminiReasoningModel extends BaseModel {
    constructor(config = {}) {
        super(config);
        this.endpoint = config.endpoint || `${Config.endpoints.gemini}/${Config.endpoints.defaultModel}:generateContent`;
    }

    getCapabilities() {
        return {
            type: 'image',
            role: 'analysis',
            priority: 1,
            supports: ['risk_assessment', 'safety_report', 'recommendations']
        };
    }

    async initialize() {
        if (!Config.keys.reasoning) {
            throw new Error('Reasoning API key not configured');
        }
        this.initialized = true;
    }

    async healthCheck() {
        return !!Config.keys.reasoning;
    }

    /**
     * Analyze image for safety concerns
     * @param {HTMLImageElement} image - Image to analyze
     * @param {Object} context - Context from detection step
     * @returns {Promise<Object>} Safety analysis report
     */
    async analyze(image, context = {}) {
        try {
            const detections = context.detections || [];
            const summary = detections.map(d => d.label).join(', ') || 'No objects detected';

            const base64 = this.imageToBase64(image, 0.6);

            const prompt = `
You are an expert Industrial Safety Officer conducting a comprehensive safety assessment.

DETECTED IN SCENE: [${summary}]

Analyze this industrial/construction site image and provide a safety report.

Return ONLY valid JSON in this exact format:
{
  "risk_score": 75,
  "risk_level": "Warning",
  "findings": [
    {
      "type": "warning",
      "title": "Title of finding",
      "description": "Brief description"
    }
  ],
  "safety_report": "## تقرير السلامة الصناعية\\n\\n### الملخص التنفيذي\\n...\\n\\n### المخاطر المحددة\\n...\\n\\n### التوصيات\\n..."
}

Rules:
- risk_score: 0-100 (0=completely safe, 100=critical danger)
- risk_level: "Safe" (0-30), "Warning" (31-70), or "Danger" (71-100)
- findings: Array of 2-5 key observations with type: "success", "warning", or "danger"
- safety_report: Detailed markdown report in Arabic
- Consider: PPE compliance, proximity hazards, equipment safety, environmental factors
- No markdown blocks around JSON, just pure JSON
`;

            const response = await fetch(`${this.endpoint}?key=${Config.keys.reasoning}`, {
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
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(text);

            // Ensure required fields
            return {
                risk_score: parsed.risk_score || 0,
                risk_level: parsed.risk_level || 'Safe',
                findings: parsed.findings || [],
                safety_report: parsed.safety_report || 'تقرير غير متوفر'
            };

        } catch (error) {
            throw this.handleError(error, 'analyze');
        }
    }
}
