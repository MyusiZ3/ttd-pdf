/* ==========================================================================
   SignFlow - Application Core Engine (Pure Vanilla ES6+)
   ========================================================================== */

// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Application State
const state = {
    pdfDocument: null,
    pdfBytes: null,
    pdfScale: 1.2,
    pdfFileName: 'dokumen.pdf',
    savedSignatures: [],
    placedElements: [],
    activeElementId: null,
    elementCounter: 0,
    
    // Canvas Drawing State
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    brushColor: '#000000',
    brushThickness: 3,
    drawingPathPoints: [],
    
    // Image Upload State
    originalUploadedImage: null,

    // Extraction State
    extractPdfDoc: null,
    extractPdfBytes: null,
    extractPageNum: 1,
    extractTotalPages: 1,
    extractOriginalImage: null,
    extractFileType: null,
    extractImageSrc: null,

    // History & Undo/Redo State
    history: [],
    historyIndex: -1
};

// ==========================================================================
// 1. Inisialisasi & Event Listeners
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadSavedSignatures();
    setupEventListeners();
    setupSignatureCanvas();
}

function setupEventListeners() {
    // 1.1 Landing / File Upload
    const fileInput = document.getElementById('pdfFileInput');
    const dropzone = document.getElementById('uploadDropzone');

    fileInput.addEventListener('change', handleFileSelect);

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                loadPdfFile(file);
            } else {
                showToast('Hanya file PDF yang didukung!', 'error');
            }
        }
    });

    // 1.2 Sidebar & Viewer Toolbar Actions
    document.getElementById('btnChangeDoc').addEventListener('click', resetToUploadZone);
    document.getElementById('btnResetViewer').addEventListener('click', resetToUploadZone);
    
    // Zoom Actions
    document.getElementById('btnZoomIn').addEventListener('click', () => adjustZoom(0.1));
    document.getElementById('btnZoomOut').addEventListener('click', () => adjustZoom(-0.1));

    // History Actions
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnRedo').addEventListener('click', redo);

    // Open Signature Creator Modal
    document.getElementById('btnOpenSignatureModal').addEventListener('click', openSignatureModal);
    document.getElementById('btnCloseSignatureModal').addEventListener('click', closeSignatureModal);

    // Cancel modal clicks
    document.querySelectorAll('.modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeSignatureModal);
    });

    // Modal Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Drawing Controls
    const colorDots = document.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            colorDots.forEach(d => d.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.brushColor = e.currentTarget.getAttribute('data-color');
        });
    });

    const thicknessSlider = document.getElementById('brushThickness');
    const thicknessVal = document.getElementById('thicknessVal');
    thicknessSlider.addEventListener('input', (e) => {
        state.brushThickness = parseInt(e.target.value);
        thicknessVal.textContent = state.brushThickness + 'px';
    });

    document.getElementById('btnClearCanvas').addEventListener('click', clearSignatureCanvas);
    document.getElementById('btnSaveDrawSignature').addEventListener('click', saveDrawnSignature);

    // Upload Image Signature Actions
    const sigUploadArea = document.getElementById('sigUploadArea');
    const sigImageInput = document.getElementById('sigImageInput');
    const sigUploadPlaceholder = document.getElementById('sigUploadPlaceholder');

    sigUploadPlaceholder.addEventListener('click', () => sigImageInput.click());
    sigUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        sigUploadArea.style.borderColor = 'var(--secondary)';
    });
    sigUploadArea.addEventListener('dragleave', () => {
        sigUploadArea.style.borderColor = 'var(--border-color)';
    });
    sigUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        sigUploadArea.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files.length > 0) {
            handleSignatureImageSelect(e.dataTransfer.files[0]);
        }
    });
    sigImageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSignatureImageSelect(e.target.files[0]);
        }
    });

    document.getElementById('btnResetUploadSig').addEventListener('click', resetSignatureUpload);
    document.getElementById('btnSaveUploadedSignature').addEventListener('click', saveUploadedSignature);

    // Chroma-Key (Background Removal) threshold slider
    const thresholdSlider = document.getElementById('bgThreshold');
    const thresholdVal = document.getElementById('thresholdVal');
    thresholdSlider.addEventListener('input', (e) => {
        const threshold = parseInt(e.target.value);
        thresholdVal.textContent = `Ambang Batas: ${threshold}`;
        applyChromaKeyBackgroundRemoval(threshold);
    });

    // Extraction Tab Actions
    const extractUploadArea = document.getElementById('extractUploadArea');
    const extractFileInput = document.getElementById('extractFileInput');
    const extractUploadPlaceholder = document.getElementById('extractUploadPlaceholder');

    if (extractUploadPlaceholder) {
        extractUploadPlaceholder.addEventListener('click', () => extractFileInput.click());
    }
    if (extractUploadArea) {
        extractUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            extractUploadArea.style.borderColor = 'var(--secondary)';
        });
        extractUploadArea.addEventListener('dragleave', () => {
            extractUploadArea.style.borderColor = 'var(--border-color)';
        });
        extractUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            extractUploadArea.style.borderColor = 'var(--border-color)';
            if (e.dataTransfer.files.length > 0) {
                handleExtractFileSelect(e.dataTransfer.files[0]);
            }
        });
    }
    if (extractFileInput) {
        extractFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleExtractFileSelect(e.target.files[0]);
            }
        });
    }

    const btnResetExtract = document.getElementById('btnResetExtract');
    if (btnResetExtract) btnResetExtract.addEventListener('click', resetSignatureExtraction);

    const btnSaveExtractedSignature = document.getElementById('btnSaveExtractedSignature');
    if (btnSaveExtractedSignature) btnSaveExtractedSignature.addEventListener('click', saveExtractedSignature);

    const btnExtractPrevPage = document.getElementById('btnExtractPrevPage');
    if (btnExtractPrevPage) btnExtractPrevPage.addEventListener('click', () => navigateExtractPage(-1));

    const btnExtractNextPage = document.getElementById('btnExtractNextPage');
    if (btnExtractNextPage) btnExtractNextPage.addEventListener('click', () => navigateExtractPage(1));

    const extractBgThreshold = document.getElementById('extractBgThreshold');
    const extractThresholdVal = document.getElementById('extractThresholdVal');
    if (extractBgThreshold && extractThresholdVal) {
        extractBgThreshold.addEventListener('input', (e) => {
            const threshold = parseInt(e.target.value);
            extractThresholdVal.textContent = `Ambang Batas: ${threshold}`;
            renderExtractWorkspace();
        });
    }

    // Update help text dynamically when layer mode changes
    const selectLayerMode = document.getElementById('selectLayerMode');
    const layerHelpText = document.getElementById('layerModeHelpText');
    if (selectLayerMode && layerHelpText) {
        selectLayerMode.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'annot') {
                layerHelpText.textContent = 'Mode "Tumpuk di Atas" menempatkan TTD pada lapisan interaktif terluar (Annotation Widget), mencegah TTD tertimbun di belakang materai elektronik/stempel.';
            } else if (val === 'standard') {
                layerHelpText.textContent = 'Mode "Gambar Langsung" membubuhi TTD langsung ke dalam stream konten PDF dasar. TTD mungkin tertutup oleh stempel/materai yang ditambahkan di atasnya.';
            } else if (val === 'flatten') {
                layerHelpText.textContent = 'Mode "Ratakan Form" akan menyatukan (flatten) semua kolom interaktif PDF & TTD menjadi satu lapisan statis. Sangat aman dari manipulasi lebih lanjut.';
            }
        });
    }

    // Save Signed PDF Action
    document.getElementById('btnSavePdf').addEventListener('click', compileAndDownloadPDF);

    // Click outside elements to deselect active signature overlay
    document.getElementById('pdfPagesContainer').addEventListener('pointerdown', (e) => {
        if (!e.target.closest('.draggable-signature') && !e.target.closest('.resize-handle')) {
            deselectAllElements();
        }
    });
}

