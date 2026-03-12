# Linux Connection Guide - Layer 3 (Basic SSH)

[← Back to Layer 3 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Step 1: Open Terminal

Open Terminal on your system.

---

## Step 2: Connect SSH with SOCKS Proxy

Run this command:

```bash
ssh -D 1080 -N username@SERVER-IP -p 22
```

**Note:**
- Replace `username` with your username
- Replace `SERVER-IP` with your server IP
- Port `22` for Layer 3

Example:
```bash
ssh -D 1080 -N myuser@185.xxx.xxx.xxx -p 22
```

Enter your password.

Keep the Terminal window open.

---

## Step 3: Configure Proxy

### Method 1: System Settings (GNOME/Ubuntu)

For GNOME desktop:

```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

Or via GUI:
1. **Settings** → **Network**
2. **Network Proxy** → **Manual**
3. **Socks Host**: `127.0.0.1`, Port: `1080`

To disable:
```bash
gsettings set org.gnome.system.proxy mode 'none'
```

---

### Method 2: Environment Variables

For temporary setup in current Terminal:

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

For permanent setup, add to `~/.bashrc` or `~/.zshrc`:

```bash
echo 'export ALL_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
echo 'export HTTP_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
echo 'export HTTPS_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
source ~/.bashrc
```

---

### Method 3: Browser Only (Firefox)

1. Firefox → **Preferences**
2. **Network Settings** → **Settings**
3. **Manual proxy configuration**
4. **SOCKS Host**: `127.0.0.1`
5. **Port**: `1080`
6. Select **SOCKS v5**

---

### Method 4: Chrome/Chromium

Run Chrome with proxy-server parameter:

```bash
google-chrome --proxy-server="socks5://127.0.0.1:1080"
```

Or use **Proxy SwitchyOmega** extension.

---

## Important Notes

- Terminal window must remain open (or use `-f`)
- To disconnect: Ctrl+C
- Port `1080` must be free

---

## Advanced Tip: Run in Background

To run in background:

```bash
ssh -D 1080 -N -f username@SERVER-IP -p 22
```

To disconnect:
```bash
ps aux | grep "ssh -D 1080"
kill [PID]
```

Or:
```bash
pkill -f "ssh -D 1080"
```

---

## Test Connection

Check your IP:

```bash
curl --socks5 127.0.0.1:1080 https://ipinfo.io/ip
```

Should show your VPS server IP.

---

## Using with curl

```bash
curl --socks5 127.0.0.1:1080 https://example.com
```

---

## Using with wget

```bash
wget -e use_proxy=yes -e socks_proxy=127.0.0.1:1080 https://example.com
```

---

**Made with ❤️ for internet freedom**

