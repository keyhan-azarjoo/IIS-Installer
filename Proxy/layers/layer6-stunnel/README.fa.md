# لایه ۶: Stunnel - امنیت دوبل با TLS

> **⭐⭐⭐ امنیت بالا با رمزنگاری دوبل**
> پورت 443 - TLS Wrapper برای SSH

[← بازگشت به راهنمای اصلی](../README.fa.md)

---

## این روش چیست؟

این روش SSH را داخل یک تونل TLS می‌پیچد.
یعنی رمزنگاری SSH + رمزنگاری TLS = امنیت دوبل

**مزایا:**
- رمزنگاری دوبل (SSH + TLS)
- به نظر شبیه HTTPS واقعی
- سخت‌تر برای تشخیص
- هنوز هم روی پورت 443

**نسبت به لایه ۴:**
- امنیت بیشتر
- مخفی‌تر از DPI (Deep Packet Inspection)
- نصب کمی پیچیده‌تر

---

--------------------------------------------------
مرحله ۱: خرید سرور VPS
--------------------------------------------------

**اگر از قبل سرور لینوکس با Ubuntu دارید، این مرحله را رد کنید و به مرحله ۲ بروید.**

**برای خرید از IONOS (پیشنهادی):** [راهنمای خرید سرور از IONOS](../buy-ionos-server.fa.md)

### نکات خرید:
- سیستم‌عامل: **Ubuntu**
- پلن ارزان کافی است
- لوکیشن به انتخاب شما

**اطلاعات مورد نیاز از سرور:**
- IP سرور
- نام کاربری: root
- رمز عبور

---

--------------------------------------------------
مرحله ۲: اتصال SSH
--------------------------------------------------

**[راهنمای اتصال به سرور با SSH](../ssh-connection.fa.md)**

خلاصه:
```bash
ssh root@SERVER-IP
```

---

--------------------------------------------------
مرحله ۳: نصب لایه ۶ (Stunnel + TLS)
--------------------------------------------------

این دستور را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer6-stunnel/install.sh -o install.sh && bash install.sh
```

نصب خودکار انجام می‌شود.
Stunnel با TLS روی پورت 443 راه‌اندازی می‌شود.

---

--------------------------------------------------
مرحله ۴: اضافه کردن کاربر
--------------------------------------------------

برای هر نفر یک کاربر بسازید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh
```

نام کاربری و رمز عبور را وارد کنید.

---

--------------------------------------------------
مرحله ۵: مانیتورینگ کاربران
--------------------------------------------------

برای مشاهده کاربران متصل و وضعیت سرور:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/view-users.sh -o view-users.sh && bash view-users.sh
```

---

--------------------------------------------------
مرحله ۶: حذف کاربر (در صورت نیاز)
--------------------------------------------------

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/delete-user.sh -o delete-user.sh && bash delete-user.sh username
```

---

## استفاده در iOS (NPV Tunnel)

### مرحله ۱: نصب اپلیکیشن

وارد App Store شوید و جستجو کنید:
**NPV Tunnel**

![NPV App Store](https://github.com/user-attachments/assets/22d012dd-eea8-4bde-9146-3a0e52154a88)

---

### مرحله ۲: ورود به Config

![Config Tab](https://github.com/user-attachments/assets/2497ee34-fcb2-4575-9e42-2b930b8d0b8d)

---

### مرحله ۳: اضافه کردن تنظیمات

روی **+** کلیک کنید.

![Add Config](https://github.com/user-attachments/assets/a9b01bb9-f03d-4d5e-bcf7-d920b44660a4)

**Add Config Manually** را انتخاب کنید.

![Add Manually](https://github.com/user-attachments/assets/b87227d4-5b41-443f-8707-2a322d2c018f)

---

### مرحله ۴: انتخاب SSH Config

![SSH Config](https://github.com/user-attachments/assets/ac804061-e32d-423a-8387-69d25e326e27)

---

### مرحله ۵: وارد کردن اطلاعات

**مهم:** تنظیمات لایه ۶ با لایه ۴ فرق دارد!

اطلاعات را وارد کنید:
- SSH Host: IP سرور
- Port: **443**
- Username: نام کاربری شما
- Password: رمز عبور شما
- **Connection Mode: SSH-TLS** (نه SSH معمولی!)
- **SNI: www.google.com** (یا هر وبسایت دیگری مثل www.bing.com)

**SNI چیست؟** SNI باعث می‌شود ترافیک شما شبیه بازدید از یک وبسایت معمولی به نظر برسد.

![photo_6039717998622346553_y](https://github.com/user-attachments/assets/a792a56c-7292-4c8e-bf17-4aa040d669ec)

![photo_6039717998622346552_y](https://github.com/user-attachments/assets/61ee74b4-6327-415e-813d-a989ec119b97)


روی **Save** کلیک کنید و سپس **Connect**.

✅ اتصال برقرار شد!

---

## استفاده در Android (Net Mod)

**مهم:** تنظیمات NetMod برای لایه ۶ با لایه ۴ فرق دارد!

![Android Step 1](https://github.com/user-attachments/assets/72e7e385-83cf-4139-98df-4d41a5097916)

![Android Step 2](https://github.com/user-attachments/assets/c308415b-1484-448d-8c9d-69c5c97aab2d)

![Android Step 3](https://github.com/user-attachments/assets/86f3cea3-3d09-48bd-93f0-7824ffa10cb1)

![photo_6039717998622346556_y](https://github.com/user-attachments/assets/7120f144-825e-472c-9b4f-fad94fe25168)

![Android Step 5](https://github.com/user-attachments/assets/2847c64f-7061-4860-96b8-c131cc672031)

**تنظیمات Android:**
تنظیمات:
- Host: IP سرور
- Port: **443**
- Username: نام کاربری
- Password: رمز عبور
- **TLS Type: tls** (از لیست انتخاب کنید)
- **SNI: www.google.com** (یا www.bing.com یا هر سایت دیگر)

روی **Save** کلیک کنید و سپس **Connect** بزنید.

---

## نکات مهم

- این روش امنیت دوبل دارد (SSH + TLS)
- از DPI بهتر عبور می‌کند
- سرعت شبیه لایه ۴ است
- برای سانسور سخت، لایه ۷ را امتحان کنید

---
