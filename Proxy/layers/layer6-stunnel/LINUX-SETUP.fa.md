# راهنمای اتصال با Linux - لایه ۶ (Stunnel)

[← بازگشت به راهنمای اصلی لایه ۶](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## مرحله ۱: باز کردن Terminal

Terminal را باز کنید.

---

## مرحله ۲: اتصال SSH

```bash
ssh -D 1080 -N username@SERVER-IP -p 443
```

**توجه:** پورت **443** برای لایه ۶ - امنیت دوبل SSH + TLS

---

## مرحله ۳: تنظیم پراکسی

### تنظیمات سیستم (GNOME):
```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

### متغیرهای محیطی:
```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

### فقط مرورگر:
Firefox: Preferences → Network Settings → SOCKS5: `127.0.0.1:1080`

✅ اتصال برقرار شد!

---

## نکات مهم

- این روش رمزنگاری دوبل دارد (SSH + TLS)
- امن‌تر از لایه ۴
- Terminal باید باز بماند (یا از `-f` استفاده کنید)

---