// ==========================================================================
// 2. Logika Pemuatan & Rendering PDF (PDF.js)
// ==========================================================================

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        loadPdfFile(e.target.files[0]);
    }
}

function loadPdfFile(file) {
    state.pdfFileName = file.name;
    
    // Render doc stats
    document.getElementById('docName').textContent = file.name;
    document.getElementById('toolbarFilename').textContent = file.name;
    
    const sizeInKB = Math.round(file.size / 1024);
    const sizeText = sizeInKB > 1000 ? (sizeInKB / 1024).toFixed(1) + ' MB' : sizeInKB + ' KB';
    document.getElementById('docSize').textContent = sizeText;

    // Show Loader Box
    showLoader(true, "Membaca Dokumen PDF...");

    const reader = new FileReader();
    reader.onload = function(e) {
        state.pdfBytes = new Uint8Array(e.target.result);
        
        // Load PDF using PDFJS
        // Slice the buffer to prevent PDF.js from detaching/transferring the original ArrayBuffer to the worker
        const loadingTask = pdfjsLib.getDocument({ data: state.pdfBytes.slice(0) });
        loadingTask.promise.then(pdf => {
            state.pdfDocument = pdf;
            document.getElementById('docPages').textContent = pdf.numPages + ' Halaman';
            
            // Switch views
            document.getElementById('uploadDropzone').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('pdfViewerWrapper').classList.remove('hidden');
            
            showLoader(false);
            showToast('PDF Berhasil Dimuat!', 'success');
            
            // Render pages
            renderPdfPages();
        }).catch(err => {
            console.error('PDF.js Error:', err);
            showLoader(false);
            showToast('Gagal memproses file PDF. Pastikan file valid.', 'error');
        });
    };
    reader.readAsArrayBuffer(file);
}

async function renderPdfPages() {
    const container = document.getElementById('pdfPagesContainer');
    container.innerHTML = '';
    
    if (!state.pdfDocument) return;

    state.placedElements = [];
    updatePlacedElementsList();

    // Initialize history stack on PDF document load
    state.history = [[]];
    state.historyIndex = 0;
    updateHistoryButtons();

    const pagesCount = state.pdfDocument.numPages;
    
    for (let pageNum = 1; pageNum <= pagesCount; pageNum++) {
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'pdf-page-wrapper';
        pageWrapper.setAttribute('data-page-number', pageNum);
        pageWrapper.id = `page-wrapper-${pageNum}`;

        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        pageWrapper.appendChild(canvas);

        const overlayContainer = document.createElement('div');
        overlayContainer.className = 'page-overlay-container';
        pageWrapper.appendChild(overlayContainer);

        container.appendChild(pageWrapper);

        // Async render page
        await renderSinglePage(pageNum, canvas, pageWrapper);
    }
}

function renderSinglePage(pageNum, canvas, wrapper) {
    return state.pdfDocument.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: state.pdfScale });
        const ctx = canvas.getContext('2d');
        
        // High-DPI support to ensure crystal clear resolution
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        wrapper.style.width = viewport.width + 'px';
        wrapper.style.height = viewport.height + 'px';
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
        };
        
        return page.render(renderContext).promise;
    });
}

function adjustZoom(amount) {
    if (!state.pdfDocument) return;
    
    const nextZoom = state.pdfScale + amount;
    if (nextZoom < 0.5 || nextZoom > 2.5) return;
    
    // Capture positions relative to percentages before updating zoom
    const elementsCache = state.placedElements.map(el => {
        const parentWrapper = document.getElementById(`page-wrapper-${el.pageNum}`);
        const currentWidth = parentWrapper.clientWidth;
        const currentHeight = parentWrapper.clientHeight;
        return {
            id: el.id,
            pctX: el.x / currentWidth,
            pctY: el.y / currentHeight,
            pctW: el.width / currentWidth,
            pctH: el.height / currentHeight
        };
    });

    state.pdfScale = parseFloat(nextZoom.toFixed(1));
    document.getElementById('zoomVal').textContent = Math.round(state.pdfScale * 100) + '%';
    
    showLoader(true, "Menyesuaikan Zoom Halaman...");
    
    // Rerender all pages
    const promises = [];
    const wrappers = document.querySelectorAll('.pdf-page-wrapper');
    
    wrappers.forEach(wrapper => {
        const pageNum = parseInt(wrapper.getAttribute('data-page-number'));
        const canvas = wrapper.querySelector('.pdf-page-canvas');
        
        const promise = state.pdfDocument.getPage(pageNum).then(page => {
            const viewport = page.getViewport({ scale: state.pdfScale });
            const ctx = canvas.getContext('2d');
            
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            
            canvas.width = viewport.width * pixelRatio;
            canvas.height = viewport.height * pixelRatio;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            wrapper.style.width = viewport.width + 'px';
            wrapper.style.height = viewport.height + 'px';
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
                transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
            };
            return page.render(renderContext).promise;
        });
        promises.push(promise);
    });

    Promise.all(promises).then(() => {
        showLoader(false);
        
        // Recalculate placed signatures positions relative to the new page sizes
        elementsCache.forEach(cache => {
            const parentWrapper = document.getElementById(`page-wrapper-${cache.id.split('-')[0]}`);
            const newWidth = parentWrapper.clientWidth;
            const newHeight = parentWrapper.clientHeight;
            
            const elObj = state.placedElements.find(el => el.id === cache.id);
            if (elObj) {
                elObj.x = cache.pctX * newWidth;
                elObj.y = cache.pctY * newHeight;
                elObj.width = cache.pctW * newWidth;
                // Enforce exact original aspect ratio during zoom scaling to prevent drift/distortion
                elObj.height = elObj.width / (elObj.aspectRatio || (cache.pctW / cache.pctH));
                
                // Update DOM element directly
                const domEl = document.querySelector(`.draggable-signature[data-id="${cache.id}"]`);
                if (domEl) {
                    domEl.style.left = elObj.x + 'px';
                    domEl.style.top = elObj.y + 'px';
                    domEl.style.width = elObj.width + 'px';
                    domEl.style.height = elObj.height + 'px';
                }
            }
        });
    });
}

function resetToUploadZone() {
    state.pdfDocument = null;
    state.pdfBytes = null;
    state.placedElements = [];
    
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('uploadDropzone').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('pdfViewerWrapper').classList.add('hidden');
    
    deselectAllElements();
}

// ==========================================================================
// 3. Kanvas Menggambar Tanda Tangan (Signature Canvas Bezier Drawing)
// ==========================================================================

function setupSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    state.signatureCanvas = canvas;
    state.ctx = canvas.getContext('2d');
    
    // Set line endings to round for smooth handwriting feel
    state.ctx.lineCap = 'round';
    state.ctx.lineJoin = 'round';
    
    // Pointer Events support Mouse & Touch out of the box
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
}

