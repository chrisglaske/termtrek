// ==========================================
// THE DEVCORE ENGINE
// ==========================================

const AppState = {
    completedModules: JSON.parse(localStorage.getItem('devcore_state')) || [],
    currentModuleId: 'welcome',
    activeModuleData: null,
    currentStepIndex: 0,
    os: localStorage.getItem('devcore_os') || 'mac'
};

let monacoEditorInstance = null;
let pyodideInstance = null;

const VFS = {
    currentPath: '/home/student/project',
    files: { '/home/student/project': ['main.py', 'secrets.txt', 'README.md'] }
};

async function bootPythonEngine() {
    try {
        console.log("Booting Python Virtual Machine...");
        pyodideInstance = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
        console.log("Python VM Ready!");
    } catch (error) {
        console.error("Python Engine failed to load:", error);
    }
}

function setOS(os) {
    AppState.os = os;
    localStorage.setItem('devcore_os', os);
    document.getElementById('btn-mac').classList.toggle('active', os === 'mac');
    document.getElementById('btn-win').classList.toggle('active', os === 'win');
    document.body.setAttribute('data-os', os);

    const termTab = document.getElementById('tab-terminal');
    if (termTab) termTab.innerText = os === 'win' ? 'Git Bash' : 'Terminal (zsh)';
}

function updatePrompt() {
    const folder = VFS.currentPath.split('/').pop();
    const promptEl = document.getElementById('term-prompt');
    if (promptEl) promptEl.innerText = `${folder} $`;
}

function initApp() {
    setOS(AppState.os);
    renderSidebar();
    loadModule(AppState.currentModuleId);
    setupTerminalListeners();
    setupVisualizerTerminal();
    bootPythonEngine();

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

        const currentStep = AppState.activeModuleData?.steps[AppState.currentStepIndex];
        if (currentStep && currentStep.editorDefaultValue) {
            monacoEditorInstance.setValue(currentStep.editorDefaultValue);
        }
    });
}

function renderSidebar() {
    const navTree = document.getElementById('nav-tree');
    let html = '';
    curriculum.phases.forEach(phase => {
        html += `<div class="nav-phase">${phase.title}</div>`;
        phase.modules.forEach(mod => {
            const isCompleted = AppState.completedModules.includes(mod.id);
            const isActive = AppState.currentModuleId === mod.id;
            html += `<div class="nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" onclick="loadModule('${mod.id}')"><span>${mod.title}</span><div class="status-indicator"></div></div>`;
        });
    });
    navTree.innerHTML = html;
}

function loadModule(moduleId) {
    AppState.currentModuleId = moduleId;
    let foundModule = null;
    let foundPhase = null;

    curriculum.phases.forEach(phase => {
        const mod = phase.modules.find(m => m.id === moduleId);
        if (mod) { foundModule = mod; foundPhase = phase; }
    });

    if (!foundModule) return;
    AppState.activeModuleData = foundModule;
    AppState.currentStepIndex = 0;

    document.getElementById('module-tag').innerText = foundPhase.title;
    document.getElementById('module-title').innerText = foundModule.title;

    switchWorkspace(foundModule.workspaceType);
    renderSidebar();
    loadStep();
}

