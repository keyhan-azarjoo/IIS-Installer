# Linux Connection Guide - Layer 7 (Real Domain + TLS)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method 1: Using Xray-core

### Step 1: Installation

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### Step 2: Create Config

```bash
sudo nano /usr/local/etc/xray/config.json
```

Content (for VLESS):
```json
{
  "inbounds": [{
    "port": 1080,
    "protocol": "socks",
    "settings": {"udp": true}
  }],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "your-domain.duckdns.org",
        "port": 443,
        "users": [{
          "id": "YOUR-UUID",
          "encryption": "none"
        }]
      }]
    },
    "streamSettings": {
      "network": "grpc",
      "security": "tls",
      "tlsSettings": {
        "serverName": "your-domain.duckdns.org",
        "allowInsecure": false,
        "alpn": ["h2"]
      },
      "grpcSettings": {
        "serviceName": "YOUR-GRPC-SERVICE"
      }
    }
  }]
}
```

**Note:** Replace `your-domain.duckdns.org`, `YOUR-UUID`, and `YOUR-GRPC-SERVICE`.

### Step 3: Run

```bash
sudo systemctl start xray
sudo systemctl enable xray
```

### Step 4: Configure Proxy

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
```

---

## Method 2: Using Qv2ray (GUI)

### Install:
```bash
wget https://github.com/Qv2ray/Qv2ray/releases/download/v2.7.0/qv2ray_2.7.0_amd64.deb
sudo dpkg -i qv2ray_2.7.0_amd64.deb
```

### Add:
Group → Import → From VLESS/Trojan link / QR code

✅ Connected successfully!

---

## Important Notes

- This method has the best security
- Uses real domain + valid TLS certificate
- Traffic looks like real HTTPS

---

**Made with ❤️ for internet freedom**