function startDrawing(e) {
    e.preventDefault();
    state.isDrawing = true;
    
    const pos = getCanvasPointerPos(e);
    state.lastX = pos.x;
    state.lastY = pos.y;
    
    state.drawingPathPoints = [{ x: pos.x, y: pos.y }];
    
    state.ctx.beginPath();
    state.ctx.moveTo(state.lastX, state.lastY);
}

function draw(e) {
    if (!state.isDrawing) return;
    e.preventDefault();
    
    const pos = getCanvasPointerPos(e);
    state.drawingPathPoints.push({ x: pos.x, y: pos.y });

    // Drawing curve using quadratic curve to achieve extremely smooth ink strokes
    // Jagged pixels are avoided by drawing a bezier curve to the mid-point of the next stroke
    if (state.drawingPathPoints.length > 2) {
        state.ctx.clearRect(0, 0, state.signatureCanvas.width, state.signatureCanvas.height);
        
        // Redraw complete path with quadratic curves
        state.ctx.strokeStyle = state.brushColor;
        state.ctx.lineWidth = state.brushThickness;
        state.ctx.beginPath();
        state.ctx.moveTo(state.drawingPathPoints[0].x, state.drawingPathPoints[0].y);
        
        let i;
        for (i = 1; i < state.drawingPathPoints.length - 2; i++) {
            const xc = (state.drawingPathPoints[i].x + state.drawingPathPoints[i + 1].x) / 2;
            const yc = (state.drawingPathPoints[i].y + state.drawingPathPoints[i + 1].y) / 2;
            state.ctx.quadraticCurveTo(state.drawingPathPoints[i].x, state.drawingPathPoints[i].y, xc, yc);
        }
        
        // For the last 2 points
        if (i < state.drawingPathPoints.length - 1) {
            state.ctx.quadraticCurveTo(
                state.drawingPathPoints[i].x, 
                state.drawingPathPoints[i].y, 
                state.drawingPathPoints[i + 1].x, 
                state.drawingPathPoints[i + 1].y
            );
        }
        state.ctx.stroke();
    }
}

function stopDrawing() {
    state.isDrawing = false;
}

function getCanvasPointerPos(e) {
    const rect = state.signatureCanvas.getBoundingClientRect();
    
    // Translate screen pixels to canvas viewport bounds
    const scaleX = state.signatureCanvas.width / rect.width;
    const scaleY = state.signatureCanvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function clearSignatureCanvas() {
    state.ctx.clearRect(0, 0, state.signatureCanvas.width, state.signatureCanvas.height);
    state.drawingPathPoints = [];
}

// Utility: Trim empty (transparent) space around signature on canvas
function trimCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const len = pixels.data.length;
    let bound = {
        top: null,
        left: null,
        right: null,
        bottom: null
    };
    
    // Find first and last transparent bounding pixels
    for (let i = 0; i < len; i += 4) {
        if (pixels.data[i + 3] !== 0) { // Alpha channel is not transparent
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            
            if (bound.top === null) bound.top = y;
            if (bound.left === null) bound.left = x;
            else if (x < bound.left) bound.left = x;
            
            if (bound.right === null) bound.right = x;
            else if (x > bound.right) bound.right = x;
            
            if (bound.bottom === null) bound.bottom = y;
            else if (y > bound.bottom) bound.bottom = y;
        }
    }
    
    // If canvas is completely empty, don't crop
    if (bound.top === null) return canvas.toDataURL();
    
    // Create new temporary canvas with cropped boundary width
    const trimmedWidth = bound.right - bound.left + 1;
    const trimmedHeight = bound.bottom - bound.top + 1;
    
    // Pad slightly to prevent cropping exactly at edges
    const padding = 12;
    const finalWidth = trimmedWidth + (padding * 2);
    const finalHeight = trimmedHeight + (padding * 2);
    
    const copyCanvas = document.createElement('canvas');
    copyCanvas.width = finalWidth;
    copyCanvas.height = finalHeight;
    const copyCtx = copyCanvas.getContext('2d');
    
    copyCtx.drawImage(
        canvas, 
        bound.left, bound.top, trimmedWidth, trimmedHeight, 
        padding, padding, trimmedWidth, trimmedHeight
    );
    
    return copyCanvas.toDataURL('image/png');
}

function saveDrawnSignature() {
    if (state.drawingPathPoints.length === 0) {
        showToast('Gambar tanda tangan Anda terlebih dahulu!', 'error');
        return;
    }
    
    // Trim empty surrounding spaces
    const dataURL = trimCanvas(state.signatureCanvas);
    saveSignatureToCollection(dataURL);
    closeSignatureModal();
    showToast('Tanda tangan berhasil dibuat!', 'success');
}

// ==========================================================================
// 4. Modul Unggah Gambar & Penghapus Latar Belakang Otomatis
// ==========================================================================