function switchWorkspace(type) {
    document.querySelectorAll('.workspace-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

    if (type === 'terminal') {
        document.getElementById('ui-terminal').style.display = 'flex';
        document.getElementById('tab-terminal').classList.add('active');
        document.getElementById('term-input').focus();
    } else if (type === 'editor') {
        document.getElementById('ui-editor').style.display = 'flex';
        document.getElementById('tab-editor').classList.add('active');
        if (monacoEditorInstance) monacoEditorInstance.focus();
    } else if (type === 'visualizer') {
        document.getElementById('ui-visualizer').style.display = 'flex';
        document.getElementById('tab-visualizer').classList.add('active');
    }
}

function loadStep() {
    const step = AppState.activeModuleData.steps[AppState.currentStepIndex];
    document.getElementById('module-content').innerHTML = step.content;
    document.getElementById('module-content').scrollTop = 0;

    if (monacoEditorInstance) {
        if (step.editorDefaultValue) {
            monacoEditorInstance.setValue(step.editorDefaultValue);
        } else if (AppState.currentStepIndex === 0) {
            monacoEditorInstance.setValue('# Write your Python code here...\n\n');
        }
    }

    let dotsHtml = '';
    AppState.activeModuleData.steps.forEach((s, idx) => {
        let statusClass = '';
        if (idx < AppState.currentStepIndex) statusClass = 'completed';
        else if (idx === AppState.currentStepIndex) statusClass = 'active';
        dotsHtml += `<div class="step-dot ${statusClass}"></div>`;
    });
    document.getElementById('step-indicator').innerHTML = dotsHtml;

    const nextBtn = document.getElementById('next-mission-btn');
    nextBtn.disabled = true;
    nextBtn.innerText = "Mission Incomplete";
    nextBtn.style.background = "var(--border)";
    nextBtn.onclick = null;

    // --- NEW: Smart completion tracking bypasses validation locks ---
    const isModuleCompleted = AppState.completedModules.includes(AppState.currentModuleId);

    if (isModuleCompleted || (!step.validateCommand && !step.validateCode)) {
        stepSuccess();
    }
}

function stepSuccess() {
    const isLastStep = AppState.currentStepIndex === AppState.activeModuleData.steps.length - 1;
    const nextBtn = document.getElementById('next-mission-btn');
    nextBtn.disabled = false;
    nextBtn.style.background = "var(--success)";

    if (isLastStep) {
        nextBtn.innerText = "Module Complete → Next";
        if (!AppState.completedModules.includes(AppState.currentModuleId)) {
            AppState.completedModules.push(AppState.currentModuleId);
            localStorage.setItem('devcore_state', JSON.stringify(AppState.completedModules));
            renderSidebar();
        }
        nextBtn.onclick = () => {
            const flatModules = curriculum.phases.flatMap(p => p.modules);
            const currentIndex = flatModules.findIndex(m => m.id === AppState.currentModuleId);
            if (currentIndex < flatModules.length - 1) loadModule(flatModules[currentIndex + 1].id);
        };
    } else {
        nextBtn.innerText = "Step Complete → Continue";
        nextBtn.onclick = () => {
            AppState.currentStepIndex++;
            loadStep();
        };
    }
}

function setupTerminalListeners() {
    const oldInput = document.getElementById('term-input');
    const termOutput = document.getElementById('term-output');

    const newTermInput = oldInput.cloneNode(true);
    oldInput.parentNode.replaceChild(newTermInput, oldInput);

    document.getElementById('ui-terminal').addEventListener('click', () => {
        newTermInput.focus();
    });

    newTermInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const cmd = newTermInput.value.trim();
            if (!cmd) return;

            termOutput.innerHTML += `<div class="term-input-line" style="margin-top:2px;"><span class="prompt">${VFS.currentPath.split('/').pop()} $</span> ${cmd}</div>`;

            let response = '';

            if (cmd.startsWith('echo ')) response = cmd.substring(5).replace(/['"]/g, '');
            else if (cmd === 'pwd') response = VFS.currentPath;
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
                        updatePrompt();
                    }
                } else {
                    const possiblePath = `${VFS.currentPath}/${target}`;
                    if (VFS.files[possiblePath]) {
                        VFS.currentPath = possiblePath;
                        updatePrompt();
                    } else {
                        response = `bash: cd: ${target}: No such file or directory`;
                    }
                }
            }
            else if (cmd.startsWith('touch ')) {
                const newFile = cmd.substring(6).trim();
                if (!VFS.files[VFS.currentPath].includes(newFile)) VFS.files[VFS.currentPath].push(newFile);
            }
            else if (cmd.startsWith('rm ')) {
                const fileToRm = cmd.substring(3).trim();
                const fileIndex = VFS.files[VFS.currentPath].indexOf(fileToRm);
                if (fileIndex > -1) VFS.files[VFS.currentPath].splice(fileIndex, 1);
                else response = `rm: ${fileToRm}: No such file or directory`;
            }
            else if (cmd === 'git status') response = 'On branch main<br>Your branch is up to date with origin/main.';
            else if (cmd === 'git log') response = '<span style="color: var(--warning)">commit a1b2c3d</span> (HEAD -> main)<br>Author: Student<br>Date: Today<br><br>    Initial commit';
            else if (cmd.includes('git checkout -b')) response = `Switched to a new branch '${cmd.split(' ').pop()}'`;
            else if (cmd === 'git checkout main') response = `Switched to branch 'main'`;
            else if (cmd === 'git merge dev') response = `Auto-merging calc.py<br><span style="color: var(--warning)">CONFLICT (content): Merge conflict in calc.py</span><br><span style="color: var(--danger)">Automatic merge failed; fix conflicts and then commit the result.</span>`;
            else if (cmd === 'git add calc.py') response = ''; // Silent success
            else if (cmd.startsWith('git commit')) response = `[main 4a2b1c] Merged branch 'dev'`;
            else if (cmd === 'git stash') response = 'Saved working directory and index state WIP on main...';
            else if (cmd === 'git stash pop') response = 'Dropped refs/stash@{0} (a1b2c3d)';
            else if (cmd === 'clear') { termOutput.innerHTML = ''; newTermInput.value = ''; return; }
            else if (cmd === 'exit') { termOutput.innerHTML += '<div style="color: var(--warning);">Connection closed.</div>'; newTermInput.disabled = true; stepSuccess(); return; }
            else response = `bash: ${cmd}: command not found`;

            if (response) termOutput.innerHTML += `<div style="margin-bottom: 8px; color: #a3a3a3;">${response}</div>`;

            termOutput.scrollTop = termOutput.scrollHeight;
            newTermInput.value = '';

            const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
            if (currentStep && currentStep.validateCommand && currentStep.validateCommand(cmd)) {
                stepSuccess();
            }
        }
    });
}

