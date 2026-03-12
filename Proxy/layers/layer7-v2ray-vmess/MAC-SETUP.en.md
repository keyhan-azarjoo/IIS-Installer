# macOS Connection Guide - Layer 7 (V2Ray VMess)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method 1: Using V2RayX (Easier)

### Step 1: Download V2RayX

Download from:
https://github.com/Cenmrev/V2RayX/releases

### Step 2: Install

Open the DMG file and copy V2RayX to Applications.

### Step 3: Add Server

1. Open V2RayX
2. Configure → Import from JSON / QRCode
3. Paste VMess link or scan QR code

### Step 4: Connect

Click V2RayX icon in menu bar and select **Load core**.

✅ Connected successfully!

---

## Method 2: Using Xray-core (Terminal)

### Step 1: Install Xray

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### Step 2: Create Config File

```bash
nano /usr/local/etc/xray/config.json
```

Content:
```json
{
  "inbounds": [{
    "port": 1080,
    "protocol": "socks",
    "settings": {
      "udp": true
    }
  }],
  "outbounds": [{
    "protocol": "vmess",
    "settings": {
      "vnext": [{
        "address": "SERVER-IP",
        "port": 443,
        "users": [{
          "id": "YOUR-UUID",
          "security": "auto"
        }]
      }]
    },
    "streamSettings": {
      "network": "ws",
      "wsSettings": {
        "path": "/vmess"
      }
    }
  }]
}
```

### Step 3: Run

```bash
xray run -c /usr/local/etc/xray/config.json
```

### Step 4: Configure Proxy

System Preferences → Network → Advanced → Proxies → SOCKS Proxy: `127.0.0.1:1080`

---

## Important Notes

- Keep UUID secure
- Use V2RayX for simple usage
- This method is designed for hard censorship

---

**Made with ❤️ for internet freedom**