function handleSignatureImageSelect(file) {
    if (!file.type.match('image.*')) {
        showToast('Unggah file gambar saja!', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            state.originalUploadedImage = img;
            
            // Set preview canvas dimensions
            const canvas = document.getElementById('sigPreviewCanvas');
            state.sigPreviewCanvas = canvas;
            state.previewCtx = canvas.getContext('2d');
            
            // Downscale image if it is too massive to prevent localstorage blockages
            let targetWidth = img.width;
            let targetHeight = img.height;
            const maxDimension = 600;
            
            if (img.width > maxDimension || img.height > maxDimension) {
                if (img.width > img.height) {
                    targetWidth = maxDimension;
                    targetHeight = (img.height * maxDimension) / img.width;
                } else {
                    targetHeight = maxDimension;
                    targetWidth = (img.width * maxDimension) / img.height;
                }
            }
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            // Draw image initially
            state.previewCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // Hide placeholder, show container
            document.getElementById('sigUploadPlaceholder').classList.add('hidden');
            document.getElementById('sigPreviewContainer').classList.remove('hidden');
            document.getElementById('btnResetUploadSig').classList.remove('hidden');
            
            // Enable save button
            const saveBtn = document.getElementById('btnSaveUploadedSignature');
            saveBtn.classList.remove('disabled');
            saveBtn.removeAttribute('disabled');
            
            // Run automatic chroma key transparency
            const defaultThreshold = parseInt(document.getElementById('bgThreshold').value);
            applyChromaKeyBackgroundRemoval(defaultThreshold);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function applyChromaKeyBackgroundRemoval(threshold) {
    if (!state.originalUploadedImage) return;
    
    const canvas = state.sigPreviewCanvas;
    const ctx = state.previewCtx;
    const img = state.originalUploadedImage;
    
    // Redraw fresh copy of image first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Pixel-level keying to remove off-white background paper seamlessly
    // Math.min/Math.max is calculated to measure proximity of each pixel to white color (255)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Find distance to pure white
        const diff = 255 - Math.min(r, g, b);
        
        if (diff < threshold) {
            // Remove completely
            data[i+3] = 0;
        } else if (diff < threshold * 2.5) {
            // Feather opacity smoothly near edges for ultra-premium anti-aliased integration!
            const ratio = (diff - threshold) / (threshold * 1.5);
            data[i+3] = Math.max(0, Math.min(255, ratio * 255));
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
}

function resetSignatureUpload() {
    state.originalUploadedImage = null;
    document.getElementById('sigImageInput').value = '';
    
    document.getElementById('sigUploadPlaceholder').classList.remove('hidden');
    document.getElementById('sigPreviewContainer').classList.add('hidden');
    document.getElementById('btnResetUploadSig').classList.add('hidden');
    
    const saveBtn = document.getElementById('btnSaveUploadedSignature');
    saveBtn.classList.add('disabled');
    saveBtn.setAttribute('disabled', 'true');
}

function saveUploadedSignature() {
    if (!state.originalUploadedImage) return;
    
    // Trim signature to borders
    const trimmedDataURL = trimCanvas(state.sigPreviewCanvas);
    
    saveSignatureToCollection(trimmedDataURL);
    closeSignatureModal();
    resetSignatureUpload();
    showToast('Tanda tangan berhasil diunggah!', 'success');
}

// ==========================================================================
// 4.5 Modul Ekstraksi Tanda Tangan dari Dokumen PDF/Gambar (Interactive Crop & Remove Background)
// ==========================================================================

function handleExtractFileSelect(file) {
    if (!file) return;
    
    // Reset any previous state first
    resetSignatureExtraction();
    
    // Check if it's a PDF or Image
    if (file.type === 'application/pdf') {
        state.extractFileType = 'pdf';
        
        showLoader(true, "Membaca Dokumen Ekstraksi...");
        const reader = new FileReader();
        reader.onload = function(e) {
            state.extractPdfBytes = new Uint8Array(e.target.result);
            
            // slice to prevent transfer detached buffer issues
            const loadingTask = pdfjsLib.getDocument({ data: state.extractPdfBytes.slice(0) });
            loadingTask.promise.then(pdf => {
                state.extractPdfDoc = pdf;
                state.extractPageNum = 1;
                state.extractTotalPages = pdf.numPages;
                
                // Show page nav
                document.getElementById('extractPageNav').classList.remove('hidden');
                
                // Show editor workspace
                document.getElementById('extractUploadPlaceholder').classList.add('hidden');
                document.getElementById('extractEditorContainer').classList.remove('hidden');
                document.getElementById('btnResetExtract').classList.remove('hidden');
                
                // Enable button save
                const saveBtn = document.getElementById('btnSaveExtractedSignature');
                saveBtn.classList.remove('disabled');
                saveBtn.removeAttribute('disabled');
                
                showLoader(false);
                renderExtractWorkspace();
                
                // Bind interactions once when workspace loads
                initExtractCropInteractions();
            }).catch(err => {
                console.error('Extraction PDF Load Error:', err);
                showLoader(false);
                showToast('Gagal membaca PDF ekstraksi. Pastikan file valid.', 'error');
            });
        };
        reader.readAsArrayBuffer(file);
        
    } else if (file.type.match('image.*')) {
        state.extractFileType = 'image';
        
        showLoader(true, "Membaca Gambar Ekstraksi...");
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                state.extractOriginalImage = img;
                
                // Hide page nav (not needed for images)
                document.getElementById('extractPageNav').classList.add('hidden');
                
                // Show editor workspace
                document.getElementById('extractUploadPlaceholder').classList.add('hidden');
                document.getElementById('extractEditorContainer').classList.remove('hidden');
                document.getElementById('btnResetExtract').classList.remove('hidden');
                
                // Enable button save
                const saveBtn = document.getElementById('btnSaveExtractedSignature');
                saveBtn.classList.remove('disabled');
                saveBtn.removeAttribute('disabled');
                
                showLoader(false);
                renderExtractWorkspace();
                
                // Bind interactions once when workspace loads
                initExtractCropInteractions();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        showToast('Tipe file tidak didukung! Pilih PDF atau Gambar.', 'error');
    }
}

function resetSignatureExtraction() {
    state.extractPdfDoc = null;
    state.extractPdfBytes = null;
    state.extractPageNum = 1;
    state.extractTotalPages = 1;
    state.extractOriginalImage = null;
    state.extractFileType = null;
    state.extractImageSrc = null;
    
    const fileInput = document.getElementById('extractFileInput');
    if (fileInput) fileInput.value = '';
    
    const placeholder = document.getElementById('extractUploadPlaceholder');
    const editor = document.getElementById('extractEditorContainer');
    const resetBtn = document.getElementById('btnResetExtract');
    const saveBtn = document.getElementById('btnSaveExtractedSignature');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (editor) editor.classList.add('hidden');
    if (resetBtn) resetBtn.classList.add('hidden');
    
    if (saveBtn) {
        saveBtn.classList.add('disabled');
        saveBtn.setAttribute('disabled', 'true');
    }
}

function navigateExtractPage(dir) {
    if (!state.extractPdfDoc) return;
    
    const targetPage = state.extractPageNum + dir;
    if (targetPage < 1 || targetPage > state.extractTotalPages) return;
    
    state.extractPageNum = targetPage;
    renderExtractWorkspace();
}

function renderExtractWorkspace() {
    const canvas = document.getElementById('extractCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const threshold = parseInt(document.getElementById('extractBgThreshold').value || '30');
    
    if (state.extractFileType === 'pdf' && state.extractPdfDoc) {
        document.getElementById('extractPageIndicator').textContent = `Halaman ${state.extractPageNum} dari ${state.extractTotalPages}`;
        
        showLoader(true, "Merender Halaman PDF...");
        state.extractPdfDoc.getPage(state.extractPageNum).then(page => {
            // Render viewport with high quality
            const viewport = page.getViewport({ scale: 1.5 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            page.render(renderContext).promise.then(() => {
                // Apply transparency/chroma key to the rendered page pixels if threshold > 0
                if (threshold > 0) {
                    applyExtractChromaKey(canvas, ctx, threshold);
                }
                showLoader(false);
            });
        }).catch(err => {
            console.error("Gagal rendering extract page:", err);
            showLoader(false);
        });
        
    } else if (state.extractFileType === 'image' && state.extractOriginalImage) {
        const img = state.extractOriginalImage;
        
        // Fit image nicely into preview canvas
        let targetWidth = img.width;
        let targetHeight = img.height;
        const maxDimension = 700;
        
        if (img.width > maxDimension || img.height > maxDimension) {
            if (img.width > img.height) {
                targetWidth = maxDimension;
                targetHeight = (img.height * maxDimension) / img.width;
            } else {
                targetHeight = maxDimension;
                targetWidth = (img.width * maxDimension) / img.height;
            }
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        if (threshold > 0) {
            applyExtractChromaKey(canvas, ctx, threshold);
        }
    }
}

function applyExtractChromaKey(canvas, ctx, threshold) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Pixel-level keying to remove white backgrounds seamlessly
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Find distance to pure white
        const diff = 255 - Math.min(r, g, b);
        
        if (diff < threshold) {
            data[i+3] = 0; // Transparent
        } else if (diff < threshold * 2.5) {
            // Feather transparency smoothly
            const ratio = (diff - threshold) / (threshold * 1.5);
            data[i+3] = Math.max(0, Math.min(255, ratio * 255));
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
}

// Global variable to keep track of crop box state
let extractCropState = {
    isDraggingBox: false,
    isResizingBox: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0
};

function initExtractCropInteractions() {
    const cropBox = document.getElementById('extractCropBox');
    const resizeHandle = document.getElementById('extractResizeHandle');
    const cropWrapper = document.getElementById('extractCropWrapper');
    
    if (!cropBox || !resizeHandle || !cropWrapper) return;
    
    // Set default initial crop box position and size
    cropBox.style.width = '160px';
    cropBox.style.height = '80px';
    cropBox.style.left = '30px';
    cropBox.style.top = '30px';
    
    // Pointerdown for dragging
    cropBox.addEventListener('pointerdown', (e) => {
        if (e.target === resizeHandle) return; // ignore resize handle clicks
        
        e.preventDefault();
        cropBox.setPointerCapture(e.pointerId);
        extractCropState.isDraggingBox = true;
        
        extractCropState.startX = e.clientX;
        extractCropState.startY = e.clientY;
        extractCropState.startLeft = parseInt(cropBox.style.left || '0');
        extractCropState.startTop = parseInt(cropBox.style.top || '0');
    });
    
    // Pointerdown for resizing
    resizeHandle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizeHandle.setPointerCapture(e.pointerId);
        extractCropState.isResizingBox = true;
        
        extractCropState.startX = e.clientX;
        extractCropState.startY = e.clientY;
        extractCropState.startWidth = parseInt(cropBox.style.width || '100');
        extractCropState.startHeight = parseInt(cropBox.style.height || '50');
    });
    
    // Pointermove for both
    cropBox.addEventListener('pointermove', (e) => {
        if (extractCropState.isDraggingBox) {
            const dx = e.clientX - extractCropState.startX;
            const dy = e.clientY - extractCropState.startY;
            
            let newLeft = extractCropState.startLeft + dx;
            let newTop = extractCropState.startTop + dy;
            
            // Constrain within cropWrapper/canvas bounds
            const maxLeft = cropWrapper.clientWidth - parseInt(cropBox.style.width);
            const maxTop = cropWrapper.clientHeight - parseInt(cropBox.style.height);
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            cropBox.style.left = newLeft + 'px';
            cropBox.style.top = newTop + 'px';
        }
    });
    
    resizeHandle.addEventListener('pointermove', (e) => {
        if (extractCropState.isResizingBox) {
            const dx = e.clientX - extractCropState.startX;
            const dy = e.clientY - extractCropState.startY;
            
            let newWidth = extractCropState.startWidth + dx;
            let newHeight = extractCropState.startHeight + dy;
            
            // Constrain min size
            newWidth = Math.max(40, newWidth);
            newHeight = Math.max(20, newHeight);
            
            // Constrain within wrapper bounds
            const left = parseInt(cropBox.style.left || '0');
            const top = parseInt(cropBox.style.top || '0');
            
            if (left + newWidth > cropWrapper.clientWidth) {
                newWidth = cropWrapper.clientWidth - left;
            }
            if (top + newHeight > cropWrapper.clientHeight) {
                newHeight = cropWrapper.clientHeight - top;
            }
            
            cropBox.style.width = newWidth + 'px';
            cropBox.style.height = newHeight + 'px';
        }
    });
    
    // Pointerup release capture
    cropBox.addEventListener('pointerup', (e) => {
        if (extractCropState.isDraggingBox) {
            extractCropState.isDraggingBox = false;
            cropBox.releasePointerCapture(e.pointerId);
        }
    });
    
    resizeHandle.addEventListener('pointerup', (e) => {
        if (extractCropState.isResizingBox) {
            extractCropState.isResizingBox = false;
            resizeHandle.releasePointerCapture(e.pointerId);
        }
    });
}

function saveExtractedSignature() {
    const canvas = document.getElementById('extractCanvas');
    const cropBox = document.getElementById('extractCropBox');
    const cropWrapper = document.getElementById('extractCropWrapper');
    
    if (!canvas || !cropBox || !cropWrapper) return;
    
    // Get crop dimensions
    const left = parseInt(cropBox.style.left || '0');
    const top = parseInt(cropBox.style.top || '0');
    const width = parseInt(cropBox.style.width || '100');
    const height = parseInt(cropBox.style.height || '50');
    
    // Check if bounds are correct
    if (width <= 0 || height <= 0) {
        showToast('Pilih area crop yang valid!', 'error');
        return;
    }
    
    // Render cropped portion to temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // We need to scale crop coordinates to match the actual backing store canvas resolution (which is at 100% css width but fits scale)
    const scaleX = canvas.width / cropWrapper.clientWidth;
    const scaleY = canvas.height / cropWrapper.clientHeight;
    
    tempCtx.drawImage(
        canvas,
        left * scaleX, top * scaleY, width * scaleX, height * scaleY,
        0, 0, width, height
    );
    
    // Trim empty boundaries around cropped area to get a perfectly aligned bounding box!
    const trimmedDataURL = trimCanvas(tempCanvas);
    
    // Save to localStorage collection
    saveSignatureToCollection(trimmedDataURL);
    
    closeSignatureModal();
    resetSignatureExtraction();
    showToast('Tanda tangan berhasil diambil dari dokumen!', 'success');
}

// ==========================================================================
// 5. Pengelolaan Koleksi Tanda Tangan (localStorage)
// ==========================================================================

function loadSavedSignatures() {
    const local = localStorage.getItem('signflow_saved_sigs');
    if (local) {
        state.savedSignatures = JSON.parse(local);
    } else {
        state.savedSignatures = [];
    }
    renderSavedSignaturesGrid();
}

function saveSignatureToCollection(base64Image) {
    state.savedSignatures.unshift(base64Image); // Add at top
    // Limit stored signature images to 8 max to protect localStorage size quota
    if (state.savedSignatures.length > 8) {
        state.savedSignatures.pop();
    }
    localStorage.setItem('signflow_saved_sigs', JSON.stringify(state.savedSignatures));
    renderSavedSignaturesGrid();
}

function renderSavedSignaturesGrid() {
    const grid = document.getElementById('savedSignaturesGrid');
    grid.innerHTML = '';
    
    if (state.savedSignatures.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'signature-placeholder';
        placeholder.id = 'noSavedSignatures';
        placeholder.textContent = 'Belum ada tanda tangan. Klik tombol di bawah untuk membuat.';
        grid.appendChild(placeholder);
        return;
    }
    
    state.savedSignatures.forEach((sigSrc, index) => {
        const thumbCard = document.createElement('div');
        thumbCard.className = 'signature-thumbnail-card';
        
        const img = document.createElement('img');
        img.src = sigSrc;
        img.alt = `Tanda Tangan ${index + 1}`;
        thumbCard.appendChild(img);
        
        // Quick add action on thumbnail click
        thumbCard.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return; // Avoid triggering when delete clicked
            placeSignatureOnActivePage(sigSrc);
        });

        // Delete thumbnail button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Hapus';
        delBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSavedSignature(index);
        });
        
        thumbCard.appendChild(delBtn);
        grid.appendChild(thumbCard);
    });
}

function deleteSavedSignature(index) {
    state.savedSignatures.splice(index, 1);
    localStorage.setItem('signflow_saved_sigs', JSON.stringify(state.savedSignatures));
    renderSavedSignaturesGrid();
    showToast('Tanda tangan dihapus dari koleksi.', 'info');
}

// ==========================================================================
// 6. Penempatan, Penyeretan & Penskalaan Tanda Tangan di PDF (Interaction Layer)
// ==========================================================================

function placeSignatureOnActivePage(imageSrc) {
    if (!state.pdfDocument) return;

    // Pre-load the signature image to dynamically determine its aspect ratio and avoid stretching/distortion
    const imgTemp = new Image();
    imgTemp.onload = function() {
        const originalWidth = imgTemp.naturalWidth || 150;
        const originalHeight = imgTemp.naturalHeight || 75;
        const imageAspectRatio = originalWidth / originalHeight;

        // Maintain the original aspect ratio with a beautiful, balanced default width (e.g. 150px)
        const defaultWidth = 150;
        const defaultHeight = defaultWidth / imageAspectRatio;

        // Detect currently visible page in PDF scrollview to place signature on
        const targetPageNum = detectVisiblePageNum();
        const overlay = document.querySelector(`#page-wrapper-${targetPageNum} .page-overlay-container`);
        
        if (!overlay) return;

        state.elementCounter++;
        const elementId = `${targetPageNum}-${state.elementCounter}`;

        // Set position at middle of target viewport
        const leftPos = Math.max(20, (overlay.clientWidth - defaultWidth) / 2);
        const topPos = Math.max(20, (overlay.clientHeight - defaultHeight) / 2);

        // Create element DOM
        const sigEl = document.createElement('div');
        sigEl.className = 'draggable-signature';
        sigEl.setAttribute('data-id', elementId);
        sigEl.style.width = defaultWidth + 'px';
        sigEl.style.height = defaultHeight + 'px';
        sigEl.style.left = leftPos + 'px';
        sigEl.style.top = topPos + 'px';

        const img = document.createElement('img');
        img.src = imageSrc;
        sigEl.appendChild(img);

        // Delete bubble
        const delBtn = document.createElement('button');
        delBtn.className = 'action-bubble bubble-delete';
        delBtn.title = 'Hapus';
        delBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removePlacedElement(elementId);
        });
        sigEl.appendChild(delBtn);

        // Duplicate bubble
        const dupBtn = document.createElement('button');
        dupBtn.className = 'action-bubble bubble-duplicate';
        dupBtn.title = 'Duplikat';
        dupBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicatePlacedElement(elementId);
        });
        sigEl.appendChild(dupBtn);

        // Rotate bubble
        const rotBtn = document.createElement('button');
        rotBtn.className = 'action-bubble bubble-rotate';
        rotBtn.title = 'Putar 90°';
        rotBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
        `;
        rotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rotatePlacedElement(elementId);
        });
        sigEl.appendChild(rotBtn);

        // Resize circle handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        sigEl.appendChild(resizeHandle);

        overlay.appendChild(sigEl);

        // Track active placing element
        const elObj = {
            id: elementId,
            imageSrc: imageSrc,
            pageNum: targetPageNum,
            x: leftPos,
            y: topPos,
            width: defaultWidth,
            height: defaultHeight,
            aspectRatio: imageAspectRatio
        };
        state.placedElements.push(elObj);
        saveHistoryState();
        
        // Bind interaction logic
        setupDragAndResize(sigEl, elObj, overlay);
        
        // Set active element focus
        setActiveElement(elementId);
        updatePlacedElementsList();
        
        showToast('Tanda tangan ditambahkan ke halaman ' + targetPageNum, 'info');
    };
    imgTemp.src = imageSrc;
}

function detectVisiblePageNum() {
    const container = document.getElementById('pdfPagesContainer');
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    const wrappers = document.querySelectorAll('.pdf-page-wrapper');
    let visiblePageNum = 1;
    let maxVisibleHeight = 0;
    
    wrappers.forEach(wrapper => {
        const rectTop = wrapper.offsetTop - container.offsetTop;
        const rectBottom = rectTop + wrapper.clientHeight;
        
        // Calculate overlapping visible height of the page wrapper inside scroll viewport
        const visibleTop = Math.max(containerScrollTop, rectTop);
        const visibleBottom = Math.min(containerScrollTop + containerHeight, rectBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        
        if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            visiblePageNum = parseInt(wrapper.getAttribute('data-page-number'));
        }
    });
    
    return visiblePageNum;
}

function setupDragAndResize(domEl, elObj, overlay) {
    const resizeHandle = domEl.querySelector('.resize-handle');
    
    let isDragging = false;
    let isResizing = false;
    
    let startPointerX = 0;
    let startPointerY = 0;
    
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    
    // Ratio to maintain correct shape during corners resize
    const aspectRatio = elObj.aspectRatio || (elObj.width / elObj.height);

    // Pointer events are perfect for both mouse click & mobile gestures
    domEl.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('action-bubble') || e.target.classList.contains('resize-handle')) return;
        
        e.preventDefault();
        setActiveElement(elObj.id);
        
        isDragging = true;
        domEl.setPointerCapture(e.pointerId);
        
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startX = elObj.x;
        startY = elObj.y;
    });

    resizeHandle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Avoid triggering drag on element itself
        setActiveElement(elObj.id);
        
        isResizing = true;
        resizeHandle.setPointerCapture(e.pointerId);
        
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startW = elObj.width;
        startH = elObj.height;
    });

    // Global listeners for movement
    domEl.addEventListener('pointermove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startPointerX;
            const dy = e.clientY - startPointerY;
            
            let newX = startX + dx;
            let newY = startY + dy;
            
            // Constrain signature inside parent PDF page edges bounds
            const maxX = overlay.clientWidth - elObj.width;
            const maxY = overlay.clientHeight - elObj.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            elObj.x = newX;
            elObj.y = newY;
            
            domEl.style.left = newX + 'px';
            domEl.style.top = newY + 'px';
        }
    });

    resizeHandle.addEventListener('pointermove', (e) => {
        if (isResizing) {
            const dx = e.clientX - startPointerX;
            
            // Read active ratio dynamically in case it was rotated
            const currentAspectRatio = elObj.aspectRatio || (elObj.width / elObj.height);
            
            // Keep aspect ratio
            let newW = startW + dx;
            let newH = newW / currentAspectRatio;
            
            // Constrain bounds (min 40px, max to match page edges)
            newW = Math.max(40, newW);
            newH = newW / currentAspectRatio;
            
            if (elObj.x + newW > overlay.clientWidth) {
                newW = overlay.clientWidth - elObj.x;
                newH = newW / currentAspectRatio;
            }
            if (elObj.y + newH > overlay.clientHeight) {
                newH = overlay.clientHeight - elObj.y;
                newW = newH * currentAspectRatio;
            }
            
            elObj.width = newW;
            elObj.height = newH;
            
            domEl.style.width = newW + 'px';
            domEl.style.height = newH + 'px';
        }
    });

    // Release captures
    domEl.addEventListener('pointerup', (e) => {
        if (isDragging) {
            isDragging = false;
            domEl.releasePointerCapture(e.pointerId);
            saveHistoryState();
        }
    });

    resizeHandle.addEventListener('pointerup', (e) => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.releasePointerCapture(e.pointerId);
            saveHistoryState();
        }
    });
}

function setActiveElement(id) {
    state.activeElementId = id;
    
    // Reset other active UI elements styling
    document.querySelectorAll('.draggable-signature').forEach(el => {
        el.classList.remove('active');
    });
    
    const activeDom = document.querySelector(`.draggable-signature[data-id="${id}"]`);
    if (activeDom) {
        activeDom.classList.add('active');
    }
}

function deselectAllElements() {
    state.activeElementId = null;
    document.querySelectorAll('.draggable-signature').forEach(el => {
        el.classList.remove('active');
    });
}

function removePlacedElement(id) {
    const elIndex = state.placedElements.findIndex(el => el.id === id);
    if (elIndex !== -1) {
        state.placedElements.splice(elIndex, 1);
    }
    
    const dom = document.querySelector(`.draggable-signature[data-id="${id}"]`);
    if (dom) {
        dom.remove();
    }
    
    if (state.activeElementId === id) {
        state.activeElementId = null;
    }
    
    updatePlacedElementsList();
    saveHistoryState();
    showToast('Tanda tangan dihapus dari halaman.', 'info');
}

function duplicatePlacedElement(id) {
    const original = state.placedElements.find(el => el.id === id);
    if (!original) return;
    
    const overlay = document.querySelector(`#page-wrapper-${original.pageNum} .page-overlay-container`);
    if (!overlay) return;
    
    state.elementCounter++;
    const newId = `${original.pageNum}-${state.elementCounter}`;
    
    // Shift duplicate slightly lower & to the right
    let newX = original.x + 20;
    let newY = original.y + 20;
    
    // Bounds check
    if (newX + original.width > overlay.clientWidth) newX = 20;
    if (newY + original.height > overlay.clientHeight) newY = 20;
    
    const sigEl = document.createElement('div');
    sigEl.className = 'draggable-signature';
    sigEl.setAttribute('data-id', newId);
    sigEl.style.width = original.width + 'px';
    sigEl.style.height = original.height + 'px';
    sigEl.style.left = newX + 'px';
    sigEl.style.top = newY + 'px';

    const img = document.createElement('img');
    img.src = original.imageSrc;
    sigEl.appendChild(img);

    const delBtn = document.createElement('button');
    delBtn.className = 'action-bubble bubble-delete';
    delBtn.title = 'Hapus';
    delBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePlacedElement(newId);
    });
    sigEl.appendChild(delBtn);

    const dupBtn = document.createElement('button');
    dupBtn.className = 'action-bubble bubble-duplicate';
    dupBtn.title = 'Duplikat';
    dupBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    `;
    dupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        duplicatePlacedElement(newId);
    });
    sigEl.appendChild(dupBtn);

    // Rotate bubble
    const rotBtn = document.createElement('button');
    rotBtn.className = 'action-bubble bubble-rotate';
    rotBtn.title = 'Putar 90°';
    rotBtn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
    `;
    rotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        rotatePlacedElement(newId);
    });
    sigEl.appendChild(rotBtn);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    sigEl.appendChild(resizeHandle);

    overlay.appendChild(sigEl);

    const elObj = {
        id: newId,
        imageSrc: original.imageSrc,
        pageNum: original.pageNum,
        x: newX,
        y: newY,
        width: original.width,
        height: original.height,
        aspectRatio: original.aspectRatio
    };
    
    state.placedElements.push(elObj);
    saveHistoryState();
    setupDragAndResize(sigEl, elObj, overlay);
    setActiveElement(newId);
    updatePlacedElementsList();
}

