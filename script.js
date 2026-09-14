// Initialize PDF.js worker
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const toolsGrid = document.getElementById('tools-grid');
const toolWorkspace = document.getElementById('tool-workspace');
const backBtn = document.getElementById('back-btn');
const workspaceTitle = document.getElementById('workspace-title');
const workspaceSubtitle = document.getElementById('workspace-subtitle');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const filesPreview = document.getElementById('files-preview');
const processBtn = document.getElementById('process-btn');
const processBtnText = document.getElementById('process-btn-text');
const processingSpinner = document.getElementById('processing-spinner');
const progressStatus = document.getElementById('progress-status');
const supportedFormats = document.getElementById('supported-formats');
const navFilters = document.querySelectorAll('.nav-filter');
const compressionOptions = document.getElementById('compression-options');
const excelOptions = document.getElementById('excel-options');
const resultCard = document.getElementById('result-card');
const seoContent = document.getElementById('seo-content');

// PDF Editor Studio Elements
const pdfEditorStudio = document.getElementById('pdf-editor-studio');
const editorCloseBtn = document.getElementById('editor-close-btn');
const editorFilename = document.getElementById('editor-filename');
const editorToolBtns = document.querySelectorAll('.editor-tool-btn');
const editorFontSize = document.getElementById('editor-font-size');
const editorColorPicker = document.getElementById('editor-color-picker');
const editorBoldBtn = document.getElementById('editor-bold-btn');
const editorAlignLeft = document.getElementById('editor-align-left');
const editorAlignCenter = document.getElementById('editor-align-center');
const editorAlignRight = document.getElementById('editor-align-right');
const editorPrevPage = document.getElementById('editor-prev-page');
const editorNextPage = document.getElementById('editor-next-page');
const editorZoomOutBtn = document.getElementById('editor-zoom-out');
const editorZoomInBtn = document.getElementById('editor-zoom-in');
const editorPageInfo = document.getElementById('editor-page-info');
const editorSaveBtn = document.getElementById('editor-save-btn');
const editorPreviewBtn = document.getElementById('editor-preview-btn');
const editorUndoBtn = document.getElementById('editor-undo-btn');
const editorRedoBtn = document.getElementById('editor-redo-btn');
const editorInstructionText = document.getElementById('editor-instruction-text');
const editorPageWrapper = document.getElementById('editor-page-wrapper');
const editorPdfCanvas = document.getElementById('editor-pdf-canvas');
const editorDrawCanvas = document.getElementById('editor-draw-canvas');
const editorTextOverlay = document.getElementById('editor-text-overlay');

let currentTool = null;
let currentAccept = '.pdf';
let selectedFiles = [];

// =========================================================
// Secure Error Handling & Information Disclosure Prevention
// Prevents internal paths, stack traces, and library internals from leaking to users
// =========================================================
function sanitizeErrorMessage(error, defaultMessage = 'An unexpected error occurred while processing your document. Please try again.') {
    // Log full error details to console/telemetry for debugging
    console.error('[Diagnostic Details]:', error);

    if (!error) return defaultMessage;
    const msg = typeof error === 'string' ? error : (error.message || '');

    // Allow intentional validation rejection messages
    if (msg.startsWith('Input Validation Rejected:') || msg.startsWith('Schema Validation Error:')) {
        return msg;
    }

    // Check for sensitive patterns: stack traces, file paths, SQL/database keywords, internal modules
    const sensitivePatterns = [
        /at\s+[\w\.\/<>]+\s+\(.*:\d+:\d+\)/i, // Stack trace lines
        /[\\\/](home|var|usr|etc|tmp|Users|C:)[\\\/]/i, // Internal paths
        /(select|insert|update|delete|drop|table|sqlite|postgres|mysql|mongodb)/i, // Database terms
        /(eval|webpack|node_modules|wasm|heap|v8)/i // Internal runtimes
    ];

    if (sensitivePatterns.some(p => p.test(msg))) {
        return defaultMessage;
    }

    // Known user-safe operational errors
    if (/password|encrypted/i.test(msg)) {
        return 'This document is encrypted or password-protected. Please unlock it before processing.';
    }
    if (/corrupt|invalid pdf|bad format/i.test(msg)) {
        return 'The document appears to be corrupted or in an unsupported format. Please verify the file.';
    }

    return defaultMessage;
}

function showSafeUserError(error, defaultMessage) {
    const safeMsg = sanitizeErrorMessage(error, defaultMessage);
    alert(safeMsg);
}


// =========================================================
// Category Filtering in Navigation
// =========================================================
navFilters.forEach(filter => {
    filter.addEventListener('click', (e) => {
        e.preventDefault();
        navFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');

        const category = filter.dataset.filter;
        document.querySelectorAll('.tool-card').forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        if (toolWorkspace.style.display === 'block') {
            goBackToGrid();
        }
    });
});

// =========================================================
// Tool Card Click Handlers
// =========================================================
document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
        currentTool = card.dataset.tool;
        currentAccept = card.dataset.accept || '.pdf';
        
        workspaceTitle.innerText = card.dataset.title || card.querySelector('h3').innerText;
        processBtnText.innerText = card.dataset.action || 'Process Files';
        fileInput.accept = currentAccept;
        supportedFormats.innerText = `Supported: ${currentAccept.toUpperCase().replace(/\./g, ' ')}`;

        // Show/hide compression options
        if (currentTool === 'compress' || currentTool === 'compress-image' || currentTool === 'compress-office') {
            compressionOptions.style.display = 'block';
            if (currentTool === 'compress-image') {
                workspaceSubtitle.innerText = 'Compress single or multiple images with optimal visual quality';
            } else if (currentTool === 'compress-office') {
                workspaceSubtitle.innerText = 'Compress Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) documents across 3 compression levels';
            } else {
                workspaceSubtitle.innerText = 'Reduce PDF file size while preserving high document quality';
            }
        } else {
            compressionOptions.style.display = 'none';
        }

        // Show/hide Excel sheet options
        if (currentTool === 'pdf-to-excel') {
            if (excelOptions) excelOptions.style.display = 'block';
            workspaceSubtitle.innerText = 'Extract tables & text from multi-page PDFs into a clean, single-sheet Excel workbook';
        } else {
            if (excelOptions) excelOptions.style.display = 'none';
        }

        // Adjust for multi-file tools
        if (currentTool === 'merge' || currentTool === 'jpg-to-pdf' || currentTool === 'compress-image' || currentTool === 'compress-office') {
            fileInput.multiple = true;
            if (currentTool !== 'compress-image' && currentTool !== 'compress-office') {
                workspaceSubtitle.innerText = 'Select multiple files to combine into a single document';
            }
        } else if (currentTool === 'edit-pdf') {
            fileInput.multiple = false;
            workspaceSubtitle.innerText = 'Upload your PDF to edit text, erase content, or add notes and signatures';
        } else if (currentTool === 'split') {
            fileInput.multiple = false;
            workspaceSubtitle.innerText = 'Upload a multi-page PDF to delete pages, extract custom ranges, or split files';
        } else if (currentTool !== 'compress') {
            fileInput.multiple = false;
            workspaceSubtitle.innerText = 'Select or drop your file to convert completely offline';
        }

        toolsGrid.style.display = 'none';
        document.querySelector('.hero').style.display = 'none';
        if (seoContent) seoContent.style.display = 'none';
        toolWorkspace.style.display = 'block';
        
        // Reset state
        selectedFiles = [];
        resultCard.style.display = 'none';
        if (typeof resetSplitStudio === 'function') resetSplitStudio();
        updatePreview();
    });
});

// Handle Compression Radio Selection Highlight
document.querySelectorAll('.compression-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.compression-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });
});

// Handle Excel Radio Selection Highlight
document.querySelectorAll('.excel-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.excel-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });
});

function goBackToGrid() {
    if (typeof resetSplitStudio === 'function') resetSplitStudio();
    if (excelOptions) excelOptions.style.display = 'none';
    if (compressionOptions) compressionOptions.style.display = 'none';
    toolWorkspace.style.display = 'none';
    toolsGrid.style.display = 'grid';
    document.querySelector('.hero').style.display = 'block';
    if (seoContent) seoContent.style.display = 'block';
    selectedFiles = [];
    resultCard.style.display = 'none';
    updatePreview();

    // Reset navigation tabs to "All Tools"
    navFilters.forEach(f => f.classList.remove('active'));
    const allFilter = document.querySelector('.nav-filter[data-filter="all"]');
    if (allFilter) allFilter.classList.add('active');
    document.querySelectorAll('.tool-card').forEach(card => card.style.display = 'flex');

    // Close PDF editor studio if open
    if (pdfEditorStudio && pdfEditorStudio.style.display !== 'none') {
        pdfEditorStudio.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

backBtn.addEventListener('click', goBackToGrid);

// Clicking Logo navigates back to Home Page
const headerLogo = document.getElementById('header-logo') || document.querySelector('.logo');
if (headerLogo) {
    headerLogo.addEventListener('click', goBackToGrid);
    headerLogo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goBackToGrid();
        }
    });
}

// Footer Quick Tool Navigation Links
document.querySelectorAll('.footer-tool-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const toolName = link.dataset.tool;
        if (!toolName) return;
        e.preventDefault();
        const targetCard = document.querySelector(`.tool-card[data-tool="${toolName}"]`);
        if (targetCard) {
            if (toolWorkspace.style.display === 'block') {
                goBackToGrid();
            }
            targetCard.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// Quick Keyword Intent Badges & Directory Tag Buttons
document.querySelectorAll('.kw-badge, .kw-tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const toolName = btn.dataset.tool;
        const filterName = btn.dataset.filter;

        if (toolName) {
            e.preventDefault();
            const targetCard = document.querySelector(`.tool-card[data-tool="${toolName}"]`);
            if (targetCard) {
                if (toolWorkspace.style.display === 'block') {
                    goBackToGrid();
                }
                targetCard.click();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else if (filterName) {
            e.preventDefault();
            const targetFilter = document.querySelector(`.nav-filter[data-filter="${filterName}"]`);
            if (targetFilter) {
                targetFilter.click();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
});

// Drag and drop events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// =========================================================
// Strict Schema Input Validation System
// Validates type, length/size, and binary format/signatures; rejects non-matching inputs
// =========================================================
const STRICT_INPUT_SCHEMAS = {
    file: {
        maxSizeBytes: 100 * 1024 * 1024, // 100 MB max
        minSizeBytes: 1,                 // 1 byte min (reject empty files)
        tools: {
            'edit-pdf': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'merge': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'split': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'compress': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'pdf-to-word': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'pdf-to-excel': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'pdf-to-jpg': { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] },
            'word-to-pdf': { extensions: ['docx', 'doc'], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/zip'], magic: [[0x50, 0x4B, 0x03, 0x04], [0xD0, 0xCF, 0x11, 0xE0]] },
            'excel-to-pdf': { extensions: ['xlsx', 'xls', 'csv'], mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/csv', 'application/zip', 'text/plain'], magic: [[0x50, 0x4B, 0x03, 0x04], [0xD0, 0xCF, 0x11, 0xE0]] },
            'jpg-to-pdf': { extensions: ['jpg', 'jpeg', 'png', 'webp'], mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], magic: [[0xFF, 0xD8, 0xFF], [0x89, 0x50, 0x4E, 0x47], [0x52, 0x49, 0x46, 0x46]] },
            'compress-image': { extensions: ['jpg', 'jpeg', 'png', 'webp'], mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], magic: [[0xFF, 0xD8, 0xFF], [0x89, 0x50, 0x4E, 0x47], [0x52, 0x49, 0x46, 0x46]] },
            'compress-office': { extensions: ['docx', 'xlsx', 'pptx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'], magic: [[0x50, 0x4B, 0x03, 0x04]] }
        }
    },
    pageRange: {
        maxLength: 200,
        pattern: /^(?:[1-9]\d*(?:-[1-9]\d*)?)(?:\s*,\s*[1-9]\d*(?:-[1-9]\d*))*$/
    },
    editor: {
        fontSize: { min: 6, max: 144 },
        colorPattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        textMaxLength: 5000
    }
};

async function validateFileInputStrict(file, toolId) {
    if (!file || !(file instanceof File || file instanceof Blob)) {
        throw new Error('Input Validation Rejected: Selected item is not a valid file object.');
    }

    const schema = (toolId && STRICT_INPUT_SCHEMAS.file.tools[toolId]) 
        ? STRICT_INPUT_SCHEMAS.file.tools[toolId] 
        : { extensions: ['pdf'], mimeTypes: ['application/pdf'], magic: [[0x25, 0x50, 0x44, 0x46]] };
    
    const name = file.name || 'document';
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

    // 1. Strict extension type validation
    if (!ext || !schema.extensions.includes(ext)) {
        throw new Error(`Input Validation Rejected: File "${name}" has unsupported format (.${ext || 'unknown'}). Expected format: ${schema.extensions.map(e => '.' + e).join(', ')}.`);
    }

    // 2. Strict MIME type validation (when reported by browser)
    if (file.type && schema.mimeTypes && schema.mimeTypes.length > 0) {
        const reportedMime = file.type.toLowerCase();
        if (!schema.mimeTypes.includes(reportedMime) && reportedMime !== 'application/octet-stream') {
            throw new Error(`Input Validation Rejected: File "${name}" reported MIME type "${reportedMime}" is not permitted for this operation.`);
        }
    }

    // 3. Strict size length validation
    if (file.size < STRICT_INPUT_SCHEMAS.file.minSizeBytes) {
        throw new Error(`Input Validation Rejected: File "${name}" is empty (0 bytes).`);
    }
    if (file.size > STRICT_INPUT_SCHEMAS.file.maxSizeBytes) {
        throw new Error(`Input Validation Rejected: File "${name}" exceeds the maximum allowed file size of 100MB.`);
    }

    // 3. Strict Binary Header / Magic Bytes format validation
    if (schema.magic && schema.magic.length > 0) {
        try {
            const slice = file.slice(0, 8);
            const buffer = await slice.arrayBuffer();
            const header = new Uint8Array(buffer);
            const isMatch = schema.magic.some(magicBytes => {
                if (header.length < magicBytes.length) return false;
                return magicBytes.every((b, i) => header[i] === b);
            });
            if (!isMatch && ext !== 'csv') {
                throw new Error(`Input Validation Rejected: File "${name}" binary header does not match declared .${ext} format. Malformed or disguised files are strictly rejected.`);
            }
        } catch (e) {
            if (e.message.startsWith('Input Validation Rejected')) throw e;
        }
    }

    return true;
}

async function handleFiles(files) {
    if (!files || files.length === 0) return;
    resultCard.style.display = 'none';

    // Strict schema validation for each selected file
    const validBatch = [];
    for (let i = 0; i < files.length; i++) {
        try {
            await validateFileInputStrict(files[i], currentTool);
            validBatch.push(files[i]);
        } catch (err) {
            alert(err.message);
            fileInput.value = '';
            return;
        }
    }

    if (fileInput.multiple) {
        for (let i = 0; i < validBatch.length; i++) {
            selectedFiles.push(validBatch[i]);
        }
    } else {
        selectedFiles = [validBatch[0]];
    }

    // Interactive Split & Delete Studio
    if (currentTool === 'split' && selectedFiles.length > 0) {
        initSplitStudio(selectedFiles[0]);
        return;
    }

    updatePreview();

    // Auto-open PDF editor when in edit mode
    if (currentTool === 'edit-pdf' && selectedFiles.length > 0) {
        launchPdfEditor();
    }
}


function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '<i class="fa-solid fa-file-pdf" style="color: #E5322D;"></i>';
    if (ext === 'docx' || ext === 'doc') return '<i class="fa-solid fa-file-word" style="color: #2B579A;"></i>';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return '<i class="fa-solid fa-file-excel" style="color: #217346;"></i>';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return '<i class="fa-solid fa-file-image" style="color: #7C3AED;"></i>';
    return '<i class="fa-solid fa-file" style="color: #64748B;"></i>';
}

function updatePreview() {
    filesPreview.innerHTML = '';
    if (currentTool === 'split' && selectedFiles.length > 0) {
        return;
    }

    if (selectedFiles.length > 0) {
        processBtn.style.display = 'inline-flex';
        uploadArea.style.display = 'none';
    } else {
        processBtn.style.display = 'none';
        uploadArea.style.display = 'block';
    }

    selectedFiles.forEach((file, index) => {
        const fileEl = document.createElement('div');
        fileEl.className = 'file-item';
        
        const sizeFormatted = file.size > 1024 * 1024 
            ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            : (file.size / 1024).toFixed(1) + ' KB';

        fileEl.innerHTML = `
            <div class="file-item-info">
                ${getFileIcon(file.name)}
                <span>${file.name} (${sizeFormatted})</span>
            </div>
            <i class="fa-solid fa-trash remove-file" data-index="${index}" title="Remove file"></i>
        `;
        filesPreview.appendChild(fileEl);
    });

    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            selectedFiles.splice(index, 1);
            resultCard.style.display = 'none';
            updatePreview();
        });
    });
}

