# راهنمای اتصال با macOS - لایه ۴ (Nginx)

[← بازگشت به راهنمای اصلی لایه ۴](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## مرحله ۱: باز کردن Terminal

از Spotlight (Cmd+Space) جستجو کنید: **Terminal**

---

## مرحله ۲: اتصال SSH با SOCKS Proxy

دستور زیر را اجرا کنید:

```bash
ssh -D 1080 -N username@SERVER-IP -p 443
```

**توجه:**
- `username` را با نام کاربری خود جایگزین کنید
- `SERVER-IP` را با IP سرور خود جایگزین کنید
- پورت `443` برای لایه ۴ (HTTPS)

مثال:
```bash
ssh -D 1080 -N myuser@185.xxx.xxx.xxx -p 443
```

رمز عبور را وارد کنید.

پنجره Terminal را باز نگه دارید.

---

## مرحله ۳: تنظیم پراکسی سیستم

### روش ۱: تنظیمات سیستم (System-wide)

1. **System Preferences** → **Network**
2. شبکه فعلی خود را انتخاب کنید (Wi-Fi یا Ethernet)
3. روی **Advanced** کلیک کنید
4. تب **Proxies** را انتخاب کنید
5. **SOCKS Proxy** را تیک بزنید
6. **SOCKS Proxy Server**: `127.0.0.1:1080`
7. روی **OK** و سپس **Apply** کلیک کنید

✅ تمام برنامه‌ها از پراکسی استفاده می‌کنند!

---

### روش ۲: فقط مرورگر (Firefox)

1. Firefox → **Preferences**
2. **Network Settings** → **Settings**
3. **Manual proxy configuration**
4. **SOCKS Host**: `127.0.0.1`
5. **Port**: `1080`
6. **SOCKS v5** را انتخاب کنید
7. روی **OK** کلیک کنید

---

### روش ۳: Chrome با افزونه

برای Chrome از افزونه **Proxy SwitchyOmega** استفاده کنید:

1. نصب از Chrome Web Store
2. New Profile → Proxy Profile
3. Protocol: SOCKS5
4. Server: `127.0.0.1`
5. Port: `1080`

---

## نکات مهم

- پنجره Terminal باید باز بماند
- پورت **443** شبیه HTTPS است و فیلتر شدن آن سخت‌تر است
- این روش برای استفاده روزمره توصیه می‌شود

---

## نکته پیشرفته: اجرای در Background

```bash
ssh -D 1080 -N -f username@SERVER-IP -p 443
```

---