function updatePlacedElementsList() {
    const listContainer = document.getElementById('placedElementsList');
    listContainer.innerHTML = '';
    
    if (state.placedElements.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'elements-placeholder';
        placeholder.textContent = 'Belum ada tanda tangan yang ditempel di halaman PDF.';
        listContainer.appendChild(placeholder);
        return;
    }
    
    // Sort items by page numbers for neat structured organization
    const sorted = [...state.placedElements].sort((a, b) => a.pageNum - b.pageNum);
    
    sorted.forEach(el => {
        const item = document.createElement('div');
        item.className = 'element-item';
        
        const info = document.createElement('div');
        info.className = 'element-item-info';
        info.innerHTML = `
            <span class="element-item-badge">Hal ${el.pageNum}</span>
            <span>Tanda Tangan</span>
        `;
        
        // Click item scroll to focus
        item.addEventListener('click', () => {
            setActiveElement(el.id);
            const targetWrapper = document.getElementById(`page-wrapper-${el.pageNum}`);
            if (targetWrapper) {
                targetWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete-element';
        delBtn.title = 'Hapus';
        delBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removePlacedElement(el.id);
        });
        
        item.appendChild(info);
        item.appendChild(delBtn);
        listContainer.appendChild(item);
    });
}

// ==========================================================================
// 7. Penyusunan PDF & Unduhan (pdf-lib Integration)
// ==========================================================================

async function compileAndDownloadPDF() {
    if (!state.pdfDocument) return;
    
    if (state.placedElements.length === 0) {
        showToast('Tempel minimal satu tanda tangan pada dokumen terlebih dahulu!', 'error');
        return;
    }

    showProcessingOverlay(true, "Menyusun Dokumen PDF...");

    try {
        // Load original PDF using pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(state.pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Get selected layering mode
        const layeringMode = document.getElementById('selectLayerMode')?.value || 'annot';
        
        // Loop through placed elements
        for (const el of state.placedElements) {
            const pageIndex = el.pageNum - 1;
            if (pageIndex >= pages.length) continue;
            
            const page = pages[pageIndex];
            
            // Get original sizes in PDF points
            const { width: pdfWidth, height: pdfHeight } = page.getSize();
            
            // Get matching HTML wrapper element coordinates size
            const wrapper = document.getElementById(`page-wrapper-${el.pageNum}`);
            const htmlWidth = wrapper.clientWidth;
            const htmlHeight = wrapper.clientHeight;
            
            // Convert PNG base64 to arrayBuffer bytes for embedding
            const base64Data = el.imageSrc.split(',')[1];
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Embed PNG signature image
            const signatureImage = await pdfDoc.embedPng(bytes);
            
            // Compute scaling ratios between points & pixels
            const scaleX = pdfWidth / htmlWidth;
            const scaleY = pdfHeight / htmlHeight;
            
            // Calculate aspect ratio using the actual embedded image dimensions
            const imgRatio = signatureImage.width / signatureImage.height;
            
            // Set base dimensions in PDF points
            const targetWidth = el.width * scaleX;
            // Enforce aspect ratio using image ratio directly to prevent any distortion in output PDF
            const targetHeight = targetWidth / imgRatio;
            
            // Translate coordinates (HTML origin top-left to PDF origin bottom-left!)
            const targetX = el.x * scaleX;
            // The top of element in PDF coordinates is computed from bottom
            const targetY = (htmlHeight - el.y) * scaleY - targetHeight;
            
            if (layeringMode === 'annot' || layeringMode === 'flatten') {
                // Technique 2: Create a Button Field widget to place signature in the Annotation Layer (Z-Index fix)
                const form = pdfDoc.getForm();
                const buttonFieldId = `sig-button-${el.pageNum}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const button = form.createButton(buttonFieldId);
                
                button.addToPage('', page, {
                    x: targetX,
                    y: targetY,
                    width: targetWidth,
                    height: targetHeight,
                    borderWidth: 0
                });
                
                button.setImage(signatureImage, PDFLib.ImageAlignment.Center);
                button.enableReadOnly();
            } else {
                // Technique 1: Draw image directly on the content stream (Standard/Default)
                page.drawImage(signatureImage, {
                    x: targetX,
                    y: targetY,
                    width: targetWidth,
                    height: targetHeight
                });
            }
        }
        
        // If flatten mode, flatten form fields after placing all elements
        if (layeringMode === 'flatten') {
            try {
                const form = pdfDoc.getForm();
                form.flatten();
            } catch (formError) {
                console.warn("Gagal meratakan form:", formError);
            }
        }
        
        // Save bytes
        const modifiedPdfBytes = await pdfDoc.save();
        
        // Generate blob and trigger file download
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        // Create matching clean download name
        const cleanName = state.pdfFileName.toLowerCase().endsWith('.pdf') 
            ? state.pdfFileName.substring(0, state.pdfFileName.length - 4)
            : state.pdfFileName;
        
        a.download = `${cleanName}_signed.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        showProcessingOverlay(false);
        showToast('PDF Berhasil Ditandatangani & Diunduh!', 'success');
        
    } catch (error) {
        console.error('pdf-lib Compile Error:', error);
        showProcessingOverlay(false);
        showToast('Gagal menyusun PDF: ' + error.message, 'error');
    }
}

// ==========================================================================
// 8. Tampilan Modal & Pembantu UI
// ==========================================================================

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    modal.classList.remove('hidden');
    
    // Automatically switch to first tab
    switchTab('tab-draw');
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    modal.classList.add('hidden');
    
    // Reset states
    clearSignatureCanvas();
    resetSignatureUpload();
    resetSignatureExtraction();
}

function switchTab(tabId) {
    // Buttons active state
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Content active state
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });

    // Toggle modal size for wider workspace on extraction tab
    const modalContainer = document.querySelector('#signatureModal .modal-container');
    if (modalContainer) {
        if (tabId === 'tab-extract') {
            modalContainer.classList.add('modal-large');
        } else {
            modalContainer.classList.remove('modal-large');
        }
    }
    
    // Redraw signature layout coordinates when tab is drawn to avoid canvas width mismatches
    if (tabId === 'tab-draw') {
        clearSignatureCanvas();
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="12" x2="12" y2="12"></line><line x1="12" y1="16" x2="12" y2="16"></line><path d="M12 8v4"></path></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after animation completes
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function showLoader(show, message = "Memuat Halaman...") {
    // Using a loader inside page rendering area or simple overlays
    const loadingEl = document.getElementById('viewerLoading');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('hidden');
            loadingEl.querySelector('p').textContent = message;
        } else {
            loadingEl.classList.add('hidden');
        }
    }
}

