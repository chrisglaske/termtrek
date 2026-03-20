// ==========================================
// THE DEVCORE ENGINE
// ==========================================

const AppState = {
    completedModules: JSON.parse(localStorage.getItem('devcore_state')) || [],
    currentModuleId: 'welcome',
    activeModuleData: null
};

let monacoEditorInstance = null;
let pyodideInstance = null;


// --- Virtual File System (VFS) ---
const VFS = {
    currentPath: '/home/student/project',
    files: {
        '/home/student/project': ['main.py', 'secrets.txt', 'README.md']
    }
};

async function bootPythonEngine() {
    try {
        console.log("Booting Python Virtual Machine...");
        // Explicitly telling Pyodide where to fetch its WebAssembly binary
        pyodideInstance = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        console.log("Python VM Ready!");
    } catch (error) {
        console.error("Python Engine failed to load:", error);
        alert("🚨 Python Engine Blocked! \n\nYour browser is blocking the WebAssembly engine because you are using a 'file://' URL. Please open this folder using a local web server (like VS Code Live Server).");
    }
}

// --- Initialization ---
function initApp() {
    renderSidebar();
    loadModule(AppState.currentModuleId);
    setupTerminalListeners();
    setupVisualizerTerminal();
    bootPythonEngine();

    // Initialize Monaco Editor
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monacoEditorInstance = monaco.editor.create(document.getElementById('code-editor'), {
            value: '# Write your Python code here...\n\n',
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            padding: { top: 20 }
        });
    });
}


// --- Navigation & UI Rendering ---
function renderSidebar() {
    const navTree = document.getElementById('nav-tree');
    let html = '';

    curriculum.phases.forEach(phase => {
        html += `<div class="nav-phase">${phase.title}</div>`;

        phase.modules.forEach(mod => {
            const isCompleted = AppState.completedModules.includes(mod.id);
            const isActive = AppState.currentModuleId === mod.id;

            html += `
                <div class="nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                     onclick="loadModule('${mod.id}')">
                    <span>${mod.title}</span>
                    <div class="status-indicator"></div>
                </div>
            `;
        });
    });

    navTree.innerHTML = html;
}

function loadModule(moduleId) {
    AppState.currentModuleId = moduleId;

    // Find the module data
    let foundModule = null;
    let foundPhase = null;
    curriculum.phases.forEach(phase => {
        const mod = phase.modules.find(m => m.id === moduleId);
        if (mod) {
            foundModule = mod;
            foundPhase = phase;
        }
    });

    if (!foundModule) return;
    AppState.activeModuleData = foundModule;

    // 1. Update Middle Pane (Briefing)
    document.getElementById('module-tag').innerText = foundPhase.title;
    document.getElementById('module-title').innerText = foundModule.title;
    document.getElementById('module-content').innerHTML = foundModule.content;

    // CRITICAL SCROLL FIX: Force the pane back to the top
    document.getElementById('module-content').scrollTop = 0;

    // Lock the next button until the mission is passed
    const nextBtn = document.getElementById('next-mission-btn');
    if (AppState.completedModules.includes(moduleId)) {
        missionSuccess(); // Already beat it
    } else {
        nextBtn.disabled = true;
        nextBtn.innerText = "Mission Incomplete";
        nextBtn.classList.remove('btn-success');
        nextBtn.onclick = null;
    }

    // 2. Update Right Pane (Workspace)
    switchWorkspace(foundModule.workspaceType);
    renderSidebar(); // Update active highlights
}

