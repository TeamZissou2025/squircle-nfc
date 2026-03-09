# Squircle NFC Bridge

Local CLI tool that connects the ACR1252U NFC reader to the [Squircle NFC Dashboard](https://nfc.moonagedaydream.ca) via WebSocket.

## Prerequisites

- **Node.js** v20 or later
- **ACR1252U USB NFC reader**
- **ACS driver for macOS** — download from [ACS Downloads](https://www.acs.com.hk/en/driver/290/acr1252u-usb-nfc-reader-iii/)
  - Install the **macOS** package (listed as "Mac OS X" on the ACS site)
  - Restart your Mac after installing the driver

## Setup (fresh Mac)

1. **Open Terminal**
   - Press `Cmd + Space`, type `Terminal`, and hit Enter

2. **Install Homebrew** (if you don't have it)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Install Node.js**
   ```bash
   brew install node
   ```

4. **Install the ACS ACR1252U driver**

   Download and install from: https://www.acs.com.hk/en/driver/290/acr1252u-usb-nfc-reader-iii/

5. **Clone the repo and install**
   ```bash
   git clone https://github.com/TeamZissou2025/squircle-nfc.git
   cd squircle-nfc/squircle-nfc-bridge
   npm install
   npm link
   ```

6. **Plug in the ACR1252U reader via USB**

7. **Run the bridge**
   ```bash
   squircle-nfc-bridge
   ```

8. **Open the dashboard** at https://nfc.moonagedaydream.ca

## Usage

```bash
squircle-nfc-bridge            # default port 7891
squircle-nfc-bridge --port 8080  # custom port
```

The bridge starts a WebSocket server that the dashboard connects to automatically.

## Troubleshooting

- **Reader not detected on macOS**: You may need to disable the built-in smart card daemon:
  ```bash
  sudo defaults write /Library/Preferences/com.apple.security.smartcard DisabledTokens -array com.apple.ifdreader
  ```
  Then restart your Mac.

- **`NODE_MODULE_VERSION` mismatch error**: The native PC/SC module needs to be rebuilt for your Node version:
  ```bash
  npm rebuild
  ```

- **`npm link` not working**: Make sure you run it from inside the `squircle-nfc-bridge` directory.