function setProcessing(isProcessing, statusText = 'Processing...') {
    if (isProcessing) {
        processBtn.style.display = 'none';
        processingSpinner.style.display = 'flex';
        progressStatus.innerText = statusText;
        resultCard.style.display = 'none';
    } else {
        processBtn.style.display = selectedFiles.length > 0 ? 'inline-flex' : 'none';
        processingSpinner.style.display = 'none';
    }
}

// =========================================================
// Main Process Button Handler
// =========================================================
processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    try {
        switch (currentTool) {
            case 'edit-pdf':
                await launchPdfEditor();
                break;
            case 'compress':
                setProcessing(true, 'Analyzing & compressing PDF in browser...');
                await compressPdf();
                break;
            case 'compress-image':
                setProcessing(true, 'Compressing image(s) in browser...');
                await compressImages();
                break;
            case 'compress-office':
                setProcessing(true, 'Analyzing & compressing Office files (.docx, .xlsx, .pptx)...');
                await compressOfficeDocuments();
                break;
            case 'pdf-to-word':
                setProcessing(true, 'Extracting text & generating Word (.docx)...');
                await convertPdfToWord();
                break;
            case 'pdf-to-excel':
                setProcessing(true, 'Extracting tables & generating Excel (.xlsx)...');
                await convertPdfToExcel();
                break;
            case 'word-to-pdf':
                setProcessing(true, 'Rendering Word document & converting to PDF...');
                await convertWordToPdf();
                break;
            case 'excel-to-pdf':
                setProcessing(true, 'Formatting spreadsheet & converting to PDF...');
                await convertExcelToPdf();
                break;
            case 'pdf-to-jpg':
                setProcessing(true, 'Rendering PDF pages to JPG images...');
                await convertPdfToJpg();
                break;
            case 'jpg-to-pdf':
                setProcessing(true, 'Converting images into PDF...');
                await convertJpgToPdf();
                break;
            case 'merge':
                setProcessing(true, 'Merging PDF files...');
                await mergePDFs();
                break;
            case 'split':
                setProcessing(true, 'Splitting PDF pages...');
                await splitPDF();
                break;
            default:
                alert(`Tool "${currentTool}" is currently under development.`);
        }
    } catch (error) {
        showSafeUserError(error, 'An unexpected error occurred during document conversion. Please check your file and try again.');
    } finally {
        if (currentTool !== 'edit-pdf') {
            setProcessing(false);
        }
    }
});

// =========================================================
// =========================================================
// FULL IN-BROWSER INTERACTIVE PDF TEXT EDITOR STUDIO
// =========================================================
// =========================================================

const editorState = {
    pdfDoc: null,
    arrayBuffer: null,
    fileName: 'document.pdf',
    currentPage: 1,
    totalPages: 1,
    scale: 1.5,
    currentMode: 'edit-text', // 'edit-text', 'add-text', 'whiteout', 'draw', 'highlight'
    fontSize: 16,
    color: '#000000',
    bold: false,
    alignment: 'left', // 'left' (writes from the beginning of the box), 'center', 'right'
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    isPreviewMode: false,
    prePreviewMode: 'edit-text',
    history: {}, // pageNum -> { past: [snapshots], future: [snapshots] }
    pagesData: {} // pageNum -> { editedBlocks: [], addedTextboxes: [], whiteouts: [], drawCanvasData: null, detectedBoxes: [] }
};

function setEditorAlignment(align) {
    editorState.alignment = align;
    if (editorAlignLeft) editorAlignLeft.classList.toggle('active', align === 'left');
    if (editorAlignCenter) editorAlignCenter.classList.toggle('active', align === 'center');
    if (editorAlignRight) editorAlignRight.classList.toggle('active', align === 'right');

    const activeInput = document.querySelector('.pdf-text-block-input');
    if (activeInput) {
        activeInput.style.textAlign = align;
    }
}

// Helper to switch editor tool mode
function setEditorToolMode(mode) {
    if (editorState.isPreviewMode) {
        togglePreviewMode(false);
    }
    editorState.currentMode = mode;
    editorToolBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    pdfEditorStudio.dataset.mode = mode;
    editorTextOverlay.className = `editor-text-overlay mode-${mode}`;

    if (mode === 'edit-text') {
        editorInstructionText.innerText = "Click on any text on the page to edit it directly in place. Original text will be replaced seamlessly.";
    } else if (mode === 'add-text') {
        editorInstructionText.innerText = "Click anywhere on the document to place a new custom text box.";
    } else if (mode === 'whiteout') {
        editorInstructionText.innerText = "Click and drag across text or graphics to whiteout / erase.";
    } else if (mode === 'draw') {
        editorInstructionText.innerText = "Click and drag to draw freehand notes or add signatures.";
    } else if (mode === 'highlight') {
        editorInstructionText.innerText = "Click and drag across text to highlight with translucent marker.";
    }
}

// Toggle Clean Preview Mode
function togglePreviewMode(forceState) {
    const nextState = (forceState !== undefined) ? forceState : !editorState.isPreviewMode;
    editorState.isPreviewMode = nextState;

    if (editorState.isPreviewMode) {
        editorState.prePreviewMode = editorState.currentMode;
        pdfEditorStudio.classList.add('preview-mode');
        if (editorPreviewBtn) {
            editorPreviewBtn.classList.add('active');
            editorPreviewBtn.innerHTML = '<i class="fa-solid fa-pen"></i> <span>Exit Preview</span>';
        }
        editorInstructionText.innerText = "Preview Mode: All editing guides, outlines, and controls are hidden. Review your clean document.";
    } else {
        pdfEditorStudio.classList.remove('preview-mode');
        if (editorPreviewBtn) {
            editorPreviewBtn.classList.remove('active');
            editorPreviewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> <span>Preview</span>';
        }
        setEditorToolMode(editorState.prePreviewMode || 'edit-text');
    }
}

// History & Snapshot Management (Undo / Redo)
function takeSnapshot(pageNum) {
    const pageObj = editorState.pagesData[pageNum] || { editedBlocks: [], addedTextboxes: [], whiteouts: [], drawCanvasData: null };
    return {
        editedBlocks: JSON.parse(JSON.stringify(pageObj.editedBlocks || [])),
        addedTextboxes: JSON.parse(JSON.stringify(pageObj.addedTextboxes || [])),
        whiteouts: JSON.parse(JSON.stringify(pageObj.whiteouts || [])),
        drawCanvasData: (pageNum === editorState.currentPage) ? editorDrawCanvas.toDataURL() : (pageObj.drawCanvasData || null)
    };
}

function recordEditorAction() {
    const p = editorState.currentPage;
    if (!editorState.history[p]) {
        editorState.history[p] = { past: [], future: [] };
    }
    const snapshot = takeSnapshot(p);
    editorState.history[p].past.push(snapshot);
    if (editorState.history[p].past.length > 50) {
        editorState.history[p].past.shift();
    }
    editorState.history[p].future = []; // Clear redo stack on new user action
    updateUndoRedoButtons();
}

function undoEditorAction() {
    const p = editorState.currentPage;
    const hist = editorState.history[p];
    if (!hist || hist.past.length <= 1) return;

    // Pop the current active state and move to redo future
    const currentSnapshot = hist.past.pop();
    hist.future.push(currentSnapshot);

    // Target state is now at top of past
    const targetSnapshot = hist.past[hist.past.length - 1];
    restoreSnapshot(p, targetSnapshot);
    updateUndoRedoButtons();
}

function redoEditorAction() {
    const p = editorState.currentPage;
    const hist = editorState.history[p];
    if (!hist || hist.future.length === 0) return;

    const nextSnapshot = hist.future.pop();
    hist.past.push(nextSnapshot);

    restoreSnapshot(p, nextSnapshot);
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const p = editorState.currentPage;
    const hist = editorState.history[p];
    if (editorUndoBtn) {
        editorUndoBtn.disabled = !hist || hist.past.length <= 1;
    }
    if (editorRedoBtn) {
        editorRedoBtn.disabled = !hist || hist.future.length === 0;
    }
}

function restoreSnapshot(pageNum, snapshot) {
    const pageObj = editorState.pagesData[pageNum];
    if (!pageObj) return;

    pageObj.editedBlocks = JSON.parse(JSON.stringify(snapshot.editedBlocks || []));
    pageObj.addedTextboxes = JSON.parse(JSON.stringify(snapshot.addedTextboxes || []));
    pageObj.whiteouts = JSON.parse(JSON.stringify(snapshot.whiteouts || []));
    pageObj.drawCanvasData = snapshot.drawCanvasData || null;

    // Restore Drawing Layer Canvas
    const drawCtx = editorDrawCanvas.getContext('2d');
    drawCtx.clearRect(0, 0, editorDrawCanvas.width, editorDrawCanvas.height);
    if (pageObj.drawCanvasData) {
        const img = new Image();
        img.src = pageObj.drawCanvasData;
        img.onload = () => {
            drawCtx.clearRect(0, 0, editorDrawCanvas.width, editorDrawCanvas.height);
            drawCtx.drawImage(img, 0, 0);
        };
    }

    // Clear dynamic elements from overlay
    editorTextOverlay.querySelectorAll('.editor-textbox, .editor-whiteout-rect').forEach(el => el.remove());

    // Re-render Whiteouts
    pageObj.whiteouts.forEach((w, idx) => renderWhiteoutBox(w, idx));

    // Re-render Added Textboxes
    pageObj.addedTextboxes.forEach((tb, idx) => renderAddedTextbox(tb, idx));

    // Update in-place editable text blocks
    editorTextOverlay.querySelectorAll('.pdf-text-block').forEach(blockEl => {
        const blockId = blockEl.id;
        const existingEdit = pageObj.editedBlocks.find(eb => eb.id === blockId);
        const span = blockEl.querySelector('span');

        if (existingEdit) {
            blockEl.classList.add('has-edited');
            if (span) span.innerText = existingEdit.newText;
            blockEl.style.fontSize = `${existingEdit.fontSize}px`;
            blockEl.style.color = existingEdit.color || '#0F172A';
            blockEl.style.fontWeight = existingEdit.bold ? 'bold' : 'normal';
            blockEl.style.textAlign = existingEdit.align || editorState.alignment || 'center';
        } else {
            blockEl.classList.remove('has-edited');
            const origText = blockEl.dataset.originalText;
            if (span && origText !== undefined) span.innerText = origText;
            blockEl.style.color = 'transparent';
            blockEl.style.fontWeight = 'normal';
        }
    });
}

async function launchPdfEditor() {
    const file = selectedFiles[0];
    editorState.fileName = file.name;
    editorFilename.innerText = file.name;
    editorState.arrayBuffer = await file.arrayBuffer();

    setProcessing(true, "Opening PDF Editor Studio...");
    editorState.pdfDoc = await pdfjsLib.getDocument({ data: editorState.arrayBuffer }).promise;
    editorState.totalPages = editorState.pdfDoc.numPages;
    editorState.currentPage = 1;
    editorState.pagesData = {};
    editorState.history = {};
    editorState.isPreviewMode = false;
    pdfEditorStudio.classList.remove('preview-mode');
    if (editorPreviewBtn) {
        editorPreviewBtn.classList.remove('active');
        editorPreviewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> <span>Preview</span>';
    }

    for (let i = 1; i <= editorState.totalPages; i++) {
        editorState.pagesData[i] = {
            editedBlocks: [],
            addedTextboxes: [],
            whiteouts: [],
            drawCanvasData: null,
            detectedBoxes: []
        };
        editorState.history[i] = {
            past: [takeSnapshot(i)],
            future: []
        };
    }

    // Adaptive scale for mobile devices and small viewports
    if (window.innerWidth <= 480) {
        editorState.scale = 0.9;
    } else if (window.innerWidth <= 768) {
        editorState.scale = 1.15;
    } else {
        editorState.scale = 1.5;
    }

    pdfEditorStudio.style.display = 'flex';
    setEditorToolMode('edit-text');
    setProcessing(false);
    await renderEditorCurrentPage();
}

editorCloseBtn.addEventListener('click', () => {
    pdfEditorStudio.style.display = 'none';
});

// Tool Mode Switching
editorToolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setEditorToolMode(btn.dataset.mode);
    });
});

if (editorPreviewBtn) {
    editorPreviewBtn.addEventListener('click', () => {
        togglePreviewMode();
    });
}

if (editorUndoBtn) {
    editorUndoBtn.addEventListener('click', () => {
        undoEditorAction();
    });
}

if (editorRedoBtn) {
    editorRedoBtn.addEventListener('click', () => {
        redoEditorAction();
    });
}

// Global Keyboard Shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
window.addEventListener('keydown', (e) => {
    if (!pdfEditorStudio || pdfEditorStudio.style.display === 'none') return;

    const active = document.activeElement;
    const isEditingInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

    // Ctrl+Z or Cmd+Z (without Shift) -> Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isEditingInput) return; // Allow native input undo when typing
        e.preventDefault();
        undoEditorAction();
    }
    // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z -> Redo
    else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
             ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        if (isEditingInput) return; // Allow native input redo when typing
        e.preventDefault();
        redoEditorAction();
    }
});

