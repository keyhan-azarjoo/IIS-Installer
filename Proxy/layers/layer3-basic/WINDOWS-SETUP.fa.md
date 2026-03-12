# راهنمای اتصال با Windows - لایه ۳ (SSH پایه)

[← بازگشت به راهنمای اصلی لایه ۳](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش ۱: استفاده از PowerShell (ویندوز ۱۰ و بالاتر)

### مرحله ۱: باز کردن PowerShell

روی دکمه Start کلیک راست کرده و **PowerShell** را انتخاب کنید.

### مرحله ۲: اتصال SSH با SOCKS Proxy

دستور زیر را اجرا کنید:

```powershell
ssh -D 1080 -N username@SERVER-IP -p 22
```

**توجه:**
- `username` را با نام کاربری خود جایگزین کنید
- `SERVER-IP` را با IP سرور خود جایگزین کنید
- پورت `22` برای لایه ۳

مثال:
```powershell
ssh -D 1080 -N myuser@185.xxx.xxx.xxx -p 22
```

رمز عبور را وارد کنید.

### مرحله ۳: تنظیم مرورگر

اکنون باید مرورگر خود را تنظیم کنید تا از SOCKS5 proxy استفاده کند.

#### برای Firefox:
1. Settings → Network Settings
2. Manual proxy configuration
3. SOCKS Host: `127.0.0.1`
4. Port: `1080`
5. SOCKS v5 را انتخاب کنید

#### برای Chrome:
از افزونه **Proxy SwitchyOmega** استفاده کنید:
1. نصب کنید از Chrome Web Store
2. New Profile → Proxy Profile
3. Protocol: SOCKS5
4. Server: `127.0.0.1`
5. Port: `1080`

✅ اتصال برقرار شد!

---

## روش ۲: استفاده از PuTTY

### مرحله ۱: دانلود و نصب

از لینک زیر PuTTY را دانلود کنید:
https://www.putty.org/

### مرحله ۲: تنظیمات اتصال

1. **Host Name**: `username@SERVER-IP`
2. **Port**: `22`
3. به منوی **Connection → SSH → Tunnels** بروید
4. **Source port**: `1080`
5. **Destination**: خالی بگذارید
6. **Dynamic** را انتخاب کنید
7. روی **Add** کلیک کنید
8. برگردید به **Session** و روی **Open** کلیک کنید

رمز عبور را وارد کنید.

### مرحله ۳: تنظیم مرورگر

مثل روش ۱، مرورگر را تنظیم کنید که از `127.0.0.1:1080` استفاده کند.

---

## نکات مهم

- پنجره PowerShell یا PuTTY باید باز بماند
- اگر پنجره را ببندید، پراکسی قطع می‌شود
- پورت `1080` روی سیستم شما باید آزاد باشد
- برای قطع اتصال، پنجره را ببندید یا Ctrl+C بزنید

---
