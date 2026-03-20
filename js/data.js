const curriculum = {
    phases: [
        {
            title: "Phase 0: Groundwork",
            modules: [
                {
                    id: "welcome",
                    title: "Welcome & Mindset",
                    workspaceType: "terminal",
                    content: `
                        <p>This is not a "copy-paste" tutorial. This is a simulation of how real software developers work. If you follow this step-by-step, you will not just learn syntax; you will learn how to build, save, break, and fix software.</p>
                        
                        <h2>Why Git & Python First?</h2>
                        <p>Beginners are terrified of breaking their code. <strong>Git</strong> removes that fear entirely. It acts as an infinite "undo" button for your entire project folder. We learn Git first so you can experiment fearlessly from Day 1.</p>
                        <p>We use <strong>Python</strong> because it removes the boilerplate. Instead of spending hours learning how to set up a compiler, Python lets you write code and see it work instantly, teaching you pure logic.</p>
                        
                        <div class="mission-box">
                            <strong>The Developer's Pact:</strong>
                            <ul style="margin-top: 10px; margin-bottom: 10px; padding-left: 20px;">
                                <li><strong>Read the Errors:</strong> Do not panic at red text. The computer is literally telling you exactly what went wrong.</li>
                                <li><strong>Type, Don't Copy:</strong> Muscle memory is real. Type the code out yourself.</li>
                                <li><strong>Get Stuck:</strong> Getting stuck is the job.</li>
                            </ul>
                            <hr style="border: 0; border-top: 1px solid rgba(245,166,35,0.3); margin: 15px 0;">
                            <strong>Mission:</strong> Boot up your terminal environment. Type <code>echo "System Online"</code> in the terminal on the right and hit Enter.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd.includes("echo") && cmd.includes("System Online")
                },
                {
                    id: "bash-basics",
                    title: "The Command Line Deep Dive",
                    workspaceType: "terminal",
                    content: `
                        <p>Before you code, you need to know how to talk to your computer without a mouse. The Terminal (or Command Prompt) is how developers navigate their file systems and execute scripts.</p>
                        
                        <h2>What is a Path?</h2>
                        <p>When you use a mouse to open a folder called "Documents", your <em>Path</em> is something like <code>/Users/YourName/Documents</code>. The terminal is a cursor; it is always "sitting inside" one specific folder at a time.</p>
                        
                        <h2>The Core 3 Commands</h2>
                        <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                            <li><code>pwd</code> <strong>(Print Working Directory):</strong> Tells you exactly what folder the terminal is currently inside.</li>
                            <li><code>ls</code> <strong>(List):</strong> Lists every single file and folder inside your current directory.</li>
                            <li><code>cd</code> <strong>(Change Directory):</strong> This is how you "double-click" a folder in the terminal. Typing <code>cd Desktop</code> moves you into the Desktop. Typing <code>cd ..</code> moves you <em>backwards</em> one folder.</li>
                        </ul>

                        <div class="mission-box">
                            <strong>Mission:</strong> Prove you can navigate.
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Type <code>pwd</code> to see your current path.</li>
                                <li>Type <code>ls</code> to look around.</li>
                            </ol>
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "ls"
                }
            ]
        },
        {
            title: "Phase 1: Git Mastery",
            modules: [
                {
                    id: "git-mental-model",
                    title: "Git: The Mental Model",
                    workspaceType: "visualizer",
                    content: `
                        <p>Most beginners think Git just "saves" files. It doesn't. It moves them through a highly organized, three-step pipeline. If you understand these three zones, Git will never confuse you again.</p>
                        
                        <h2>The Three Zones</h2>
                        <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                            <li><strong>1. Working Directory:</strong> Your actual folder on your computer. When you edit a file, it lives here. Git sees it, but isn't officially tracking the changes yet.</li>
                            <li><strong>2. Staging Area (The Loading Dock):</strong> You use <code>git add</code> to place files here. It means, "I am preparing a save, and I want these specific files to be included in it".</li>
                            <li><strong>3. Local Repository (The Vault):</strong> You use <code>git commit</code> to take a permanent snapshot of whatever was on the Staging Area. It is safely locked into your history with a unique ID (like <code>a1b2c3d</code>).</li>
                        </ul>

                        <div class="mission-box">
                            <strong>Mission:</strong> Watch the Visualizer on the right.
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Type <code>git add index.txt</code> to move the file to the Staging Area.</li>
                                <li>Type <code>git commit -m "Initial commit"</code> to lock it into the Vault.</li>
                            </ol>
                        </div>
                    `
                },
                {
                    id: "git-branching",
                    title: "Branching & Merging",
                    workspaceType: "terminal",
                    content: `
                        <p>Never write experimental code on your <code>main</code> branch. If you are adding a new feature, you create a "parallel universe" called a branch.</p>
                        
                        <h2>How Branching Actually Works</h2>
                        <p>Think of your Git history like a tree. The trunk is <code>main</code>. When you create a branch, Git creates a pointer to your current commit. As you add new commits to your branch, the <code>main</code> branch stays perfectly untouched. If your experiment fails, you just delete the branch. If it succeeds, you pull those changes back into the trunk using a <strong>merge</strong>.</p>
                        
                        <h2>The Commands</h2>
                        <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                            <li><code>git branch feature-login</code>: Creates the branch, but keeps you on main.</li>
                            <li><code>git checkout feature-login</code>: Moves you into the new branch.</li>
                            <li><code>git checkout -b feature-login</code>: A shortcut that creates the branch AND moves you into it immediately.</li>
                        </ul>

                        <div class="mission-box">
                            <strong>Mission:</strong> We need to build a new feature safely. Create and switch to a new branch named 'dev'. Type:<br> 
                            <code>git checkout -b dev</code>
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "git checkout -b dev" || cmd === "git checkout -b 'dev'"
                },
                {
                    id: "git-advanced",
                    title: "Stashing & Deleting",
                    workspaceType: "terminal",
                    content: `
                        <p>Real-world development is messy. Your boss interrupts you to fix a bug on <code>main</code>, but you are halfway through writing a new feature. Your code is broken, so you can't commit it, but Git won't let you switch branches with unsaved changes. Enter: <strong>The Stash</strong>.</p>
                        
                        <h2>The Stash Drawer</h2>
                        <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                            <li><code>git stash</code>: Shoves all your modified, uncommitted files into a temporary hidden drawer, returning your folder to a clean state.</li>
                            <li><code>git stash pop</code>: Opens the drawer and pulls those half-finished files right back into your working directory so you can resume work.</li>
                        </ul>

                        <h2>Housekeeping</h2>
                        <p>Once you merge a branch, leaving it around clutters your project. Delete it using <code>git branch -d branch-name</code>. If Git warns you the code isn't merged but you want to destroy it anyway, use a capital <code>-D</code>.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Your code is a mess and you need a clean slate immediately. Type <code>git stash</code> to hide your current changes.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "git stash"
                }
            ]
        },
        {
            title: "Phase 2: Python Core",
            modules: [
                {
                    id: "py-vars",
                    title: "Variables, Types & F-Strings",
                    workspaceType: "editor",
                    content: `
                        <p>Python reads like plain English. It handles memory management automatically, so you can focus entirely on logic.</p>
                        
                        <h2>The 4 Core Data Types</h2>
                        <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                            <li><strong>Strings (str):</strong> Text, always wrapped in quotes. <code>hero = "Arthur"</code></li>
                            <li><strong>Integers (int):</strong> Whole numbers. <code>level = 5</code></li>
                            <li><strong>Floats (float):</strong> Decimals. <code>health = 85.5</code></li>
                            <li><strong>Booleans (bool):</strong> True or False (Must be capitalized!). <code>is_alive = True</code></li>
                        </ul>

                        <h2>Talking to the User</h2>
                        <p>A program is useless if it can't interact. We use <code>input()</code> to ask questions. By default, <code>input()</code> treats everything the user types as a String.</p>
                        <p>To inject variables directly into text, we use <strong>f-strings</strong> (put an 'f' before the quotes and wrap the variable in curly braces).</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Let's write a dynamic greeting. In the editor on the right:
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Create a variable: <code>user = "Engineer"</code></li>
                                <li>Print an f-string: <code>print(f"Welcome to the system, {user}")</code></li>
                            </ol>
                            Click <strong>Run Code ▶</strong> when ready.
                        </div>
                    `,
                    validateCode: (code) => code.includes('user') && code.includes('f"') && code.includes('{user}') && code.includes('print(')
                },
                {
                    id: "py-logic",
                    title: "Logic, Ifs, and Loops",
                    workspaceType: "editor",
                    content: `
                        <p>Programs need to make decisions and repeat tasks. This is called "Control Flow".</p>
                        
                        <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                            <strong>CRITICAL: Python uses Indentation!</strong><br>
                            Other languages use brackets <code>{}</code> to group code. Python uses spaces. If your code is indented incorrectly, it will instantly crash.
                        </div>

                        <h2>Conditional Logic (If / Elif / Else)</h2>
                        <p>You can chain conditions together using <code>elif</code> (else if).</p>
                        <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
gold = 50
if gold >= 100:
    print("Buy sword")
elif gold >= 50:
    print("Buy potion")
else:
    print("Too broke")</pre>

                        <h2>Lists and Loops</h2>
                        <p>A List holds multiple items: <code>inventory = ["Map", "Torch"]</code>. A <code>for</code> loop lets you do something to every item in that list.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Write an <code>if</code> statement to check reactor status.
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Set <code>temp = 90</code></li>
                                <li>Write an if statement: <code>if temp > 100:</code></li>
                                <li>Indent the next line and write: <code>print("Meltdown")</code></li>
                                <li>Write an <code>else:</code> statement that prints <code>"Stable"</code></li>
                            </ol>
                        </div>
                    `,
                    validateCode: (code) => code.includes('if temp') && code.includes('print(') && code.includes('else:')
                },
                {
                    id: "py-funcs",
                    title: "Functions & Architecture",
                    workspaceType: "editor",
                    content: `
                        <p>As your code gets longer, it gets messy. Functions allow you to package a block of code, give it a name, and reuse it anywhere.</p>
                        
                        <h2>Defining vs. Calling</h2>
                        <p>You use <code>def</code> to define a function. <em>Defining</em> it doesn't run it. It just stores the instructions in memory. You have to <em>call</em> it by typing its name with parentheses.</p>

                        <h2>The Secret of "return"</h2>
                        <p><code>print()</code> just shows text on the screen for the human. <code>return</code> actually hands data <em>back</em> to the computer so it can be saved in a variable and used later.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Build a reusable addition engine.
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Define it: <code>def add(a, b):</code></li>
                                <li>Return the math: <code>return a + b</code></li>
                                <li>Call it and save it: <code>total = add(5, 5)</code></li>
                                <li>Print it: <code>print(total)</code></li>
                            </ol>
                        </div>
                    `,
                    validateCode: (code) => code.includes('def add') && code.includes('return') && code.includes('total = add(') && code.includes('print(total)')
                }
            ]
        },
        {
            title: "Phase 3: The Capstone Projects",
            modules: [
                {
                    id: "proj-1",
                    title: "Project 1: The CLI Calculator",
                    workspaceType: "editor",
                    content: `
                        <p>Time to prove you understand logic, variables, and type casting.</p>
                        
                        <h2>The Type Casting Trap</h2>
                        <p>If you run <code>num = input("Enter number: ")</code> and the user types 5, Python stores it as the <em>text</em> "5". If you try to add "5" + "5", Python gives you "55". You must convert it to a float (decimal) using <code>float()</code>.</p>

                        <h2>The Mission Briefing</h2>
                        <p>We are going to build a calculator that runs in the terminal.</p>
                        
                        <div class="mission-box">
                            <strong>Project Requirements:</strong>
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Create <code>num1 = float(input("First: "))</code></li>
                                <li>Create <code>op = input("Operator (+, -, *, /): ")</code></li>
                                <li>Create <code>num2 = float(input("Second: "))</code></li>
                                <li>Write an <code>if/elif</code> block to handle the math based on <code>op</code>.</li>
                                <li>Print the final <code>result</code>.</li>
                            </ol>
                        </div>
                    `,
                    validateCode: (code) => code.includes('float(input') && code.includes('if op') && code.includes('elif') && code.includes('print(')
                },
                {
                    id: "proj-2",
                    title: "Project 2: The Secret Vault",
                    workspaceType: "editor",
                    content: `
                        <p>Programs forget everything when they close. Real apps save data to a database or a file. We will build a vault that saves your secrets to a text file on your hard drive.</p>
                        
                        <h2>Writing to a File in Python</h2>
                        <p>Python has a built-in <code>open()</code> function. If we open a file in <strong>"a" (append) mode</strong>, it will add new text to the end of the file without deleting the old stuff.</p>

                        <div style="background: rgba(245, 166, 35, 0.1); border-left: 4px solid #f5a623; padding: 15px; margin-bottom: 20px;">
                            <strong>Git .gitignore Practice</strong><br>
                            In the real world, you do NOT want your <code>secrets.txt</code> file to be uploaded to GitHub for the world to see. You would create a file called <code>.gitignore</code> and type <code>secrets.txt</code> inside it.
                        </div>

                        <div class="mission-box">
                            <strong>Project Requirements:</strong>
                            <ol style="margin-top: 10px; padding-left: 20px;">
                                <li>Ask the user for input: <code>secret = input("Enter secret: ")</code></li>
                                <li>Open the file: <code>with open("secrets.txt", "a") as file:</code></li>
                                <li>Write to it: <code>file.write(secret + "\\n")</code></li>
                            </ol>
                        </div>
                    `,
                    validateCode: (code) => code.includes('open(') && code.includes('"a"') && code.includes('.write(')
                },
                {
                    id: "proj-3",
                    title: "Project 3: Git Sabotage",
                    workspaceType: "terminal",
                    content: `
                        <p>The best way to learn version control is to destroy your own project on purpose and use Git to rescue it.</p>
                        
                        <h2>The Disaster Scenario</h2>
                        <p>Imagine you accidentally highlighted all the code in your calculator project and deleted it, then saved the file. Your editor shows nothing. The file is empty.</p>
                        <p>If you run <code>git status</code>, it will show in red that the file has been modified.</p>

                        <h2>The Rescue</h2>
                        <p>Since you haven't committed the destruction to the vault yet, you can tell Git to pull the last known good version and overwrite your working directory.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Oh no! You ruined <code>calc.py</code>. Rescue it from the vault by checking out the last safe version. Type:<br>
                            <code>git checkout -- calc.py</code>
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "git checkout -- calc.py"
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
                    content: `
                        <p>You've mastered the concepts in the browser. Now, it is time to turn your actual physical machine into a professional development environment.</p>
                        
                        <h2>Step 1: Download Visual Studio Code</h2>
                        <p>VS Code is the industry standard text editor. It is free, lightweight, and built by Microsoft.</p>
                        <ul>
                            <li><a href="https://code.visualstudio.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to download VS Code</a>.</li>
                            <li>Run the installer and leave all default options checked.</li>
                        </ul>

                        <h2>Step 2: Install the Python Extension</h2>
                        <p>Out of the box, VS Code is just a text editor. We need to give it Python superpowers.</p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li>Open VS Code.</li>
                            <li>Click the <strong>Extensions</strong> icon on the far left sidebar (it looks like 4 building blocks).</li>
                            <li>Search for <strong>"Python"</strong>.</li>
                            <li>Find the one published by <strong>Microsoft</strong> and click Install.</li>
                        </ol>

                        <div class="mission-box">
                            <strong>Mission:</strong> Type <code>echo "Editor Installed"</code> to proceed to the Python engine setup.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd.includes("echo") && cmd.includes("Editor")
                },
                {
                    id: "local-python",
                    title: "2. The Engine (Python)",
                    workspaceType: "terminal",
                    content: `
                        <p>Your computer does not inherently know how to read Python code. We have to install the Python Engine.</p>
                        
                        <h2>Step 1: Download Python</h2>
                        <p><a href="https://www.python.org/downloads/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to go to Python.org</a> and download the latest version for your operating system.</p>

                        <h2>Step 2: Installation (CRITICAL)</h2>
                        <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                            <strong>Windows Users - DO NOT CLICK NEXT YET:</strong><br>
                            On the very first screen of the Windows installer, look at the bottom. You <strong>MUST</strong> check the box that says <strong>"Add Python to PATH"</strong>. If you forget this, your terminal will never recognize Python commands, and nothing will work.
                        </div>
                        
                        <p><strong>Mac Users:</strong> Run the installer normally. After it finishes, a Finder window will pop up. Double-click the file named <code>Install Certificates.command</code> to allow Python to access the internet.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Let's verify your installation. Open your computer's actual terminal and type <code>python --version</code> (or <code>python3 --version</code> on Mac). Once you do, simulate it here by typing <code>python --version</code>.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "python --version" || cmd === "python3 --version"
                },
                {
                    id: "local-git",
                    title: "3. The Time Machine (Git)",
                    workspaceType: "terminal",
                    content: `
                        <p>We need to install Git locally so your computer can track file history and talk to GitHub.</p>
                        
                        <h2>For Windows Users</h2>
                        <p>The default Windows Command Prompt is terrible for developers. We need to install <strong>Git Bash</strong>, which gives Windows a Mac/Linux-style terminal.</p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li><a href="https://gitforwindows.org/" target="_blank" style="color: var(--primary); text-decoration: underline;">Download Git for Windows here</a>.</li>
                            <li>Run the installer. You can just click "Next" through all the default options.</li>
                            <li>From now on, whenever you need a terminal, search your computer for <strong>Git Bash</strong> and use that!</li>
                        </ol>

                        <h2>For Mac Users</h2>
                        <p>Macs make this incredibly easy.</p>
                        <ol style="padding-left: 20px; margin-bottom: 20px;">
                            <li>Press <code>Cmd + Space</code>, type "Terminal", and hit Enter.</li>
                            <li>Type <code>git --version</code> and hit Enter.</li>
                            <li>A popup will appear asking you to install "Command Line Developer Tools." Click <strong>Install</strong>.</li>
                        </ol>

                        <div class="mission-box">
                            <strong>Mission:</strong> Type <code>git --version</code> in the emulator below to verify.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd.includes("git --version")
                },
                {
                    id: "ssh-keys",
                    title: "4. The Secret Handshake (SSH)",
                    workspaceType: "terminal",
                    content: `
                        <p>If you push code to GitHub using HTTPS, it will ask for your password every single time. We use an <strong>SSH Key</strong>—a cryptographic lock—to prove to GitHub that your laptop is authorized.</p>

                        <h2>Step 1: Generate the Key</h2>
                        <p>Open your newly installed terminal (or Git Bash) and run:</p>
                        <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">ssh-keygen -t ed25519 -C "your_email@example.com"</pre>
                        <p>Hit <strong>Enter</strong> to accept the default file location, and hit <strong>Enter twice</strong> to leave the passphrase blank for convenience.</p>

                        <h2>Step 2: Give the Key to GitHub</h2>
                        <p>You need to copy the public half of the key.</p>
                        <ul>
                            <li><strong>Mac:</strong> Type <code>pbcopy < ~/.ssh/id_ed25519.pub</code> (This copies it invisibly).</li>
                            <li><strong>Windows:</strong> Type <code>cat ~/.ssh/id_ed25519.pub</code>, then highlight and copy the text that appears.</li>
                        </ul>
                        <p>Log into <a href="https://github.com/settings/keys" target="_blank" style="color: var(--primary); text-decoration: underline;">GitHub SSH Settings</a>, click <strong>New SSH Key</strong>, and paste it.</p>

                        <div class="mission-box">
                            <strong>Mission:</strong> Tell your local Git who you are. This stamps your name on your code. Type:<br>
                            <code>git config --global user.name "Your Name"</code>
                        </div>
                    `,
                    validateCommand: (cmd) => cmd.startsWith("git config --global user.name")
                },
                {
                    id: "external-resources",
                    title: "5. Next Steps & Resources",
                    workspaceType: "terminal",
                    content: `
                        <p>Congratulations. Your machine is officially a professional development environment, and you understand the core mechanics of version control and programming logic.</p>
                        
                        <h2>Where to Go From Here</h2>
                        <p>This bootcamp gave you the map, but you have to walk the path. Here are the best resources on the internet to continue your journey:</p>

                        <ul style="padding-left: 20px; margin-bottom: 20px; line-height: 1.8;">
                            <li><strong>Advanced Git:</strong> <a href="https://www.atlassian.com/git/tutorials" target="_blank" style="color: var(--primary); text-decoration: underline;">Atlassian Git Tutorials</a> - The absolute best visual guides for complex Git workflows.</li>
                            <li><strong>Python Deep Dive:</strong> <a href="https://docs.python.org/3/tutorial/index.html" target="_blank" style="color: var(--primary); text-decoration: underline;">The Official Python Tutorial</a> - Learn directly from the creators of the language.</li>
                            <li><strong>Algorithm Practice:</strong> <a href="https://leetcode.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">LeetCode</a> or <a href="https://www.codewars.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">CodeWars</a> - Start doing "Easy" problems to build your problem-solving muscle.</li>
                            <li><strong>Developer Roadmaps:</strong> <a href="https://roadmap.sh/" target="_blank" style="color: var(--primary); text-decoration: underline;">Roadmap.sh</a> - Interactive roadmaps showing you exactly what technologies to learn next based on your career goals (e.g., Backend, Frontend, DevOps).</li>
                        </ul>

                        <div class="mission-box">
                            <strong>Final Mission:</strong> The simulation is complete. Type <code>exit</code> to shut down the terminal and begin building on your own machine.
                        </div>
                    `,
                    validateCommand: (cmd) => cmd === "exit" || cmd === "clear"
                }
            ]
        }
    ]
}