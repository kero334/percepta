/* ═══════════════════════════════════════════════════════════════════════════
   PERCEPTA - Main Application Entry Point
   Initializes all modules and orchestrates the UI
   ═══════════════════════════════════════════════════════════════════════════ */

import { Config, validateConfig } from './core/config.js';
import { modelRegistry } from './core/modelRegistry.js';
import { pipelineEngine } from './core/pipelineEngine.js';
import { GeminiVisionModel } from './models/geminiVision.js';
import { GeminiReasoningModel } from './models/geminiReasoning.js';

// ─────────────────────────────────────────────────────────────────────────────
// Application State
// ─────────────────────────────────────────────────────────────────────────────
const AppState = {
    isProcessing: false,
    currentImage: null,
    lastResult: null
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────────────────────
const DOM = {
    get displayImage() { return document.getElementById('display-image'); },
    get outputCanvas() { return document.getElementById('output-canvas'); },
    get emptyState() { return document.getElementById('empty-state'); },
    get loadingOverlay() { return document.getElementById('loading-overlay'); },
    get loadingText() { return document.getElementById('loading-text'); },
    get progressSteps() { return document.getElementById('progress-steps'); },
    get reportCard() { return document.getElementById('report-card'); },
    get reportContent() { return document.getElementById('report-content'); },
    get riskScore() { return document.getElementById('risk-score'); },
    get riskLevel() { return document.getElementById('risk-level'); },
    get riskBar() { return document.getElementById('risk-bar-fill'); },
    get findingsList() { return document.getElementById('findings-list'); },
    get scanLine() { return document.getElementById('scan-line'); },
    get statusVision() { return document.getElementById('status-vision'); },
    get statusReasoning() { return document.getElementById('status-reasoning'); },
    get statusText() { return document.getElementById('status-text'); },
    get settingsModal() { return document.getElementById('settings-modal'); }
};

// ─────────────────────────────────────────────────────────────────────────────
// Model Registration
// ─────────────────────────────────────────────────────────────────────────────
function registerModels() {
    // Register Gemini Vision (Engine 1)
    modelRegistry.register('gemini-vision', new GeminiVisionModel(), {
        priority: 1
    });

    // Register Gemini Reasoning (Engine 2)
    modelRegistry.register('gemini-reasoning', new GeminiReasoningModel(), {
        priority: 1
    });

}

// ─────────────────────────────────────────────────────────────────────────────
// UI Updates
// ─────────────────────────────────────────────────────────────────────────────
function updateStatusIndicators() {
    const visionOk = !!Config.keys.vision;
    const reasoningOk = !!Config.keys.reasoning;

    if (DOM.statusVision) {
        DOM.statusVision.className = visionOk
            ? 'status-dot online'
            : 'status-dot offline';
    }

    if (DOM.statusReasoning) {
        DOM.statusReasoning.className = reasoningOk
            ? 'status-dot online'
            : 'status-dot offline';
    }

    if (DOM.statusText) {
        DOM.statusText.textContent = (visionOk && reasoningOk)
            ? 'DUAL ENGINE READY'
            : 'KEYS MISSING';
    }
}

function showLoading(show = true) {
    DOM.loadingOverlay?.classList.toggle('hidden', !show);
}

function updateProgress(step, total, message, status = 'loading') {
    if (!DOM.progressSteps) return;

    const steps = DOM.progressSteps.querySelectorAll('.progress-step');
    steps.forEach((el, i) => {
        const icon = el.querySelector('.progress-step-icon');
        if (i < step - 1) {
            el.classList.remove('active');
            el.classList.add('completed');
            icon?.classList.replace('active', 'completed');
            icon?.classList.replace('pending', 'completed');
        } else if (i === step - 1) {
            el.classList.add('active');
            el.classList.remove('completed');
            icon?.classList.replace('pending', 'active');
            icon?.classList.replace('completed', 'active');
        } else {
            el.classList.remove('active', 'completed');
            icon?.classList.add('pending');
            icon?.classList.remove('active', 'completed');
        }
    });

    if (DOM.loadingText) {
        DOM.loadingText.textContent = message.toUpperCase();
    }
}

function displayReport(report) {
    if (!DOM.reportCard) return;

    // Update risk score with animation
    if (DOM.riskScore) {
        const score = report.risk_score || 0;
        animateValue(DOM.riskScore, 0, score, 1000);

        // Set color class
        DOM.riskScore.className = 'risk-score-value ' +
            (score <= 30 ? 'safe' : score <= 70 ? 'warning' : 'danger');
    }

    // Update risk level
    if (DOM.riskLevel) {
        DOM.riskLevel.textContent = report.risk_level || 'Unknown';
    }

    // Update risk bar
    if (DOM.riskBar) {
        DOM.riskBar.style.width = `${report.risk_score || 0}%`;
        DOM.riskBar.className = 'risk-bar-fill ' +
            (report.risk_score <= 30 ? 'safe' : report.risk_score <= 70 ? 'warning' : 'danger');
    }

    // Render findings
    if (DOM.findingsList && report.findings) {
        DOM.findingsList.innerHTML = report.findings.map(f => `
      <div class="finding-item ${f.type}">
        <i class="fa-solid ${f.type === 'success' ? 'fa-check' : f.type === 'danger' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
        <span>${f.title || f.description}</span>
      </div>
    `).join('');
    }

    // Render full report
    if (DOM.reportContent && window.marked) {
        DOM.reportContent.innerHTML = marked.parse(report.safety_report || '');
    }

    // Show report card with animation
    DOM.reportCard.classList.remove('hidden');
    DOM.reportCard.classList.add('animate-in');
}

function animateValue(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ─────────────────────────────────────────────────────────────────────────────
// Visualization (Canvas Drawing)
// ─────────────────────────────────────────────────────────────────────────────
function renderDetections(image, detections) {
    const canvas = DOM.outputCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Clear and draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    const humans = [];
    const machines = [];

    // Draw detection boxes
    detections.forEach((det, index) => {
        const [ymin, xmin, ymax, xmax] = det.box_2d;
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const w = ((xmax - xmin) / 1000) * canvas.width;
        const h = ((ymax - ymin) / 1000) * canvas.height;

        // Determine color based on label
        let color, bgColor;
        if (det.label.includes('person')) {
            color = '#f43f5e';
            bgColor = 'rgba(244, 63, 94, 0.2)';
            humans.push({ x: x + w / 2, y: y + h / 2 });
        } else if (det.label.includes('machine') || det.label.includes('vehicle')) {
            color = '#f59e0b';
            bgColor = 'rgba(245, 158, 11, 0.2)';
            machines.push({ x: x + w / 2, y: y + h / 2 });
        } else {
            color = '#38bdf8';
            bgColor = 'rgba(56, 189, 248, 0.2)';
        }

        // Draw filled background
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);

        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Draw corner brackets
        const bracketSize = Math.min(w, h) * 0.15;
        ctx.lineWidth = 4;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + bracketSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + bracketSize, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - bracketSize, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + bracketSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + h - bracketSize);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + bracketSize, y + h);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w - bracketSize, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - bracketSize);
        ctx.stroke();

        // Draw label
        const label = `${det.label.toUpperCase()} ${Math.round(det.score * 100)}%`;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - 24, textWidth + 12, 22);

        ctx.fillStyle = 'white';
        ctx.fillText(label, x + 6, y - 8);
    });

    // Draw danger lines between humans and machines
    const threshold = canvas.width * Config.analysis.proximityThreshold;

    humans.forEach(human => {
        machines.forEach(machine => {
            const distance = Math.hypot(human.x - machine.x, human.y - machine.y);

            if (distance < threshold) {
                // Animated dashed line
                ctx.beginPath();
                ctx.moveTo(human.x, human.y);
                ctx.lineTo(machine.x, machine.y);
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 10]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Danger badge
                const midX = (human.x + machine.x) / 2;
                const midY = (human.y + machine.y) / 2;

                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.roundRect(midX - 40, midY - 12, 80, 24, 4);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('⚠ DANGER', midX, midY + 4);
                ctx.textAlign = 'left';
            }
        });
    });

    // Hide original image, show canvas
    image.style.opacity = '0';
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Pipeline
// ─────────────────────────────────────────────────────────────────────────────
async function runAnalysis(image) {
    if (AppState.isProcessing) return;
    AppState.isProcessing = true;
    AppState.currentImage = image;

    try {
        showLoading(true);

        // Subscribe to progress updates
        const unsubscribe = pipelineEngine.onProgress((step, total, message, status) => {
            updateProgress(step, total, message, status);
        });

        // Run pipeline
        const result = await pipelineEngine.executeImagePipeline(image);
        AppState.lastResult = result;

        unsubscribe();

        if (result.success) {
            // Render detections
            const detections = result.outputs.vision || [];
            renderDetections(image, detections);

            // Display report
            const report = result.outputs.reasoning || {};
            displayReport(report);
        } else {
            console.error('[Percepta] Pipeline failed:', result.error);
            updateProgress(0, 2, result.error?.message || 'Analysis failed', 'error');
        }

    } catch (error) {
        console.error('[Percepta] Analysis error:', error);
    } finally {
        AppState.isProcessing = false;
        setTimeout(() => showLoading(false), 500);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers (exposed globally)
// ─────────────────────────────────────────────────────────────────────────────
window.handleUpload = function (input) {
    const file = input.files?.[0];
    if (!file) return;

    const img = DOM.displayImage;
    if (!img) return;

    img.src = URL.createObjectURL(file);
    DOM.emptyState?.classList.add('hidden');
    img.classList.remove('hidden');
    DOM.reportCard?.classList.add('hidden');

    img.onload = () => runAnalysis(img);
};

window.loadTestImage = function () {
    const img = DOM.displayImage;
    if (!img) return;

    img.crossOrigin = 'Anonymous';
    img.src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop';
    DOM.emptyState?.classList.add('hidden');
    img.classList.remove('hidden');
    DOM.reportCard?.classList.add('hidden');

    img.onload = () => runAnalysis(img);
    img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop';
    };
};

window.toggleReport = function () {
    const body = document.getElementById('report-body');
    if (body) {
        const isOpen = body.style.maxHeight !== '0px';
        body.style.maxHeight = isOpen ? '0px' : '60vh';
    }
};

window.exportPDF = function (event) {
    event?.stopPropagation();

    const content = DOM.reportContent?.innerHTML;
    if (!content || !window.html2pdf) return;

    const element = document.createElement('div');
    element.innerHTML = content;
    element.style.padding = '20px';
    element.style.background = 'white';
    element.style.color = 'black';

    html2pdf()
        .set({ margin: 10, filename: 'percepta-safety-report.pdf' })
        .from(element)
        .save();
};

window.openSettings = function () {
    DOM.settingsModal?.classList.remove('hidden');
};

window.closeSettings = function () {
    DOM.settingsModal?.classList.add('hidden');
};

window.saveSettings = function () {
    const visionKey = document.getElementById('key-vision')?.value?.trim();
    const reasoningKey = document.getElementById('key-reasoning')?.value?.trim();

    if (visionKey) Config.keys.vision = visionKey;
    if (reasoningKey) Config.keys.reasoning = reasoningKey;

    updateStatusIndicators();
    window.closeSettings();
};

window.switchSidebarTab = function (tab) {
    document.getElementById('content-controls')?.classList.toggle('hidden', tab !== 'controls');
    document.getElementById('content-history')?.classList.toggle('hidden', tab !== 'history');

    document.getElementById('tab-controls')?.classList.toggle('active', tab === 'controls');
    document.getElementById('tab-history')?.classList.toggle('active', tab === 'history');
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────
function init() {

    // Validate configuration
    const configStatus = validateConfig();
    if (!configStatus.valid) {
        console.warn('[Percepta] Config issues:', configStatus.issues);
    }

    // Register models
    registerModels();

    // Update UI
    updateStatusIndicators();


}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { AppState, runAnalysis };