editorFontSize.addEventListener('change', (e) => {
    const rawVal = e.target.value;
    const num = Number(rawVal);
    const schema = STRICT_INPUT_SCHEMAS.editor.fontSize;
    if (!Number.isInteger(num) || num < schema.min || num > schema.max) {
        alert(`Input Validation Rejected: Font size must be an integer between ${schema.min} and ${schema.max}.`);
        e.target.value = editorState.fontSize;
        return;
    }
    editorState.fontSize = num;
});

editorColorPicker.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    if (typeof rawVal !== 'string' || !STRICT_INPUT_SCHEMAS.editor.colorPattern.test(rawVal)) {
        alert('Input Validation Rejected: Color must be a valid hex color format (#RGB or #RRGGBB).');
        e.target.value = editorState.color;
        return;
    }
    editorState.color = rawVal;
});


editorBoldBtn.addEventListener('click', () => {
    editorState.bold = !editorState.bold;
    editorBoldBtn.classList.toggle('active', editorState.bold);
});

if (editorAlignLeft) editorAlignLeft.addEventListener('click', () => setEditorAlignment('left'));
if (editorAlignCenter) editorAlignCenter.addEventListener('click', () => setEditorAlignment('center'));
if (editorAlignRight) editorAlignRight.addEventListener('click', () => setEditorAlignment('right'));

editorPrevPage.addEventListener('click', async () => {
    if (editorState.currentPage > 1) {
        saveCurrentPageDrawCanvas();
        editorState.currentPage--;
        await renderEditorCurrentPage();
    }
});

editorNextPage.addEventListener('click', async () => {
    if (editorState.currentPage < editorState.totalPages) {
        saveCurrentPageDrawCanvas();
        editorState.currentPage++;
        await renderEditorCurrentPage();
    }
});

if (editorZoomInBtn) {
    editorZoomInBtn.addEventListener('click', async () => {
        if (editorState.scale < 3.0) {
            saveCurrentPageDrawCanvas();
            editorState.scale = Math.min(3.0, +(editorState.scale + 0.25).toFixed(2));
            await renderEditorCurrentPage();
        }
    });
}

if (editorZoomOutBtn) {
    editorZoomOutBtn.addEventListener('click', async () => {
        if (editorState.scale > 0.5) {
            saveCurrentPageDrawCanvas();
            editorState.scale = Math.max(0.5, +(editorState.scale - 0.25).toFixed(2));
            await renderEditorCurrentPage();
        }
    });
}

function saveCurrentPageDrawCanvas() {
    const pageObj = editorState.pagesData[editorState.currentPage];
    if (pageObj) {
        pageObj.drawCanvasData = editorDrawCanvas.toDataURL();
    }
}

// Detect interactive form fields, rectangular cells & boxes on the active page
async function detectPageBoxes(page, viewport) {
    const boxes = [];
    
    // 1. Extract from Annotations (AcroForms / Form Widgets)
    try {
        const annotations = await page.getAnnotations({ intent: 'display' });
        if (annotations && annotations.length > 0) {
            annotations.forEach((annot, idx) => {
                if (annot.rect) {
                    const vRect = viewport.convertToViewportRectangle(annot.rect);
                    const x = Math.min(vRect[0], vRect[2]);
                    const y = Math.min(vRect[1], vRect[3]);
                    const width = Math.abs(vRect[2] - vRect[0]);
                    const height = Math.abs(vRect[3] - vRect[1]);
                    
                    if (width >= 20 && height >= 10 && width < viewport.width * 0.98) {
                        boxes.push({
                            id: `annot_box_${editorState.currentPage}_${idx}`,
                            x: Math.round(x),
                            y: Math.round(y),
                            width: Math.round(width),
                            height: Math.round(height),
                            type: 'annotation'
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn("Annotation extraction error:", e);
    }

    // 2. Extract from Operator List (drawn rectangles & form paths)
    try {
        const opList = await page.getOperatorList();
        const fnArray = opList.fnArray;
        const argsArray = opList.argsArray;
        let boxCounter = 0;

        for (let i = 0; i < fnArray.length; i++) {
            const fn = fnArray[i];
            const args = argsArray[i];

            if (fn === pdfjsLib.OPS.rectangle) {
                const rx = args[0];
                const ry = args[1];
                const rw = args[2];
                const rh = args[3];

                const p1 = pdfjsLib.Util.transform(viewport.transform, [rx, ry]);
                const p2 = pdfjsLib.Util.transform(viewport.transform, [rx + rw, ry + rh]);
                const x = Math.min(p1[0], p2[0]);
                const y = Math.min(p1[1], p2[1]);
                const width = Math.abs(p2[0] - p1[0]);
                const height = Math.abs(p2[1] - p1[1]);

                if (width >= 25 && height >= 10 && width < viewport.width * 0.98 && height < viewport.height * 0.85) {
                    boxes.push({
                        id: `op_box_${editorState.currentPage}_${boxCounter++}`,
                        x: Math.round(x),
                        y: Math.round(y),
                        width: Math.round(width),
                        height: Math.round(height),
                        type: 'drawn-rect'
                    });
                }
            } else if (fn === pdfjsLib.OPS.constructPath) {
                const subOps = args[0];
                const subArgs = args[1];
                let aIdx = 0;

                for (let j = 0; j < subOps.length; j++) {
                    const subOp = subOps[j];
                    if (subOp === pdfjsLib.OPS.rectangle) {
                        const rx = subArgs[aIdx];
                        const ry = subArgs[aIdx + 1];
                        const rw = subArgs[aIdx + 2];
                        const rh = subArgs[aIdx + 3];
                        aIdx += 4;

                        const p1 = pdfjsLib.Util.transform(viewport.transform, [rx, ry]);
                        const p2 = pdfjsLib.Util.transform(viewport.transform, [rx + rw, ry + rh]);
                        const x = Math.min(p1[0], p2[0]);
                        const y = Math.min(p1[1], p2[1]);
                        const width = Math.abs(p2[0] - p1[0]);
                        const height = Math.abs(p2[1] - p1[1]);

                        if (width >= 25 && height >= 10 && width < viewport.width * 0.98 && height < viewport.height * 0.85) {
                            boxes.push({
                                id: `path_box_${editorState.currentPage}_${boxCounter++}`,
                                x: Math.round(x),
                                y: Math.round(y),
                                width: Math.round(width),
                                height: Math.round(height),
                                type: 'path-rect'
                            });
                        }
                    } else if (subOp === pdfjsLib.OPS.moveTo || subOp === pdfjsLib.OPS.lineTo) {
                        aIdx += 2;
                    } else if (subOp === pdfjsLib.OPS.curveTo) {
                        aIdx += 6;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Operator list extraction error:", e);
    }

    // Deduplicate near-identical boxes
    const uniqueBoxes = [];
    boxes.forEach(b => {
        const isDup = uniqueBoxes.some(u => 
            Math.abs(u.x - b.x) <= 5 &&
            Math.abs(u.y - b.y) <= 5 &&
            Math.abs(u.width - b.width) <= 8 &&
            Math.abs(u.height - b.height) <= 8
        );
        if (!isDup) uniqueBoxes.push(b);
    });

    return uniqueBoxes;
}

function findContainingBox(boxes, clickX, clickY) {
    if (!boxes || boxes.length === 0) return null;
    const candidates = boxes.filter(b => 
        clickX >= (b.x - 2) && clickX <= (b.x + b.width + 2) &&
        clickY >= (b.y - 2) && clickY <= (b.y + b.height + 2)
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    return candidates[0];
}

// Render the active PDF page in the editor
async function renderEditorCurrentPage() {
    editorPageInfo.innerText = `Page ${editorState.currentPage} / ${editorState.totalPages}`;
    const page = await editorState.pdfDoc.getPage(editorState.currentPage);
    const viewport = page.getViewport({ scale: editorState.scale });

    editorPdfCanvas.width = viewport.width;
    editorPdfCanvas.height = viewport.height;
    editorDrawCanvas.width = viewport.width;
    editorDrawCanvas.height = viewport.height;
    editorPageWrapper.style.width = `${viewport.width}px`;
    editorPageWrapper.style.height = `${viewport.height}px`;

    // Render Base PDF canvas
    const ctx = editorPdfCanvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // Restore Drawing Layer
    const drawCtx = editorDrawCanvas.getContext('2d');
    drawCtx.clearRect(0, 0, editorDrawCanvas.width, editorDrawCanvas.height);
    const pageObj = editorState.pagesData[editorState.currentPage];
    if (pageObj && pageObj.drawCanvasData) {
        const img = new Image();
        img.src = pageObj.drawCanvasData;
        img.onload = () => drawCtx.drawImage(img, 0, 0);
    }

    // Cluster text into logical lines & phrases
    editorTextOverlay.innerHTML = '';

    // Detect & render form boxes
    pageObj.detectedBoxes = await detectPageBoxes(page, viewport);
    pageObj.detectedBoxes.forEach(box => {
        const boxEl = document.createElement('div');
        boxEl.className = 'pdf-detected-box';
        boxEl.id = box.id;
        boxEl.style.left = `${box.x}px`;
        boxEl.style.top = `${box.y}px`;
        boxEl.style.width = `${box.width}px`;
        boxEl.style.height = `${box.height}px`;

        boxEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (editorState.currentMode === 'edit-text' || editorState.currentMode === 'add-text' || editorState.currentMode === 'text') {
                handleFormBoxClick(box);
            }
        });

        editorTextOverlay.appendChild(boxEl);
    });

    const textContent = await page.getTextContent({ normalizeWhitespace: true });
    
    const lineMap = [];
    textContent.items.forEach(item => {
        if (!item.str || item.str.trim() === '') return;
        
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5]; // Baseline Y
        const fontSize = Math.max(10, Math.round((item.height || Math.abs(item.transform[0])) * editorState.scale));
        const height = fontSize * 1.2;
        const width = item.width * editorState.scale;

        let line = lineMap.find(l => Math.abs(l.baselineY - y) <= 4.0);
        if (!line) {
            line = { baselineY: y, fontSize: fontSize, height: height, items: [] };
            lineMap.push(line);
        }
        line.items.push({ x, baselineY: y, width, str: item.str, fontSize, height });
    });

    // Sort lines top to bottom
    lineMap.sort((a, b) => a.baselineY - b.baselineY);

    let blockCounter = 0;
    lineMap.forEach(line => {
        // Sort items in line left to right
        line.items.sort((a, b) => a.x - b.x);

        let currentBlock = null;
        line.items.forEach(item => {
            if (!currentBlock) {
                currentBlock = {
                    id: `block_${editorState.currentPage}_${blockCounter++}`,
                    x: item.x,
                    y: line.baselineY - (item.fontSize * 0.95),
                    width: item.width,
                    height: item.height,
                    fontSize: item.fontSize,
                    text: item.str
                };
            } else {
                const gap = item.x - (currentBlock.x + currentBlock.width);
                if (gap < 24) {
                    currentBlock.text += (gap > 1.5 ? ' ' : '') + item.str;
                    currentBlock.width = (item.x + item.width) - currentBlock.x;
                } else {
                    renderClusteredTextBlock(currentBlock, pageObj);
                    currentBlock = {
                        id: `block_${editorState.currentPage}_${blockCounter++}`,
                        x: item.x,
                        y: line.baselineY - (item.fontSize * 0.95),
                        width: item.width,
                        height: item.height,
                        fontSize: item.fontSize,
                        text: item.str
                    };
                }
            }
        });
        if (currentBlock) {
            renderClusteredTextBlock(currentBlock, pageObj);
        }
    });

    // Render Whiteouts and User Added Textboxes
    if (pageObj) {
        pageObj.whiteouts.forEach((w, idx) => renderWhiteoutBox(w, idx));
        pageObj.addedTextboxes.forEach((tb, idx) => renderAddedTextbox(tb, idx));
    }
}

// Render In-Place Editable Text Block
function renderClusteredTextBlock(block, pageObj) {
    // Check if this block was already edited
    const existingEdit = pageObj.editedBlocks.find(eb => eb.id === block.id);
    const displayText = existingEdit ? existingEdit.newText : block.text;

    const el = document.createElement('div');
    el.className = 'pdf-text-block' + (existingEdit ? ' has-edited' : '');
    el.id = block.id;
    el.dataset.originalText = block.text;
    el.style.left = `${block.x}px`;
    el.style.top = `${block.y}px`;
    el.style.minWidth = `${Math.max(block.width, 24)}px`;
    el.style.height = `${block.height}px`;
    el.style.fontSize = `${existingEdit ? existingEdit.fontSize : block.fontSize}px`;
    el.style.color = existingEdit ? (existingEdit.color || '#0F172A') : 'transparent';
    el.style.fontWeight = (existingEdit && existingEdit.bold) ? 'bold' : 'normal';
    el.style.textAlign = existingEdit ? (existingEdit.align || editorState.alignment || 'center') : (editorState.alignment || 'center');

    const span = document.createElement('span');
    span.innerText = displayText;
    el.appendChild(span);

    // Clicking text block opens in-place editor
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editorState.currentMode === 'edit-text') {
            activateInlineBlockEditor(el, block, pageObj);
        }
    });

    editorTextOverlay.appendChild(el);
}

function activateInlineBlockEditor(blockEl, blockData, pageObj) {
    if (blockEl.classList.contains('editing')) return;

    blockEl.classList.add('editing');
    const existingEdit = pageObj.editedBlocks.find(eb => eb.id === blockData.id);
    const currentText = existingEdit ? existingEdit.newText : blockData.text;

    blockEl.innerHTML = '';

    // Create floating action toolbar
    const actionsBar = document.createElement('div');
    actionsBar.className = 'pdf-text-block-actions';
    actionsBar.innerHTML = `
        <button class="pdf-action-btn pdf-action-save" title="Save changes (Enter)"><i class="fa-solid fa-check"></i> Save</button>
        <button class="pdf-action-btn pdf-action-cancel" title="Cancel (Esc)"><i class="fa-solid fa-times"></i> Cancel</button>
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pdf-text-block-input';
    input.value = currentText;
    input.style.fontSize = `${blockData.fontSize}px`;
    input.style.color = editorState.color || '#000000';
    input.style.fontWeight = editorState.bold ? 'bold' : 'normal';
    input.style.textAlign = (existingEdit && existingEdit.align) ? existingEdit.align : (editorState.alignment || 'center');
    input.style.width = `${Math.max(blockData.width + 40, 90)}px`;

    // Auto-resize input width as user types
    input.addEventListener('input', () => {
        const textLength = input.value.length;
        const estWidth = Math.max(blockData.width + 40, textLength * (blockData.fontSize * 0.65) + 30);
        input.style.width = `${estWidth}px`;
    });

    blockEl.appendChild(actionsBar);
    blockEl.appendChild(input);
    input.focus();
    input.select();

    let isFinished = false;

    const commitSave = () => {
        if (isFinished) return;
        isFinished = true;

        const newText = input.value;
        blockEl.classList.remove('editing');

        if (newText !== blockData.text && newText.trim() !== '') {
            blockEl.classList.add('has-edited');
            blockEl.style.fontSize = `${blockData.fontSize}px`;
            blockEl.style.color = editorState.color || '#000000';
            blockEl.style.fontWeight = editorState.bold ? 'bold' : 'normal';
            blockEl.style.textAlign = editorState.alignment || 'center';

            const editEntry = {
                id: blockData.id,
                origX: blockData.x,
                origY: blockData.y,
                origWidth: Math.max(blockData.width, 30),
                origHeight: Math.max(blockData.height, 16),
                newText: newText,
                fontSize: blockData.fontSize,
                color: editorState.color || '#000000',
                bold: editorState.bold,
                align: editorState.alignment || 'center'
            };

            const idx = pageObj.editedBlocks.findIndex(eb => eb.id === blockData.id);
            if (idx >= 0) {
                pageObj.editedBlocks[idx] = editEntry;
            } else {
                pageObj.editedBlocks.push(editEntry);
            }

            blockEl.innerHTML = `<span>${newText}</span>`;
            recordEditorAction();
        } else if (newText === blockData.text) {
            const idx = pageObj.editedBlocks.findIndex(eb => eb.id === blockData.id);
            if (idx >= 0) {
                pageObj.editedBlocks.splice(idx, 1);
                recordEditorAction();
            }
            blockEl.classList.remove('has-edited');
            blockEl.innerHTML = `<span>${blockData.text}</span>`;
        } else {
            blockEl.innerHTML = `<span>${currentText}</span>`;
        }
    };

    const cancelEdit = () => {
        if (isFinished) return;
        isFinished = true;
        blockEl.classList.remove('editing');
        blockEl.innerHTML = `<span>${currentText}</span>`;
    };

    actionsBar.querySelector('.pdf-action-save').addEventListener('click', (e) => {
        e.stopPropagation();
        commitSave();
    });

    actionsBar.querySelector('.pdf-action-cancel').addEventListener('click', (e) => {
        e.stopPropagation();
        cancelEdit();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });

    // Save on clicking outside the block
    const onOutsideClick = (e) => {
        if (!blockEl.contains(e.target)) {
            window.removeEventListener('mousedown', onOutsideClick);
            commitSave();
        }
    };
    setTimeout(() => {
        window.addEventListener('mousedown', onOutsideClick);
    }, 100);
}

// Clicking empty area on the page / empty form cell / blank space
editorTextOverlay.addEventListener('click', (e) => {
    if (e.target !== editorTextOverlay) return;

    // In 'edit-text' mode, clicking on blank empty space does NOT create new text boxes.
    // New text boxes can only be placed when 'Add New Text' mode is active.
    if (editorState.currentMode === 'add-text') {
        const rect = editorTextOverlay.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const pageObj = editorState.pagesData[editorState.currentPage];
        const containingBox = findContainingBox(pageObj ? pageObj.detectedBoxes : [], clickX, clickY);

        if (containingBox) {
            handleFormBoxClick(containingBox);
        } else {
            openNewFieldEditor(clickX, clickY, null);
        }
    }
});

function handleFormBoxClick(targetBox) {
    const pageObj = editorState.pagesData[editorState.currentPage];
    if (!pageObj) return;

    // Check if there is ALREADY an added textbox inside this targetBox!
    const existingTb = pageObj.addedTextboxes.find(tb => 
        tb.boxId === targetBox.id ||
        (tb.x >= targetBox.x - 5 && tb.x <= (targetBox.x + targetBox.width + 5) &&
         tb.y >= targetBox.y - 5 && tb.y <= (targetBox.y + targetBox.height + 5))
    );

    if (existingTb) {
        const existingEl = document.getElementById(existingTb.id);
        if (existingEl) {
            reEditAddedTextbox(existingEl, existingTb, targetBox);
            return;
        }
    }

    // In 'edit-text' mode, empty boxes do not spawn new text boxes unless 'add-text' mode is selected
    if (editorState.currentMode === 'add-text') {
        // Position at the beginning of the box (left edge + 8px, vertically centered)
        const startX = targetBox.x + 8;
        const startY = targetBox.y + (targetBox.height / 2);
        openNewFieldEditor(startX, startY, targetBox);
    }
}

// Open active inline text editor for form fields & custom text
function openNewFieldEditor(clickX, clickY, targetBox) {
    const pageObj = editorState.pagesData[editorState.currentPage];

    const box = document.createElement('div');
    box.className = 'editor-textbox editing';
    box.style.left = `${clickX}px`;
    box.style.top = `${clickY}px`;
    box.style.transform = 'translateY(-50%)';
    box.style.textAlign = editorState.alignment || 'left';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pdf-text-block-input';
    input.placeholder = 'Type here...';
    input.style.fontSize = `${editorState.fontSize || 15}px`;
    input.style.color = editorState.color || '#0F172A';
    input.style.fontWeight = editorState.bold ? 'bold' : 'normal';
    input.style.textAlign = editorState.alignment || 'left';
    input.style.width = targetBox ? `${Math.min(targetBox.width - 20, 160)}px` : '120px';
    input.style.maxWidth = targetBox ? `${targetBox.width - 16}px` : '450px';

    const actionsBar = document.createElement('div');
    actionsBar.className = 'pdf-text-block-actions';
    actionsBar.innerHTML = `
        <button class="pdf-action-btn pdf-action-save" title="Save (Enter)"><i class="fa-solid fa-check"></i> Done</button>
        <button class="pdf-action-btn pdf-action-cancel" title="Cancel (Esc)"><i class="fa-solid fa-times"></i> Cancel</button>
    `;

    box.appendChild(actionsBar);
    box.appendChild(input);
    editorTextOverlay.appendChild(box);

    input.focus();

    // Auto-expand input width as user types
    input.addEventListener('input', () => {
        const estWidth = Math.max(100, input.value.length * ((editorState.fontSize || 15) * 0.65) + 30);
        const maxW = targetBox ? (targetBox.width - 16) : 500;
        input.style.width = `${Math.min(estWidth, maxW)}px`;
    });

    let isDone = false;

    const commitField = () => {
        if (isDone) return;
        isDone = true;

        const val = input.value.trim();
        if (box.parentNode) {
            editorTextOverlay.removeChild(box);
        }

        if (val !== '') {
            const newBox = {
                id: `user_tb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                boxId: targetBox ? targetBox.id : null,
                x: clickX,
                y: clickY,
                boxWidth: targetBox ? targetBox.width : null,
                boxHeight: targetBox ? targetBox.height : null,
                text: val,
                fontSize: editorState.fontSize || 15,
                color: editorState.color || '#0F172A',
                bold: editorState.bold,
                align: editorState.alignment || 'left'
            };
            pageObj.addedTextboxes.push(newBox);
            renderAddedTextbox(newBox, pageObj.addedTextboxes.length - 1);
            recordEditorAction();
        }
    };

    const cancelField = () => {
        if (isDone) return;
        isDone = true;
        if (box.parentNode) {
            editorTextOverlay.removeChild(box);
        }
    };

    actionsBar.querySelector('.pdf-action-save').addEventListener('click', (e) => {
        e.stopPropagation();
        commitField();
    });

    actionsBar.querySelector('.pdf-action-cancel').addEventListener('click', (e) => {
        e.stopPropagation();
        cancelField();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitField();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelField();
        }
    });

    const onOutside = (e) => {
        if (!box.contains(e.target)) {
            window.removeEventListener('mousedown', onOutside);
            commitField();
        }
    };
    setTimeout(() => {
        window.addEventListener('mousedown', onOutside);
    }, 100);
}

// Render User Added / Form Field Text Box with Click-to-Edit & Delete
function renderAddedTextbox(tbData, index) {
    const box = document.createElement('div');
    box.id = tbData.id;
    box.className = 'editor-textbox';
    box.style.left = `${tbData.x}px`;
    box.style.top = `${tbData.y}px`;
    box.style.transform = 'translateY(-50%)';
    box.style.textAlign = tbData.align || 'left';

    const content = document.createElement('div');
    content.className = 'editor-textbox-content';
    content.innerText = tbData.text;
    content.style.fontSize = `${tbData.fontSize}px`;
    content.style.color = tbData.color || '#0F172A';
    content.style.fontWeight = tbData.bold ? 'bold' : 'normal';
    content.style.textAlign = tbData.align || 'left';

    const delBtn = document.createElement('div');
    delBtn.className = 'editor-textbox-delete';
    delBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    delBtn.title = "Delete text";
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pageObj = editorState.pagesData[editorState.currentPage];
        const findIdx = pageObj.addedTextboxes.indexOf(tbData);
        if (findIdx >= 0) pageObj.addedTextboxes.splice(findIdx, 1);
        if (box.parentNode) editorTextOverlay.removeChild(box);
        recordEditorAction();
    });

    // Clicking added text re-opens inline editor
    box.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editorState.currentMode === 'edit-text' || editorState.currentMode === 'add-text' || editorState.currentMode === 'text') {
            const pageObj = editorState.pagesData[editorState.currentPage];
            const targetBox = (pageObj && pageObj.detectedBoxes) ? pageObj.detectedBoxes.find(b => b.id === tbData.boxId) : null;
            reEditAddedTextbox(box, tbData, targetBox);
        }
    });

    box.appendChild(content);
    box.appendChild(delBtn);
    editorTextOverlay.appendChild(box);
}