function switchWorkspace(type) {
    // Hide all
    document.querySelectorAll('.workspace-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

    // Show target
    if (type === 'terminal') {
        document.getElementById('ui-terminal').style.display = 'flex';
        document.getElementById('tab-terminal').classList.add('active');
        document.getElementById('term-input').focus();
    } else if (type === 'editor') {
        document.getElementById('ui-editor').style.display = 'flex';
        document.getElementById('tab-editor').classList.add('active');
        document.getElementById('code-editor').focus();
    } else if (type === 'visualizer') {
        // Placeholder for phase 4 visualizer
        document.getElementById('ui-visualizer').style.display = 'flex';
        document.getElementById('tab-visualizer').classList.add('active');
    }
}

// --- Mission Completion Logic ---
function missionSuccess() {
    const nextBtn = document.getElementById('next-mission-btn');
    nextBtn.disabled = false;
    nextBtn.innerText = "Mission Accomplished → Continue";
    nextBtn.style.background = "var(--success)";

    if (!AppState.completedModules.includes(AppState.currentModuleId)) {
        AppState.completedModules.push(AppState.currentModuleId);
        localStorage.setItem('devcore_state', JSON.stringify(AppState.completedModules));
        renderSidebar(); // Update the green dot
    }

    // Find next module for the button click
    nextBtn.onclick = () => {
        const flatModules = curriculum.phases.flatMap(p => p.modules);
        const currentIndex = flatModules.findIndex(m => m.id === AppState.currentModuleId);
        if (currentIndex < flatModules.length - 1) {
            loadModule(flatModules[currentIndex + 1].id);
        } else {
            alert("Course Completed!");
        }
    };
}

// --- Terminal Emulator Engine ---
function setupTerminalListeners() {
    const termInput = document.getElementById('term-input');
    const termOutput = document.getElementById('term-output');

    termInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const cmd = termInput.value.trim();
            if (!cmd) return;

            // Echo input
            termOutput.innerHTML += `<div class="term-input-line" style="margin-top:2px;"><span class="prompt">${VFS.currentPath.split('/').pop()} $</span> ${cmd}</div>`;

            // --- Advanced Bash & VFS Simulation ---
            let response = '';

            if (cmd.startsWith('echo ')) {
                response = cmd.substring(5).replace(/['"]/g, '');
            }
            else if (cmd === 'pwd') {
                response = VFS.currentPath;
            }
            else if (cmd === 'ls') {
                const currentFiles = VFS.files[VFS.currentPath] || [];
                response = currentFiles.join(' &nbsp;&nbsp;&nbsp; ');
            }
            else if (cmd.startsWith('mkdir ')) {
                const newDir = cmd.substring(6).trim();
                if (!VFS.files[VFS.currentPath].includes(newDir)) {
                    VFS.files[VFS.currentPath].push(`<span style="color: var(--primary)">${newDir}</span>`);
                    VFS.files[`${VFS.currentPath}/${newDir}`] = [];
                }
            }
            else if (cmd.startsWith('cd ')) {
                const target = cmd.substring(3).trim();
                if (target === '..') {
                    if (VFS.currentPath !== '/home/student') {
                        VFS.currentPath = VFS.currentPath.substring(0, VFS.currentPath.lastIndexOf('/'));
                    }
                } else {
                    const possiblePath = `${VFS.currentPath}/${target}`;
                    if (VFS.files[possiblePath]) {
                        VFS.currentPath = possiblePath;
                    } else {
                        response = `bash: cd: ${target}: No such file or directory`;
                    }
                }
            }
            else if (cmd.startsWith('touch ')) {
                const newFile = cmd.substring(6).trim();
                if (!VFS.files[VFS.currentPath].includes(newFile)) {
                    VFS.files[VFS.currentPath].push(newFile);
                }
            }
            else if (cmd.startsWith('git config')) response = '';
            else if (cmd === 'git init') response = `Initialized empty Git repository in ${VFS.currentPath}/.git/`;
            else if (cmd.includes('git checkout -b')) response = `Switched to a new branch 'dev'`;
            else if (cmd.includes('git checkout --')) response = `Restored calc.py from the vault.`;
            else if (cmd === 'git stash') response = 'Saved working directory and index state WIP on main...';
            else if (cmd.includes('git push')) response = 'Enumerating objects: 5, done.<br>Writing objects: 100% (5/5), 442 bytes, done.<br>To github.com:student/project.git<br> * [new branch]      main -> main';
            else if (cmd === 'git --version') response = 'git version 2.43.0';
            else if (cmd === 'clear') { termOutput.innerHTML = ''; termInput.value = ''; return; }
            else if (cmd === 'exit') { termOutput.innerHTML += '<div style="color: var(--warning);">Connection closed. Good luck, Engineer.</div>'; termInput.disabled = true; missionSuccess(); return; }
            else response = `bash: ${cmd}: command not found`;

            if (response) {
                termOutput.innerHTML += `<div style="margin-bottom: 8px; color: #a3a3a3;">${response}</div>`;
            }

            // Scroll to bottom
            termOutput.scrollTop = termOutput.scrollHeight;
            termInput.value = '';

            // Check if command fulfills current mission
            if (AppState.activeModuleData.validateCommand && AppState.activeModuleData.validateCommand(cmd)) {
                missionSuccess();
            }
        }
    });
}

// --- Code Editor Engine ---
async function executePython() {
    if (!monacoEditorInstance) return;
    if (!pyodideInstance) {
        alert("Python Engine is still booting... please wait a few seconds.");
        return;
    }

    const code = monacoEditorInstance.getValue();
    let pythonOutput = "";

    // Tell Python to capture print() statements into our javascript variable
    pyodideInstance.setStdout({ batched: (msg) => { pythonOutput += msg + "\n"; } });

    try {
        // ACTUALLY RUN THE PYTHON CODE!
        await pyodideInstance.runPythonAsync(code);

        // Show the result
        alert("💻 Terminal Output:\n\n" + (pythonOutput || "[No output printed]"));

        // Validate if they passed the mission constraints
        if (AppState.activeModuleData.validateCode && AppState.activeModuleData.validateCode(code)) {
            missionSuccess();
        }
    } catch (err) {
        // If they write bad Python, it will throw a real Python error!
        alert("🚨 Python Syntax Error:\n\n" + err.message);
    }
}

// --- Git Visualizer Logic ---
function setupVisualizerTerminal() {
    const input = document.getElementById('vis-term-input');
    const output = document.getElementById('vis-term-output');

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const cmd = input.value.trim();
            if (!cmd) return;

            output.innerHTML = `<div style="color:white;"><span class="prompt">$</span> ${cmd}</div>`;
            const fileNode = document.getElementById('file-index');

            if (cmd === 'git add index.txt' || cmd === 'git add .') {
                // Move from Working to Staging
                const stagingBody = document.getElementById('body-staging');
                stagingBody.appendChild(fileNode);
                fileNode.className = 'file-node staged';
                output.innerHTML += `<div>Added index.txt to Staging Area.</div>`;
            }
            else if (cmd.startsWith('git commit')) {
                // Move from Staging to Repo
                if (fileNode.classList.contains('staged')) {
                    const repoBody = document.getElementById('body-repo');
                    repoBody.appendChild(fileNode);
                    fileNode.className = 'file-node committed';
                    output.innerHTML += `<div>[main a1b2c3d] Committed to Local Vault.</div>`;

                    // Unlock the mission!
                    setTimeout(missionSuccess, 1000);
                } else {
                    output.innerHTML += `<div style="color: var(--warning);">Nothing to commit (working tree clean or unstaged files).</div>`;
                }
            }
            else {
                output.innerHTML += `<div>git: '${cmd}' is not a valid visualizer command. Try 'git add .'</div>`;
            }

            input.value = '';
            output.scrollTop = output.scrollHeight;
        }
    });
}

// Boot the App
window.onload = initApp;