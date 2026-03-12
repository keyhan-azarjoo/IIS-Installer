# راهنمای اتصال با Linux - لایه ۷ (V2Ray VMess)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش ۱: نصب Xray-core

### مرحله ۱: نصب

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

### مرحله ۲: ایجاد فایل کانفیگ

```bash
sudo nano /usr/local/etc/xray/config.json
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

**توجه:** `SERVER-IP` و `YOUR-UUID` را جایگزین کنید.

### مرحله ۳: اجرا

```bash
sudo systemctl start xray
sudo systemctl enable xray
```

یا اجرای دستی:
```bash
xray run -c /usr/local/etc/xray/config.json
```

### مرحله ۴: تنظیم پراکسی

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

برای دائمی کردن:
```bash
echo 'export ALL_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
source ~/.bashrc
```

یا از تنظیمات سیستم (GNOME):
```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

---

## روش ۲: استفاده از V2Ray GUI (Qv2ray)

### مرحله ۱: نصب Qv2ray

برای Ubuntu/Debian:
```bash
wget https://github.com/Qv2ray/Qv2ray/releases/download/v2.7.0/qv2ray_2.7.0_amd64.deb
sudo dpkg -i qv2ray_2.7.0_amd64.deb
```

### مرحله ۲: اضافه کردن سرور

1. Qv2ray را باز کنید
2. Group → Import → From VMess link / QR code
3. لینک VMess را paste کنید

### مرحله ۳: اتصال

روی سرور کلیک کنید و Connect را بزنید.

✅ اتصال برقرار شد!

---

## تست اتصال

```bash
curl --socks5 127.0.0.1:1080 https://ipinfo.io/ip
```

باید IP سرور VPS را نشان دهد.

---

## نکات مهم

- UUID را ایمن نگه دارید
- این روش برای سانسور سخت طراحی شده
- برای استفاده ساده از GUI استفاده کنید

---