// Re-edit previously typed form text
function reEditAddedTextbox(boxEl, tbData, targetBox) {
    if (boxEl.classList.contains('editing')) return;

    boxEl.classList.add('editing');
    boxEl.innerHTML = '';

    const actionsBar = document.createElement('div');
    actionsBar.className = 'pdf-text-block-actions';
    actionsBar.innerHTML = `
        <button class="pdf-action-btn pdf-action-save" title="Save (Enter)"><i class="fa-solid fa-check"></i> Done</button>
        <button class="pdf-action-btn pdf-action-cancel" title="Cancel (Esc)"><i class="fa-solid fa-times"></i> Cancel</button>
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pdf-text-block-input';
    input.value = tbData.text;
    input.style.fontSize = `${tbData.fontSize}px`;
    input.style.color = tbData.color || '#0F172A';
    input.style.fontWeight = tbData.bold ? 'bold' : 'normal';
    input.style.textAlign = tbData.align || editorState.alignment || 'left';
    input.style.width = `${Math.max(tbData.text.length * (tbData.fontSize * 0.65) + 30, 80)}px`;
    input.style.maxWidth = targetBox ? `${targetBox.width - 16}px` : '450px';

    input.addEventListener('input', () => {
        const estWidth = Math.max(80, input.value.length * (tbData.fontSize * 0.65) + 30);
        const maxW = targetBox ? (targetBox.width - 16) : 500;
        input.style.width = `${Math.min(estWidth, maxW)}px`;
    });

    boxEl.appendChild(actionsBar);
    boxEl.appendChild(input);
    input.focus();
    input.select();

    let isDone = false;

    const commitReEdit = () => {
        if (isDone) return;
        isDone = true;

        const val = input.value.trim();
        boxEl.classList.remove('editing');

        if (val !== '') {
            tbData.text = val;
            tbData.align = editorState.alignment || tbData.align || 'left';
            boxEl.style.textAlign = tbData.align;
            boxEl.innerHTML = `
                <div class="editor-textbox-content" style="font-size: ${tbData.fontSize}px; color: ${tbData.color}; font-weight: ${tbData.bold ? 'bold' : 'normal'}; text-align: ${tbData.align};">${val}</div>
                <div class="editor-textbox-delete" title="Delete text"><i class="fa-solid fa-times"></i></div>
            `;
            boxEl.querySelector('.editor-textbox-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                const pageObj = editorState.pagesData[editorState.currentPage];
                const findIdx = pageObj.addedTextboxes.indexOf(tbData);
                if (findIdx >= 0) pageObj.addedTextboxes.splice(findIdx, 1);
                if (boxEl.parentNode) editorTextOverlay.removeChild(boxEl);
                recordEditorAction();
            });
            recordEditorAction();
        } else {
            const pageObj = editorState.pagesData[editorState.currentPage];
            const findIdx = pageObj.addedTextboxes.indexOf(tbData);
            if (findIdx >= 0) pageObj.addedTextboxes.splice(findIdx, 1);
            if (boxEl.parentNode) editorTextOverlay.removeChild(boxEl);
            recordEditorAction();
        }
    };

    const cancelReEdit = () => {
        if (isDone) return;
        isDone = true;
        boxEl.classList.remove('editing');
        boxEl.innerHTML = `
            <div class="editor-textbox-content" style="font-size: ${tbData.fontSize}px; color: ${tbData.color}; font-weight: ${tbData.bold ? 'bold' : 'normal'}; text-align: ${tbData.align || 'left'};">${tbData.text}</div>
            <div class="editor-textbox-delete" title="Delete text"><i class="fa-solid fa-times"></i></div>
        `;
        boxEl.querySelector('.editor-textbox-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            const pageObj = editorState.pagesData[editorState.currentPage];
            const findIdx = pageObj.addedTextboxes.indexOf(tbData);
            if (findIdx >= 0) pageObj.addedTextboxes.splice(findIdx, 1);
            if (boxEl.parentNode) editorTextOverlay.removeChild(boxEl);
        });
    };

    actionsBar.querySelector('.pdf-action-save').addEventListener('click', (e) => {
        e.stopPropagation();
        commitReEdit();
    });

    actionsBar.querySelector('.pdf-action-cancel').addEventListener('click', (e) => {
        e.stopPropagation();
        cancelReEdit();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitReEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelReEdit();
        }
    });

    const onOutside = (e) => {
        if (!boxEl.contains(e.target)) {
            window.removeEventListener('mousedown', onOutside);
            commitReEdit();
        }
    };
    setTimeout(() => {
        window.addEventListener('mousedown', onOutside);
    }, 100);
}

// Whiteout Tool Handlers
editorTextOverlay.addEventListener('mousedown', (e) => {
    if (editorState.currentMode !== 'whiteout') return;
    if (e.target.closest('.editor-whiteout-delete')) return;

    e.preventDefault();
    const rect = editorTextOverlay.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    const previewWhiteout = document.createElement('div');
    previewWhiteout.className = 'editor-whiteout-rect preview-whiteout';
    previewWhiteout.style.left = `${startX}px`;
    previewWhiteout.style.top = `${startY}px`;
    previewWhiteout.style.pointerEvents = 'none';
    editorTextOverlay.appendChild(previewWhiteout);

    function onMouseMove(moveEvent) {
        const curX = moveEvent.clientX - rect.left;
        const curY = moveEvent.clientY - rect.top;
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);
        previewWhiteout.style.left = `${x}px`;
        previewWhiteout.style.top = `${y}px`;
        previewWhiteout.style.width = `${w}px`;
        previewWhiteout.style.height = `${h}px`;
    }

    function onMouseUp(upEvent) {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const curX = upEvent.clientX - rect.left;
        const curY = upEvent.clientY - rect.top;
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);

        if (previewWhiteout.parentNode) {
            editorTextOverlay.removeChild(previewWhiteout);
        }

        if (w >= 4 && h >= 4) {
            const pageObj = editorState.pagesData[editorState.currentPage];
            const whiteoutObj = {
                x: x,
                y: y,
                width: w,
                height: h
            };
            pageObj.whiteouts.push(whiteoutObj);
            renderWhiteoutBox(whiteoutObj, pageObj.whiteouts.length - 1);
            recordEditorAction();
        }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
});

function renderWhiteoutBox(wData, index) {
    const box = document.createElement('div');
    box.className = 'editor-whiteout-rect';
    box.style.left = `${wData.x}px`;
    box.style.top = `${wData.y}px`;
    box.style.width = `${wData.width}px`;
    box.style.height = `${wData.height}px`;

    const delBtn = document.createElement('div');
    delBtn.className = 'editor-whiteout-delete';
    delBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
    delBtn.title = "Remove whiteout box";
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pageObj = editorState.pagesData[editorState.currentPage];
        const findIdx = pageObj.whiteouts.indexOf(wData);
        if (findIdx >= 0) pageObj.whiteouts.splice(findIdx, 1);
        if (box.parentNode) editorTextOverlay.removeChild(box);
        recordEditorAction();
    });

    box.appendChild(delBtn);
    editorTextOverlay.appendChild(box);
}

// Freehand Drawing & Highlighter Events
function getCanvasCoords(e) {
    const rect = editorDrawCanvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(pt) {
    editorState.isDrawing = true;
    editorState.lastX = pt.x;
    editorState.lastY = pt.y;

    const ctx = editorDrawCanvas.getContext('2d');
    ctx.beginPath();

    if (editorState.currentMode === 'highlight') {
        const hColor = (editorState.color && editorState.color !== '#000000') ? editorState.color : '#FACC15';
        ctx.strokeStyle = hColor;
        ctx.fillStyle = hColor;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.4;
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const dColor = editorState.color || '#000000';
        ctx.strokeStyle = dColor;
        ctx.fillStyle = dColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1.0;
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
}

function drawMove(pt) {
    if (!editorState.isDrawing) return;
    const ctx = editorDrawCanvas.getContext('2d');

    if (editorState.currentMode === 'highlight') {
        const hColor = (editorState.color && editorState.color !== '#000000') ? editorState.color : '#FACC15';
        ctx.strokeStyle = hColor;
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.4;
    } else {
        const dColor = editorState.color || '#000000';
        ctx.strokeStyle = dColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1.0;
    }

    ctx.beginPath();
    ctx.moveTo(editorState.lastX, editorState.lastY);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    editorState.lastX = pt.x;
    editorState.lastY = pt.y;
}

function stopDrawing() {
    if (editorState.isDrawing) {
        editorState.isDrawing = false;
        saveCurrentPageDrawCanvas();
        recordEditorAction();
    }
}

editorDrawCanvas.addEventListener('mousedown', (e) => {
    if (editorState.currentMode !== 'draw' && editorState.currentMode !== 'highlight') return;
    e.preventDefault();
    startDrawing(getCanvasCoords(e));
});

editorDrawCanvas.addEventListener('mousemove', (e) => {
    if (!editorState.isDrawing) return;
    drawMove(getCanvasCoords(e));
});

window.addEventListener('mouseup', () => {
    if (editorState.isDrawing) {
        stopDrawing();
    }
});

editorDrawCanvas.addEventListener('mouseleave', () => {
    if (editorState.isDrawing) {
        stopDrawing();
    }
});

editorDrawCanvas.addEventListener('touchstart', (e) => {
    if (editorState.currentMode !== 'draw' && editorState.currentMode !== 'highlight') return;
    e.preventDefault();
    startDrawing(getCanvasCoords(e));
}, { passive: false });

editorDrawCanvas.addEventListener('touchmove', (e) => {
    if (!editorState.isDrawing) return;
    e.preventDefault();
    drawMove(getCanvasCoords(e));
}, { passive: false });

editorDrawCanvas.addEventListener('touchend', () => {
    if (editorState.isDrawing) {
        stopDrawing();
    }
});

// Save and Export Edited PDF
editorSaveBtn.addEventListener('click', async () => {
    saveCurrentPageDrawCanvas();
    editorSaveBtn.disabled = true;
    editorSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving PDF...';

    try {
        const { PDFDocument } = PDFLib;
        const finalPdf = await PDFDocument.create();

        for (let pageNum = 1; pageNum <= editorState.totalPages; pageNum++) {
            const page = await editorState.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // 2.0x Retina scale export

            const compCanvas = document.createElement('canvas');
            compCanvas.width = viewport.width;
            compCanvas.height = viewport.height;
            const compCtx = compCanvas.getContext('2d');

            // 1. Render Base PDF Page
            await page.render({ canvasContext: compCtx, viewport: viewport }).promise;

            const pageObj = editorState.pagesData[pageNum] || { editedBlocks: [], addedTextboxes: [], whiteouts: [], drawCanvasData: null };
            const scaleMultiplier = 2.0 / editorState.scale;

            // 2. Erase and Replace Edited Text Blocks
            pageObj.editedBlocks.forEach(eb => {
                const tx = eb.origX * scaleMultiplier;
                const ty = eb.origY * scaleMultiplier;
                const tw = eb.origWidth * scaleMultiplier;
                const th = eb.origHeight * scaleMultiplier;
                const fSize = eb.fontSize * scaleMultiplier;

                // Erase old text on PDF with clean white rectangle
                compCtx.fillStyle = '#FFFFFF';
                compCtx.fillRect(tx - 2, ty - 2, tw + 8, th + 4);

                // Draw replacement text
                compCtx.fillStyle = eb.color || '#000000';
                compCtx.font = `${eb.bold ? 'bold ' : ''}${fSize}px Arial, sans-serif`;
                
                const align = eb.align || 'left';
                compCtx.textAlign = align;
                compCtx.textBaseline = 'middle';

                let drawX = tx;
                if (align === 'center') {
                    drawX = tx + (tw / 2);
                } else if (align === 'right') {
                    drawX = tx + tw;
                }
                const drawY = ty + (th / 2);

                compCtx.fillText(eb.newText, drawX, drawY);
            });

            // 3. Render Whiteouts
            pageObj.whiteouts.forEach(w => {
                compCtx.fillStyle = '#FFFFFF';
                compCtx.fillRect(
                    w.x * scaleMultiplier,
                    w.y * scaleMultiplier,
                    w.width * scaleMultiplier,
                    w.height * scaleMultiplier
                );
            });

            // 4. Render Drawings / Highlighting
            if (pageObj.drawCanvasData) {
                await new Promise((resolve) => {
                    const img = new Image();
                    img.src = pageObj.drawCanvasData;
                    img.onload = () => {
                        compCtx.drawImage(img, 0, 0, compCanvas.width, compCanvas.height);
                        resolve();
                    };
                    img.onerror = resolve;
                });
            }

            // 5. Render User Added Text Boxes
            pageObj.addedTextboxes.forEach(tb => {
                const tx = tb.x * scaleMultiplier;
                const ty = tb.y * scaleMultiplier;
                const fSize = tb.fontSize * scaleMultiplier;
                const align = tb.align || 'left';

                compCtx.fillStyle = tb.color || '#000000';
                compCtx.font = `${tb.bold ? 'bold ' : ''}${fSize}px Arial, sans-serif`;
                compCtx.textAlign = align;
                compCtx.textBaseline = 'middle';

                const lines = (tb.text || '').split('\n');
                const totalHeight = lines.length * fSize * 1.25;
                const startY = ty - (totalHeight / 2) + ((fSize * 1.25) / 2);

                lines.forEach((line, lIdx) => {
                    let drawX = tx;
                    if (align === 'center' && tb.boxWidth) {
                        drawX = tx + (tb.boxWidth * scaleMultiplier / 2);
                    } else if (align === 'right' && tb.boxWidth) {
                        drawX = tx + (tb.boxWidth * scaleMultiplier);
                    }
                    compCtx.fillText(line, drawX, startY + (lIdx * fSize * 1.25));
                });
            });

            // Embed into PDF-Lib
            const pageDataUrl = compCanvas.toDataURL('image/jpeg', 0.95);
            const pageBytes = await fetch(pageDataUrl).then(r => r.arrayBuffer());
            const embeddedImg = await finalPdf.embedJpg(pageBytes);

            const origWidth = viewport.width / 2.0;
            const origHeight = viewport.height / 2.0;
            const newPdfPage = finalPdf.addPage([origWidth, origHeight]);
            newPdfPage.drawImage(embeddedImg, {
                x: 0,
                y: 0,
                width: origWidth,
                height: origHeight
            });
        }

        const finalPdfBytes = await finalPdf.save();
        downloadFile(finalPdfBytes, `${getBaseFilename(editorState.fileName)}_edited.pdf`, 'application/pdf');

    } catch (err) {
        showSafeUserError(err, 'Failed to save edited PDF. Please check your text inputs and annotations and try again.');
    } finally {
        editorSaveBtn.disabled = false;
        editorSaveBtn.innerHTML = '<i class="fa-solid fa-download"></i> Save & Download PDF';
    }
});

// =========================================================
// 1. IMAGE COMPRESSION - IN-BROWSER
// =========================================================
async function compressImages() {
    const levelRadio = document.querySelector('input[name="compression-level"]:checked');
    const level = levelRadio ? levelRadio.value : 'recommended';

    let maxDimension = 1920;
    let quality = 0.70;

    if (level === 'extreme') {
        maxDimension = 1280;
        quality = 0.45;
    } else if (level === 'low') {
        maxDimension = 2560;
        quality = 0.85;
    }

    let totalOriginal = 0;
    let totalCompressed = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessing(true, `Compressing image ${i + 1} of ${selectedFiles.length}: ${file.name}...`);
        
        totalOriginal += file.size;

        const compressedBlob = await new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                let { width, height } = img;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                if (isPng && level === 'extreme') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.drawImage(img, 0, 0, width, height);

                const outputType = (file.type === 'image/webp' || isPng) ? 'image/webp' : 'image/jpeg';

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Canvas blob creation failed"));
                    }
                }, outputType, quality);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error(`Failed to load image: ${file.name}`));
            };

            img.src = objectUrl;
        });

        totalCompressed += compressedBlob.size;
        
        const ext = file.name.split('.').pop().toLowerCase();
        const outExt = (ext === 'png' && level === 'extreme') ? 'jpg' : ext;
        downloadFile(compressedBlob, `${getBaseFilename(file.name)}_compressed.${outExt}`, compressedBlob.type);
    }

    const savedPercent = Math.max(0, Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100));

    const formatSize = (bytes) => bytes > 1024 * 1024 
        ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
        : (bytes / 1024).toFixed(1) + ' KB';

    resultCard.style.display = 'flex';
    resultCard.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size: 20px;"></i>
        <span><strong>Image Compression Complete!</strong> Total: ${formatSize(totalOriginal)} &rarr; ${formatSize(totalCompressed)} (${savedPercent}% saved across ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''})</span>
    `;
}

