# Linux Connection Guide - Layer 7 (V2Ray VMess)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method 1: Install Xray-core

### Step 1: Installation

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### Step 2: Create Config File

```bash
sudo nano /usr/local/etc/xray/config.json
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

**Note:** Replace `SERVER-IP` and `YOUR-UUID`.

### Step 3: Run

```bash
sudo systemctl start xray
sudo systemctl enable xray
```

Or manual run:
```bash
xray run -c /usr/local/etc/xray/config.json
```

### Step 4: Configure Proxy

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

For permanent:
```bash
echo 'export ALL_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
source ~/.bashrc
```

Or system settings (GNOME):
```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

---

## Method 2: Using V2Ray GUI (Qv2ray)

### Step 1: Install Qv2ray

For Ubuntu/Debian:
```bash
wget https://github.com/Qv2ray/Qv2ray/releases/download/v2.7.0/qv2ray_2.7.0_amd64.deb
sudo dpkg -i qv2ray_2.7.0_amd64.deb
```

### Step 2: Add Server

1. Open Qv2ray
2. Group → Import → From VMess link / QR code
3. Paste VMess link

### Step 3: Connect

Click on server and press Connect.

✅ Connected successfully!

---

## Test Connection

```bash
curl --socks5 127.0.0.1:1080 https://ipinfo.io/ip
```

Should show your VPS server IP.

---

## Important Notes

- Keep UUID secure
- This method is designed for hard censorship
- Use GUI for simple usage

---

**Made with ❤️ for internet freedom**

