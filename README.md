<div align="center">

# TermTrek

**Learn Git by using it.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

[**Start learning at termtrek.work**](https://termtrek.work)

</div>

---

## What it is

TermTrek is a free, hands-on Git course that runs entirely in your browser. You type real Git commands into a simulated terminal and watch your repository change as you go. It is for people who have never used Git, people who want to get properly good at it, and non-developers who write code with AI tools and want a safety net.

- **No account.** Open the site and start.
- **Nothing saved about you.** There is no backend and no sign-in. Your lesson progress and theme choice stay in your own browser (localStorage) and are never sent anywhere.
- **Free and open source**, under GPL-3.0.

## Features

- **Interactive terminal.** Type commands yourself and get feedback that mirrors real Git, including helpful explanations when something goes wrong.
- **Live repo map.** A diagram of your commits, branches and working files that updates after every command.
- **Simulated team server and pull requests.** Clone, push, pull, open a pull request and merge it, with a teammate who pushes changes while you work.
- **Playground.** A free sandbox with a sample project and server, with no lesson steps to follow.
- **Guides.** Short reference pages for setting up Git on your own machine, with a macOS/Windows switch.

## The course

The launch course has four sections and 34 lessons:

| Section | Lessons |
| --- | --- |
| Foundations | 10 |
| Fixing mistakes | 7 |
| Branching | 8 |
| Working with a team | 9 |

Two more sections, Pro skills and Automation, are planned.

## Run it locally

```sh
npm install
npm run dev      # start the dev server
npm run verify   # typecheck, tests, production build and dist checks
```

## How it is built

TermTrek is a React and TypeScript app built with Vite and tested with Vitest. There is no server: everything runs in the browser.

- `src/engine` is a simulated Git engine. It implements a small shell, an in-memory file system, repositories, merging, and a fake remote server.
- `src/lessons` holds the course. `course.ts` lists the sections and the lessons in each, and `schema.ts` defines the `Lesson` and `Step` types. Each lesson is one file in a section folder (`foundations`, `fixing`, `branching`, `team`).
- A lesson has a starting `setup` (files, config, remote) and a list of steps. Each step has `learn` text, a `task`, `hints`, a `solution`, and a `check` function that inspects the world after each command. See an existing lesson such as `src/lessons/foundations/what-is-git.ts` for a worked example.
- `src/ui` contains the interface (terminal, repo map, remote panel, lesson view, Playground, landing page), and `src/guides` holds the guide pages.

## Contributing

Please open an issue before starting work, so we can agree on the change first. Before you open a pull request, `npm run verify` must pass.

## Privacy

TermTrek sets no tracking cookies. It uses Cloudflare Web Analytics for anonymous page counts only. Your lesson progress and theme choice are stored only in your own browser (localStorage); nothing is sent anywhere.

## License

GPL-3.0. See [LICENSE](LICENSE).
