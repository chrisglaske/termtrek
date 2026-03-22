const curriculum = {
    phases: [
        {
            title: "Phase 0: Groundwork",
            modules: [
                {
                    id: "welcome",
                    title: "Welcome & Mindset",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>Welcome to TermTrek! 👋</h2>
                                <p>Hello and welcome! If you are reading this, you've taken your first step toward becoming a real software engineer. You aren't just going to watch videos here; you are going to write code, break things, and fix them.</p>
                                <p>TermTrek is a fully interactive, browser-based engineering sandbox. We've built a real UNIX terminal, a virtual file system, and a Python compiler right into this web page so you can practice safely.</p>
                            `
                        },
                        {
                            content: `
                                <h2>What You Will Learn</h2>
                                <p>By the end of this simulation, you will have the muscle memory to operate like a professional developer. We will cover:</p>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>Terminal Navigation (Bash):</strong> How to command a computer entirely through text, without ever touching a mouse.</li>
                                    <li><strong>Version Control (Git):</strong> How to use the industry-standard "time machine" to save your code, create alternate timelines, and collaborate.</li>
                                    <li><strong>Programming (Python):</strong> Core logic, variables, loops, object-oriented design, and how to build actual applications.</li>
                                    <li><strong>Local Setup:</strong> How to leave this sandbox and properly configure your actual physical computer for professional development.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>The Illusion of Competence</h2>
                                <p>Watching a senior developer code on YouTube feels great. It makes you feel like you are learning. But the moment you open an empty text editor, your mind goes blank. This is called <strong>Tutorial Hell</strong>.</p>
                                <p>Software engineering is not about memorizing syntax. It is about muscle memory, breaking things, reading error logs, and fixing them. You can only learn it by doing it.</p>
                                
                                <h2>Why Git & Python First?</h2>
                                <p>Beginners are terrified of breaking their computers. <strong>Git (Version Control)</strong> removes that fear entirely. It acts as an infinite "undo" button for your entire project.</p>
                                <p>We use <strong>Python</strong> because it reads like English and removes the complex boilerplate required by other languages. It lets you focus entirely on pure logic.</p>
                            `
                        }
                    ]
                },
                {
                    id: "os-setup",
                    title: "Environment Setup",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The Operating System Divide</h2>
                                <p>The internet runs on Linux. Because of this, modern web development tools are natively built for Unix-based operating systems (macOS and Linux). The terminal commands used to navigate these systems are called <strong>Bash</strong> or <strong>Zsh</strong> commands.</p>
                                <p>Windows uses an entirely different architecture. Its default Command Prompt uses different commands (e.g., <code>dir</code> instead of <code>ls</code>).</p>
                                
                                <h2>The Workaround</h2>
                                <p>To solve this, Windows developers install tools like <strong>Git Bash</strong> or <strong>WSL</strong>, which force Windows to understand Mac/Linux commands. In this course, we teach the industry-standard Unix commands, regardless of what computer you are using.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's configure your simulation. Look at the sidebar on the left and click the toggle to select the actual Operating System you are using.
                                    <br><br>Once selected, verify your environment by typing: <code>echo "Environment Set"</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("echo") && cmd.includes("Environment Set")
                        }
                    ]
                },
                {
                    id: "bash-basics",
                    title: "Terminal Navigation",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The GUI is a Crutch</h2>
                                <p>When you use a mouse to click a folder icon, your computer is secretly running terminal commands in the background. Professional developers bypass the mouse and type the commands directly, which is infinitely faster.</p>
                                
                                <h2>The "Working Directory"</h2>
                                <p>The terminal is like a physical cursor. It is always "sitting inside" one specific folder on your hard drive at any given time. We call this the <strong>Working Directory</strong>.</p>
                                <p>We use the <code>pwd</code> (Print Working Directory) command to ask the terminal for our exact location.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Find out where you are sitting. Type <code>pwd</code> and hit enter.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "pwd"
                        },
                        {
                            content: `
                                <h2>Peering into the Dark</h2>
                                <p>Now that you know you are inside the <code>/home/student/project</code> folder, you need to see what files exist inside it.</p>
                                <p>The <code>ls</code> (List) command lists all visible files and folders in your current working directory. Look at the File Explorer panel—when you run the command, the output should match what you see there.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Look around your current directory. Type <code>ls</code>.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "ls"
                        },
                        {
                            content: `
                                <h2>Hidden Files</h2>
                                <p>Not all files are visible by default. Files or folders that start with a dot (like <code>.git</code>) are intentionally hidden by the operating system to prevent accidental deletion or clutter.</p>
                                <p>To see absolutely everything, you must pass the <strong>"all" flag</strong> to the list command.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Reveal the hidden files in your project directory.
                                    <br><br>Type <code>ls -a</code> (or <code>ls -la</code> for a detailed vertical list). Watch the explorer to see them appear!
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "ls -a" || cmd === "ls -la" || cmd === "ls -al"
                        },
                        {
                            content: `
                                <h2>Relative vs. Absolute Paths</h2>
                                <p>If you type <code>cd logs</code>, you are using a <strong>Relative Path</strong>—you are telling the computer to look for a folder named "logs" exactly where you are standing.</p>
                                <p>An <strong>Absolute Path</strong> starts from the very root of the computer, like <code>cd /home/student/project/logs</code>.</p>
                                
                                <h2>The Secret Dot Notation</h2>
                                <p>Operating systems use shorthand for navigation. <br><code>.</code> (a single dot) means "the current folder". <br><code>..</code> (two dots) means "the parent folder" (go back one step).</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's practice path resolution. Watch the terminal prompt update as you move!
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type <code>mkdir logs</code> (Make Directory).</li>
                                        <li>Type <code>cd logs</code> to enter it using a relative path.</li>
                                        <li>Now, navigate backwards to the parent folder by typing <code>cd ..</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "cd .."
                        }
                    ]
                },
                {
                    id: "bash-files",
                    title: "Creating, Reading & Destroying",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>Rapid File Creation</h2>
                                <p>The <code>touch</code> command instantly creates an empty file. It is much faster than opening a text editor, clicking "File -> New," and saving it.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Create a new file in your current folder. Type <code>touch server.log</code>. Watch it glow and slide into your Explorer panel!
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "touch server.log"
                        },
                        {
                            content: `
                                <h2>Reading Files Without an Editor</h2>
                                <p>What if you just want to quickly read a file without opening up a heavy IDE? You can use the <code>cat</code> (Concatenate) command to print the entire contents of a file directly into your terminal screen.</p>
                                <p>This is incredibly useful for reading configuration files or checking logs on remote servers.</p>

                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    We already have a <code>README.md</code> file in our project. Let's read it.
                                    <br><br>Type: <code>cat README.md</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "cat README.md"
                        },
                        {
                            content: `
                                <h2>The Danger of the Terminal</h2>
                                <p>To delete a file, we use the <code>rm</code> (Remove) command. <strong>This is incredibly dangerous.</strong></p>
                                <p>When you delete a file using your mouse, your OS moves it to the "Recycle Bin", giving you a chance to recover it. The terminal has no Recycle Bin. When you use <code>rm</code>, the file is instantly and permanently destroyed from your hard drive.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Delete the file you just made. Type <code>rm server.log</code>. Watch it explode.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "rm server.log"
                        }
                    ]
                }
            ]
        },
        {
            title: "Phase 1: Git Mastery",
            modules: [
                {
                    id: "git-mental-model",
                    title: "Git: The Mental Model",
                    workspaceType: "terminal",
                    steps: [
                        {
                            showVisualizer: true,
                            content: `
                                <h2>What is Git, Actually?</h2>
                                <p>Most beginners think Git is a cloud backup service. It isn't. <strong>Git is a local time-machine database.</strong> When initialized, it creates a hidden folder named <code>.git</code> that tracks every single keystroke you make.</p>
                                
                                <h2>The Three Zones</h2>
                                <p>Git moves your code through a highly organized pipeline:</p>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>1. Working Directory:</strong> Your actual folder. Git sees your changes here but isn't officially tracking them.</li>
                                    <li><strong>2. Staging Area:</strong> The loading dock. You use <code>git add</code> to place files here to prepare them for saving.</li>
                                    <li><strong>3. Repository (Vault):</strong> The timeline. You use <code>git commit</code> to lock a snapshot of the Staging Area into history permanently.</li>
                                </ul>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Watch the Visualizer above your terminal. Move the file from the Working Directory to the Staging Area by typing <code>git add index.txt</code> (or <code>git add .</code> to stage everything).
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "git add index.txt" || cmd === "git add ."
                        },
                        {
                            showVisualizer: true,
                            content: `
                                <h2>The Commit Snapshot</h2>
                                <p>Your file is on the loading dock. Now commit it to the vault. Every commit requires a "message" (the <code>-m</code> flag) explaining what changed. We will use a standard prefix (<code>feat:</code>) to denote a new feature.</p>
                                <p>Under the hood, Git generates a massive 40-character cryptographic hash (like <code>a1b2c3d4...</code>) for this commit. That hash is the exact coordinate in time you can travel back to if your code breaks.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Lock the staged file into the Vault. Type <code>git commit -m "feat: initial commit"</code>.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git commit") && cmd.includes("feat:")
                        }
                    ]
                },
                {
                    id: "git-conventional",
                    title: "Conventional Commits",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The Chaos of Teamwork</h2>
                                <p>If you write a commit message like <code>git commit -m "fixed the thing"</code>, your teammates will hate you. Professional engineering teams use a strict standard called <strong>Conventional Commits</strong> to bring order to the chaos.</p>
                                
                                <h2>The Prefixes</h2>
                                <p>Every commit message must start with a specific prefix:</p>
                                
                                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px; margin-bottom: 25px;">
                                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                                        <div style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 4px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; width: 65px; text-align: center;">feat:</div>
                                        <div style="font-size: 0.95rem; color: #d4d4d8;">A new feature <span style="color: var(--text-secondary); font-size: 0.85rem;">(e.g., <code>feat: add login page</code>)</span></div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                                        <div style="background: rgba(239, 68, 68, 0.15); color: var(--danger); padding: 4px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; width: 65px; text-align: center;">fix:</div>
                                        <div style="font-size: 0.95rem; color: #d4d4d8;">Resolving a bug <span style="color: var(--text-secondary); font-size: 0.85rem;">(e.g., <code>fix: stop app crash</code>)</span></div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 12px 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px;">
                                        <div style="background: rgba(0, 112, 243, 0.15); color: #4fc1ff; padding: 4px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; width: 65px; text-align: center;">docs:</div>
                                        <div style="font-size: 0.95rem; color: #d4d4d8;">Documentation <span style="color: var(--text-secondary); font-size: 0.85rem;">(e.g., <code>docs: update readme</code>)</span></div>
                                    </div>
                                    <div style="background: rgba(245, 166, 35, 0.15); color: var(--warning); padding: 4px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; width: 65px; text-align: center;">chore:</div>
                                        <div style="font-size: 0.95rem; color: #d4d4d8;">Maintenance tasks <span style="color: var(--text-secondary); font-size: 0.85rem;">(e.g., <code>chore: update packages</code>)</span></div>
                                    </div>
                                </div>
                            `
                        },
                        {
                            showVisualizer: true,
                            content: `
                                <h2>Why do we do this? (Automation)</h2>
                                <p>By strictly enforcing these prefixes, companies can write robots that read the Git history and automatically generate "Release Notes" for the users. A robot knows that a <code>feat:</code> means a new version!</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's practice the professional workflow.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type <code>touch api.py</code></li>
                                        <li>Type <code>git add .</code> to stage it.</li>
                                        <li>Commit it using the proper feature tag: <code>git commit -m "feat: build api structure"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git commit") && cmd.includes("feat:")
                        }
                    ]
                },
                {
                    id: "git-branching",
                    title: "Branching & Isolation",
                    workspaceType: "terminal",
                    steps: [
                        {
                            showVisualizer: true,
                            content: `
                                <h2>The Golden Rule: Protect Main</h2>
                                <p>The <code>main</code> branch of your repository represents the code that is currently live and in production. <strong>You never write experimental code directly on main.</strong></p>
                                
                                <h2>Parallel Universes</h2>
                                <p>When you want to build a new feature, you create a <strong>Branch</strong>. A branch is an exact clone of <code>main</code> at that moment in time. You can spend weeks destroying and rebuilding code on your branch, and the <code>main</code> branch remains perfectly safe.</p>
                                <p>Under the hood, Git uses a pointer called <code>HEAD</code> to track which branch you are currently sitting in. Look at your terminal prompt at the bottom of the screen—it currently says <code>(main)</code>.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Create a branch named 'dev' and switch your <code>HEAD</code> pointer to it simultaneously using the <code>-b</code> flag. 
                                    <br><br>Type: <code>git checkout -b dev</code>
                                    <br><br><em>Notice how your terminal prompt changes to (dev)!</em>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git checkout -b dev")
                        }
                    ]
                },
                {
                    id: "git-conflicts",
                    title: "Merge Conflicts",
                    workspaceType: "terminal",
                    steps: [
                        {
                            showVisualizer: true,
                            content: `
                                <h2>The Inevitable Collision</h2>
                                <p>When your feature is complete on the <code>dev</code> branch, you merge it back into <code>main</code>. Usually, Git combines the code automatically. But what happens if you and a teammate edit the <em>exact same line</em> of the <em>exact same file</em>?</p>
                                <p>Git panics. It doesn't know which version is the correct one, so it halts the process and throws a <strong>Merge Conflict</strong>.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's trigger a disaster. You wrote code on <code>dev</code>, but <code>main</code> was also updated. Attempt to smash them together. 
                                    <br><br>Type: <code>git merge dev</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "git merge dev"
                        },
                        {
                            workspaceType: "editor",
                            editorDefaultValue: `def add(a, b):\n<<<<<<< HEAD\n    print(f"Main Branch says: {a+b}")\n=======\n    print(f"Dev Branch says: {a+b}")\n>>>>>>> dev\n    return a + b`,
                            content: `
                                <h2>Anatomy of a Conflict</h2>
                                <p>When a conflict occurs, Git literally injects weird markers directly into your text file to show you the collision. We have automatically opened the broken <code>calc.py</code> file in your editor.</p>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code> represents where you currently are (Main).</li>
                                    <li><code>=======</code> is the divider line.</li>
                                    <li><code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; dev</code> represents the incoming code you tried to merge.</li>
                                </ul>
                                <p>To fix this, you just delete the markers and delete the code you don't want.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Resolve the conflict manually in the editor.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Delete the <code>&lt;&lt;&lt;</code>, <code>===</code>, and <code>&gt;&gt;&gt;</code> marker lines entirely.</li>
                                        <li>Keep ONLY the "Dev Branch" print statement. Delete the Main branch one.</li>
                                        <li>Click <strong>Run Code ▶</strong> to save the fixed file to your hard drive.</li>
                                    </ol>
                                </div>
                            `,
                            isEditorMissionOnly: true,
                            validateCode: (code) => !code.includes("<<<<<<<") && !code.includes("=======") && !code.includes("Main Branch") && code.includes("Dev Branch")
                        },
                        {
                            workspaceType: "terminal",
                            showVisualizer: true,
                            content: `
                                <h2>Finalizing the Merge</h2>
                                <p>The text file is clean, but Git is still waiting in a paused "merging state." You have to explicitly tell Git that the conflict is resolved by staging the file and committing the final result.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Finalize the merge using a conventional commit.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Stage the fix: <code>git add .</code></li>
                                        <li>Commit it: <code>git commit -m "fix: resolve merge conflict"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git commit") && cmd.includes("fix:")
                        }
                    ]
                }
            ]
        },
        {
            title: "Phase 2: Python Core",
            modules: [
                {
                    id: "py-intro",
                    title: "What is Python?",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The "Swiss Army Knife" of Code</h2>
                                <p>Python is currently the most popular programming language in the world. Why? Because it was designed to be <strong>readable</strong>. While other languages look like math equations, Python looks like English.</p>
                                
                                <h2>Real-World Use Cases</h2>
                                <p>You aren't just learning a "beginner" tool. Python powers the world's most advanced technology:</p>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>Artificial Intelligence:</strong> Almost every AI (like ChatGPT) and Machine Learning model is built using Python.</li>
                                    <li><strong>Data Science:</strong> Scientists use it to analyze massive amounts of data and create visualizations.</li>
                                    <li><strong>Web Development:</strong> Sites like Instagram, Netflix, and Spotify use Python for their "Backend" (the brain of the website).</li>
                                    <li><strong>Automation:</strong> Engineers use it to write "scripts" that do hours of boring manual work in seconds.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>Interpreted vs. Compiled</h2>
                                <p>Computers cannot actually read Python. They only understand 1s and 0s. Some languages (like C++) require a "Compilation" step where you convert the whole file into a <code>.exe</code> before you can run it.</p>
                                <p>Python is <strong>Interpreted</strong>. This means there is a "Translator" program (the Python Interpreter) that reads your code line-by-line and executes it instantly. This makes it much faster for you to experiment and find bugs.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's talk to the interpreter. Type <code>python3</code> (or just <code>python</code>) and hit Enter to enter "Interactive Mode."
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "python3" || cmd === "python"
                        },
                        {
                            content: `
                                <h2>The "Zen" of Python</h2>
                                <p>The creators of Python believe that "Simple is better than complex." They even hid a poem inside the language called <em>The Zen of Python</em> which outlines the philosophy of how to write good code.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Read the philosophy. While still inside the interactive Python mode, type <code>import this</code> and hit Enter.
                                    <br><br>Once you've read it, type <code>exit()</code> to return to the normal terminal.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "exit()"
                        }
                    ]
                },
                {
                    id: "py-vars",
                    title: "Variables & Types",
                    workspaceType: "editor",
                    editorDefaultValue: `# Step 1: Create a variable named 'user' below this line\n\n\n# Step 2: Use an f-string to print a greeting using the variable\n`,
                    steps: [
                        {
                            content: `
                                <h2>Dynamic Memory</h2>
                                <p>Python is a <strong>dynamically typed</strong> language. In older languages like C++, you have to tell the computer exactly how much RAM to reserve for a variable (e.g., <code>int age = 5;</code>). Python handles memory management automatically; you just write <code>age = 5</code> and Python figures out the type in the background.</p>
                                
                                <h2>The 4 Core Data Types</h2>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>Strings (str):</strong> Text, always wrapped in quotes. <code>hero = "Arthur"</code></li>
                                    <li><strong>Integers (int):</strong> Whole numbers. <code>level = 5</code></li>
                                    <li><strong>Floats (float):</strong> Decimals. <code>health = 85.5</code></li>
                                    <li><strong>Booleans (bool):</strong> Binary True or False (Must be capitalized in Python!). <code>is_alive = True</code></li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>String Injection (f-strings)</h2>
                                <p>Historically, mixing variables and text in Python was ugly. You had to use plus signs (<code>"Hello " + user + "!"</code>). Modern Python introduced <strong>f-strings</strong> (formatted strings).</p>
                                <p>By placing an <code>f</code> directly outside the opening quote, you can inject variables seamlessly inside curly braces <code>{}</code>.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Let's write a dynamic greeting in the <strong>editor.py</strong> tab to the right in the menu bar.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Create a variable: <code>user = "Engineer"</code></li>
                                        <li>Print an f-string: <code>print(f"Welcome to the system, {user}")</code></li>
                                    </ol>
                                    Click <strong>Run Code ▶</strong> to compile it. Watch the terminal to see your output!
                                </div>
                            `,
                            validateCode: (code) => code.includes('user') && code.includes('{user}') && code.includes('print')
                        }
                    ]
                },
                {
                    id: "py-math",
                    title: "Math & Operators",
                    workspaceType: "editor",
                    editorDefaultValue: `# Calculate if 15 is even or odd using modulo\nnum = 15\n\n# Calculate the remainder and print it below:\n`,
                    steps: [
                        {
                            content: `
                                <h2>Beyond Basic Arithmetic</h2>
                                <p>Python can do basic math like addition (<code>+</code>), subtraction (<code>-</code>), and multiplication (<code>*</code>) natively. But algorithms often require more advanced operators.</p>
                                
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong>Exponents (<code>**</code>):</strong> Calculates power. <code>3 ** 2</code> is 9.</li>
                                    <li><strong>Floor Division (<code>//</code>):</strong> Divides and rounds down to the nearest whole integer. <code>10 // 3</code> is 3.</li>
                                    <li><strong>Modulo (<code>%</code>):</strong> Returns only the remainder of a division. <code>10 % 3</code> is 1.</li>
                                </ul>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Modulo is famously used to check if a number is even (if it divides by 2 with a remainder of 0).
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Create a variable to hold the remainder: <code>remainder = num % 2</code></li>
                                        <li>Print it: <code>print(remainder)</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('%') && code.includes('2') && code.includes('print(')
                        }
                    ]
                },
                {
                    id: "py-strings",
                    title: "String Manipulation",
                    workspaceType: "editor",
                    editorDefaultValue: `text = "hello world"\n\n# Capitalize the text and print it below:\n`,
                    steps: [
                        {
                            content: `
                                <h2>Text is an Array</h2>
                                <p>Under the hood, a string is just an array of individual characters. Because of this, Python provides incredibly powerful built-in methods to manipulate text.</p>
                                
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><strong><code>.upper()</code> / <code>.lower()</code>:</strong> Forces text to a specific case. (Great for normalizing user input!).</li>
                                    <li><strong><code>.replace(old, new)</code>:</strong> Swaps specific substrings.</li>
                                    <li><strong><code>.split(" ")</code>:</strong> Chops a string into a List of smaller strings based on a separator (like a space).</li>
                                </ul>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Format the text data using string methods.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Print the text in all caps: <code>print(text.upper())</code></li>
                                        <li>Print the text with "world" swapped out: <code>print(text.replace("world", "engineer"))</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('text.upper()') && code.includes('text.replace(')
                        }
                    ]
                },
                {
                    id: "py-logic",
                    title: "Conditional Logic",
                    workspaceType: "editor",
                    editorDefaultValue: `# We are building an authentication system.\n\nadmin = True\n\n# Write your if/else statement below:\n`,
                    steps: [
                        {
                            content: `
                                <h2>The Brains of the Operation</h2>
                                <p>Software is entirely built on decisions. <code>if</code> statements allow your code to branch into different paths based on incoming data.</p>
                                
                                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-bottom: 20px;">
                                    <strong>CRITICAL: Python uses Indentation!</strong><br>
                                    Languages like JavaScript use curly brackets <code>{}</code> to group code blocks together. Python relies strictly on <strong>whitespace</strong>. If your code isn't indented perfectly (usually 4 spaces or 1 tab), the entire program will crash with an <code>IndentationError</code>.
                                </div>
                                
                                <h2>If / Elif / Else</h2>
                                <p>You can chain multiple conditions together using <code>elif</code> (else if). The computer checks them top-to-bottom. The first one that evaluates to True executes, and the rest are ignored.</p>
                            `
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Write the authentication block in the editor.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Write the if statement: <code>if admin == True:</code></li>
                                        <li>Indent the next line and write: <code>print("Access Granted")</code></li>
                                        <li>Remove the indent, write <code>else:</code>, and indent the next line to print <code>"Denied"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('if admin') && code.includes('print(') && code.includes('else:')
                        }
                    ]
                },
                {
                    id: "py-loops",
                    title: "Iteration & Loops",
                    workspaceType: "editor",
                    editorDefaultValue: `# Build a countdown timer that prints 0 through 4\n\n# Write your for loop below:\n`,
                    steps: [
                        {
                            content: `
                                <h2>The Power of Automation</h2>
                                <p>Computers are stupid, but they are incredibly fast at doing repetitive tasks. We use loops to tell a computer to run the same block of code thousands of times.</p>
                                
                                <h2>The While Loop & The Infinite Trap</h2>
                                <p>A <code>while</code> loop runs continuously <em>as long as</em> a mathematical condition remains True. You must be extremely careful to ensure the condition eventually becomes False, otherwise you create an <strong>Infinite Loop</strong> that will consume all your CPU memory and freeze the program.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The For Loop</h2>
                                <p>A <code>for</code> loop is vastly safer. It is designed to iterate a specific number of times, or to step through a pre-existing collection of data one item at a time.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Write a countdown using a <code>for</code> loop and the built-in <code>range()</code> function.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type: <code>for i in range(5):</code></li>
                                        <li>Indent and type: <code>print(i)</code></li>
                                    </ol>
                                    <em>Note: When you run this, observe how computers start counting at 0, not 1!</em>
                                </div>
                            `,
                            validateCode: (code) => code.includes('for i in range') && code.includes('print(i)')
                        }
                    ]
                },
                {
                    id: "py-lists",
                    title: "Deep Dive: Lists",
                    workspaceType: "editor",
                    editorDefaultValue: `servers = ["web-1", "db-1"]\n\n# Add a new server 'cache-1' to the list:\n`,
                    steps: [
                        {
                            content: `
                                <h2>Dynamic Arrays</h2>
                                <p>A List is an ordered collection of items wrapped in square brackets <code>[]</code>. You retrieve items by calling their "Index" number. Because computers use <strong>Zero-Based Indexing</strong>, the first item is always at index 0.</p>
                                <p>Unlike lists in other languages, Python lists are dynamic. They can shrink, grow, and hold completely mixed data types simultaneously.</p>
                                
                                <h2>List Methods</h2>
                                <p>You can dynamically modify a list using built in methods like <code>.append(item)</code> to stick a new item on the end, or <code>.remove(item)</code> to delete one.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Scale up your server infrastructure.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Append a new server: <code>servers.append("cache-1")</code></li>
                                        <li>Print the entire list: <code>print(servers)</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('.append') && code.includes('cache-1') && code.includes('print(servers)')
                        }
                    ]
                },
                {
                    id: "py-dicts",
                    title: "Deep Dive: Dictionaries",
                    workspaceType: "editor",
                    editorDefaultValue: `# Create a dictionary representing a server:\nserver = { "status": "Online", "ping": 42 }\n\n# Print the status key safely using .get():\n`,
                    steps: [
                        {
                            content: `
                                <h2>Key-Value Lookups (JSON)</h2>
                                <p>While Lists are great for ordered data, they are terrible for lookups. If you want to find "Charlie's phone number", a List forces the computer to search through every single item until it finds him.</p>
                                <p>A <strong>Dictionary</strong> stores data in Key-Value pairs using curly braces <code>{}</code>. It acts like a literal dictionary: you look up the "Key" (a word), and it instantly gives you the "Value".</p>
                                <p>Dictionaries map perfectly to JSON, which is how 99% of all data is sent across the internet today.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The KeyError Trap</h2>
                                <p>If you try to look up a key that doesn't exist (e.g. <code>server["region"]</code>), Python will crash with a massive <code>KeyError</code>. Professional developers use the <code>.get()</code> method instead, which allows you to supply a safe fallback value if the key is missing.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Safely retrieve data from the dictionary.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Print the ping safely: <code>print(server.get("ping"))</code></li>
                                        <li>Try to print a missing key with a fallback: <code>print(server.get("region", "Unknown Region"))</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('.get("ping")') && code.includes('.get("region"')
                        }
                    ]
                },
                {
                    id: "py-errors",
                    title: "Error Handling",
                    workspaceType: "editor",
                    editorDefaultValue: `# Wrap the dangerous code below in a try/except block:\n\nprint(ghost_variable) # This variable does not exist\n`,
                    steps: [
                        {
                            content: `
                                <h2>Anticipating Disaster</h2>
                                <p>When real humans interact with your program, they will do unpredictable things. If your code asks for their age, and they type "Banana", trying to do math on the word "Banana" will cause your program to instantly shut down and throw a stack trace error.</p>
                                <p>Professional engineers do not let their apps crash. They anticipate failures and handle them gracefully.</p>
                                
                                <h2>Try / Except Blocks</h2>
                                <p>You can wrap dangerous code inside a <code>try</code> block. If Python hits an error inside that block, it aborts the execution but <em>does not crash the app</em>. Instead, it instantly jumps to the <code>except</code> block so you can show the user a polite warning message.</p>
                            `
                        },
                        {
                            content: `
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3; font-family: var(--font-mono);">
try:
    # Trying to divide by zero causes a massive crash
    answer = 10 / 0
except:
    print("Math error! You can't divide by zero.")</pre>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Catch a failure in the editor.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Write a <code>try:</code> block that attempts to print the undefined variable: <code>print(ghost_variable)</code></li>
                                        <li>Write an <code>except:</code> block below it that prints: <code>"Caught the error!"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('try:') && code.includes('except:') && code.includes('print(')
                        }
                    ]
                },
                {
                    id: "py-funcs",
                    title: "Functions & Architecture",
                    workspaceType: "editor",
                    editorDefaultValue: `# Define the reusable 'add' function below:\n\n\n\n# Call the function and print the result:\n`,
                    steps: [
                        {
                            content: `
                                <h2>DRY: Don't Repeat Yourself</h2>
                                <p>As your codebase grows, writing the same logic over and over becomes a nightmare. If the logic has a bug, you have to find and fix it in 50 different places.</p>
                                <p><strong>Functions</strong> allow you to package a block of code, give it a name, and reuse it anywhere. You only write the logic once.</p>
                                
                                <h2>Parameters vs. Arguments</h2>
                                <p>When you <em>define</em> a function using <code>def</code>, you define <strong>Parameters</strong>—these are empty placeholder variables (like <code>a</code> and <code>b</code>). When you actually <em>call</em> the function to run it, you pass in <strong>Arguments</strong>—the actual live data (like <code>5</code> and <code>10</code>) that fill those placeholders.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The Secret of "Return"</h2>
                                <p>Beginners often confuse <code>print()</code> with <code>return</code>. <br><code>print()</code> is just a visual display for the human looking at the screen. The computer immediately forgets it.<br><code>return</code> actually hands the processed data <em>back</em> to the computer's memory so it can be saved in a variable and used in future calculations.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Build a reusable engine in the editor.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Define it: <code>def add(a, b):</code></li>
                                        <li>Return the math: <code>return a + b</code></li>
                                        <li>Un-indent to call it and save the returned data: <code>total = add(5, 10)</code></li>
                                        <li>Print the saved data: <code>print(total)</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('def add') && code.includes('return') && code.includes('total = add(') && code.includes('print(total)')
                        }
                    ]
                },
                {
                    id: "py-imports",
                    title: "Modules & Libraries",
                    workspaceType: "editor",
                    editorDefaultValue: `import random\n\n# Generate a random number between 1 and 100\n`,
                    steps: [
                        {
                            content: `
                                <h2>Standing on the Shoulders of Giants</h2>
                                <p>You do not need to build everything from scratch. Python comes with a massive "Standard Library" of pre-written modules that handle complex math, dates, and network requests.</p>
                                <p>To unlock these tools, you use the <code>import</code> keyword at the very top of your file. Once imported, you can access the module's tools using "Dot Notation".</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Use the built-in random module to generate a number.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>We've added <code>import random</code> to the top of the file.</li>
                                        <li>Use dot notation to call the randint method and print it: <code>print(random.randint(1, 100))</code></li>
                                    </ol>
                                    <em>Run the code multiple times and watch the terminal output change!</em>
                                </div>
                            `,
                            validateCode: (code) => code.includes('import random') && code.includes('random.randint') && code.includes('print')
                        }
                    ]
                },
                {
                    id: "py-oop",
                    title: "Object-Oriented Design",
                    workspaceType: "editor",
                    editorDefaultValue: `# 1. Define the class\nclass User:\n    def __init__(self, name):\n        self.name = name\n\n# 2. Add the login() method below:\n\n\n# 3. Create an instance and call the method:\n`,
                    steps: [
                        {
                            content: `
                                <h2>The Blueprint (Classes)</h2>
                                <p>As programs get larger, floating variables and scattered functions become messy. <strong>Object-Oriented Programming (OOP)</strong> allows you to bundle related data (variables) and behaviors (functions) together into a single, structured <strong>Object</strong>.</p>
                                <p>A <code>class</code> is the blueprint. It defines what an object *should* look like. When you actually build an object from that blueprint, it is called an <strong>Instance</strong>.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The Constructor (__init__)</h2>
                                <p>When you create a new instance of a class, Python automatically runs a special hidden method called <code>__init__</code>. This method initializes the specific data for that specific object (like setting its name).</p>
                                <p><strong>The "self" keyword:</strong> In Python, classes must pass a reference to themselves (<code>self</code>) into all of their internal methods so they can access their own data.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Finish building the User blueprint.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Add a method inside the class: <code>def login(self):</code></li>
                                        <li>Indent and make it print: <code>print(f"{self.name} logged in.")</code></li>
                                        <li>Un-indent to the root level. Create an instance: <code>admin = User("Engineer")</code></li>
                                        <li>Call your method on the instance: <code>admin.login()</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('def login(self):') && code.includes('admin = User') && code.includes('admin.login()')
                        }
                    ]
                },
                {
                    id: "py-oop-2",
                    title: "Inheritance",
                    workspaceType: "editor",
                    editorDefaultValue: `class User:\n    def __init__(self, name):\n        self.name = name\n\n# Create a SuperUser class that inherits from User:\n`,
                    steps: [
                        {
                            content: `
                                <h2>Sharing the Blueprint</h2>
                                <p>What if you want to create a <code>SuperUser</code> class? It needs a name just like a normal user, but it also needs extra abilities. Instead of copying and pasting the code, you can use <strong>Inheritance</strong>.</p>
                                <p>You pass the parent class into the parentheses of the new class: <code>class SuperUser(User):</code>. Now, the SuperUser instantly inherits all the data and methods of the normal User, while letting you define extra ones exclusively for the SuperUser.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Build an inherited class.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Define the child: <code>class SuperUser(User):</code></li>
                                        <li>Indent and add a new method: <code>def sudo(self):</code></li>
                                        <li>Indent and print: <code>print("Running as admin")</code></li>
                                        <li>Un-indent to root. Create an instance: <code>root = SuperUser("Root")</code></li>
                                        <li>Call the inherited property AND the new method: <code>print(root.name)</code> and <code>root.sudo()</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('class SuperUser(User):') && code.includes('def sudo(self):') && code.includes('SuperUser(') && code.includes('.sudo()')
                        }
                    ]
                }
            ]
        },
        {
            title: "Phase 3: Capstone Projects",
            modules: [
                {
                    id: "proj-1",
                    title: "Project 1: CLI Calculator",
                    workspaceType: "editor",
                    editorDefaultValue: `# THE CALCULATOR ENGINE\n# 1. Ask for first number (cast to float)\n# 2. Ask for operator (+, -, *, /)\n# 3. Ask for second number (cast to float)\n# 4. Use if/elif/else to run the math and print result\n\n`,
                    steps: [
                        {
                            content: `
                                <h2>Putting It All Together</h2>
                                <p>It is time to combine Variables, Control Flow, and Input/Output to build a functional Command Line Interface (CLI) application.</p>
                                
                                <h2>The Type Casting Trap</h2>
                                <p>When you use Python's <code>input()</code> function to ask a user a question, Python grabs their keyboard strokes and treats them strictly as a String (Text), even if they typed a number.</p>
                                <p>If a user types <code>5</code>, Python stores the <em>text character</em> "5". If you try to add "5" + "5", Python will smash the text together and give you "55". You must <strong>Cast</strong> the text into a float (a decimal number) using the <code>float()</code> wrapper before doing math.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The Logic Tree</h2>
                                <p>Your program will need to ask three separate questions, and then use an <code>if/elif/else</code> block to check which mathematical operator the user chose to determine which math equation to run.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Build the calculator engine.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Prompt and cast: <code>num1 = float(input("First: "))</code></li>
                                        <li>Prompt operator: <code>op = input("Operator (+, -, *, /): ")</code></li>
                                        <li>Prompt and cast: <code>num2 = float(input("Second: "))</code></li>
                                        <li>Write the logic block starting with: <code>if op == "+":</code></li>
                                        <li>Print the final result.</li>
                                    </ol>
                                    <em>Note: When you hit Run Code, the terminal will prompt you to enter the numbers!</em>
                                </div>
                            `,
                            validateCode: (code) => code.includes('float(input') && code.includes('if op') && code.includes('elif') && code.includes('print(')
                        }
                    ]
                },
                {
                    id: "proj-2",
                    title: "Project 2: The Secret Vault",
                    workspaceType: "editor",
                    editorDefaultValue: `# THE VAULT ENGINE\n# 1. Ask the user for a secret using input()\n# 2. Open 'secrets.txt' in append mode ('a')\n# 3. Write the secret to the file with a newline ('\\n')\n\n`,
                    steps: [
                        {
                            content: `
                                <h2>The Volatility of RAM</h2>
                                <p>Variables live in your computer's RAM. When your Python script finishes running, the RAM is instantly cleared. Everything is forgotten. To create an app that "remembers" data, you must write that data to a permanent file on the hard drive (or a database).</p>
                                
                                <h2>File Descriptors</h2>
                                <p>To talk to a hard drive, Python uses the <code>with open("filename.txt", "mode") as file:</code> syntax. This opens a secure stream to the hard drive, writes the data, and automatically closes the stream when it's done so the file doesn't corrupt.</p>
                                <p>We use <strong>"a" (append) mode</strong> so that new secrets are added to the bottom of the file without erasing the old ones.</p>
                            `
                        },
                        {
                            content: `
                                <h2>Git Security (The .gitignore file)</h2>
                                <div style="background: rgba(245, 166, 35, 0.1); border-left: 4px solid var(--warning); padding: 15px; margin-bottom: 20px;">
                                    In the real world, you <strong>NEVER</strong> commit files containing passwords, API keys, or personal secrets to GitHub. Hackers run automated bots that scrape GitHub 24/7 looking for exposed keys. You protect them by creating a file named <code>.gitignore</code> and typing the name of your secrets file inside it. Git will then pretend that file doesn't exist.
                                </div>
                                
                                <div class="mission-box">
                                    <span class="badge-edit">📝 EDITOR MISSION</span><br><br>
                                    Build the file writer.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Ask for input: <code>secret = input("Enter secret: ")</code></li>
                                        <li>Open the stream: <code>with open("secrets.txt", "a") as file:</code></li>
                                        <li>Write to it (adding a newline character so they stack): <code>file.write(secret + "\\n")</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('open(') && code.includes('"a"') && code.includes('.write(')
                        }
                    ]
                },
                {
                    id: "proj-3",
                    title: "Project 3: Git Sabotage",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The True Power of Version Control</h2>
                                <p>The absolute best way to learn to trust Git is to intentionally destroy your own work and rescue it from the brink.</p>
                                
                                <h2>The Disaster Scenario</h2>
                                <p>Imagine it is 2:00 AM. You accidentally highlighted all 500 lines of code in your calculator project and pressed delete. Your cat walks across the keyboard and hits <code>Ctrl+S</code> (Save). Your editor shows nothing. The file is empty.</p>
                                <p>Because you saved the file, your editor's "Undo" button is useless. If you run <code>git status</code>, Git will see the modification and warn you that <code>calc.py</code> has been altered in the Working Directory.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The Rescue Operation</h2>
                                <p>Because you practiced good habits and committed your code to the Git Vault earlier that day, the destruction only exists in your Working Directory. The Vault is safe.</p>
                                <p>You can command Git to reach into the Vault, grab the last known perfect snapshot of <code>calc.py</code>, and forcefully overwrite the broken file in your folder.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Your code is gone. Rescue <code>calc.py</code> from the Vault. 
                                    <br><br>Type: <code>git checkout -- calc.py</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "git checkout -- calc.py"
                        }
                    ]
                }
            ]
        },
        {
            title: "Phase 4: Going Local",
            modules: [
                {
                    id: "local-vscode",
                    title: "1. The Editor (VS Code)",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>Leaving the Sandbox</h2>
                                <p>You have mastered the core mechanics inside our simulated browser sandbox. Now, it is time to configure your actual physical computer into a professional software development environment.</p>
                                
                                <h2>The IDE (Integrated Development Environment)</h2>
                                <p>Developers don't use Microsoft Word or Notepad to write code. We use IDEs—highly advanced text editors that feature syntax highlighting, auto-completion, and integrated terminals.</p>
                                <p>Visual Studio Code (VS Code), built by Microsoft, is the undisputed industry standard. It is lightweight, infinitely customizable, and 100% free.</p>
                                <ul>
                                    <li><a href="https://code.visualstudio.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to download VS Code</a>.</li>
                                    <li>Run the installer and leave all default options checked.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>Extensions (Superpowers)</h2>
                                <p>Out of the box, VS Code is just a generic text editor. To make it understand Python syntax, format your code beautifully, and run debugger tools, you need to install the official Python extension.</p>
                                <ol style="padding-left: 20px; margin-bottom: 20px;">
                                    <li>Open VS Code.</li>
                                    <li>Click the <strong>Extensions</strong> icon on the far left sidebar (it looks like 4 building blocks).</li>
                                    <li>Search for <strong>"Python"</strong>.</li>
                                    <li>Find the one published by <strong>Microsoft</strong> and click Install.</li>
                                </ol>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Once you have VS Code installed locally, simulate the confirmation here.
                                    <br><br>Type <code>echo "Editor Installed"</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("echo") && cmd.includes("Editor")
                        }
                    ]
                },
                {
                    id: "local-python",
                    title: "2. The Engine (Python)",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The Compiler</h2>
                                <p>Your computer's CPU only understands binary (1s and 0s). It has no idea how to read the English-like Python code you write. You must install the Python Engine (the interpreter), which acts as a translator, reading your code and converting it into machine instructions in real-time.</p>
                                <h2>Step 1: Download Python</h2>
                                <p><a href="https://www.python.org/downloads/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to go to Python.org</a> and download the latest version for your operating system.</p>
                            `
                        },
                        {
                            content: `
                                <h2>Step 2: Installation (CRITICAL WARNING)</h2>
                                <div class="win-only">
                                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger); padding: 15px; margin-bottom: 20px;">
                                        <strong>Windows Users - DO NOT CLICK NEXT YET:</strong><br>
                                        On the very first screen of the Windows installer, look at the absolute bottom. You <strong>MUST</strong> check the tiny box that says <strong>"Add Python.exe to PATH"</strong>. 
                                        <br><br>If you forget this, Windows will not know where Python is installed. Your terminal will spit out "command not found" errors, and absolutely nothing will work.
                                    </div>
                                </div>
                                <div class="mac-only">
                                    <p><strong>Mac Users:</strong> Run the installer normally. Mac handles PATH variables much better than Windows. After the installation finishes, a Finder window might pop up. Double-click the file named <code>Install Certificates.command</code> to ensure Python has security permissions to access the internet.</p>
                                </div>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Verify your installation. Open your computer's *real* terminal and type <code>python --version</code> (or <code>python3 --version</code> on Mac).
                                    <br><br>Once you see the version number locally, simulate it here: <code>python --version</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "python --version" || cmd === "python3 --version"
                        }
                    ]
                },
                {
                    id: "local-venv",
                    title: "3. Virtual Environments",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The Danger of Global Pollution (Dependency Hell)</h2>
                                <p>Imagine you build a web scraper today using version 1.0 of a library. A year from now, you build a second app that requires version 2.0 of that library. If you install libraries "globally" on your computer, installing version 2.0 will overwrite version 1.0, and your first app will instantly break.</p>
                                
                                <h2>The Solution: The Venv Sandbox</h2>
                                <p>A virtual environment (<code>venv</code>) is an isolated sandbox folder. When you create one, Python literally copies its own execution engine into that folder. Anything you install inside that folder stays trapped inside it, completely protecting the rest of your computer.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Tell the built-in <code>venv</code> module (<code>-m</code>) to generate a sandbox folder named "venv".
                                    <br><br>
                                    <span class="mac-only">Type: <code>python3 -m venv venv</code></span>
                                    <span class="win-only">Type: <code>python -m venv venv</code></span>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("-m venv venv")
                        },
                        {
                            content: `
                                <h2>Activating the Environment</h2>
                                <p>Creating the folder isn't enough; you have to turn it on. When you run the activation script, it temporarily overwrites your terminal's path variables, forcing the terminal to use the isolated Python engine instead of the global one.</p>
                                <p>You will know it worked when the prefix <code>(venv)</code> permanently attaches itself to the left side of your terminal prompt.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Run the activation script inside the folder.
                                    <br><br>
                                    <span class="mac-only">Type: <code>source venv/bin/activate</code></span>
                                    <span class="win-only">Type: <code>source venv/Scripts/activate</code></span>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("activate")
                        },
                        {
                            content: `
                                <h2>Pip: The Package Manager</h2>
                                <p>Now that your sandbox is active, you can safely download code written by other developers. We use the tool <code>pip</code> (Pip Installs Packages), which reaches out to the Python Package Index (PyPI) on the web and downloads the libraries into your sandbox.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Let's install the famous 'requests' library, which allows Python to easily talk to web APIs.
                                    <br><br>Type: <code>pip install requests</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "pip install requests" || cmd === "pip3 install requests"
                        },
                        {
                            content: `
                                <h2>Trust, but Verify</h2>
                                <p>A great engineer never assumes a command worked. Did the library actually install? Where is the proof? You can ask Pip to print out a list of every single package currently installed in your active environment.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    View your installed packages to verify the download.
                                    <br><br>Type: <code>pip list</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "pip list" || cmd === "pip3 list"
                        }
                    ]
                },
                {
                    id: "local-git",
                    title: "4. The Time Machine (Git)",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <p>You understand the mechanics of Git, but now we need to install the actual Git engine locally so your computer can track file history and eventually sync to GitHub.</p>
                                <div class="win-only">
                                    <h2>For Windows Users</h2>
                                    <p>As mentioned earlier, the default Windows Command Prompt is painful for developers. The Git installer fixes this by including <strong>Git Bash</strong>, a highly capable terminal emulator that translates standard Unix commands for Windows.</p>
                                    <ol style="padding-left: 20px; margin-bottom: 20px;">
                                        <li><a href="https://gitforwindows.org/" target="_blank" style="color: var(--primary); text-decoration: underline;">Download Git for Windows here</a>.</li>
                                        <li>Run the installer. You can just click "Next" through all the default options (there are a lot of them).</li>
                                        <li>From now on, whenever you need a terminal, search your computer for <strong>Git Bash</strong> and use that instead of CMD!</li>
                                    </ol>
                                </div>
                                <div class="mac-only">
                                    <h2>For Mac Users</h2>
                                    <p>Macs are Unix-based, which makes installing developer tools incredibly easy.</p>
                                    <ol style="padding-left: 20px; margin-bottom: 20px;">
                                        <li>Press <code>Cmd + Space</code>, type "Terminal", and hit Enter to open your native terminal.</li>
                                        <li>Type <code>git --version</code> and hit Enter.</li>
                                        <li>Because Git isn't installed yet, Apple will intercept the command and pop up a window asking you to install "Command Line Developer Tools." Click <strong>Install</strong>.</li>
                                    </ol>
                                </div>
                            `
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Once installed on your physical machine, verify the installation by asking for the version. Simulate it below.
                                    <br><br>Type: <code>git --version</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git --version")
                        }
                    ]
                },
                {
                    id: "ssh-keys",
                    title: "5. Git Config & SSH",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>Step 1: Global Identity</h2>
                                <p>Git permanently stamps every commit with an author's name and email. Before you can use Git locally, you must tell it who you are. We use the <code>--global</code> flag to apply these settings to your entire computer, not just one project.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Configure your identity.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type: <code>git config --global user.name "Your Name"</code></li>
                                        <li>Type: <code>git config --global user.email "email@example.com"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.startsWith("git config --global user.email")
                        },
                        {
                            content: `
                                <h2>Step 2: Verify the Configuration</h2>
                                <p>Where did that data go? The <code>git config</code> command doesn't use magic; it literally just creates a hidden text file in your home directory named <code>.gitconfig</code> and writes the data inside it.</p>
                                <p>We can use the <code>cat</code> command to look inside the file and prove our configuration saved properly.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Read the hidden config file.
                                    <br><br>Type: <code>cat ~/.gitconfig</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "cat ~/.gitconfig"
                        },
                        {
                            content: `
                                <h2>Step 3: Asymmetric Cryptography (SSH)</h2>
                                <p>If you push code to GitHub using the old HTTPS method, it prompts you to type your password every single time. It is highly insecure and tedious. Modern developers use <strong>SSH Keys</strong>.</p>
                                <p>An SSH Key is an impossibly complex cryptographic lock-and-key system. We generate a pair: a Private Key (which stays hidden deep in your hard drive) and a Public Key (which you give to GitHub). When you push code, GitHub checks if your hidden Private Key matches the Public Key they have on file. If it does, you authenticate instantly.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Run the key generator. We use the ed25519 algorithm, which is the current cryptographic standard.
                                    <br><br>Type: <code>ssh-keygen -t ed25519 -C "email@example.com"</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.startsWith("ssh-keygen")
                        },
                        {
                            content: `
                                <h2>Step 4: Verify the Generation</h2>
                                <p>The generator created a hidden folder in your home directory called <code>.ssh</code> and placed the two files inside it. Let's look inside the folder to ensure they are there.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    List the contents of the hidden SSH folder.
                                    <br><br>Type: <code>ls ~/.ssh</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "ls ~/.ssh"
                        },
                        {
                            content: `
                                <h2>Step 5: The SSH Agent</h2>
                                <p>The keys exist, but your computer's background security guard (the SSH Agent) doesn't know about them yet. The agent is responsible for grabbing the private key and presenting it to GitHub when requested. You must wake the agent up and hand it the key.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Add the key to the agent.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Start the background agent: <code>eval "$(ssh-agent -s)"</code></li>
                                        <li><span class="mac-only">Add it to the Apple Keychain: <code>ssh-add --apple-use-keychain ~/.ssh/id_ed25519</code></span><span class="win-only">Add it: <code>ssh-add ~/.ssh/id_ed25519</code></span></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.startsWith("ssh-add")
                        },
                        {
                            content: `
                                <h2>Step 6: Give the Lock to GitHub</h2>
                                <p>Now you need to grab the Public half of the key (the <code>.pub</code> file) and paste it into <a href="https://github.com/settings/keys" target="_blank" style="color: var(--primary);">GitHub's SSH Settings</a>.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Extract the text from the public key file so you can copy it.
                                    <br><br>
                                    <span class="mac-only">Type: <code>pbcopy < ~/.ssh/id_ed25519.pub</code> (This pipes the output directly to your clipboard invisibly, which is much safer!)</span>
                                    <span class="win-only">Type: <code>cat ~/.ssh/id_ed25519.pub</code> (Then manually highlight and copy the output)</span>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("pbcopy") || cmd.includes("cat")
                        },
                        {
                            content: `
                                <h2>Step 7: The Server Handshake Test</h2>
                                <p>Assuming you pasted the key into GitHub on your real machine, you need to verify that the cryptographic handshake actually works. We do this by attempting a raw SSH connection to the GitHub servers.</p>
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    Ping GitHub's servers to test your authentication.
                                    <br><br>Type: <code>ssh -T git@github.com</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "ssh -T git@github.com"
                        }
                    ]
                },
                {
                    id: "external-resources",
                    title: "6. Next Steps",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <h2>The Threshold</h2>
                                <p>Congratulations. You are no longer a spectator. Your machine is officially a professional development environment, and you understand the core mechanics of version control and programming logic.</p>
                                <p>But this is only day one. You have the map, but now you have to walk the path.</p>
                                
                                <h2>Where to Go From Here</h2>
                                <ul style="padding-left: 20px; margin-bottom: 20px; line-height: 1.8;">
                                    <li><strong>Algorithm Practice:</strong> Go to <a href="https://leetcode.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">LeetCode</a> or <a href="https://www.codewars.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">CodeWars</a>. Start doing "Easy" problems to build your problem-solving muscle. It will be brutal at first. Keep doing it.</li>
                                    <li><strong>Python Deep Dive:</strong> Read <a href="https://docs.python.org/3/tutorial/index.html" target="_blank" style="color: var(--primary); text-decoration: underline;">The Official Python Tutorial</a>. Learn directly from the creators of the language.</li>
                                    <li><strong>Advanced Git:</strong> Check out the <a href="https://www.atlassian.com/git/tutorials" target="_blank" style="color: var(--primary); text-decoration: underline;">Atlassian Git Tutorials</a> for the absolute best visual guides on complex workflows like rebasing and cherry-picking.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>Developer Roadmaps</h2>
                                <p>The tech industry is massive. You can become a Frontend Developer, Backend Developer, DevOps Engineer, or Data Scientist. Go to <a href="https://roadmap.sh/" target="_blank" style="color: var(--primary); text-decoration: underline;">Roadmap.sh</a>. They provide interactive, industry-standard flowcharts showing you exactly what technologies to learn next based on your specific career goals.</p>
                                
                                <div class="mission-box">
                                    <span class="badge-term">🎯 TERMINAL MISSION</span><br><br>
                                    The simulation is complete. Type <code>exit</code> to shut down the terminal. Good luck, Engineer.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "exit" || cmd === "clear"
                        }
                    ]
                }
            ]
        }
    ]
};