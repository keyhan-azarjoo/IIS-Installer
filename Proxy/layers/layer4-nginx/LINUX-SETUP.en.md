# Linux Connection Guide - Layer 4 (Nginx)

[← Back to Layer 4 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Step 1: Open Terminal

Open Terminal on your system.

---

## Step 2: Connect SSH with SOCKS Proxy

Run this command:

```bash
ssh -D 1080 -N username@SERVER-IP -p 443
```

**Note:**
- Replace `username` with your username
- Replace `SERVER-IP` with your server IP
- Port `443` for Layer 4 (HTTPS)

Example:
```bash
ssh -D 1080 -N myuser@185.xxx.xxx.xxx -p 443
```

Enter your password.

Keep the Terminal window open.

---

## Step 3: Configure Proxy

### Method 1: System Settings (GNOME/Ubuntu)

```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

Or via GUI:
1. **Settings** → **Network**
2. **Network Proxy** → **Manual**
3. **Socks Host**: `127.0.0.1`, Port: `1080`

---

### Method 2: Environment Variables

For temporary setup:

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

For permanent setup:

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

## Important Notes

- Terminal window must remain open (or use `-f`)
- Port **443** looks like HTTPS and is harder to filter
- This method is recommended for daily use

---

## Advanced Tip: Run in Background

```bash
ssh -D 1080 -N -f username@SERVER-IP -p 443
```

---

## Test Connection

```bash
curl --socks5 127.0.0.1:1080 https://ipinfo.io/ip
```

Should show your VPS server IP.

---

**Made with ❤️ for internet freedom**

