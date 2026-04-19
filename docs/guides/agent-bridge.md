# SnipSnip Agent Bridge Walkthrough

This guide is for a regular desktop user who wants to pull Markdown from the current browser tab into local tools without downloading a `.md` file first.

## What The Agent Bridge Does

SnipSnip normally gives you Markdown in the popup, through the clipboard, or as a download.

The Agent Bridge adds a local CLI so other tools can ask SnipSnip for the current page directly.

Typical examples:

- piping the current page into a coding agent prompt
- grabbing the current tab as JSON for a script
- forcing a fresh capture without touching the popup

## Before You Start

You need:

- SnipSnip installed in Chrome or Firefox
- the Agent Bridge companion for your OS downloaded from the SnipSnip releases page
- the browser open while you use the CLI

The CLI only talks to the local browser on your machine. Nothing is sent to a remote service by the bridge itself.

## First-Time Setup

1. Download and extract the Agent Bridge companion for your OS.
2. Open a terminal in the extracted folder.
3. Run the install command:

**Windows**

```powershell
.\snipsnip.exe install-host
```

**macOS/Linux**

```bash
./snipsnip install-host
```

4. Open SnipSnip Settings.
5. Open the **Downloads** section.
6. Turn on **Agent Bridge**.
7. If SnipSnip asks for native messaging permission, approve it. The extension may reload.
8. Go back to options and navigate to the Agent Bridge section to verify it's on.
9. Wait for the status line to show that the bridge is connected.

If you use a local unpacked Chrome build during development, install the host with the current unpacked extension ID:

**Windows**

```powershell
.\snipsnip.exe install-host --chrome-extension-id <your-unpacked-id>
```

Example:

```powershell
.\snipsnip.exe install-host --chrome-extension-id jfmmhkkjnbhkkjnbhkkjnbhkkjnbhkkj
```

**macOS/Linux**

```bash
./snipsnip install-host --chrome-extension-id <your-unpacked-id>
```

If that unpacked Chrome extension ID ever changes, rerun the same command with the new ID so Chrome can reconnect to the native host.

## Normal Daily Use

1. Open the page you want in the browser.
2. Keep that tab active.
3. Run one of these commands:

**Windows**

```powershell
.\snipsnip.exe status
.\snipsnip.exe clip
.\snipsnip.exe clip --json
.\snipsnip.exe clip --fresh
```

**macOS/Linux**

```bash
./snipsnip status
./snipsnip clip
./snipsnip clip --json
./snipsnip clip --fresh
```

What each command does:

- `status` shows whether the browser-side bridge is connected
- `clip` prints Markdown to stdout
- `clip --json` returns Markdown plus metadata like title, URL, source, and timestamp
- `clip --fresh` ignores any cached popup edit and captures the page again

## How SnipSnip Chooses What To Return

By default, SnipSnip prefers your popup-edited version when both of these are true:

- you already opened the popup for that page
- the active tab still matches that page URL

That means you can:

1. open the popup
2. make a quick edit
3. switch back to the page
4. run the matching `clip` command for your platform

If you do not want the edited popup version, use:

**Windows**

```powershell
.\snipsnip.exe clip --fresh
```

**macOS/Linux**

```bash
./snipsnip clip --fresh
```

## Using It With Other Tools

Raw Markdown to stdout:

**Windows**

```powershell
.\snipsnip.exe clip
```

**macOS/Linux**

```bash
./snipsnip clip
```

JSON for scripts:

**Windows**

```powershell
.\snipsnip.exe clip --json
```

**macOS/Linux**

```bash
./snipsnip clip --json
```

Example PowerShell pipeline:

```powershell
.\snipsnip.exe clip | Set-Clipboard
```

Example fresh JSON capture on macOS/Linux:

```bash
./snipsnip clip --json --fresh
```

## What To Expect

The bridge does not open the popup for a fresh capture.

Fresh capture happens in the background through SnipSnip's service worker and offscreen document.

The popup is only relevant when you want SnipSnip to reuse the last edited popup snapshot.

## Troubleshooting

If `status` says nothing is connected:

- make sure the browser is open
- make sure **Agent Bridge** is enabled in SnipSnip Settings
- if Settings shows **Permission needed**, click **Grant Permission**
- rerun the install command from the extracted companion folder

If Chrome local development does not connect:

- verify the unpacked extension ID
- rerun `install-host --chrome-extension-id <id>`
- if the unpacked extension ID changed after reloading or rebuilding the local extension, rerun the install command with the new ID

## Local Unpacked Chrome Setup

If you are testing a local unpacked build instead of the store build, Chrome uses your unpacked extension ID, not the stable store ID.

### Fastest way to find your unpacked Chrome ID on Windows

Run this from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\find-unpacked-chrome-extension-id.ps1 -ExtensionPath .\src
```

If the script finds your unpacked extension, it prints the Chrome profile and extension ID.

If you are on macOS or Linux, or if the script does not find a match, use the manual fallback:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Find your unpacked SnipSnip entry
4. Copy the **ID**

### Exact local install command

Once you have the unpacked extension ID, run:

**Windows**

```powershell
cd .\native
.\snipsnip.exe install-host --chrome-extension-id <YOUR_UNPACKED_EXTENSION_ID>
```

**macOS/Linux**

```bash
cd ./native
./snipsnip install-host --chrome-extension-id <YOUR_UNPACKED_EXTENSION_ID>
```

If the unpacked extension ID changes later, run the same command again with the new ID.

### Quick validation

1. Reload the unpacked extension in `chrome://extensions`
2. Open SnipSnip Settings
3. Open **Downloads**
4. Turn on **Agent Bridge**
5. Confirm the status shows connected
6. Open a normal web page in Chrome and keep it active
7. Run:

**Windows**

```powershell
cd .\native
.\snipsnip.exe status
.\snipsnip.exe clip --json --fresh
```

**macOS/Linux**

```bash
cd ./native
./snipsnip status
./snipsnip clip --json --fresh
```

Expected result:

- `status` shows a live Chrome bridge session
- `clip --json --fresh` prints JSON with the active page title, URL, and markdown

If you want to remove the companion:

**Windows**

```powershell
.\snipsnip.exe uninstall-host
```

**macOS/Linux**

```bash
./snipsnip uninstall-host
```

## Quick Reference

**Windows**

```powershell
.\snipsnip.exe install-host
.\snipsnip.exe status
.\snipsnip.exe clip
.\snipsnip.exe clip --json
.\snipsnip.exe clip --fresh
.\snipsnip.exe uninstall-host
```

**macOS/Linux**

```bash
./snipsnip install-host
./snipsnip status
./snipsnip clip
./snipsnip clip --json
./snipsnip clip --fresh
./snipsnip uninstall-host
```
