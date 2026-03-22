// ==========================================
// THE TERMTREK ENGINE (v8.3 - Privacy & Close Logic)
// ==========================================

const AppState = {
    consent: localStorage.getItem('termtrek_consent') || null, // Privacy first!
    completedModules: JSON.parse(localStorage.getItem('termtrek_state')) || [],
    currentModuleId: 'welcome',
    activeModuleData: null,
    currentStepIndex: 0,
    os: localStorage.getItem('termtrek_os') || 'mac',
    gitBranch: 'main'
};

const EXPLORER_REQ_MODULES = ['bash-basics', 'bash-files', 'git-mental-model', 'local-venv', 'proj-2'];

let monacoEditorInstance = null;
let pyodideInstance = null;
let explorerCollapsed = false;
let lastExplorerWidth = '220px';

const VFS = {
    currentPath: '/home/student/project',
    files: { '/home/student/project': ['main.py', 'secrets.txt', 'README.md'] }
};

// --- PRIVACY & CONSENT LOGIC ---
function checkPrivacy() {
    if (!AppState.consent) {
        showPrivacyModal();
    } else {
        updatePrivacyUI();
    }
}

function showPrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    modal.classList.add('active');

    // Highlight their current choice if they already made one
    document.getElementById('btn-accept-consent').classList.remove('active-choice');
    document.getElementById('btn-decline-consent').classList.remove('active-choice');

    if (AppState.consent === 'accepted') {
        document.getElementById('btn-accept-consent').classList.add('active-choice');
    } else if (AppState.consent === 'declined') {
        document.getElementById('btn-decline-consent').classList.add('active-choice');
    }
}

function closePrivacyModal() {
    // Only let them close it if they have actually made a choice
    if (AppState.consent) {
        document.getElementById('privacy-modal').classList.remove('active');
    } else {
        showToast("Please make a storage selection to continue.");
    }
}

function setConsent(choice) {
    if (choice === 'declined') {
        const areYouSure = confirm("🚨 ARE YOU SURE?\n\nDeclining will instantly delete all your saved progress, and no future progress will be saved. You will lose your place if you refresh the page.");
        if (!areYouSure) return;

        localStorage.removeItem('termtrek_state');
        localStorage.removeItem('termtrek_os');
        AppState.completedModules = [];
        renderSidebar();
    }

    AppState.consent = choice;
    localStorage.setItem('termtrek_consent', choice);
    document.getElementById('privacy-modal').classList.remove('active');
    updatePrivacyUI();
}

function updatePrivacyUI() {
    const statusDot = document.getElementById('privacy-dot');
    const statusText = document.getElementById('privacy-text');

    if (AppState.consent === 'accepted') {
        statusDot.className = 'status-dot accepted';
        statusText.innerText = 'Storage: Accepted';
    } else if (AppState.consent === 'declined') {
        statusDot.className = 'status-dot declined';
        statusText.innerText = 'Storage: Declined';
    }
}