// =========================================================
// 2. PDF COMPRESSION - IN-BROWSER
// =========================================================
async function compressPdf() {
    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();
    
    const levelRadio = document.querySelector('input[name="compression-level"]:checked');
    const level = levelRadio ? levelRadio.value : 'recommended';
    
    let scale = 1.35;
    let quality = 0.68;
    
    if (level === 'extreme') {
        scale = 1.0;
        quality = 0.48;
    } else if (level === 'low') {
        scale = 1.8;
        quality = 0.84;
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const { PDFDocument } = PDFLib;
    const newPdfDoc = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
        setProcessing(true, `Compressing page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
        
        const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);
        
        const origWidth = viewport.width / scale;
        const origHeight = viewport.height / scale;
        const newPage = newPdfDoc.addPage([origWidth, origHeight]);
        newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: origWidth,
            height: origHeight,
        });
    }

    setProcessing(true, 'Compiling compressed PDF...');
    const compressedPdfBytes = await newPdfDoc.save({ useObjectStreams: true });
    
    const originalSize = file.size;
    const compressedSize = compressedPdfBytes.length;
    const savedPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

    const formatSize = (bytes) => bytes > 1024 * 1024 
        ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
        : (bytes / 1024).toFixed(1) + ' KB';

    resultCard.style.display = 'flex';
    resultCard.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size: 20px;"></i>
        <span><strong>Compression Complete!</strong> Original: ${formatSize(originalSize)} &rarr; Compressed: ${formatSize(compressedSize)} (${savedPercent}% size reduction)</span>
    `;

    downloadFile(compressedPdfBytes, `${getBaseFilename(file.name)}_compressed.pdf`, 'application/pdf');
}

// =========================================================
// 2B. OFFICE DOCUMENT COMPRESSION (.DOCX, .XLSX, .PPTX) - IN-BROWSER
// =========================================================
async function compressOfficeDocuments() {
    if (!selectedFiles || selectedFiles.length === 0) {
        throw new Error('Please select at least one .docx, .xlsx, or .pptx file.');
    }

    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded. Please refresh the page.');
    }

    const levelRadio = document.querySelector('input[name="compression-level"]:checked');
    const level = levelRadio ? levelRadio.value : 'recommended';

    // Compression profiles - 100% document structure preserving
    let maxDimension = 1280;
    let jpegQuality = 0.65;
    let levelLabel = 'Good Compression';

    if (level === 'extreme') {
        maxDimension = 850;
        jpegQuality = 0.45;
        levelLabel = 'Extreme Compression';
    } else if (level === 'low') {
        maxDimension = 1920;
        jpegQuality = 0.84;
        levelLabel = 'Less Compression';
    }

    let totalOriginal = 0;
    let totalCompressed = 0;
    const processedFiles = [];

    const formatSize = (bytes) => bytes > 1024 * 1024 
        ? (bytes / (1024 * 1024)).toFixed(2) + ' MB'
        : (bytes / 1024).toFixed(1) + ' KB';

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const ext = file.name.split('.').pop().toLowerCase();

        setProcessing(true, `Reading ${file.name} (${i + 1} of ${selectedFiles.length})...`);
        totalOriginal += file.size;

        let docMime = 'application/octet-stream';
        if (ext === 'docx') docMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'xlsx') docMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'pptx') docMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

        // Load document zip archive
        const zip = await JSZip.loadAsync(file);

        // Scan exclusively for embedded media images inside user document media folders
        // Preserving all XMLs, theme definitions, and relationship files completely intact
        const mediaEntries = [];
        const videoAudioEntries = [];
        let totalVideoAudioBytes = 0;

        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;

            // Target user media in word/media/, ppt/media/, or xl/media/
            if (/(^|\/)(word|ppt|xl)\/media\/.*\.(jpe?g|png|bmp|webp)$/i.test(relativePath)) {
                mediaEntries.push({ path: relativePath, entry: zipEntry });
            } else if (/\.(mp4|mov|m4a|mp3|wav|avi|wmv|mkv)$/i.test(relativePath)) {
                videoAudioEntries.push({ path: relativePath, entry: zipEntry });
            }
        });

        let optimizedImagesCount = 0;

        if (mediaEntries.length > 0) {
            for (let m = 0; m < mediaEntries.length; m++) {
                const { path: relPath, entry: zipEntry } = mediaEntries[m];
                setProcessing(true, `Optimizing media in ${file.name} (${m + 1} of ${mediaEntries.length})...`);

                try {
                    const rawBytes = await zipEntry.async('uint8array');
                    const isJpeg = /\.(jpe?g)$/i.test(relPath);
                    const isPng = /\.png$/i.test(relPath);

                    const mimeType = isJpeg ? 'image/jpeg' : (isPng ? 'image/png' : 'image/webp');
                    const imgBlob = new Blob([rawBytes], { type: mimeType });
                    const imgUrl = URL.createObjectURL(imgBlob);

                    const img = new Image();
                    const loaded = await new Promise((resolve) => {
                        img.onload = () => resolve(true);
                        img.onerror = () => resolve(false);
                        img.src = imgUrl;
                    });
                    URL.revokeObjectURL(imgUrl);

                    if (loaded && img.width > 0 && img.height > 0) {
                        let width = img.width;
                        let height = img.height;

                        if (width > maxDimension || height > maxDimension) {
                            if (width > height) {
                                height = Math.round((height * maxDimension) / width);
                                width = maxDimension;
                            } else {
                                width = Math.round((width * maxDimension) / height);
                                height = maxDimension;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // CRITICAL: Preserve the exact same file format and name to avoid OpenXML corruption!
                        // JPEGs stay JPEGs, PNGs stay PNGs.
                        const outType = isJpeg ? 'image/jpeg' : 'image/png';
                        const outQuality = isJpeg ? jpegQuality : undefined;
                        const compressedImgBlob = await new Promise(resolve => canvas.toBlob(resolve, outType, outQuality));

                        if (compressedImgBlob && compressedImgBlob.size > 0) {
                            const newBuffer = await compressedImgBlob.arrayBuffer();
                            const newUint8 = new Uint8Array(newBuffer);

                            // Only replace in-place if size was actually reduced
                            if (newUint8.length < rawBytes.length) {
                                zip.file(relPath, newUint8, { binary: true });
                                optimizedImagesCount++;
                            }
                        }
                    }
                } catch (imgErr) {
                    console.warn(`Could not optimize ${relPath}:`, imgErr);
                }
            }
        }

        // Calculate size of any video/audio files
        for (const vEntry of videoAudioEntries) {
            try {
                const vBytes = await vEntry.entry.async('uint8array');
                totalVideoAudioBytes += vBytes.length;
            } catch (e) {}
        }

        setProcessing(true, `Packaging compressed ${file.name}...`);
        // Standard DEFLATE compression compatible with all versions of Microsoft Office
        const compressedBlob = await zip.generateAsync({
            type: 'blob',
            mimeType: docMime,
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            setProcessing(true, `Rebuilding ${file.name} (${Math.round(metadata.percent)}%)...`);
        });

        // If compressed size is smaller, use compressed version; otherwise keep original
        const finalBlob = (compressedBlob.size <= file.size) ? compressedBlob : file;
        totalCompressed += finalBlob.size;

        const outName = `${getBaseFilename(file.name)}_compressed.${ext}`;
        processedFiles.push({
            name: outName,
            originalSize: file.size,
            compressedSize: finalBlob.size,
            blob: finalBlob,
            mime: docMime,
            optimizedImages: optimizedImagesCount,
            videoAudioBytes: totalVideoAudioBytes,
            videoAudioCount: videoAudioEntries.length
        });

        // Trigger download of the verified file
        downloadFile(finalBlob, outName, docMime);
    }

    const savedBytes = Math.max(0, totalOriginal - totalCompressed);
    const savedPercent = totalOriginal > 0 ? Math.round((savedBytes / totalOriginal) * 100) : 0;

    resultCard.style.display = 'flex';
    resultCard.style.flexDirection = 'column';
    resultCard.style.gap = '12px';

    let filesSummaryHtml = processedFiles.map(f => {
        const fileSaved = f.originalSize > 0 ? Math.max(0, Math.round(((f.originalSize - f.compressedSize) / f.originalSize) * 100)) : 0;
        let detailHints = [];
        if (f.optimizedImages > 0) detailHints.push(`${f.optimizedImages} embedded image${f.optimizedImages > 1 ? 's' : ''} optimized`);
        if (f.videoAudioCount > 0) detailHints.push(`Notice: ${f.videoAudioCount} embedded video/audio (${formatSize(f.videoAudioBytes)}) preserved`);

        return `<div style="display: flex; flex-direction: column; gap: 4px; width: 100%; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed #A7F3D0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fa-solid fa-file"></i> <strong>${f.name}</strong></span>
                <span>${formatSize(f.originalSize)} &rarr; ${formatSize(f.compressedSize)} <strong style="color: #059669;">(-${fileSaved}%)</strong></span>
            </div>
            ${detailHints.length > 0 ? `<div style="font-size: 12px; color: #047857; margin-left: 20px;"><i class="fa-solid fa-circle-info"></i> ${detailHints.join(' &bull; ')}</div>` : ''}
        </div>`;
    }).join('');

    resultCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-circle-check" style="font-size: 24px; color: #059669;"></i>
            <div>
                <strong style="font-size: 15px; color: #065F46;">Office Compression Complete (${levelLabel})!</strong>
                <p style="margin: 2px 0 0 0; font-size: 13px; color: #047857;">Total: ${formatSize(totalOriginal)} &rarr; ${formatSize(totalCompressed)} (${savedPercent}% size reduction across ${processedFiles.length} file${processedFiles.length > 1 ? 's' : ''})</p>
            </div>
        </div>
        <div style="width: 100%; margin-top: 4px;">
            ${filesSummaryHtml}
        </div>
    `;
}

// =========================================================
// 3. PDF TO WORD (.DOCX) - IN-BROWSER
// =========================================================
async function convertPdfToWord() {
    const docxLib = window.docxBuilder || window.docx;
    if (!docxLib || !docxLib.Document) {
        throw new Error("Docx library is not loaded properly. Please refresh the page.");
    }

    const AlignmentType = docxLib.AlignmentType || { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'both' };
    const HeadingLevel = docxLib.HeadingLevel || { HEADING_1: 'Heading1', HEADING_2: 'Heading2' };

    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const docChildren = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setProcessing(true, `Analyzing layout & extracting styles from page ${pageNum} of ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        
        if (pageNum > 1) {
            docChildren.push(new docxLib.Paragraph({
                children: [],
                pageBreakBefore: true
            }));
        }

        const lineGroups = [];
        textContent.items.forEach(item => {
            if (!item.str || item.str.trim() === '') return;
            const x = item.transform[4];
            const y = item.transform[5];
            const height = item.height || Math.abs(item.transform[0]) || 12;
            const fontName = item.fontName || '';
            const fontObj = textContent.styles ? textContent.styles[fontName] : null;

            const lowerFont = (fontName + ' ' + (fontObj ? fontObj.fontFamily : '')).toLowerCase();
            const bold = lowerFont.includes('bold') || lowerFont.includes('black') || lowerFont.includes('heavy') || lowerFont.includes('semibold') || lowerFont.includes('w7') || lowerFont.includes('w8') || lowerFont.includes('w9');
            const italics = lowerFont.includes('italic') || lowerFont.includes('oblique');
            const font = (fontObj && fontObj.fontFamily) ? fontObj.fontFamily.replace(/,.*/, '').replace(/["']/g, '') : 'Calibri';

            let group = lineGroups.find(g => Math.abs(g.y - y) <= 4.0);
            if (!group) {
                group = { y: y, items: [] };
                lineGroups.push(group);
            }
            group.items.push({
                x,
                str: item.str,
                width: item.width || (item.str.length * (height * 0.5)),
                height,
                bold,
                italics,
                font
            });
        });

        lineGroups.sort((a, b) => b.y - a.y);

        let i = 0;
        while (i < lineGroups.length) {
            const tableLines = [];
            let j = i;
            while (j < lineGroups.length) {
                const line = lineGroups[j];
                line.items.sort((a, b) => a.x - b.x);
                
                const distinctColumns = countDistinctColumns(line.items);
                if (distinctColumns >= 2) {
                    tableLines.push(line);
                    j++;
                } else {
                    break;
                }
            }

            if (tableLines.length >= 2) {
                const tableElement = createDocxTable(tableLines, pageWidth, docxLib);
                if (tableElement) {
                    docChildren.push(tableElement);
                    docChildren.push(new docxLib.Paragraph({ text: "", spacing: { after: 120 } }));
                    i = j;
                    continue;
                }
            }

            const line = lineGroups[i];
            line.items.sort((a, b) => a.x - b.x);

            const minX = line.items[0].x;
            const lastItem = line.items[line.items.length - 1];
            const maxX = lastItem.x + lastItem.width;
            const lineWidth = maxX - minX;
            const avgHeight = line.items.reduce((sum, item) => sum + item.height, 0) / line.items.length;

            let alignment = AlignmentType.LEFT || 'left';
            if (Math.abs((pageWidth / 2) - (minX + lineWidth / 2)) < 35 && lineWidth < pageWidth * 0.75) {
                alignment = AlignmentType.CENTER || 'center';
            } else if (pageWidth - maxX < 70 && minX > 100) {
                alignment = AlignmentType.RIGHT || 'right';
            }

            const textRuns = [];
            for (let k = 0; k < line.items.length; k++) {
                const cur = line.items[k];
                if (k > 0) {
                    const prev = line.items[k - 1];
                    const gap = cur.x - (prev.x + prev.width);
                    if (gap > 4) {
                        textRuns.push(new docxLib.TextRun({ text: " " }));
                    }
                }

                textRuns.push(new docxLib.TextRun({
                    text: cur.str,
                    bold: cur.bold,
                    italics: cur.italics,
                    font: cur.font,
                    size: Math.round(cur.height * 2.0)
                }));
            }

            const isHeading = avgHeight >= 16;
            const spacingBefore = (i > 0 && Math.abs(lineGroups[i-1].y - line.y) > avgHeight * 2.2) ? 200 : 60;

            docChildren.push(new docxLib.Paragraph({
                children: textRuns,
                alignment: alignment,
                heading: isHeading ? (avgHeight >= 20 ? (HeadingLevel.HEADING_1 || "Heading1") : (HeadingLevel.HEADING_2 || "Heading2")) : undefined,
                spacing: { before: spacingBefore, after: 80, line: 276 }
            }));

            i++;
        }
    }

    const doc = new docxLib.Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 720,
                        right: 720,
                        bottom: 720,
                        left: 720
                    }
                }
            },
            children: docChildren.length > 0 ? docChildren : [new docxLib.Paragraph({ text: "Empty PDF document" })]
        }]
    });

    const blob = await docxLib.Packer.toBlob(doc);
    downloadFile(blob, `${getBaseFilename(file.name)}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}

function countDistinctColumns(items) {
    if (items.length < 2) return 1;
    let count = 1;
    for (let k = 1; k < items.length; k++) {
        const gap = items[k].x - (items[k - 1].x + items[k - 1].width);
        if (gap >= 20) count++;
    }
    return count;
}

function createDocxTable(tableLines, pageWidth, docxLibPassed) {
    const docxLib = docxLibPassed || window.docxBuilder || window.docx;
    if (!docxLib) return null;

    const WidthType = docxLib.WidthType || { PERCENTAGE: 'pct' };
    const BorderStyle = docxLib.BorderStyle || { SINGLE: 'single' };

    try {
        const columnXPositions = [];
        tableLines.forEach(line => {
            line.items.forEach(item => {
                const matched = columnXPositions.find(x => Math.abs(x - item.x) <= 25);
                if (!matched) {
                    columnXPositions.push(item.x);
                }
            });
        });
        columnXPositions.sort((a, b) => a - b);
        const numCols = Math.max(2, columnXPositions.length);

        const rows = tableLines.map((line, rowIdx) => {
            const cellsText = Array(numCols).fill(null).map(() => []);

            line.items.forEach(item => {
                let bestCol = 0;
                let minDist = 9999;
                columnXPositions.forEach((colX, colIdx) => {
                    const dist = Math.abs(colX - item.x);
                    if (dist < minDist) {
                        minDist = dist;
                        bestCol = colIdx;
                    }
                });
                cellsText[bestCol].push(item);
            });

            const cells = cellsText.map(colItems => {
                const runs = [];
                colItems.forEach((it, idx) => {
                    if (idx > 0) runs.push(new docxLib.TextRun({ text: " " }));
                    runs.push(new docxLib.TextRun({
                        text: it.str,
                        bold: it.bold || (rowIdx === 0),
                        italics: it.italics,
                        size: Math.round(it.height * 2.0)
                    }));
                });

                return new docxLib.TableCell({
                    children: [new docxLib.Paragraph({ children: runs.length > 0 ? runs : [new docxLib.TextRun({ text: "" })] })],
                    shading: (rowIdx === 0) ? { fill: "F1F5F9" } : (rowIdx % 2 === 1 ? { fill: "F8FAFC" } : undefined),
                    margins: { top: 100, bottom: 100, left: 120, right: 120 }
                });
            });

            return new docxLib.TableRow({
                children: cells,
                tableHeader: rowIdx === 0
            });
        });

        return new docxLib.Table({
            rows: rows,
            width: { size: 100, type: WidthType.PERCENTAGE || 'pct' },
            borders: {
                top: { style: BorderStyle.SINGLE || 'single', size: 4, color: "CBD5E1" },
                bottom: { style: BorderStyle.SINGLE || 'single', size: 4, color: "CBD5E1" },
                left: { style: BorderStyle.SINGLE || 'single', size: 4, color: "CBD5E1" },
                right: { style: BorderStyle.SINGLE || 'single', size: 4, color: "CBD5E1" },
                insideHorizontal: { style: BorderStyle.SINGLE || 'single', size: 2, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE || 'single', size: 2, color: "E2E8F0" }
            }
        });
    } catch (e) {
        console.error("Table creation error fallback:", e);
        return null;
    }
}

// =========================================================
// 4. PDF TO EXCEL (.XLSX) - IN-BROWSER
// =========================================================
async function convertPdfToExcel() {
    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const wb = XLSX.utils.book_new();
    const sheetMode = document.querySelector('input[name="excel-sheet-mode"]:checked')?.value || 'single';

    if (sheetMode === 'single') {
        const allRows = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            setProcessing(true, `Extracting tables from page ${pageNum} of ${pdf.numPages}...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const lineGroups = [];
            textContent.items.forEach(item => {
                if (!item.str || item.str.trim() === '') return;
                const x = item.transform[4];
                const y = item.transform[5];

                let group = lineGroups.find(g => Math.abs(g.y - y) <= 4);
                if (!group) {
                    group = { y: y, items: [] };
                    lineGroups.push(group);
                }
                group.items.push({ x, str: item.str });
            });

            lineGroups.sort((a, b) => b.y - a.y);

            for (const group of lineGroups) {
                group.items.sort((a, b) => a.x - b.x);
                const rowValues = group.items.map(i => i.str.trim());
                if (rowValues.length > 0 && rowValues.some(val => val !== '')) {
                    allRows.push(rowValues);
                }
            }
        }

        const ws = XLSX.utils.aoa_to_sheet(allRows.length > 0 ? allRows : [["(No text found in PDF)"]]);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    } else {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            setProcessing(true, `Extracting tables from page ${pageNum} of ${pdf.numPages}...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const lineGroups = [];
            textContent.items.forEach(item => {
                if (!item.str || item.str.trim() === '') return;
                const x = item.transform[4];
                const y = item.transform[5];

                let group = lineGroups.find(g => Math.abs(g.y - y) <= 4);
                if (!group) {
                    group = { y: y, items: [] };
                    lineGroups.push(group);
                }
                group.items.push({ x, str: item.str });
            });

            lineGroups.sort((a, b) => b.y - a.y);

            const rows = [];
            for (const group of lineGroups) {
                group.items.sort((a, b) => a.x - b.x);
                const rowValues = group.items.map(i => i.str.trim());
                if (rowValues.length > 0 && rowValues.some(val => val !== '')) {
                    rows.push(rowValues);
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(rows.length > 0 ? rows : [["(No text found on this page)"]]);
            XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
        }
    }

    const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `${getBaseFilename(file.name)}.xlsx`;
    downloadFile(blob, filename, blob.type);

    if (resultCard) {
        resultCard.style.display = 'block';
        const modeDesc = sheetMode === 'single'
            ? `all <strong>${pdf.numPages}</strong> pages merged into a single worksheet`
            : `<strong>${pdf.numPages}</strong> individual page sheets`;
        resultCard.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
                <i class="fa-solid fa-circle-check" style="font-size: 26px; color: var(--excel-green);"></i>
                <h3 style="margin: 0; font-size: 17px; color: #1E293B;">Excel File Converted Successfully!</h3>
            </div>
            <p style="color: #64748B; font-size: 14px; margin: 0;">
                Saved <strong>${filename}</strong> with ${modeDesc}.
            </p>
        `;
    }
}

