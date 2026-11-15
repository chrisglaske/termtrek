export type Os = 'macos' | 'windows'

/** `body` is RichText (backtick spans become pills). `command` renders as a copyable pill and is never run. */
export interface GuideStep {
  title: string
  body: string
  command?: string
  /** Optional sub-heading shown above the first step of a group (for example a route to choose). */
  group?: string
}

export interface Guide {
  id: 'install-git' | 'set-your-name' | 'sign-in-to-github'
  title: string
  summary: string
  minutes: number
  /** Lesson ids and labels shown as "Related lessons". */
  related: { id: string; label: string }[]
  common?: GuideStep[]
  byOs: Record<Os, GuideStep[]>
  /** RichText: the command that proves it worked. */
  check: string
}

const NAME_STEPS: GuideStep[] = [
  {
    title: 'Set your name',
    body: 'Use the name you want on your commits. Replace Your Name with it, keeping the quotes.',
    command: 'git config --global user.name "Your Name"',
  },
  {
    title: 'Set your email',
    body: "Use the email on your GitHub account, or the private no-reply address GitHub shows under Settings, then Emails. That way GitHub links your commits to you.",
    command: 'git config --global user.email "you@example.com"',
  },
  {
    title: 'Name your first branch main',
    body: 'New repositories will start on a branch called **main**, which is what GitHub expects.',
    command: 'git config --global init.defaultBranch main',
  },
  {
    title: 'Choose what a divergent pull does',
    body: 'When your branch and the server have both moved on, `git pull` has to combine them. Setting `pull.rebase` to `false` makes it merge, so a divergent pull merges instead of stopping to ask. Setting it to `true` replays your commits on top instead.',
    command: 'git config --global pull.rebase false',
  },
]

const SSH_STEPS: GuideStep[] = [
  {
    title: 'Make a key',
    group: 'Option B: SSH key (do this or Option A, not both)',
    body: 'Use this route if you would rather not deal with tokens that expire. On Windows, Git Bash already includes `ssh-keygen`. Press Enter to accept the default file location. A passphrase is optional but a good idea.',
    command: 'ssh-keygen -t ed25519 -C "you@example.com"',
  },
  {
    title: 'Copy your public key',
    body: 'This prints the public half, a single line starting with `ssh-ed25519`. Copy the whole line (on macOS, `pbcopy < ~/.ssh/id_ed25519.pub` copies it for you). Never share the private key (the file without `.pub`).',
    command: 'cat ~/.ssh/id_ed25519.pub',
  },
  {
    title: 'Add it to GitHub',
    body: 'On github.com open your profile menu, then **Settings**, then **SSH and GPG keys**, then **New SSH key**. Give it a title like "My laptop", paste the line and save.',
  },
  {
    title: 'Test the connection',
    body: 'The first time, type `yes` to trust github.com. Success looks like "Hi your-username! You\'ve successfully authenticated, but GitHub does not provide shell access."',
    command: 'ssh -T git@github.com',
  },
  {
    title: 'Use the SSH address',
    body: 'Clone with the SSH address, which looks like `git@github.com:your-name/your-repo.git` (the **Code** button on GitHub shows it under **SSH**). To switch a clone you already made from https to SSH, run the command below with your own name and repository.',
    command: 'git remote set-url origin git@github.com:your-name/your-repo.git',
  },
]

const sshAgentSteps = (os: Os): GuideStep[] =>
  os === 'macos'
    ? [
        {
          title: 'Let your Mac remember the key',
          body: 'If you set a passphrase, this saves it in your Keychain so you are not asked every time. Then add these four lines to the file `~/.ssh/config` (create it if it is missing): `Host github.com`, `AddKeysToAgent yes`, `UseKeychain yes` and `IdentityFile ~/.ssh/id_ed25519`, each on its own line, with the last three indented.',
          command: 'ssh-add --apple-use-keychain ~/.ssh/id_ed25519',
        },
      ]
    : [
        {
          title: 'Start the ssh-agent',
          body: 'In Git Bash, start the agent, then add your key. If you set a passphrase, you type it once per session. If you use the Windows OpenSSH service instead, start the **OpenSSH Authentication Agent** service first.',
          command: 'eval "$(ssh-agent -s)" && ssh-add',
        },
      ]

const httpsSteps = (store: string): GuideStep[] => [
  {
    title: 'Create a token',
    group: 'Option A: HTTPS with a token (do this or Option B, not both)',
    body: 'On github.com open your profile menu, then **Settings**, then **Developer settings**, then **Personal access tokens**, then **Fine-grained tokens**. Choose **Generate new token**, pick only the repositories you need, and give it the minimum permission: **Contents** set to read and write. Set an expiry date. If you will push files under `.github/workflows/`, also allow **Workflows**. If the repository belongs to an organization, an owner may need to approve the token.',
  },
  {
    title: 'Sign in when Git asks',
    body: `The first time you push or pull from a GitHub address starting with https, Git asks you to sign in. If it asks for a username, enter your GitHub username. If it shows a password box, paste the token there, not your GitHub password. ${store}`,
  },
]

