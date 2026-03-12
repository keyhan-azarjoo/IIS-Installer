# Windows Connection Guide - Layer 7 (V2Ray VMess)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method 1: Using V2RayN (Easier)

### Step 1: Download V2RayN

Download from:
https://github.com/2dust/v2rayN/releases

Download `v2rayN-windows-64.zip`.

### Step 2: Extract and Run

1. Extract the zip file
2. Run `v2rayN.exe`

### Step 3: Add Server

#### Method A: Scan QR Code
1. Servers → Scan QRcode from screen
2. Display the server QR code on screen

#### Method B: Import from Clipboard
1. Copy the VMess link
2. Servers → Import bulk URL from clipboard

### Step 4: Connect

Right-click on the server and select **Set as active server**.

✅ Connected successfully!

---

## Method 2: Using Xray-core (Advanced)

### Step 1: Download Xray

Download from:
https://github.com/XTLS/Xray-core/releases

### Step 2: Create Config File

Create `config.json`:

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

**Note:** Replace `SERVER-IP` and `YOUR-UUID` with your information.

### Step 3: Run

```powershell
.\xray.exe -c config.json
```

### Step 4: Configure Browser

SOCKS5 proxy: `127.0.0.1:1080`

---

## Important Notes

- Keep UUID secure
- This method is designed for hard censorship
- Use V2RayN for simple usage

---

**Made with ❤️ for internet freedom**

