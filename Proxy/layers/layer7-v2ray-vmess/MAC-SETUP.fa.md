# راهنمای اتصال با macOS - لایه ۷ (V2Ray VMess)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش ۱: استفاده از V2RayX (ساده‌تر)

### مرحله ۱: دانلود V2RayX

از لینک زیر دانلود کنید:
https://github.com/Cenmrev/V2RayX/releases

### مرحله ۲: نصب

فایل DMG را باز کنید و V2RayX را به Applications کپی کنید.

### مرحله ۳: اضافه کردن سرور

1. V2RayX را باز کنید
2. Configure → Import from JSON / QRCode
3. لینک VMess را paste کنید یا QR Code را اسکن کنید

### مرحله ۴: اتصال

روی آیکن V2RayX در menu bar کلیک کنید و **Load core** را انتخاب کنید.

✅ اتصال برقرار شد!

---

## روش ۲: استفاده از Xray-core (Terminal)

### مرحله ۱: نصب Xray

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### مرحله ۲: ایجاد فایل کانفیگ

```bash
nano /usr/local/etc/xray/config.json
```

محتوا:
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

### مرحله ۳: اجرا

```bash
xray run -c /usr/local/etc/xray/config.json
```

### مرحله ۴: تنظیم پراکسی

System Preferences → Network → Advanced → Proxies → SOCKS Proxy: `127.0.0.1:1080`

---

## نکات مهم

- UUID را ایمن نگه دارید
- برای استفاده ساده از V2RayX استفاده کنید
- این روش برای سانسور سخت طراحی شده

---
