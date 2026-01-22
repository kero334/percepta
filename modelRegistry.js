/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Model Registry
   Dynamic registration and discovery of AI models
   ═══════════════════════════════════════════════════════════════════════════ */

class ModelRegistry {
    constructor() {
        this.models = new Map();
        this.fallbacks = new Map();
    }

    /**
     * Register a model with the registry
     * @param {string} id - Unique identifier for the model
     * @param {BaseModel} model - Model instance
     * @param {Object} options - Registration options
     */
    register(id, model, options = {}) {
        const registration = {
            model,
            priority: options.priority || 1,
            fallbackFor: options.fallbackFor || null,
            enabled: options.enabled !== false
        };

        this.models.set(id, registration);

        // Register as fallback if specified
        if (registration.fallbackFor) {
            if (!this.fallbacks.has(registration.fallbackFor)) {
                this.fallbacks.set(registration.fallbackFor, []);
            }
            this.fallbacks.get(registration.fallbackFor).push(id);
        }

        console.log(`[ModelRegistry] Registered: ${id}`, model.getCapabilities());
        return this;
    }

    /**
     * Unregister a model
     * @param {string} id - Model identifier
     */
    unregister(id) {
        this.models.delete(id);
        // Clean up fallback references
        for (const [key, fallbackList] of this.fallbacks.entries()) {
            const index = fallbackList.indexOf(id);
            if (index > -1) {
                fallbackList.splice(index, 1);
            }
        }
        console.log(`[ModelRegistry] Unregistered: ${id}`);
    }

    /**
     * Get a model by ID
     * @param {string} id - Model identifier
     * @returns {BaseModel|null}
     */
    get(id) {
        const registration = this.models.get(id);
        return registration?.enabled ? registration.model : null;
    }

    /**
     * Get models by capability
     * @param {Object} filters - Filter criteria
     * @returns {Array<{id: string, model: BaseModel}>}
     */
    getByCapability({ type, role }) {
        const matches = [];

        for (const [id, registration] of this.models.entries()) {
            if (!registration.enabled) continue;

            const caps = registration.model.getCapabilities();
            const typeMatch = !type || caps.type === type;
            const roleMatch = !role || caps.role === role;

            if (typeMatch && roleMatch) {
                matches.push({ id, model: registration.model, priority: registration.priority });
            }
        }

        // Sort by priority (higher first)
        return matches.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get fallbacks for a model
     * @param {string} id - Primary model identifier
     * @returns {Array<BaseModel>}
     */
    getFallbacks(id) {
        const fallbackIds = this.fallbacks.get(id) || [];
        return fallbackIds
            .map(fid => this.get(fid))
            .filter(m => m !== null);
    }

    /**
     * Check health of all registered models
     * @returns {Promise<Object>} Health status for each model
     */
    async healthCheck() {
        const results = {};

        for (const [id, registration] of this.models.entries()) {
            try {
                const healthy = await registration.model.healthCheck();
                results[id] = { healthy, enabled: registration.enabled };
            } catch (error) {
                results[id] = { healthy: false, enabled: registration.enabled, error: error.message };
            }
        }

        return results;
    }

    /**
     * Get all registered model IDs
     * @returns {Array<string>}
     */
    list() {
        return Array.from(this.models.keys());
    }

    /**
     * Get count of registered models
     * @returns {number}
     */
    get count() {
        return this.models.size;
    }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();
