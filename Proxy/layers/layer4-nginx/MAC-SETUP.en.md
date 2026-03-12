# macOS Connection Guide - Layer 4 (Nginx)

[← Back to Layer 4 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Step 1: Open Terminal

From Spotlight (Cmd+Space) search: **Terminal**

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

## Step 3: Configure Proxy Settings

### Method 1: System Settings (System-wide)

1. **System Preferences** → **Network**
2. Select your current network (Wi-Fi or Ethernet)
3. Click **Advanced**
4. Select **Proxies** tab
5. Check **SOCKS Proxy**
6. **SOCKS Proxy Server**: `127.0.0.1:1080`
7. Click **OK** then **Apply**

✅ All apps will use the proxy!

---

### Method 2: Browser Only (Firefox)

1. Firefox → **Preferences**
2. **Network Settings** → **Settings**
3. **Manual proxy configuration**
4. **SOCKS Host**: `127.0.0.1`
5. **Port**: `1080`
6. Select **SOCKS v5**
7. Click **OK**

---

### Method 3: Chrome with Extension

For Chrome, use **Proxy SwitchyOmega** extension:

1. Install from Chrome Web Store
2. New Profile → Proxy Profile
3. Protocol: SOCKS5
4. Server: `127.0.0.1`
5. Port: `1080`

---

## Important Notes

- Terminal window must remain open
- Port **443** looks like HTTPS and is harder to filter
- This method is recommended for daily use

---

## Advanced Tip: Run in Background

```bash
ssh -D 1080 -N -f username@SERVER-IP -p 443
```

---

**Made with ❤️ for internet freedom**