async function bootPythonEngine() {
    try { pyodideInstance = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" }); }
    catch (error) { console.error("Python Engine failed to load:", error); }
}

function setOS(os) {
    AppState.os = os;
    if (AppState.consent === 'accepted') {
        localStorage.setItem('termtrek_os', os);
    }

    document.getElementById('btn-mac').classList.toggle('active', os === 'mac');
    document.getElementById('btn-win').classList.toggle('active', os === 'win');
    document.body.setAttribute('data-os', os);
    const termTab = document.getElementById('tab-terminal');
    if (termTab) termTab.innerText = os === 'win' ? 'Git Bash' : 'Terminal (zsh)';
}

function resolvePath(current, target) {
    if (target === '~') return '/home/student/project';
    if (target.startsWith('~/')) return '/home/student/project/' + target.substring(2);
    if (target.startsWith('/')) return target;

    const parts = target.split('/');
    let stack = current.split('/').filter(Boolean);

    for (let part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    return '/' + stack.join('/');
}

function showToast(message) {
    const toast = document.getElementById('sys-toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function toggleExplorer(forceExpand = false) {
    const layout = document.getElementById('app-layout');
    const pane = document.getElementById('explorer-pane');
    const isRequired = EXPLORER_REQ_MODULES.includes(AppState.currentModuleId);

    if (!explorerCollapsed && !forceExpand) {
        if (isRequired) {
            showToast("Action Denied: The File Explorer is required to visualize commands in this lesson.");
            return;
        }
        explorerCollapsed = true;
        pane.classList.add('collapsed');
        document.documentElement.style.setProperty('--explorer-width', '40px');
    } else if (explorerCollapsed || forceExpand) {
        explorerCollapsed = false;
        pane.classList.remove('collapsed');
        document.documentElement.style.setProperty('--explorer-width', lastExplorerWidth);
    }
}

const ICONS = {
    folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#D2A373"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
    py: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#4FC1FF"><path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-11.5v5l4-2.5-4-2.5z"/></svg>`,
    txt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#A1A1AA"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    md: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#0070F3"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    default: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#A1A1AA"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`
};

function getFileIcon(filename) {
    if (filename.endsWith('.py')) return ICONS.py;
    if (filename.endsWith('.txt')) return ICONS.txt;
    if (filename.endsWith('.md')) return ICONS.md;
    return ICONS.default;
}

function buildTreeHTML(path, depth, animateItem, animationType) {
    let html = '';
    const items = VFS.files[path] || [];
    const paddingLeft = depth * 16 + 10;

    items.forEach(item => {
        const isDir = item.includes('<span');
        const cleanName = item.replace(/<[^>]*>?/gm, '');
        const itemPath = `${path}/${cleanName}`;

        let animClass = '';
        if (cleanName === animateItem && path === VFS.currentPath) {
            animClass = animationType === 'add' ? 'anim-create' : 'anim-explode';
        }

        let activeClass = (itemPath === VFS.currentPath) ? 'active-dir' : '';

        if (isDir) {
            html += `<div class="tree-item ${animClass} ${activeClass}" style="padding-left: ${paddingLeft}px;">
                        <span class="tree-folder-chevron">▼</span>
                        <span class="tree-icon">${ICONS.folder}</span>
                        <span class="tree-item-name">${cleanName}</span>
                        ${activeClass ? '<span style="margin-left: 8px; font-size: 0.65rem; background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px;">current</span>' : ''}
                     </div>`;
            if (VFS.files[itemPath]) {
                html += `<div class="tree-sub-items">`;
                html += buildTreeHTML(itemPath, depth + 1, animateItem, animationType);
                html += `</div>`;
            }
        } else {
            html += `<div class="tree-item ${animClass}" style="padding-left: ${paddingLeft + 16}px;">
                        <span class="tree-icon">${getFileIcon(cleanName)}</span>
                        <span class="tree-item-name">${cleanName}</span>
                     </div>`;
        }
    });
    return html;
}

function renderFileTree(animateItem = null, animationType = null) {
    const treeEl = document.getElementById('file-tree');
    if (!treeEl) return;

    const rootPath = '/home/student/project';
    const isRootActive = (VFS.currentPath === rootPath) ? 'active-dir' : '';

    let html = `
        <div class="tree-item root-item ${isRootActive}" style="padding-left: 10px;">
            <span class="tree-folder-chevron">▼</span>
            <span class="tree-icon">${ICONS.folder}</span>
            <span class="tree-item-name" style="font-weight: 600; color: #fff;">project</span>
            ${isRootActive ? '<span style="margin-left: 8px; font-size: 0.65rem; background: var(--primary); color: #fff; padding: 2px 6px; border-radius: 4px;">current</span>' : ''}
        </div>
        <div class="tree-sub-items">
            ${buildTreeHTML(rootPath, 1, animateItem, animationType)}
        </div>
    `;
    treeEl.innerHTML = html;
}

function updatePrompt() {
    const promptEl = document.getElementById('term-prompt');
    if (promptEl) {
        let displayPath = VFS.currentPath.replace('/home/student', '~');
        if (displayPath.startsWith('~/project')) {
            promptEl.innerHTML = `${displayPath} <span class="prompt-branch">(${AppState.gitBranch})</span> $`;
        } else {
            promptEl.innerText = `${displayPath} $`;
        }
    }
}

function updateTabGlow(step) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('glow-attention'));
    if (!step) return;
    if (step.workspaceType === 'editor' || step.isEditorMissionOnly) document.getElementById('tab-editor').classList.add('glow-attention');
    else if (step.workspaceType === 'terminal') document.getElementById('tab-terminal').classList.add('glow-attention');
    else if (step.workspaceType === 'visualizer') document.getElementById('tab-visualizer').classList.add('glow-attention');
}

function setupResizer() {
    const resizer = document.getElementById('drag-resizer');
    const layout = document.getElementById('app-layout');
    if (!resizer || !layout) return;

    let isDragging = false;

    resizer.addEventListener('mousedown', function (e) {
        isDragging = true;
        resizer.classList.add('dragging');
        layout.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < (window.innerWidth - 600)) {
            document.documentElement.style.setProperty('--workspace-width', `${newWidth}px`);
        }
    });

    document.addEventListener('mouseup', function (e) {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('dragging');
            layout.classList.remove('resizing');
            document.body.style.cursor = '';
        }
    });
}

