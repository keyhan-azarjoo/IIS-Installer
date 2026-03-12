# راهنمای اتصال با Windows - لایه ۷ (V2Ray VMess)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش ۱: استفاده از V2RayN (ساده‌تر)

### مرحله ۱: دانلود V2RayN

از لینک زیر دانلود کنید:
https://github.com/2dust/v2rayN/releases

فایل `v2rayN-windows-64.zip` را دانلود کنید.

### مرحله ۲: استخراج و اجرا

1. فایل zip را استخراج کنید
2. `v2rayN.exe` را اجرا کنید

### مرحله ۳: اضافه کردن سرور

#### روش A: اسکن QR Code
1. Servers → Scan QRcode from screen
2. QR Code سرور را روی صفحه نمایش دهید

#### روش B: Import از Clipboard
1. لینک VMess را کپی کنید
2. Servers → Import bulk URL from clipboard

### مرحله ۴: اتصال

روی سرور راست کلیک کنید و **Set as active server** را انتخاب کنید.

✅ اتصال برقرار شد!

---

## روش ۲: استفاده از Xray-core (پیشرفته)

### مرحله ۱: دانلود Xray

از لینک زیر دانلود کنید:
https://github.com/XTLS/Xray-core/releases

### مرحله ۲: ایجاد فایل کانفیگ

فایل `config.json` بسازید:

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

**توجه:** `SERVER-IP` و `YOUR-UUID` را با اطلاعات خود جایگزین کنید.

### مرحله ۳: اجرا

```powershell
.\xray.exe -c config.json
```

### مرحله ۴: تنظیم مرورگر

SOCKS5 proxy: `127.0.0.1:1080`

---

## نکات مهم

- UUID را ایمن نگه دارید
- این روش برای سانسور سخت طراحی شده
- برای استفاده ساده از V2RayN استفاده کنید

---
