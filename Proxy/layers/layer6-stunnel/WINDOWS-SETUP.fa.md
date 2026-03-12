# راهنمای اتصال با Windows - لایه ۶ (Stunnel)

[← بازگشت به راهنمای اصلی لایه ۶](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## روش استفاده از PowerShell

### مرحله ۱: باز کردن PowerShell

روی دکمه Start کلیک راست کرده و **PowerShell** را انتخاب کنید.

### مرحله ۲: اتصال SSH با SOCKS Proxy

```powershell
ssh -D 1080 -N username@SERVER-IP -p 443
```

**توجه:** پورت **443** برای لایه ۶ - امنیت دوبل SSH + TLS

### مرحله ۳: تنظیم مرورگر

#### Firefox:
Settings → Network Settings → Manual proxy → SOCKS5: `127.0.0.1:1080`

#### Chrome:
استفاده از افزونه **Proxy SwitchyOmega**

✅ اتصال برقرار شد!

---

## نکات مهم

- این روش رمزنگاری دوبل دارد (SSH + TLS)
- امن‌تر از لایه ۴
- پنجره PowerShell باید باز بماند

---