// =========================================================
// 5. WORD (.DOCX) TO PDF - IN-BROWSER
// =========================================================
async function convertWordToPdf() {
    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();

    if (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
        throw new Error("Please upload a modern Word document (.docx). Legacy binary .doc format is not supported for client-side conversion.");
    }

    setProcessing(true, "Preparing Word document rendering engine...");

    const modal = document.createElement('div');
    modal.id = 'docx-render-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.7);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-y: auto;
        padding: 30px 10px;
        box-sizing: border-box;
    `;

    const statusBanner = document.createElement('div');
    statusBanner.style.cssText = `
        background: #1E293B;
        color: #FFFFFF;
        padding: 14px 28px;
        border-radius: 30px;
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    `;
    statusBanner.innerHTML = `<div class="spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff; width: 18px; height: 18px;"></div> <span>Converting Word document to PDF...</span>`;
    modal.appendChild(statusBanner);

    const renderTarget = document.createElement('div');
    renderTarget.id = 'docx-render-target';
    renderTarget.style.cssText = `
        background: #FFFFFF;
        width: 800px;
        min-height: 1050px;
        padding: 40px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        color: #111827;
        font-family: Arial, Calibri, sans-serif;
        box-sizing: border-box;
    `;
    modal.appendChild(renderTarget);
    document.body.appendChild(modal);

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        let usedDocxPreview = false;

        const renderAsyncFn = (window.docxPreviewLib && window.docxPreviewLib.renderAsync) ||
                              (window.docxPreview && window.docxPreview.renderAsync) || 
                              (window.docx && window.docx.renderAsync);

        if (renderAsyncFn) {
            try {
                statusBanner.querySelector('span').innerText = "Rendering Word layout & styles...";
                renderTarget.style.padding = '0';
                await renderAsyncFn(arrayBuffer, renderTarget, null, {
                    className: "docx-viewer",
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    useBase64URL: true
                });

                const pages = renderTarget.querySelectorAll('.docx-wrapper > section.docx-page, section.docx');
                if (pages && pages.length > 0) {
                    usedDocxPreview = true;
                    for (let p = 0; p < pages.length; p++) {
                        statusBanner.querySelector('span').innerText = `Capturing page ${p + 1} of ${pages.length}...`;
                        const pageEl = pages[p];
                        const canvas = await html2canvas(pageEl, {
                            scale: 2.0,
                            useCORS: true,
                            backgroundColor: '#ffffff',
                            logging: false
                        });

                        const imgData = canvas.toDataURL('image/jpeg', 0.95);
                        const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
                        const pdfImg = await pdfDoc.embedJpg(imgBytes);

                        const a4Width = 595.28;
                        const a4Height = 841.89;
                        const newPdfPage = pdfDoc.addPage([a4Width, a4Height]);
                        newPdfPage.drawImage(pdfImg, {
                            x: 0,
                            y: 0,
                            width: a4Width,
                            height: a4Height
                        });
                    }
                }
            } catch (err) {
                console.warn("docx-preview fallback to mammoth:", err);
                usedDocxPreview = false;
            }
        }

        if (!usedDocxPreview) {
            statusBanner.querySelector('span').innerText = "Parsing document content & formatting...";
            renderTarget.style.padding = '40px';
            const mammothResult = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            const htmlContent = mammothResult.value || "<p>Empty document</p>";

            renderTarget.innerHTML = `
                <style>
                    #docx-render-target h1, #docx-render-target h2, #docx-render-target h3 { color: #0F172A; margin-top: 18px; margin-bottom: 10px; font-family: Arial, sans-serif; }
                    #docx-render-target h1 { font-size: 20pt; font-weight: bold; }
                    #docx-render-target h2 { font-size: 16pt; font-weight: bold; }
                    #docx-render-target h3 { font-size: 13pt; font-weight: bold; }
                    #docx-render-target p { margin-bottom: 12px; font-size: 12pt; line-height: 1.6; }
                    #docx-render-target table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
                    #docx-render-target th, #docx-render-target td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; vertical-align: top; }
                    #docx-render-target th { background-color: #F1F5F9; font-weight: bold; }
                    #docx-render-target ul, #docx-render-target ol { margin: 10px 0 10px 24px; font-size: 12pt; }
                    #docx-render-target li { margin-bottom: 4px; }
                    #docx-render-target img { max-width: 100%; height: auto; display: block; margin: 12px 0; }
                </style>
                ${htmlContent}
            `;

            const images = renderTarget.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(res => { img.onload = res; img.onerror = res; });
            }));

            statusBanner.querySelector('span').innerText = "Compiling document to PDF pages...";
            const canvas = await html2canvas(renderTarget, {
                scale: 2.0,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 800
            });

            const a4Width = 595.28;
            const a4Height = 841.89;
            const canvasPageHeight = (canvas.width / a4Width) * a4Height;
            let currentY = 0;
            let pageIndex = 1;

            while (currentY < canvas.height) {
                const sliceHeight = Math.min(canvasPageHeight, canvas.height - currentY);
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = canvasPageHeight;

                const ctx = pageCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(canvas, 0, currentY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                const sliceData = pageCanvas.toDataURL('image/jpeg', 0.95);
                const sliceBytes = await fetch(sliceData).then(r => r.arrayBuffer());
                const pdfImg = await pdfDoc.embedJpg(sliceBytes);

                const newPage = pdfDoc.addPage([a4Width, a4Height]);
                newPage.drawImage(pdfImg, {
                    x: 0,
                    y: 0,
                    width: a4Width,
                    height: a4Height
                });

                currentY += canvasPageHeight;
                pageIndex++;
            }
        }

        statusBanner.querySelector('span').innerText = "Finalizing PDF file...";
        const finalPdfBytes = await pdfDoc.save();
        downloadFile(finalPdfBytes, `${getBaseFilename(file.name)}.pdf`, 'application/pdf');

    } finally {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
    }
}

// =========================================================
// 6. EXCEL (.XLSX/.XLS/.CSV) TO PDF - IN-BROWSER
// =========================================================
async function convertExcelToPdf() {
    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();

    setProcessing(true, "Parsing Excel workbook sheets...");
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    const jsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    
    if (jsPdfConstructor && typeof jsPdfConstructor === 'function') {
        const doc = new jsPdfConstructor({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        let isFirstSheet = true;

        for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

            if (!rawData || rawData.length === 0) continue;

            if (!isFirstSheet) {
                doc.addPage('a4', 'landscape');
            }
            isFirstSheet = false;

            doc.setFontSize(14);
            doc.setTextColor(30, 58, 138);
            doc.text(`Sheet: ${sheetName}`, 40, 35);

            const headers = (rawData[0] || []).map(cell => String(cell));
            const body = rawData.slice(1).map(row => {
                return headers.map((_, colIdx) => (row[colIdx] !== undefined ? String(row[colIdx]) : ""));
            });

            doc.autoTable({
                head: [headers],
                body: body,
                startY: 50,
                margin: { left: 40, right: 40, top: 40, bottom: 40 },
                theme: 'grid',
                styles: {
                    fontSize: 8.5,
                    cellPadding: 5,
                    textColor: [30, 41, 59],
                    lineColor: [203, 213, 225],
                    lineWidth: 0.5,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                }
            });
        }

        doc.save(`${getBaseFilename(file.name)}.pdf`);
    } else {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        container.style.width = '1120px';
        container.style.padding = '35px';
        container.style.backgroundColor = '#ffffff';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.color = '#1E293B';

        let fullHtml = `
            <style>
                .sheet-header { font-size: 15pt; font-weight: bold; margin: 20px 0 10px 0; color: #1E3A8A; border-bottom: 2px solid #2563EB; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9pt; }
                th, td { border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; }
                tr:nth-child(even) { background-color: #F8FAFC; }
                tr:first-child { background-color: #E2E8F0; font-weight: bold; }
            </style>
        `;

        wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const htmlTable = XLSX.utils.sheet_to_html(ws, { id: `sheet-${sheetName}` });
            fullHtml += `<div class="sheet-header"><i class="fa-solid fa-table"></i> Sheet: ${sheetName}</div>` + htmlTable;
        });

        container.innerHTML = fullHtml;
        document.body.appendChild(container);

        try {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `${getBaseFilename(file.name)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            await html2pdf().set(opt).from(container).save();
        } finally {
            if (container.parentNode) {
                document.body.removeChild(container);
            }
        }
    }
}

// =========================================================
// 7. PDF TO JPG - IN-BROWSER
// =========================================================
async function convertPdfToJpg() {
    const file = selectedFiles[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        canvas.toBlob((blob) => {
            downloadFile(blob, `${getBaseFilename(file.name)}_page_${i}.jpg`, 'image/jpeg');
        }, 'image/jpeg', 0.95);
    }
}

// =========================================================
// 8. JPG TO PDF - IN-BROWSER
// =========================================================
async function convertJpgToPdf() {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();

    for (const file of selectedFiles) {
        const imageBytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });
    }

    const pdfBytes = await pdfDoc.save();
    downloadFile(pdfBytes, 'converted_images.pdf', 'application/pdf');
}

