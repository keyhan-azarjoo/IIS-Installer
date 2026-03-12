# راهنمای اتصال با Linux - لایه ۴ (Nginx)

[← بازگشت به راهنمای اصلی لایه ۴](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## مرحله ۱: باز کردن Terminal

Terminal را در سیستم خود باز کنید.

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

## مرحله ۳: تنظیم پراکسی

### روش ۱: تنظیمات سیستم (GNOME/Ubuntu)

```bash
gsettings set org.gnome.system.proxy mode 'manual'
gsettings set org.gnome.system.proxy.socks host '127.0.0.1'
gsettings set org.gnome.system.proxy.socks port 1080
```

یا از GUI:
1. **Settings** → **Network**
2. **Network Proxy** → **Manual**
3. **Socks Host**: `127.0.0.1`, Port: `1080`

---

### روش ۲: متغیرهای محیطی

برای تنظیم موقت:

```bash
export ALL_PROXY=socks5://127.0.0.1:1080
export HTTP_PROXY=socks5://127.0.0.1:1080
export HTTPS_PROXY=socks5://127.0.0.1:1080
```

برای تنظیم دائمی:

```bash
echo 'export ALL_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
echo 'export HTTP_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
echo 'export HTTPS_PROXY=socks5://127.0.0.1:1080' >> ~/.bashrc
source ~/.bashrc
```

---

### روش ۳: فقط مرورگر (Firefox)

1. Firefox → **Preferences**
2. **Network Settings** → **Settings**
3. **Manual proxy configuration**
4. **SOCKS Host**: `127.0.0.1`
5. **Port**: `1080`
6. **SOCKS v5** را انتخاب کنید

---

## نکات مهم

- پنجره Terminal باید باز بماند (یا از `-f` استفاده کنید)
- پورت **443** شبیه HTTPS است و فیلتر شدن آن سخت‌تر است
- این روش برای استفاده روزمره توصیه می‌شود

---

## نکته پیشرفته: اجرای در Background

```bash
ssh -D 1080 -N -f username@SERVER-IP -p 443
```

---

## تست اتصال

```bash
curl --socks5 127.0.0.1:1080 https://ipinfo.io/ip
```

باید IP سرور VPS را نشان دهد.

---
