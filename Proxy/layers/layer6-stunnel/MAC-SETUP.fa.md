# راهنمای اتصال با macOS - لایه ۶ (Stunnel)

[← بازگشت به راهنمای اصلی لایه ۶](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## مرحله ۱: باز کردن Terminal

از Spotlight (Cmd+Space) جستجو کنید: **Terminal**

---

## مرحله ۲: اتصال SSH

```bash
ssh -D 1080 -N username@SERVER-IP -p 443
```

**توجه:** پورت **443** برای لایه ۶ - امنیت دوبل SSH + TLS

---

## مرحله ۳: تنظیم پراکسی

**System Preferences** → **Network** → شبکه فعلی → **Advanced** → **Proxies**

- **SOCKS Proxy**: `127.0.0.1:1080`

یا فقط مرورگر:
- Firefox: Network Settings → SOCKS5: `127.0.0.1:1080`
- Chrome: افزونه **Proxy SwitchyOmega**

✅ اتصال برقرار شد!

---

## نکات مهم

- این روش رمزنگاری دوبل دارد (SSH + TLS)
- امن‌تر از لایه ۴
- Terminal باید باز بماند

---