function initApp() {
    checkPrivacy();
    setOS(AppState.os);
    renderSidebar();
    loadModule(AppState.currentModuleId);
    setupTerminalListeners();
    setupVisualizerTerminal();
    setupResizer();
    bootPythonEngine();
    renderFileTree();
    updatePrompt();

    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monacoEditorInstance = monaco.editor.create(document.getElementById('code-editor'), {
            value: '# Write your Python code here...\n\n', language: 'python', theme: 'vs-dark',
            automaticLayout: true, minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", padding: { top: 20 }
        });
        const currentStep = AppState.activeModuleData?.steps[AppState.currentStepIndex];
        if (currentStep && currentStep.editorDefaultValue) monacoEditorInstance.setValue(currentStep.editorDefaultValue);
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

    if (EXPLORER_REQ_MODULES.includes(moduleId) && explorerCollapsed) {
        toggleExplorer(true);
    }

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

document.getElementById('tab-terminal').addEventListener('click', () => switchWorkspace('terminal'));
document.getElementById('tab-editor').addEventListener('click', () => switchWorkspace('editor'));
document.getElementById('tab-visualizer').addEventListener('click', () => switchWorkspace('visualizer'));

function loadStep() {
    const step = AppState.activeModuleData.steps[AppState.currentStepIndex];
    document.getElementById('module-content').innerHTML = step.content;
    document.getElementById('module-content').scrollTop = 0;

    updateTabGlow(step);
    document.getElementById('next-mission-btn').classList.remove('glow-next');

    if (monacoEditorInstance) {
        if (step.editorDefaultValue) monacoEditorInstance.setValue(step.editorDefaultValue);
        else if (AppState.currentStepIndex === 0) monacoEditorInstance.setValue('# Write your Python code here...\n\n');
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

    if (AppState.completedModules.includes(AppState.currentModuleId) || (!step.validateCommand && !step.validateCode)) {
        stepSuccess(true);
    }
}

function stepSuccess(isAutoLoad = false) {
    const isLastStep = AppState.currentStepIndex === AppState.activeModuleData.steps.length - 1;
    const nextBtn = document.getElementById('next-mission-btn');

    nextBtn.disabled = false;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('glow-attention'));

    if (!isAutoLoad) {
        const briefingPane = document.getElementById('briefing-pane');
        briefingPane.classList.add('flash-bg');
        setTimeout(() => briefingPane.classList.remove('flash-bg'), 800);
        nextBtn.classList.add('glow-next');
    }

    if (isLastStep) {
        nextBtn.innerText = "Module Complete → Next";

        if (!AppState.completedModules.includes(AppState.currentModuleId)) {
            AppState.completedModules.push(AppState.currentModuleId);
            if (AppState.consent === 'accepted') {
                localStorage.setItem('termtrek_state', JSON.stringify(AppState.completedModules));
            }
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

    document.getElementById('ui-terminal').addEventListener('click', () => newTermInput.focus());

    newTermInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const cmd = newTermInput.value.trim();
            if (!cmd) return;

            const promptHTML = document.getElementById('term-prompt').innerHTML;
            termOutput.innerHTML += `<div class="term-input-line" style="margin-top:2px;"><span class="prompt">${promptHTML}</span> ${cmd}</div>`;

            let response = '';

            if (cmd.startsWith('echo ')) response = cmd.substring(5).replace(/['"]/g, '');
            else if (cmd === 'pwd') response = VFS.currentPath;
            else if (cmd === 'ls') {
                const currentFiles = VFS.files[VFS.currentPath] || [];
                response = currentFiles.join(' &nbsp;&nbsp;&nbsp; ').replace(/<[^>]*>?/gm, '');
            }
            else if (cmd.startsWith('mkdir ')) {
                const newDir = cmd.substring(6).trim();
                if (!VFS.files[VFS.currentPath].includes(newDir)) {
                    VFS.files[VFS.currentPath].push(`<span style="color: var(--primary)">${newDir}</span>`);
                    VFS.files[`${VFS.currentPath}/${newDir}`] = [];
                    renderFileTree(newDir, 'add');
                }
            }
            else if (cmd.startsWith('cd ')) {
                const target = cmd.substring(3).trim();
                const resolved = resolvePath(VFS.currentPath, target);
                if (VFS.files[resolved]) {
                    VFS.currentPath = resolved;
                    updatePrompt();
                    renderFileTree();
                } else response = `bash: cd: ${target}: No such file or directory`;
            }
            else if (cmd.startsWith('touch ')) {
                const newFile = cmd.substring(6).trim();
                if (!VFS.files[VFS.currentPath].includes(newFile)) {
                    VFS.files[VFS.currentPath].push(newFile);
                    renderFileTree(newFile, 'add');
                }
            }
            else if (cmd.startsWith('rm ')) {
                const fileToRm = cmd.substring(3).trim();
                const fileIndex = VFS.files[VFS.currentPath].indexOf(fileToRm);
                if (fileIndex > -1) {
                    renderFileTree(fileToRm, 'delete');
                    setTimeout(() => {
                        VFS.files[VFS.currentPath].splice(fileIndex, 1);
                        renderFileTree();
                    }, 400);
                } else response = `rm: ${fileToRm}: No such file or directory`;
            }

            else if (cmd.startsWith('cat ')) {
                const file = cmd.split(' ')[1];
                if (file === 'README.md') response = '# TermTrek Project\n\nWelcome to the simulation environment. Use the terminal to navigate.';
                else if (file === 'secrets.txt') response = 'DB_PASSWORD=super_secret_99\nAPI_KEY=ak_live_12345';
                else if (file === 'main.py' || file === 'calc.py') response = monacoEditorInstance ? monacoEditorInstance.getValue() : 'print("Hello World")';
                else if (file === 'api.py') response = 'def get_data():\n    return {"status": 200}';
                else if (VFS.files[VFS.currentPath] && VFS.files[VFS.currentPath].includes(file)) {
                    response = `(Empty file or binary content)`;
                } else if (cmd === 'cat ~/.gitconfig') {
                    response = `[user]<br>&nbsp;&nbsp;&nbsp;&nbsp;name = Engineer<br>&nbsp;&nbsp;&nbsp;&nbsp;email = dev@example.com<br>[core]<br>&nbsp;&nbsp;&nbsp;&nbsp;editor = code --wait`;
                } else if (cmd === 'cat ~/.ssh/id_ed25519.pub') {
                    response = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJkxG7... dev@example.com';
                } else response = `cat: ${file}: No such file or directory`;
            }

            else if (cmd.startsWith('git add ')) response = '';
            else if (cmd === 'git status') response = `On branch ${AppState.gitBranch}<br>Your branch is up to date with origin/${AppState.gitBranch}.`;
            else if (cmd === 'git log') response = `<span style="color: var(--warning)">commit a1b2c3d</span> (HEAD -> ${AppState.gitBranch})<br>Author: Student<br>Date: Today<br><br>    Initial commit`;
            else if (cmd.includes('git checkout -b')) {
                AppState.gitBranch = cmd.split(' ').pop();
                updatePrompt();
                response = `Switched to a new branch '${AppState.gitBranch}'`;
            }
            else if (cmd === 'git checkout main' || cmd === 'git checkout master') {
                AppState.gitBranch = 'main';
                updatePrompt();
                response = `Switched to branch 'main'`;
            }
            else if (cmd === 'git merge dev') response = `Auto-merging calc.py<br><span style="color: var(--warning)">CONFLICT (content): Merge conflict in calc.py</span><br><span style="color: var(--danger)">Automatic merge failed; fix conflicts and then commit the result.</span>`;
            else if (cmd.startsWith('git commit')) response = `[${AppState.gitBranch} a1b2c3d] Commit successful.`;
            else if (cmd.startsWith('git config')) response = '';

            else if (cmd.startsWith('help')) {
                if (cmd === 'help --bash') {
                    response = `<div style="color:var(--primary);font-weight:bold;margin-bottom:5px;">[BASH COMMANDS]</div>
                    <table class="help-table">
                        <tr><td style="color:var(--success);width:80px;">pwd</td><td>Print Working Directory (where am I?)</td></tr>
                        <tr><td style="color:var(--success);">ls</td><td>List files in current directory</td></tr>
                        <tr><td style="color:var(--success);">cd</td><td>Change Directory (move folders)</td></tr>
                        <tr><td style="color:var(--success);">mkdir</td><td>Make Directory (create folder)</td></tr>
                        <tr><td style="color:var(--success);">touch</td><td>Create an empty file</td></tr>
                        <tr><td style="color:var(--success);">rm</td><td>Remove/delete a file</td></tr>
                        <tr><td style="color:var(--success);">cat</td><td>Read a file's contents</td></tr>
                        <tr><td style="color:var(--success);">clear</td><td>Clear the terminal screen</td></tr>
                    </table>`;
                } else if (cmd === 'help --git') {
                    response = `<div style="color:var(--primary);font-weight:bold;margin-bottom:5px;">[GIT COMMANDS]</div>
                    <table class="help-table">
                        <tr><td style="color:var(--success);width:120px;">git status</td><td>Check the status of your files</td></tr>
                        <tr><td style="color:var(--success);">git add .</td><td>Stage all changed files</td></tr>
                        <tr><td style="color:var(--success);">git commit -m</td><td>Save a snapshot to the vault</td></tr>
                        <tr><td style="color:var(--success);">git log</td><td>View commit history</td></tr>
                        <tr><td style="color:var(--success);">git checkout</td><td>Switch branches or restore files</td></tr>
                        <tr><td style="color:var(--success);">git merge</td><td>Combine branches together</td></tr>
                    </table>`;
                } else if (cmd === 'help --python') {
                    response = `<div style="color:var(--primary);font-weight:bold;margin-bottom:5px;">[PYTHON COMMANDS]</div>
                    <table class="help-table">
                        <tr><td style="color:var(--success);width:150px;">python --version</td><td>Check Python version</td></tr>
                        <tr><td style="color:var(--success);">python -m venv</td><td>Create a virtual environment</td></tr>
                        <tr><td style="color:var(--success);">pip install</td><td>Install a package</td></tr>
                        <tr><td style="color:var(--success);">pip list</td><td>List installed packages</td></tr>
                    </table>`;
                } else {
                    response = `Welcome to the TermTrek Terminal.<br>Use the following flags to see specific commands:<br><br>
                    <span style="color:var(--primary)">help --bash</span>   : File system and navigation<br>
                    <span style="color:var(--primary)">help --git</span>    : Version control<br>
                    <span style="color:var(--primary)">help --python</span> : Environment and packages<br>
                    <span style="color:var(--primary)">help --fun</span>    : ???`;
                }
            }
            else if (cmd === 'help --fun') response = `Try typing: <strong>sudo</strong>, <strong>whoami</strong>, <strong>ping</strong>, or <strong>coffee</strong>`;
            else if (cmd.startsWith('sudo ')) response = `<span style="color:var(--danger)">Nice try. This incident will be reported.</span>`;
            else if (cmd === 'whoami') response = `You are a future Senior Engineer.`;
            else if (cmd.startsWith('ping ')) response = `PONG! 🏓 (Response time: 0.001ms)`;
            else if (cmd === 'coffee' || cmd === 'brew') {
                response = `<pre class="easter-egg">
      ( (
       ) )
    ........
    |      |]
    \\      /
     \`----'
                </pre>Enjoy your terminal espresso.`;
            }

            else if (cmd.startsWith('python --version') || cmd.startsWith('python3 --version')) response = 'Python 3.12.2';
            else if (cmd.startsWith('git --version')) response = 'git version 2.43.0';
            else if (cmd.startsWith('python -m venv') || cmd.startsWith('python3 -m venv')) {
                const folderName = cmd.split(' ').pop();
                VFS.files[VFS.currentPath].push(`<span style="color: var(--primary)">${folderName}</span>`);
                VFS.files[`${VFS.currentPath}/${folderName}`] = [];
                renderFileTree(folderName, 'add');
            }
            else if (cmd.includes('activate')) {
                document.getElementById('term-prompt').innerHTML = `<span style="color: var(--warning)">(venv)</span> ` + document.getElementById('term-prompt').innerHTML;
            }
            else if (cmd.startsWith('pip install') || cmd.startsWith('pip3 install')) {
                const pkg = cmd.split(' ').pop();
                response = `Collecting ${pkg}<br>Downloading ${pkg}-2.31.0-py3-none-any.whl<br>Installing collected packages: ${pkg}<br><span style="color: var(--success)">Successfully installed ${pkg}-2.31.0</span>`;
            }
            else if (cmd === 'pip list' || cmd === 'pip3 list') response = `Package    Version<br>---------- -------<br>pip        24.0<br>requests   2.31.0`;
            else if (cmd === 'ls ~/.ssh') response = `id_ed25519 &nbsp;&nbsp;&nbsp;&nbsp; id_ed25519.pub &nbsp;&nbsp;&nbsp;&nbsp; known_hosts`;
            else if (cmd.startsWith('ssh-keygen')) response = 'Generating public/private ed25519 key pair...<br>Your identification has been saved in /home/student/.ssh/id_ed25519<br>Your public key has been saved in /home/student/.ssh/id_ed25519.pub';
            else if (cmd.startsWith('eval')) response = 'Agent pid 54321';
            else if (cmd.startsWith('ssh-add')) response = 'Identity added: /home/student/.ssh/id_ed25519 (email@example.com)';
            else if (cmd.startsWith('pbcopy') || cmd.startsWith('clip')) response = '';
            else if (cmd === 'ssh -T git@github.com') response = `Hi Engineer! You've successfully authenticated, but GitHub does not provide shell access.`;
            else if (cmd === 'clear') { termOutput.innerHTML = ''; newTermInput.value = ''; return; }
            else if (cmd === 'exit') { termOutput.innerHTML += '<div style="color: var(--warning);">Connection closed.</div>'; newTermInput.disabled = true; stepSuccess(); return; }
            else response = `bash: ${cmd}: command not found`;

            if (response) termOutput.innerHTML += `<div style="margin-bottom: 8px; color: #a3a3a3; font-family: var(--font-mono);">${response}</div>`;

            termOutput.scrollTop = termOutput.scrollHeight;
            newTermInput.value = '';

            const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
            if (currentStep && currentStep.validateCommand && currentStep.validateCommand(cmd)) stepSuccess();
        }
    });
}

async function executePython() {
    if (!monacoEditorInstance) return;
    const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
    const code = monacoEditorInstance.getValue();

    if (currentStep && currentStep.validateCode && currentStep.validateCode(code)) {
        if (currentStep.isEditorMissionOnly) {
            switchWorkspace('terminal');
            const termOutput = document.getElementById('term-output');
            termOutput.innerHTML += `<div style="margin-top: 10px; color: var(--success); font-weight: bold;">[SYSTEM] File saved successfully.</div>`;
            termOutput.scrollTop = termOutput.scrollHeight;
            stepSuccess();
            return;
        }
    }

    if (!pyodideInstance) { alert("Python Engine is still booting... please wait."); return; }

    let pythonOutput = "";
    pyodideInstance.setStdout({ batched: (msg) => { pythonOutput += msg + "\n"; } });

    switchWorkspace('terminal');
    const termOutput = document.getElementById('term-output');
    termOutput.innerHTML += `<div style="margin-top: 15px; color: var(--primary);">[Running editor.py...]</div>`;

    try {
        await pyodideInstance.runPythonAsync(code);
        termOutput.innerHTML += `<div style="color: var(--text-primary); white-space: pre-wrap;">${pythonOutput || "[No output printed]"}</div>`;
        termOutput.innerHTML += `<div style="color: var(--success); margin-bottom: 10px;">[Execution Finished]</div>`;
        termOutput.scrollTop = termOutput.scrollHeight;
        if (currentStep && currentStep.validateCode && currentStep.validateCode(code)) stepSuccess();
    } catch (err) {
        termOutput.innerHTML += `<div style="color: var(--danger); white-space: pre-wrap;">Traceback:\n${err.message}</div>`;
        termOutput.scrollTop = termOutput.scrollHeight;
    }
}

function setupVisualizerTerminal() {
    const oldInput = document.getElementById('vis-term-input');
    const output = document.getElementById('vis-term-output');
    const newInput = oldInput.cloneNode(true);
    oldInput.parentNode.replaceChild(newInput, oldInput);

    document.querySelector('.mini-terminal').addEventListener('click', () => newInput.focus());

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
                } else output.innerHTML += `<div style="color: var(--warning);">Nothing to commit.</div>`;
            } else output.innerHTML += `<div>git: '${cmd}' is not a valid visualizer command.</div>`;

            newInput.value = '';
            output.scrollTop = output.scrollHeight;

            const currentStep = AppState.activeModuleData.steps[AppState.currentStepIndex];
            if (currentStep && currentStep.validateCommand && currentStep.validateCommand(cmd)) setTimeout(stepSuccess, 1000);
        }
    });
}