export const guides: Guide[] = [
  {
    id: 'install-git',
    title: 'Install Git',
    summary: 'Get Git onto your own computer so you can use it outside TermTrek.',
    minutes: 5,
    related: [
      { id: 'what-is-git', label: 'What is Git?' },
      { id: 'start-a-project', label: 'Scenario: start a real project' },
    ],
    byOs: {
      macos: [
        {
          title: 'Open Terminal',
          body: 'Press Command and Space, type Terminal and press Enter.',
        },
        {
          title: 'Install the Command Line Tools',
          body: 'This is the simplest route. A window asks to install the developer tools, which include Git. (Some Macs show this window the first time you type `git`, which is fine too.) Click Install and wait for it to finish. If you already use Homebrew, you can instead run `brew install git`.',
          command: 'xcode-select --install',
        },
        {
          title: 'Choose the editor Git opens',
          body: 'Git sometimes opens a text editor, for example to write a commit message. Make it VS Code. In VS Code, open the Command Palette and run **Shell Command: Install \'code\' command in PATH**. Then run the command below. If you use Cursor, use `cursor --wait` in place of `code --wait`.',
          command: 'git config --global core.editor "code --wait"',
        },
      ],
      windows: [
        {
          title: 'Download Git for Windows',
          body: 'Go to https://git-scm.com/install/windows and download the installer for your computer.',
        },
        {
          title: 'Run the installer',
          body: 'On the editor screen choose **Visual Studio Code** (or Notepad). On the screen about the name of the first branch, choose **Override the default branch name** and type **main**. The rest is defaults: they are sensible, and the installer also sets up Git Credential Manager, which remembers your GitHub sign-in.',
        },
        {
          title: 'Open Git Bash',
          body: 'Open the Start menu, type **Git Bash** and press Enter. A terminal window opens. The commands in these guides work there.',
        },
        {
          title: 'Choose the editor Git opens',
          body: 'If you did not pick an editor in the installer, or want VS Code now, run the command below. If you use Cursor, use `cursor --wait` in place of `code --wait`.',
          command: 'git config --global core.editor "code --wait"',
        },
      ],
    },
    check: 'In your terminal, run `git --version`. You should see a line like `git version 2.x.x`. If you see "command not found", close the terminal, open a new one and try again.',
  },
  {
    id: 'set-your-name',
    title: 'Set your name and email',
    summary: 'Tell Git who you are, so every commit you make is labelled with your name.',
    minutes: 2,
    related: [{ id: 'introduce-yourself', label: 'Introduce yourself' }],
    byOs: {
      macos: NAME_STEPS,
      windows: NAME_STEPS,
    },
    check: 'Run `git config --global --list`. You should see your name and email in the list, along with `init.defaultbranch=main`.',
  },
  {
    id: 'sign-in-to-github',
    title: 'Sign in to GitHub',
    summary: 'Let your computer push to GitHub without asking every time.',
    minutes: 10,
    related: [
      { id: 'clone-a-repo', label: 'Copy a project from the server' },
      { id: 'push-your-work', label: 'Send your commits to the server' },
    ],
    common: [
      {
        title: 'Choose a route',
        body: 'There are two ways to sign in. **HTTPS with a token** (Option A) is simpler to set up. **SSH with a key** (Option B) avoids tokens that expire. Do one of them, not both. You need a free account at https://github.com first.',
      },
    ],
    byOs: {
      macos: [
        ...httpsSteps('macOS saves it in your Keychain, so you only do this once.'),
        ...SSH_STEPS,
        ...sshAgentSteps('macos'),
      ],
      windows: [
        ...httpsSteps('On Windows, you can skip the token: push once, and Git Credential Manager opens a browser to sign in. No token needed. Use a token only as the fallback. Git Credential Manager saves the result, so you only do this once.'),
        ...SSH_STEPS,
        ...sshAgentSteps('windows'),
      ],
    },
    check: 'For SSH, run `ssh -T git@github.com`. You should see "Hi your-username! You\'ve successfully authenticated, but GitHub does not provide shell access." For HTTPS, run `git ls-remote https://github.com/your-name/your-private-repo.git`, using one of your own private repositories. It prints the branches and their commit IDs instead of an error. Any repository you can push to works. The first time, Git may ask you to sign in.',
  },
]

export function findGuide(id: string): Guide | undefined {
  return guides.find((g) => g.id === id)
}
