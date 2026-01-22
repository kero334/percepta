/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Configuration Management
   Centralized configuration for models, keys, and features
   ═══════════════════════════════════════════════════════════════════════════ */

export const Config = {
    // API Keys (loaded from localStorage)
    keys: {
        get vision() {
            return localStorage.getItem('gemini_vision_key') || '';
        },
        set vision(value) {
            localStorage.setItem('gemini_vision_key', value);
        },
        get reasoning() {
            return localStorage.getItem('gemini_reasoning_key') || '';
        },
        set reasoning(value) {
            localStorage.setItem('gemini_reasoning_key', value);
        }
    },

    // Model Endpoints
    endpoints: {
        gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultModel: 'gemini-2.0-flash'
    },

    // Feature Flags
    features: {
        videoAnalysis: false,  // Enable when video models are ready
        offlineFallback: true, // Use TensorFlow.js as backup
        debugMode: false
    },

    // Analysis Settings
    analysis: {
        imageQuality: 0.8,     // JPEG quality for uploads
        maxImageSize: 4096,    // Max dimension in pixels
        confidenceThreshold: 0.5,
        proximityThreshold: 0.15 // Fraction of image width for danger zone
    },

    // UI Settings
    ui: {
        language: 'ar',
        animationsEnabled: true,
        scanLineEnabled: true
    }
};

// Validate configuration on load
export function validateConfig() {
    const issues = [];

    if (!Config.keys.vision) {
        issues.push('Vision API key not configured');
    }
    if (!Config.keys.reasoning) {
        issues.push('Reasoning API key not configured');
    }

    return {
        valid: issues.length === 0,
        issues
    };
}
