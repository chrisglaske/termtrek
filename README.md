<div align="center">

# 🚀 TermTrek

**Stop watching tutorials. Start engineering.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=flat-square&logo=javascript&logoColor=F7DF1E)](#)

TermTrek is a fully interactive, browser-based engineering sandbox. It teaches developers how to use Bash, Git, and Python by dropping them into a simulated UNIX terminal and forcing them to build muscle memory. 

No backend servers. No configuration headaches. Just pure logic running directly in the browser via WebAssembly.

[**Start Learning Now at termtrek.work**](https://termtrek.work)

</div>

---

## 🛑 The Problem: Tutorial Hell & The AI Trap

Modern developer education is broken.
1. **Video Tutorials:** Passive consumption gives you the illusion of competence—until you open an empty text editor and your mind goes blank.
2. **The AI Trap:** ChatGPT is an amazing tool, but if it writes your code while you are learning, *it* builds the muscle memory, not you. You are left helpless when the AI hallucinates.

## ⚡ The Solution: The TermTrek Engine

TermTrek operates on a strict **Read -> Execute -> Validate** loop. You are given a brief, you type the real commands, and the engine validates your work in real-time.

### ✨ Key Features
* 💻 **Interactive UNIX Terminal:** A robust emulator supporting directory navigation (`cd ../`), file manipulation (`touch`, `rm`, `mkdir`), file reading (`cat`), and an active Virtual File System.
* 🌿 **Live Git Visualizer:** Git is invisible; we made it visible. Watch your files physically move between the Working Directory, Staging Area, and Vault as you type commands.
* 🐍 **WebAssembly Python IDE:** Powered by **Monaco Editor** (the engine behind VS Code) and **Pyodide** (a C-engine compiled to WebAssembly). Write, run, and break real Python code entirely in the browser.
* 📂 **Dynamic File Explorer:** A VS Code-style recursive file tree that automatically syncs with terminal commands and features cinematic creation/deletion animations.
* 🛡️ **Zero-Tracking Privacy:** TermTrek respects developers. No analytical cookies, no server tracking. Everything saves to your browser's local storage.

---

## 🗺️ The Curriculum

TermTrek currently features a 5-phase curriculum designed to take absolute beginners from zero to local environment configuration:
* **Phase 0: Groundwork** (Navigating UNIX without a mouse)
* **Phase 1: Git Mastery** (Mental models, conventional commits, branching, and merge conflicts)
* **Phase 2: Python Core** (Variables, loops, data structures, and error handling)
* **Phase 3: Capstone** (Building a CLI calculator, local file vault, and rescuing sabotaged Git repos)
* **Phase 4: Going Local** (Installing VS Code, Python, Virtual Environments, and generating SSH Keys)

---

## 🌐 Getting Started

The recommended way to use TermTrek is directly through the official website. There is no setup, installation, or configuration required. 

**Jump right in:** [termtrek.work](https://termtrek.work)

### 🛠️ Running Locally (Optional)

While the hosted version is the easiest way to learn, TermTrek is built with vanilla HTML, CSS, and JavaScript, meaning getting it running locally takes about 3 seconds if you prefer to host it yourself or contribute to the project.

1. Clone the repository:
   ```bash
   git clone [https://github.com/chrisglaske/termtrek.git](https://github.com/chrisglaske/termtrek.git)