function showProcessingOverlay(show, message = "Membuat Dokumen PDF Baru...") {
    const overlay = document.getElementById('processingOverlay');
    const textEl = document.getElementById('processingText');
    
    if (show) {
        textEl.textContent = message;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// ==========================================================================
// 8. Sistem Riwayat (History - Undo/Redo) & Rotasi Tanda Tangan
// ==========================================================================

function rotateImage90Degrees(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalHeight;
            canvas.height = img.naturalWidth;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(imageSrc);
                return;
            }
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2); // 90 degrees clockwise
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
    });
}

async function rotatePlacedElement(id) {
    const elIndex = state.placedElements.findIndex(el => el.id === id);
    if (elIndex === -1) return;
    
    const el = state.placedElements[elIndex];
    
    // Rotate the image source using pixel-based canvas transformation
    const rotatedSrc = await rotateImage90Degrees(el.imageSrc);
    
    // Swap dimensions
    const oldWidth = el.width;
    const oldHeight = el.height;
    
    el.imageSrc = rotatedSrc;
    el.width = oldHeight;
    el.height = oldWidth;
    el.aspectRatio = 1 / el.aspectRatio; // Reciprocal aspect ratio
    
    // Update DOM
    const sigEl = document.querySelector(`.draggable-signature[data-id="${id}"]`);
    if (sigEl) {
        sigEl.style.width = el.width + 'px';
        sigEl.style.height = el.height + 'px';
        const img = sigEl.querySelector('img');
        if (img) img.src = rotatedSrc;
    }
    
    saveHistoryState();
    showToast('Tanda tangan diputar 90°', 'info');
}