// =========================================================
// 9. MERGE PDF - IN-BROWSER
// =========================================================
async function mergePDFs() {
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (const file of selectedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    downloadFile(mergedPdfBytes, 'merged.pdf', 'application/pdf');
}

// =========================================================
// 10. SPLIT & DELETE PDF PAGES STUDIO - IN-BROWSER
// =========================================================

// Studio DOM Elements
const splitWorkspacePanel = document.getElementById('split-workspace-panel');
const splitFileName = document.getElementById('split-file-name');
const splitChangeFileBtn = document.getElementById('split-change-file-btn');
const splitTotalCount = document.getElementById('split-total-count');
const splitKeptCount = document.getElementById('split-kept-count');
const splitDeletedCount = document.getElementById('split-deleted-count');
const splitSelectAllBtn = document.getElementById('split-select-all');
const splitDeselectAllBtn = document.getElementById('split-deselect-all');
const splitDeleteSelectedBtn = document.getElementById('split-delete-selected');
const splitRestoreAllBtn = document.getElementById('split-restore-all');
const splitRangeInput = document.getElementById('split-range-input');
const splitRangeDeleteBtn = document.getElementById('split-range-delete');
const splitRangeKeepBtn = document.getElementById('split-range-keep');
const splitPagesGrid = document.getElementById('split-pages-grid');
const splitDownloadPdfBtn = document.getElementById('split-download-pdf-btn');
const splitDownloadBtnText = document.getElementById('split-download-btn-text');
const splitExportIndividualBtn = document.getElementById('split-export-individual-btn');

// Studio State
let splitState = {
    file: null,
    arrayBuffer: null,
    pdfDoc: null,        // PDF.js Document for rendering thumbnails
    pdfLibDoc: null,     // PDF-Lib Document for lossless manipulation
    totalPages: 0,
    deletedPages: new Set(),   // 1-based page numbers marked as deleted
    selectedPages: new Set(),  // 1-based page numbers selected for batch actions
    renderSessionId: 0
};

function resetSplitStudio() {
    splitState.renderSessionId++;
    splitState.file = null;
    splitState.arrayBuffer = null;
    splitState.pdfDoc = null;
    splitState.pdfLibDoc = null;
    splitState.totalPages = 0;
    splitState.deletedPages.clear();
    splitState.selectedPages.clear();

    if (splitWorkspacePanel) splitWorkspacePanel.style.display = 'none';
    if (splitPagesGrid) splitPagesGrid.innerHTML = '';
    if (splitRangeInput) splitRangeInput.value = '';
    toolWorkspace.classList.remove('wide-mode');
}

async function initSplitStudio(file) {
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }

    try {
        setProcessing(true, 'Analyzing PDF document & loading pages...');
        splitState.file = file;
        splitState.renderSessionId++;
        const currentSession = splitState.renderSessionId;

        // Read ArrayBuffer
        splitState.arrayBuffer = await file.arrayBuffer();

        // Load into PDF-Lib and PDF.js in parallel
        const [pdfLibDoc, pdfjsDoc] = await Promise.all([
            PDFLib.PDFDocument.load(splitState.arrayBuffer, { ignoreEncryption: true }),
            pdfjsLib.getDocument({ data: splitState.arrayBuffer.slice(0) }).promise
        ]);

        splitState.pdfLibDoc = pdfLibDoc;
        splitState.pdfDoc = pdfjsDoc;
        splitState.totalPages = pdfjsDoc.numPages;
        splitState.deletedPages.clear();
        splitState.selectedPages.clear();

        if (splitState.totalPages === 0) {
            throw new Error('This PDF has no readable pages.');
        }

        // Setup UI
        uploadArea.style.display = 'none';
        filesPreview.style.display = 'none';
        processBtn.style.display = 'none';
        toolWorkspace.classList.add('wide-mode');
        splitWorkspacePanel.style.display = 'flex';

        const sizeFormatted = file.size > 1024 * 1024 
            ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            : (file.size / 1024).toFixed(1) + ' KB';
        splitFileName.innerText = `${file.name} (${sizeFormatted})`;

        renderSplitGridPlaceholders();
        updateSplitUI();
        setProcessing(false);

        // Progressively render page canvas thumbnails
        renderAllSplitThumbnails(currentSession);

    } catch (err) {
        setProcessing(false);
        showSafeUserError(err, 'Could not load PDF document. Please verify the file is not damaged or password-protected.');
        resetSplitStudio();
        updatePreview();
    }
}