async function executePython() {
    if (!monacoEditorInstance) return;

    const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
    const code = monacoEditorInstance.getValue();

    if (currentStep && currentStep.validateCode && currentStep.validateCode(code)) {
        if (currentStep.isEditorMissionOnly) {
            alert("💾 File Saved Successfully!");
            stepSuccess();
            return;
        }
    }

    if (!pyodideInstance) {
        alert("Python Engine is still booting... please wait a few seconds.");
        return;
    }

    let pythonOutput = "";
    pyodideInstance.setStdout({ batched: (msg) => { pythonOutput += msg + "\n"; } });

    try {
        await pyodideInstance.runPythonAsync(code);
        alert("💻 Terminal Output:\n\n" + (pythonOutput || "[No output printed]"));

        if (currentStep && currentStep.validateCode && currentStep.validateCode(code)) {
            stepSuccess();
        }
    } catch (err) {
        alert("🚨 Python Syntax Error:\n\n" + err.message);
    }
}

function setupVisualizerTerminal() {
    const oldInput = document.getElementById('vis-term-input');
    const output = document.getElementById('vis-term-output');

    const newInput = oldInput.cloneNode(true);
    oldInput.parentNode.replaceChild(newInput, oldInput);

    document.querySelector('.mini-terminal').addEventListener('click', () => {
        newInput.focus();
    });

    newInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const cmd = newInput.value.trim();
            if (!cmd) return;

            output.innerHTML += `<div style="color:white;"><span class="prompt">$</span> ${cmd}</div>`;
            const fileNode = document.getElementById('file-index');

            if (cmd === 'git add index.txt' || cmd === 'git add .') {
                const stagingBody = document.getElementById('body-staging');
                stagingBody.appendChild(fileNode);
                fileNode.className = 'file-node staged';
                output.innerHTML += `<div>Added index.txt to Staging Area.</div>`;
            } else if (cmd.startsWith('git commit')) {
                if (fileNode.classList.contains('staged')) {
                    const repoBody = document.getElementById('body-repo');
                    repoBody.appendChild(fileNode);
                    fileNode.className = 'file-node committed';
                    output.innerHTML += `<div>[main a1b2c3d] Committed to Local Vault.</div>`;
                } else {
                    output.innerHTML += `<div style="color: var(--warning);">Nothing to commit (working tree clean or unstaged files).</div>`;
                }
            } else {
                output.innerHTML += `<div>git: '${cmd}' is not a valid visualizer command. Try 'git add .'</div>`;
            }

            newInput.value = '';
            output.scrollTop = output.scrollHeight;

            const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
            if (currentStep && currentStep.validateCommand && currentStep.validateCommand(cmd)) {
                setTimeout(stepSuccess, 1000);
            }
        }
    });
}

// --- NEW: Reset Functions ---
function resetCurrentLesson() {
    // Strip the completion status
    AppState.completedModules = AppState.completedModules.filter(id => id !== AppState.currentModuleId);
    localStorage.setItem('devcore_state', JSON.stringify(AppState.completedModules));

    // Jump to the first step
    AppState.currentStepIndex = 0;

    // Wipe the terminal and editor clean
    document.getElementById('term-output').innerHTML = '';
    if (monacoEditorInstance) {
        const step = AppState.activeModuleData.steps[0];
        monacoEditorInstance.setValue(step?.editorDefaultValue || '# Write your Python code here...\n\n');
    }

    renderSidebar();
    loadStep();
}

function resetAllProgress() {
    if (confirm("Are you sure you want to reset all your progress? This cannot be undone.")) {
        AppState.completedModules = [];
        localStorage.removeItem('devcore_state');
        AppState.currentModuleId = 'welcome';

        document.getElementById('term-output').innerHTML = '';
        if (monacoEditorInstance) monacoEditorInstance.setValue('# Write your Python code here...\n\n');

        renderSidebar();
        loadModule('welcome');
    }
}

window.onload = initApp;