function saveHistoryState() {
    // If the index is not at the end of the history stack, discard subsequent states
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }
    
    // Deep clone the placedElements array
    const snapshot = JSON.parse(JSON.stringify(state.placedElements));
    state.history.push(snapshot);
    state.historyIndex++;
    
    // Limit history stack size to 50 entries
    if (state.history.length > 50) {
        state.history.shift();
        state.historyIndex--;
    }
    
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    
    if (btnUndo) {
        btnUndo.disabled = state.historyIndex <= 0;
        if (state.historyIndex <= 0) {
            btnUndo.classList.add('disabled');
        } else {
            btnUndo.classList.remove('disabled');
        }
    }
    
    if (btnRedo) {
        btnRedo.disabled = state.historyIndex >= state.history.length - 1;
        if (state.historyIndex >= state.history.length - 1) {
            btnRedo.classList.add('disabled');
        } else {
            btnRedo.classList.remove('disabled');
        }
    }
}

function undo() {
    if (state.historyIndex <= 0) return;
    
    state.historyIndex--;
    applyHistoryState(state.history[state.historyIndex]);
}

function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    
    state.historyIndex++;
    applyHistoryState(state.history[state.historyIndex]);
}

function applyHistoryState(elementsSnapshot) {
    // 1. Update elements array
    state.placedElements = JSON.parse(JSON.stringify(elementsSnapshot));
    
    // 2. Remove all current interactive elements from DOM
    document.querySelectorAll('.draggable-signature').forEach(el => el.remove());
    
    // 3. Re-render each element from snapshot
    state.placedElements.forEach(el => {
        const overlay = document.querySelector(`#page-wrapper-${el.pageNum} .page-overlay-container`);
        if (!overlay) return;
        
        // Recreate sigEl
        const sigEl = document.createElement('div');
        sigEl.className = 'draggable-signature';
        sigEl.setAttribute('data-id', el.id);
        sigEl.style.width = el.width + 'px';
        sigEl.style.height = el.height + 'px';
        sigEl.style.left = el.x + 'px';
        sigEl.style.top = el.y + 'px';
        
        const img = document.createElement('img');
        img.src = el.imageSrc;
        sigEl.appendChild(img);
        
        // Delete bubble
        const delBtn = document.createElement('button');
        delBtn.className = 'action-bubble bubble-delete';
        delBtn.title = 'Hapus';
        delBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removePlacedElement(el.id);
        });
        sigEl.appendChild(delBtn);
        
        // Duplicate bubble
        const dupBtn = document.createElement('button');
        dupBtn.className = 'action-bubble bubble-duplicate';
        dupBtn.title = 'Duplikat';
        dupBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            duplicatePlacedElement(el.id);
        });
        sigEl.appendChild(dupBtn);

        // Rotate bubble
        const rotBtn = document.createElement('button');
        rotBtn.className = 'action-bubble bubble-rotate';
        rotBtn.title = 'Putar 90°';
        rotBtn.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
        `;
        rotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            rotatePlacedElement(el.id);
        });
        sigEl.appendChild(rotBtn);
        
        // Resize circle handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        sigEl.appendChild(resizeHandle);
        
        overlay.appendChild(sigEl);
        
        // Bind interactions
        setupDragAndResize(sigEl, el, overlay);
    });
    
    deselectAllElements();
    updatePlacedElementsList();
    updateHistoryButtons();
}