function renderSplitGridPlaceholders() {
    splitPagesGrid.innerHTML = '';
    const total = splitState.totalPages;

    for (let pageNum = 1; pageNum <= total; pageNum++) {
        const card = document.createElement('div');
        card.className = 'split-page-card';
        card.id = `split-page-card-${pageNum}`;
        card.dataset.page = pageNum;

        card.innerHTML = `
            <div class="split-card-header">
                <label for="split-chk-${pageNum}">
                    <input type="checkbox" id="split-chk-${pageNum}" class="split-card-checkbox" data-page="${pageNum}">
                    <span>Page ${pageNum}</span>
                </label>
                <span class="split-page-badge" id="split-badge-${pageNum}">#${pageNum} of ${total}</span>
            </div>
            <div class="split-card-preview" id="split-preview-${pageNum}" data-page="${pageNum}" title="Click to select / restore">
                <div class="card-skeleton">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Loading page ${pageNum}...</span>
                </div>
            </div>
            <div class="split-card-footer">
                <button type="button" class="split-card-action-btn btn-card-del" id="split-action-btn-${pageNum}" data-page="${pageNum}" title="Remove page ${pageNum} from final PDF">
                    <i class="fa-solid fa-trash"></i> <span>Delete Page</span>
                </button>
            </div>
        `;

        // Selection checkbox event
        const chk = card.querySelector('.split-card-checkbox');
        chk.addEventListener('change', (e) => {
            e.stopPropagation();
            if (chk.checked) {
                splitState.selectedPages.add(pageNum);
            } else {
                splitState.selectedPages.delete(pageNum);
            }
            updateSplitCardVisualState(pageNum);
        });

        // Preview container click
        const preview = card.querySelector('.split-card-preview');
        preview.addEventListener('click', () => {
            if (splitState.deletedPages.has(pageNum)) {
                // Restore page if it was deleted
                toggleDeletePage(pageNum);
            } else {
                // Toggle selection
                chk.checked = !chk.checked;
                chk.dispatchEvent(new Event('change'));
            }
        });

        // Delete / Restore button
        const actionBtn = card.querySelector('.split-card-action-btn');
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDeletePage(pageNum);
        });

        splitPagesGrid.appendChild(card);
    }
}

async function renderAllSplitThumbnails(sessionId) {
    if (!splitState.pdfDoc) return;

    for (let p = 1; p <= splitState.totalPages; p++) {
        // If user changed document in between, abort this session
        if (splitState.renderSessionId !== sessionId) break;

        try {
            const page = await splitState.pdfDoc.getPage(p);
            // Scale 0.45 produces crisp, memory-efficient previews
            const viewport = page.getViewport({ scale: 0.45 });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            if (splitState.renderSessionId !== sessionId) break;

            const previewContainer = document.getElementById(`split-preview-${p}`);
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.appendChild(canvas);
            }
        } catch (err) {
            console.warn(`Failed to render thumbnail for page ${p}:`, err);
            const previewContainer = document.getElementById(`split-preview-${p}`);
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div style="color: #94A3B8; font-size: 11px; text-align: center;">
                        <i class="fa-solid fa-file-circle-exclamation" style="font-size: 24px; margin-bottom: 6px;"></i>
                        <br>Page ${p}
                    </div>
                `;
            }
        }
    }
}

function toggleDeletePage(pageNum) {
    if (splitState.deletedPages.has(pageNum)) {
        splitState.deletedPages.delete(pageNum);
    } else {
        splitState.deletedPages.add(pageNum);
        // Unselect if deleted
        splitState.selectedPages.delete(pageNum);
    }
    updateSplitCardVisualState(pageNum);
    updateSplitUI();
}

function updateSplitCardVisualState(pageNum) {
    const card = document.getElementById(`split-page-card-${pageNum}`);
    const btn = document.getElementById(`split-action-btn-${pageNum}`);
    const badge = document.getElementById(`split-badge-${pageNum}`);
    const chk = document.getElementById(`split-chk-${pageNum}`);
    if (!card || !btn) return;

    const isDeleted = splitState.deletedPages.has(pageNum);
    const isSelected = splitState.selectedPages.has(pageNum);

    // Selection styling
    if (isSelected && !isDeleted) {
        card.classList.add('is-selected');
    } else {
        card.classList.remove('is-selected');
    }
    if (chk) {
        chk.checked = isSelected && !isDeleted;
        chk.disabled = isDeleted;
    }

    // Deleted styling
    if (isDeleted) {
        card.classList.add('is-deleted');
        card.classList.remove('is-selected');
        btn.className = 'split-card-action-btn btn-card-restore';
        btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> <span>Restore Page</span>';
        btn.title = `Restore page ${pageNum} to final PDF`;
        if (badge) badge.innerText = 'Deleted';
    } else {
        card.classList.remove('is-deleted');
        btn.className = 'split-card-action-btn btn-card-del';
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> <span>Delete Page</span>';
        btn.title = `Remove page ${pageNum} from final PDF`;
        if (badge) badge.innerText = `#${pageNum} of ${splitState.totalPages}`;
    }
}

function updateAllSplitCards() {
    for (let p = 1; p <= splitState.totalPages; p++) {
        updateSplitCardVisualState(p);
    }
}

function updateSplitUI() {
    const total = splitState.totalPages;
    const deleted = splitState.deletedPages.size;
    const kept = Math.max(0, total - deleted);

    if (splitTotalCount) splitTotalCount.innerText = total;
    if (splitKeptCount) splitKeptCount.innerText = kept;
    if (splitDeletedCount) splitDeletedCount.innerText = deleted;

    if (kept === 0) {
        splitDownloadBtnText.innerText = 'Download New PDF (0 Pages)';
        splitDownloadPdfBtn.disabled = true;
        splitExportIndividualBtn.disabled = true;
    } else {
        splitDownloadBtnText.innerText = `Download New PDF (${kept} ${kept === 1 ? 'Page' : 'Pages'})`;
        splitDownloadPdfBtn.disabled = false;
        splitExportIndividualBtn.disabled = false;
    }
}

// Strict Schema Range Parser Utility
function validateAndParseRangeExpressionStrict(inputStr, maxPages) {
    if (typeof inputStr !== 'string') {
        return { valid: false, error: 'Input Validation Rejected: Page range input must be a string.' };
    }
    const trimmed = inputStr.trim();
    if (!trimmed) {
        return { valid: false, error: 'Input Validation Rejected: Page range expression cannot be empty.' };
    }
    if (trimmed.length > STRICT_INPUT_SCHEMAS.pageRange.maxLength) {
        return { valid: false, error: `Input Validation Rejected: Range expression exceeds maximum length of ${STRICT_INPUT_SCHEMAS.pageRange.maxLength} characters.` };
    }
    if (!STRICT_INPUT_SCHEMAS.pageRange.pattern.test(trimmed)) {
        return { valid: false, error: 'Input Validation Rejected: Invalid range format. Expected format like "1-3, 5, 8-10" using positive numbers only.' };
    }

    const tokens = trimmed.split(',').map(s => s.trim());
    const matched = new Set();

    for (const token of tokens) {
        if (token.includes('-')) {
            const parts = token.split('-');
            if (parts.length !== 2) {
                return { valid: false, error: `Input Validation Rejected: Malformed range segment "${token}".` };
            }
            const start = parseInt(parts[0], 10);
            const end = parseInt(parts[1], 10);
            if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
                return { valid: false, error: 'Input Validation Rejected: Page numbers must be integers >= 1.' };
            }
            if (start > end) {
                return { valid: false, error: `Input Validation Rejected: Range start (${start}) cannot be greater than end (${end}).` };
            }
            if (start > maxPages || end > maxPages) {
                return { valid: false, error: `Input Validation Rejected: Range "${start}-${end}" exceeds document page count of ${maxPages}.` };
            }
            for (let i = start; i <= end; i++) {
                matched.add(i);
            }
        } else {
            const num = parseInt(token, 10);
            if (isNaN(num) || num < 1) {
                return { valid: false, error: 'Input Validation Rejected: Page number must be an integer >= 1.' };
            }
            if (num > maxPages) {
                return { valid: false, error: `Input Validation Rejected: Page ${num} exceeds document page count of ${maxPages}.` };
            }
            matched.add(num);
        }
    }
    return { valid: true, pages: matched };
}

function parseRangeExpression(inputStr, maxPages) {
    const res = validateAndParseRangeExpressionStrict(inputStr, maxPages);
    return res.valid ? res.pages : new Set();
}

// Toolbar Action Listeners
if (splitSelectAllBtn) {
    splitSelectAllBtn.addEventListener('click', () => {
        for (let p = 1; p <= splitState.totalPages; p++) {
            if (!splitState.deletedPages.has(p)) {
                splitState.selectedPages.add(p);
            }
        }
        updateAllSplitCards();
    });
}

if (splitDeselectAllBtn) {
    splitDeselectAllBtn.addEventListener('click', () => {
        splitState.selectedPages.clear();
        updateAllSplitCards();
    });
}

if (splitDeleteSelectedBtn) {
    splitDeleteSelectedBtn.addEventListener('click', () => {
        if (splitState.selectedPages.size === 0) {
            alert('Please select at least one page to delete using the checkboxes.');
            return;
        }
        for (const p of splitState.selectedPages) {
            splitState.deletedPages.add(p);
        }
        splitState.selectedPages.clear();
        updateAllSplitCards();
        updateSplitUI();
    });
}

if (splitRestoreAllBtn) {
    splitRestoreAllBtn.addEventListener('click', () => {
        splitState.deletedPages.clear();
        updateAllSplitCards();
        updateSplitUI();
    });
}

if (splitRangeDeleteBtn) {
    splitRangeDeleteBtn.addEventListener('click', () => {
        const query = (splitRangeInput.value || '').trim();
        const res = validateAndParseRangeExpressionStrict(query, splitState.totalPages);
        if (!res.valid) {
            alert(res.error);
            return;
        }
        for (const p of res.pages) {
            splitState.deletedPages.add(p);
            splitState.selectedPages.delete(p);
        }
        updateAllSplitCards();
        updateSplitUI();
    });
}

if (splitRangeKeepBtn) {
    splitRangeKeepBtn.addEventListener('click', () => {
        const query = (splitRangeInput.value || '').trim();
        const res = validateAndParseRangeExpressionStrict(query, splitState.totalPages);
        if (!res.valid) {
            alert(res.error);
            return;
        }
        splitState.deletedPages.clear();
        for (let p = 1; p <= splitState.totalPages; p++) {
            if (!res.pages.has(p)) {
                splitState.deletedPages.add(p);
            }
        }
        splitState.selectedPages.clear();
        updateAllSplitCards();
        updateSplitUI();
    });
}


if (splitChangeFileBtn) {
    splitChangeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });
}

// =========================================================
// EXPORT NEW PDF WITHOUT DELETED PAGES
// =========================================================
async function exportNewPdfWithoutDeletedPages() {
    const keptPages1Based = [];
    for (let p = 1; p <= splitState.totalPages; p++) {
        if (!splitState.deletedPages.has(p)) {
            keptPages1Based.push(p);
        }
    }

    if (keptPages1Based.length === 0) {
        alert('All pages have been deleted! Please keep at least one page to generate a new PDF.');
        return;
    }

    setProcessing(true, `Assembling new PDF with ${keptPages1Based.length} pages in browser...`);

    try {
        const { PDFDocument } = PDFLib;
        const newPdfDoc = await PDFDocument.create();

        // Convert 1-based page numbers to 0-based indices for PDF-Lib
        const keptIndices0Based = keptPages1Based.map(p => p - 1);
        const copiedPages = await newPdfDoc.copyPages(splitState.pdfLibDoc, keptIndices0Based);

        for (const copiedPage of copiedPages) {
            newPdfDoc.addPage(copiedPage);
        }

        const newPdfBytes = await newPdfDoc.save();
        const originalBase = getBaseFilename(splitState.file.name);
        const outputFilename = `${originalBase}_edited_${keptPages1Based.length}pages.pdf`;

        downloadFile(newPdfBytes, outputFilename, 'application/pdf');

        // Display success card
        resultCard.style.display = 'block';
        resultCard.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
                <i class="fa-solid fa-circle-check" style="font-size: 28px; color: #16A34A;"></i>
                <h3 style="margin: 0; font-size: 18px; color: #1E293B;">New PDF Ready & Downloaded!</h3>
            </div>
            <p style="color: #64748B; font-size: 14px; margin-bottom: 16px;">
                Saved <strong>${outputFilename}</strong> containing <strong>${keptPages1Based.length}</strong> pages (removed ${splitState.deletedPages.size} pages).
            </p>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button type="button" class="split-text-btn" onclick="exportNewPdfWithoutDeletedPages()">
                    <i class="fa-solid fa-download"></i> Download Again
                </button>
            </div>
        `;
    } catch (err) {
        showSafeUserError(err, 'An error occurred while compiling the new PDF document. Please try again.');
    } finally {
        setProcessing(false);
    }
}

// Split into individual files for each kept page
async function splitKeptPagesAsSeparateFiles() {
    const keptPages1Based = [];
    for (let p = 1; p <= splitState.totalPages; p++) {
        if (!splitState.deletedPages.has(p)) {
            keptPages1Based.push(p);
        }
    }

    if (keptPages1Based.length === 0) {
        alert('No pages to split. Please restore at least one page.');
        return;
    }

    setProcessing(true, `Extracting ${keptPages1Based.length} separate page documents...`);

    try {
        const { PDFDocument } = PDFLib;
        const originalBase = getBaseFilename(splitState.file.name);

        for (const pageNum of keptPages1Based) {
            const singlePdfDoc = await PDFDocument.create();
            const [copiedPage] = await singlePdfDoc.copyPages(splitState.pdfLibDoc, [pageNum - 1]);
            singlePdfDoc.addPage(copiedPage);
            const singleBytes = await singlePdfDoc.save();
            downloadFile(singleBytes, `${originalBase}_page_${pageNum}.pdf`, 'application/pdf');
        }
    } catch (err) {
        showSafeUserError(err, 'An error occurred while extracting individual pages. Please try again.');
    } finally {
        setProcessing(false);
    }
}

if (splitDownloadPdfBtn) {
    splitDownloadPdfBtn.addEventListener('click', exportNewPdfWithoutDeletedPages);
}

if (splitExportIndividualBtn) {
    splitExportIndividualBtn.addEventListener('click', splitKeptPagesAsSeparateFiles);
}

// Legacy splitPDF router fallback
async function splitPDF() {
    if (splitState.file && splitState.pdfLibDoc) {
        await exportNewPdfWithoutDeletedPages();
    } else if (selectedFiles.length > 0) {
        await initSplitStudio(selectedFiles[0]);
    }
}

// Utilities
function getBaseFilename(filename) {
    return filename.replace(/\.[^/.]+$/, "");
}

function downloadFile(content, filename, type) {
    let blob;
    if (content instanceof Blob) {
        blob = content;
    } else {
        blob = new Blob([content], { type: type });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
