/**
 * YSCode - Professional Web IDE Logic
 * Built for YallCode.github.io
 */

// --- DATA & STATE MANAGEMENT ---
const DEFAULT_FILES = [
    { id: '1', name: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>YallStudioCode App</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div id="app">\n    <h1>YSCode Live</h1>\n    <p>Try editing this text!</p>\n    <button onclick="handleClick()">Click Me</button>\n  </div>\n  <script src="index.js"><\/script>\n</body>\n</html>', lang: 'markup' },
    { id: '2', name: 'index.js', content: 'function handleClick() {\n  console.log("Button clicked!");\n  alert("YSCode is functional!");\n}\n\nconsole.log("App loaded successfully.");', lang: 'javascript' },
    { id: '3', name: 'styles.css', content: 'body {\n  background: #0f172a;\n  color: white;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n#app {\n  text-align: center;\n  padding: 2rem;\n  border: 1px solid #334155;\n  border-radius: 1rem;\n  background: #1e293b;\n}', lang: 'css' }
];

let files = JSON.parse(localStorage.getItem('ysc_files')) || DEFAULT_FILES;
let activeId = localStorage.getItem('ysc_active_id') || '1';
let openIds = JSON.parse(localStorage.getItem('ysc_open_ids')) || ['1', '2', '3'];
let currentTheme = 'midnight';

// --- DOM REFERENCES ---
const input = document.getElementById('code-input');
const output = document.getElementById('highlight-area');
const pre = document.getElementById('code-output');
const lineNums = document.getElementById('line-numbers');
const terminalLogs = document.getElementById('terminal-logs');

// --- INITIALIZATION ---
function init() {
    lucide.createIcons();
    renderExplorer();
    renderTabs();
    switchFile(activeId);
    setupConsoleBridge();
    
    // Global Keyboard Listeners
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveToStorage();
            logToTerminal("Project saved successfully.", "purple");
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            openCommandPalette();
        }
    });
}

// --- EXPLORER & TABS ---
function renderExplorer() {
    const container = document.getElementById('file-list');
    container.innerHTML = files.map(f => `
        <div onclick="switchFile('${f.id}')" class="group flex items-center justify-between px-6 py-2 cursor-pointer text-sm transition ${activeId === f.id ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}">
            <div class="flex items-center gap-2">
                <i data-lucide="${getIcon(f.name)}" class="w-4 h-4"></i>
                <span class="text-[13px]">${f.name}</span>
            </div>
            <i data-lucide="x" class="w-3 h-3 opacity-0 group-hover:opacity-50 hover:!opacity-100" onclick="deleteFile(event, '${f.id}')"></i>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderTabs() {
    const bar = document.getElementById('tab-bar');
    bar.innerHTML = openIds.map(id => {
        const f = files.find(x => x.id === id);
        if (!f) return '';
        return `
            <div onclick="switchFile('${f.id}')" class="h-full px-4 flex items-center gap-2 cursor-pointer border-r border-white/5 transition text-[12px] min-w-[120px] ${activeId === f.id ? 'tab-active' : 'bg-black/20 text-gray-500 hover:text-gray-300'}">
                <i data-lucide="${getIcon(f.name)}" class="w-3 h-3"></i>
                <span class="truncate">${f.name}</span>
                <i data-lucide="x" class="w-3 h-3 ml-auto hover:bg-white/10 rounded-sm" onclick="closeTab(event, '${f.id}')"></i>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

// --- FILE OPERATIONS ---
function switchFile(id) {
    const oldFile = files.find(f => f.id === activeId);
    if (oldFile) oldFile.content = input.value;

    activeId = id;
    const file = files.find(f => f.id === id);
    if (!file) return;

    if (!openIds.includes(id)) openIds.push(id);

    input.value = file.content;
    output.className = `language-${file.lang}`;
    document.getElementById('lang-info').textContent = file.lang.toUpperCase();
    
    updateEditor();
    renderExplorer();
    renderTabs();
    saveToStorage();
}

function createNewFile() {
    showModal("Create New File", "filename.js", (name) => {
        if(!name) return;
        const ext = name.split('.').pop();
        const langMap = {js:'javascript', html:'markup', css:'css', md:'markdown', py:'python', json:'json'};
        const newFile = {
            id: Date.now().toString(),
            name: name,
            content: '',
            lang: langMap[ext] || 'javascript'
        };
        files.push(newFile);
        switchFile(newFile.id);
    });
}

function deleteFile(e, id) {
    e.stopPropagation();
    files = files.filter(f => f.id !== id);
    openIds = openIds.filter(oid => oid !== id);
    if (activeId === id) activeId = files[0]?.id || '';
    renderExplorer();
    renderTabs();
    saveToStorage();
}

// --- EDITOR ENGINE ---
function handleInput() {
    updateEditor();
    updatePos();
    const file = files.find(f => f.id === activeId);
    if (file) file.content = input.value;
}

function updateEditor() {
    let code = input.value;
    if(code.endsWith('\n')) code += ' ';
    output.textContent = code;
    Prism.highlightElement(output);
    
    const lines = input.value.split('\n').length;
    lineNums.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('<br>');
}

function handleKeydown(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = input.selectionStart;
        input.value = input.value.substring(0, start) + "  " + input.value.substring(input.selectionEnd);
        input.selectionStart = input.selectionEnd = start + 2;
        handleInput();
    }
}

function syncScroll() {
    pre.scrollTop = input.scrollTop;
    pre.scrollLeft = input.scrollLeft;
    lineNums.scrollTop = input.scrollTop;
}

// --- EXECUTION & TERMINAL ---
function runCode() {
    const file = files.find(f => f.id === activeId);
    if (file.lang === 'javascript') {
        logToTerminal(`Executing ${file.name}...`, 'purple');
        try {
            new Function(input.value)();
        } catch (e) {
            logToTerminal(`Error: ${e.message}`, 'red');
        }
    } else {
        togglePreview(true);
    }
}

function logToTerminal(msg, color) {
    const entry = document.createElement('div');
    entry.className = `mb-1 ${color === 'red' ? 'text-red-400' : color === 'purple' ? 'text-purple-400' : 'text-gray-400'}`;
    entry.innerHTML = `<span class="opacity-30 mr-2">></span> ${msg}`;
    terminalLogs.appendChild(entry);
    terminalLogs.parentElement.scrollTop = terminalLogs.parentElement.scrollHeight;
}

function setupConsoleBridge() {
    const origLog = console.log;
    console.log = (...args) => {
        logToTerminal(args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" "), "gray");
        origLog(...args);
    };
}

// --- UTILS ---
function saveToStorage() {
    localStorage.setItem('ysc_files', JSON.stringify(files));
    localStorage.setItem('ysc_active_id', activeId);
    localStorage.setItem('ysc_open_ids', JSON.stringify(openIds));
}

function getIcon(name) {
    if (name.endsWith('.js')) return 'file-json';
    if (name.endsWith('.html')) return 'code';
    if (name.endsWith('.css')) return 'palette';
    return 'file';
}

window.onload = init;