function resetCurrentLesson() {
    AppState.completedModules = AppState.completedModules.filter(id => id !== AppState.currentModuleId);

    if (AppState.consent === 'accepted') {
        localStorage.setItem('termtrek_state', JSON.stringify(AppState.completedModules));
    }

    AppState.currentStepIndex = 0;
    document.getElementById('term-output').innerHTML = '';
    VFS.files[VFS.currentPath] = ['main.py', 'secrets.txt', 'README.md'];
    renderFileTree();
    if (monacoEditorInstance) monacoEditorInstance.setValue(AppState.activeModuleData.steps[0]?.editorDefaultValue || '# Write your Python code here...\n\n');
    renderSidebar();
    loadStep();
}

function resetAllProgress() {
    if (confirm("Are you sure you want to reset all your progress? This cannot be undone.")) {
        AppState.completedModules = [];

        if (AppState.consent === 'accepted') {
            localStorage.removeItem('termtrek_state');
        }

        AppState.currentModuleId = 'welcome';
        AppState.gitBranch = 'main';
        document.getElementById('term-output').innerHTML = '';
        VFS.files = { '/home/student/project': ['main.py', 'secrets.txt', 'README.md'] };
        VFS.currentPath = '/home/student/project';
        renderFileTree();
        updatePrompt();
        if (monacoEditorInstance) monacoEditorInstance.setValue('# Write your Python code here...\n\n');
        renderSidebar();
        loadModule('welcome');
    }
}

window.onload = initApp;