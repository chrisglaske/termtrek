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
                                <p>This is a simulation of how real software developers work. You will not just learn syntax; you will learn how to build, save, break, and fix software.</p>
                                <h2>Why Git & Python First?</h2>
                                <p>Beginners are terrified of breaking their code. <strong>Git</strong> removes that fear entirely by acting as an infinite "undo" button.</p>
                                <p>We use <strong>Python</strong> because it removes the boilerplate. You can write code and see it work instantly, teaching you pure logic.</p>
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
                                <h2>Your Operating System Matters</h2>
                                <p>A developer's terminal changes depending on their Operating System. Modern web development is natively built for Unix (Mac and Linux).</p>
                                <p>If you are on Windows, we will eventually teach you how to install a tool called <strong>Git Bash</strong>, which forces Windows to act like a Mac so you can use industry-standard commands.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Look at the sidebar on the left. Click the toggle to select the actual Operating System you are currently using.
                                    <br><br>Once you have selected it, type <code>echo "Environment Set"</code> in the terminal to continue.
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
                                <p>Before you code, you need to know how to talk to your computer without a mouse.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's find out where you are. Type <code>pwd</code> (Print Working Directory) and hit enter.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "pwd"
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Now type <code>ls</code> (List) to view the contents of your current directory.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "ls"
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's create a new folder and move into it. 
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type <code>mkdir logs</code></li>
                                        <li>Type <code>cd logs</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "cd logs"
                        }
                    ]
                },
                {
                    id: "bash-files",
                    title: "Creating Files",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Create a new file in your current folder. Type <code>touch server.log</code>.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "touch server.log"
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's clean up our mess. Delete the file you just made by typing <code>rm server.log</code>.
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
                    workspaceType: "visualizer",
                    steps: [
                        {
                            content: `
                                <p>Git moves files through a three-step pipeline: Working Directory -> Staging Area -> Repository (Vault).</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Watch the Visualizer on the right. Type <code>git add index.txt</code> to move the file to the Staging Area.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "git add index.txt" || cmd === "git add ."
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Lock the staged file into the Vault. Type <code>git commit -m "Initial commit"</code>.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.startsWith("git commit")
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
                                <p>In the real world, you don't just type <code>git commit -m "fixed stuff"</code>. Professional teams use a standard called <strong>Conventional Commits</strong>.</p>
                                <h2>The Prefixes</h2>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px; line-height: 1.6;">
                                    <li><code>feat:</code> A new feature (e.g., <code>feat: add login page</code>)</li>
                                    <li><code>fix:</code> A bug fix (e.g., <code>fix: resolve crash on checkout</code>)</li>
                                    <li><code>docs:</code> Documentation changes (e.g., <code>docs: update readme</code>)</li>
                                    <li><code>chore:</code> Maintenance tasks (e.g., <code>chore: update dependencies</code>)</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <p>By using these prefixes, your entire team's Git history becomes perfectly readable, and you can even write scripts that automatically generate release notes based on the <code>feat:</code> and <code>fix:</code> tags!</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's practice.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type <code>touch api.py</code> to create a new file.</li>
                                        <li>Type <code>git add .</code> to stage it.</li>
                                        <li>Commit it using the proper feature tag: <code>git commit -m "feat: add api structure"</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git commit") && cmd.includes("feat:")
                        }
                    ]
                },
                {
                    id: "git-branching",
                    title: "Branching & Merging",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <p>Never write experimental code on your <code>main</code> branch. If you are adding a feature, you create a "parallel universe" called a branch.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Create and switch to a new branch named 'dev'. Type <code>git checkout -b dev</code>.
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
                            content: `
                                <p>You wrote code on <code>dev</code>. Your teammate wrote code on <code>main</code>. You are about to merge them together, but you both edited the exact same line in <code>calc.py</code>.</p>
                                <h2>The Collision</h2>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's trigger the disaster. Type <code>git merge dev</code> to attempt the merge.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "git merge dev"
                        },
                        {
                            workspaceType: "editor",
                            editorDefaultValue: `def add(a, b):\n<<<<<<< HEAD\n    print(f"Main Branch says: {a+b}")\n=======\n    print(f"Dev Branch says: {a+b}")\n>>>>>>> dev\n    return a + b`,
                            content: `
                                <h2>Don't Panic</h2>
                                <p>A merge conflict just means Git paused the merge and is asking a human to decide which code to keep.</p>
                                <p>We have automatically opened <code>calc.py</code> in your editor. Notice the weird <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> markers.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Resolve the conflict.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Delete the markers (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code>, <code>=======</code>, and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; dev</code>).</li>
                                        <li>Keep ONLY the "Dev Branch" print statement. Delete the Main branch one.</li>
                                        <li>Click <strong>Run Code ▶</strong> to save the file.</li>
                                    </ol>
                                </div>
                            `,
                            isEditorMissionOnly: true,
                            validateCode: (code) => !code.includes("<<<<<<<") && !code.includes("=======") && !code.includes("Main Branch") && code.includes("Dev Branch")
                        },
                        {
                            workspaceType: "terminal",
                            content: `
                                <p>The code is clean. Now we just tell Git that the conflict is resolved by adding and committing the file.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Finalize the merge using a conventional commit.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type <code>git add calc.py</code></li>
                                        <li>Type <code>git commit -m "fix: resolve merge conflict"</code></li>
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
                    id: "py-vars",
                    title: "Variables, Types & F-Strings",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>Python reads like plain English. It handles memory management automatically, so you can focus entirely on logic.</p>
                                <h2>The 4 Core Data Types</h2>
                                <ul style="margin-top: 10px; margin-bottom: 20px; padding-left: 20px;">
                                    <li><strong>Strings (str):</strong> Text, always wrapped in quotes. <code>hero = "Arthur"</code></li>
                                    <li><strong>Integers (int):</strong> Whole numbers. <code>level = 5</code></li>
                                    <li><strong>Floats (float):</strong> Decimals. <code>health = 85.5</code></li>
                                    <li><strong>Booleans (bool):</strong> True or False (Must be capitalized!). <code>is_alive = True</code></li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>Talking to the User</h2>
                                <p>We use <code>input()</code> to ask questions. To inject variables directly into text, we use <strong>f-strings</strong> (put an 'f' before the quotes and wrap the variable in curly braces).</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's write a dynamic greeting. In the editor on the right:
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Create a variable: <code>user = "Engineer"</code></li>
                                        <li>Print an f-string: <code>print(f"Welcome, {user}")</code></li>
                                    </ol>
                                    Click <strong>Run Code ▶</strong> when ready.
                                </div>
                            `,
                            validateCode: (code) => code.includes('user') && code.includes('f"') && code.includes('{user}') && code.includes('print(')
                        }
                    ]
                },
                {
                    id: "py-logic",
                    title: "Conditional Logic (Ifs)",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>Programs need to make decisions based on data.</p>
                                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                                    <strong>CRITICAL: Python uses Indentation!</strong><br>
                                    Other languages use brackets <code>{}</code> to group code. Python uses spaces. If your code is indented incorrectly, it will instantly crash.
                                </div>
                                <h2>If / Elif / Else</h2>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
temp = 90
if temp > 100:
    print("Meltdown")
elif temp > 80:
    print("Warning")
else:
    print("Stable")</pre>
                            `
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Write an <code>if/else</code> statement.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Set <code>admin = True</code></li>
                                        <li>Write an if statement: <code>if admin == True:</code></li>
                                        <li>Indent the next line and write: <code>print("Access Granted")</code></li>
                                        <li>Write an <code>else:</code> statement that prints <code>"Denied"</code></li>
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
                    steps: [
                        {
                            content: `
                                <p>Computers are incredibly fast at doing repetitive tasks. We use loops to tell a computer to do something over and over again.</p>
                                <h2>The While Loop</h2>
                                <p>A <code>while</code> loop runs continuously <em>as long as</em> a condition is true. Be careful—if the condition never turns false, you will create an infinite loop that crashes your program!</p>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
hp = 3
while hp > 0:
    print("Still alive!")
    hp = hp - 1</pre>
                            `
                        },
                        {
                            content: `
                                <h2>The For Loop</h2>
                                <p>A <code>for</code> loop is used to iterate exactly a certain number of times, or to loop through a collection of items (like a list).</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Write a countdown timer using a <code>for</code> loop and the built-in <code>range()</code> function.
                                    <ol style="margin-top: 10px; padding-left: 20px;">
                                        <li>Type: <code>for i in range(5):</code></li>
                                        <li>Indent and type: <code>print(i)</code></li>
                                    </ol>
                                </div>
                            `,
                            validateCode: (code) => code.includes('for i in range') && code.includes('print(i)')
                        }
                    ]
                },
                {
                    id: "py-data",
                    title: "Data Structures",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>Variables are great for storing one piece of data, but what if you have 10,000 users? You need Data Structures.</p>
                                <h2>Lists (Arrays)</h2>
                                <p>A List is an ordered collection of items, wrapped in square brackets <code>[]</code>. You can grab items by their index number (computers count from 0!).</p>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
users = ["Alice", "Bob", "Charlie"]
print(users[0]) # Prints Alice</pre>
                            `
                        },
                        {
                            content: `
                                <h2>Dictionaries (JSON Objects)</h2>
                                <p>A Dictionary stores data in <strong>Key-Value pairs</strong> using curly braces <code>{}</code>. It is the most important data structure in modern web development.</p>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
player = {
    "name": "Arthur",
    "level": 42
}
print(player["name"])</pre>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Create a dictionary named <code>server</code> with a key <code>"status"</code> set to <code>"Online"</code>. Then <code>print(server["status"])</code>.
                                </div>
                            `,
                            validateCode: (code) => code.includes('server = {') && code.includes('"status"') && code.includes('print(server[')
                        }
                    ]
                },
                {
                    id: "py-errors",
                    title: "Error Handling (Try/Except)",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>When users interact with your program, they will do stupid things. If you ask for a number and they type "Banana", your program will crash. Professional engineers anticipate crashes.</p>
                                <h2>Try / Except Blocks</h2>
                                <p>You can tell Python to <em>try</em> a block of code. If an error happens, instead of blowing up the program, it instantly jumps to the <em>except</em> block.</p>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">
try:
    # Trying to divide by zero causes a massive crash
    answer = 10 / 0
except:
    print("Math error! You can't divide by zero.")</pre>
                            `
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Write a <code>try:</code> block that attempts to print an undefined variable: <code>print(ghost)</code>. Write an <code>except:</code> block below it that prints <code>"Caught the error!"</code>.
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
                    steps: [
                        {
                            content: `
                                <p>As your code gets longer, it gets messy. Functions allow you to package a block of code, give it a name, and reuse it anywhere.</p>
                                <h2>Defining vs. Calling</h2>
                                <p>You use <code>def</code> to define a function. <em>Defining</em> it doesn't run it. It just stores the instructions in memory. You have to <em>call</em> it by typing its name with parentheses.</p>
                                <h2>The Secret of "return"</h2>
                                <p><code>print()</code> just shows text on the screen for the human. <code>return</code> actually hands data <em>back</em> to the computer so it can be saved in a variable and used later.</p>
                            `
                        },
                        {
                            content: `
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
                }
            ]
        },
        {
            title: "Phase 3: Capstone Projects",
            modules: [
                {
                    id: "proj-1",
                    title: "Project 1: The CLI Calculator",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>Time to prove you understand logic, variables, and type casting.</p>
                                <h2>The Type Casting Trap</h2>
                                <p>If you run <code>num = input("Enter number: ")</code> and the user types 5, Python stores it as the <em>text</em> "5". If you try to add "5" + "5", Python gives you "55". You must convert it to a float (decimal) using <code>float()</code>.</p>
                            `
                        },
                        {
                            content: `
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
                        }
                    ]
                },
                {
                    id: "proj-2",
                    title: "Project 2: The Secret Vault",
                    workspaceType: "editor",
                    steps: [
                        {
                            content: `
                                <p>Programs forget everything when they close. Real apps save data to a database or a file. We will build a vault that saves your secrets to a text file on your hard drive.</p>
                                <h2>Writing to a File in Python</h2>
                                <p>Python has a built-in <code>open()</code> function. If we open a file in <strong>"a" (append) mode</strong>, it will add new text to the end of the file without deleting the old stuff.</p>
                                <div style="background: rgba(245, 166, 35, 0.1); border-left: 4px solid #f5a623; padding: 15px; margin-bottom: 20px;">
                                    <strong>Git .gitignore Practice</strong><br>
                                    In the real world, you do NOT want your <code>secrets.txt</code> file to be uploaded to GitHub for the world to see. You would create a file called <code>.gitignore</code> and type <code>secrets.txt</code> inside it.
                                </div>
                            `
                        },
                        {
                            content: `
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
                                <p>The best way to learn version control is to destroy your own project on purpose and use Git to rescue it.</p>
                                <h2>The Disaster Scenario</h2>
                                <p>Imagine you accidentally highlighted all the code in your calculator project and deleted it, then saved the file. Your editor shows nothing. The file is empty.</p>
                                <p>If you run <code>git status</code>, it will show in red that the file has been modified.</p>
                            `
                        },
                        {
                            content: `
                                <h2>The Rescue</h2>
                                <p>Since you haven't committed the destruction to the vault yet, you can tell Git to pull the last known good version and overwrite your working directory.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Oh no! You ruined <code>calc.py</code>. Rescue it from the vault by checking out the last safe version. Type: <code>git checkout -- calc.py</code>
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
                                <p>You've mastered the concepts in the browser. Now, it is time to turn your actual physical machine into a professional development environment.</p>
                                <h2>Step 1: Download Visual Studio Code</h2>
                                <p>VS Code is the industry standard text editor. It is free, lightweight, and built by Microsoft.</p>
                                <ul>
                                    <li><a href="https://code.visualstudio.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to download VS Code</a>.</li>
                                    <li>Run the installer and leave all default options checked.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
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
                                <p>Your computer does not inherently know how to read Python code. We have to install the Python Engine.</p>
                                <h2>Step 1: Download Python</h2>
                                <p><a href="https://www.python.org/downloads/" target="_blank" style="color: var(--primary); text-decoration: underline;">Click here to go to Python.org</a> and download the latest version for your operating system.</p>
                            `
                        },
                        {
                            content: `
                                <h2>Step 2: Installation (CRITICAL)</h2>
                                <div class="win-only">
                                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                                        <strong>Windows Users - DO NOT CLICK NEXT YET:</strong><br>
                                        On the very first screen of the Windows installer, look at the bottom. You <strong>MUST</strong> check the box that says <strong>"Add Python to PATH"</strong>. If you forget this, your terminal will never recognize Python commands, and nothing will work.
                                    </div>
                                </div>
                                <div class="mac-only">
                                    <p><strong>Mac Users:</strong> Run the installer normally. After it finishes, a Finder window will pop up. Double-click the file named <code>Install Certificates.command</code> to allow Python to access the internet.</p>
                                </div>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Let's verify your installation. Open your computer's actual terminal and type <code>python --version</code> (or <code>python3 --version</code> on Mac). Once you do, simulate it here by typing <code>python --version</code>.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd === "python --version" || cmd === "python3 --version"
                        }
                    ]
                },
                {
                    id: "local-git",
                    title: "3. The Time Machine (Git)",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <p>We need to install Git locally so your computer can track file history and talk to GitHub.</p>
                                <div class="win-only">
                                    <h2>For Windows Users</h2>
                                    <p>The default Windows Command Prompt is terrible for developers. We need to install <strong>Git Bash</strong>, which gives Windows a Mac/Linux-style terminal.</p>
                                    <ol style="padding-left: 20px; margin-bottom: 20px;">
                                        <li><a href="https://gitforwindows.org/" target="_blank" style="color: var(--primary); text-decoration: underline;">Download Git for Windows here</a>.</li>
                                        <li>Run the installer. You can just click "Next" through all the default options.</li>
                                        <li>From now on, whenever you need a terminal, search your computer for <strong>Git Bash</strong> and use that!</li>
                                    </ol>
                                </div>
                                <div class="mac-only">
                                    <h2>For Mac Users</h2>
                                    <p>Macs make this incredibly easy.</p>
                                    <ol style="padding-left: 20px; margin-bottom: 20px;">
                                        <li>Press <code>Cmd + Space</code>, type "Terminal", and hit Enter.</li>
                                        <li>Type <code>git --version</code> and hit Enter.</li>
                                        <li>A popup will appear asking you to install "Command Line Developer Tools." Click <strong>Install</strong>.</li>
                                    </ol>
                                </div>
                            `
                        },
                        {
                            content: `
                                <div class="mission-box">
                                    <strong>Mission:</strong> Type <code>git --version</code> in the emulator below to verify.
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.includes("git --version")
                        }
                    ]
                },
                {
                    id: "ssh-keys",
                    title: "4. The Secret Handshake (SSH)",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <p>If you push code to GitHub using HTTPS, it will ask for your password every single time. We use an <strong>SSH Key</strong>—a cryptographic lock—to prove to GitHub that your laptop is authorized.</p>
                                <h2>Step 1: Generate the Key</h2>
                                <p>Open your newly installed terminal (or Git Bash) and run:</p>
                                <pre style="background: #000; padding: 15px; border-radius: 6px; margin-bottom: 20px; color: #a3a3a3;">ssh-keygen -t ed25519 -C "your_email@example.com"</pre>
                                <p>Hit <strong>Enter</strong> to accept the default file location, and hit <strong>Enter twice</strong> to leave the passphrase blank for convenience.</p>
                            `
                        },
                        {
                            content: `
                                <h2>Step 2: Give the Key to GitHub</h2>
                                <p>You need to copy the public half of the key.</p>
                                <ul class="mac-only" style="margin-bottom:15px; padding-left: 20px;">
                                    <li><strong>Mac:</strong> Type <code>pbcopy < ~/.ssh/id_ed25519.pub</code> (This copies it invisibly).</li>
                                </ul>
                                <ul class="win-only" style="margin-bottom:15px; padding-left: 20px;">
                                    <li><strong>Windows:</strong> Type <code>cat ~/.ssh/id_ed25519.pub</code>, then highlight and copy the text that appears.</li>
                                </ul>
                                <p>Log into <a href="https://github.com/settings/keys" target="_blank" style="color: var(--primary); text-decoration: underline;">GitHub SSH Settings</a>, click <strong>New SSH Key</strong>, and paste it.</p>
                                <div class="mission-box">
                                    <strong>Mission:</strong> Tell your local Git who you are. This stamps your name on your code. Type:<br>
                                    <code>git config --global user.name "Your Name"</code>
                                </div>
                            `,
                            validateCommand: (cmd) => cmd.startsWith("git config --global user.name")
                        }
                    ]
                },
                {
                    id: "external-resources",
                    title: "5. Next Steps & Resources",
                    workspaceType: "terminal",
                    steps: [
                        {
                            content: `
                                <p>Congratulations. Your machine is officially a professional development environment, and you understand the core mechanics of version control and programming logic.</p>
                                <h2>Where to Go From Here</h2>
                                <p>This bootcamp gave you the map, but you have to walk the path. Here are the best resources on the internet to continue your journey:</p>
                                <ul style="padding-left: 20px; margin-bottom: 20px; line-height: 1.8;">
                                    <li><strong>Advanced Git:</strong> <a href="https://www.atlassian.com/git/tutorials" target="_blank" style="color: var(--primary); text-decoration: underline;">Atlassian Git Tutorials</a> - The absolute best visual guides for complex Git workflows.</li>
                                    <li><strong>Python Deep Dive:</strong> <a href="https://docs.python.org/3/tutorial/index.html" target="_blank" style="color: var(--primary); text-decoration: underline;">The Official Python Tutorial</a> - Learn directly from the creators of the language.</li>
                                    <li><strong>Algorithm Practice:</strong> <a href="https://leetcode.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">LeetCode</a> or <a href="https://www.codewars.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">CodeWars</a> - Start doing "Easy" problems to build your problem-solving muscle.</li>
                                </ul>
                            `
                        },
                        {
                            content: `
                                <h2>Developer Roadmaps</h2>
                                <p>The tech industry is massive. You can become a Frontend Developer, Backend Developer, DevOps Engineer, or Data Scientist. Check out <a href="https://roadmap.sh/" target="_blank" style="color: var(--primary); text-decoration: underline;">Roadmap.sh</a> to see interactive flowcharts of exactly what technologies to learn next based on your career goals.</p>
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
    ]
};