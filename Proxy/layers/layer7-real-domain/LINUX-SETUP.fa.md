# راهنمای اتصال با Linux - لایه ۷ (دامنه واقعی + TLS)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش ۱: استفاده از Xray-core

### مرحله ۱: نصب

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### مرحله ۲: ایجاد کانفیگ

```bash
sudo nano /usr/local/etc/xray/config.json
```

محتوا (برای VLESS):
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

**توجه:** `your-domain.duckdns.org` و `YOUR-UUID` و `YOUR-GRPC-SERVICE` را جایگزین کنید.

### مرحله ۳: اجرا

```bash
sudo systemctl start xray
sudo systemctl enable xray
```

### مرحله ۴: تنظیم پراکسی

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
```

---

## روش ۲: استفاده از Qv2ray (GUI)

### نصب:
```bash
wget https://github.com/Qv2ray/Qv2ray/releases/download/v2.7.0/qv2ray_2.7.0_amd64.deb
sudo dpkg -i qv2ray_2.7.0_amd64.deb
```

### اضافه کردن:
Group → Import → From VLESS/Trojan link / QR code

✅ اتصال برقرار شد!

---

## نکات مهم

- این روش بهترین امنیت را دارد
- استفاده از دامنه واقعی + گواهی TLS معتبر
- ترافیک شبیه HTTPS واقعی است

---
