# لایه ۳: SSH پایه - ساده‌ترین روش

> **⭐ آسان‌ترین روش برای شروع**
> پورت 22 - مناسب تست و یادگیری

[← بازگشت به راهنمای اصلی](../README.fa.md)

---

## این روش چیست؟

ساده‌ترین روش پراکسی که از SSH استاندارد روی پورت 22 استفاده می‌کند.

**مزایا:**
- نصب بسیار آسان (5 دقیقه)
- بدون نیاز به تنظیمات پیچیده
- رمزنگاری SSH استاندارد

**محدودیت:**
- پورت 22 در برخی شبکه‌ها ممکن است فیلتر باشد
- برای سانسور سخت مناسب نیست

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
مرحله ۳: نصب لایه ۳
--------------------------------------------------

این دستور را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer3-basic/install.sh -o install.sh && bash install.sh
```

نصب خودکار انجام می‌شود.

---

--------------------------------------------------
مرحله ۳.۱: دسترسی به پنل مدیریت
--------------------------------------------------

پس از اتمام نصب، آدرس زیر را در مرورگر خود باز کنید:

```
https://server-IP:8443
```

> **توجه:** به جای `server-IP` آدرس IP سرور خود را وارد کنید.

![پنل مدیریت](https://github.com/user-attachments/assets/0a0e0264-75d5-4206-b71c-d212a61bbc99)



---

### هشدار گواهی SSL

مرورگر یک هشدار امنیتی نشان می‌دهد. این به دلیل استفاده از گواهی SSL خودامضا (self-signed) است و مشکلی ندارد.

روی **Advanced** کلیک کنید:

![هشدار SSL](https://github.com/user-attachments/assets/4a18b53a-eaaa-4e51-b9c7-d21812eb855e)

سپس روی **Proceed to IP (unsafe)** کلیک کنید:

> ما از SSL خودامضا استفاده می‌کنیم تا پنل با HTTPS کار کند (بدون نیاز به خرید گواهی). به همین دلیل مرورگر این سایت را در لیست گواهی‌های معتبر خود پیدا نمی‌کند.

![ادامه دادن](https://github.com/user-attachments/assets/4f763fcc-5bb8-4c0a-b96f-e09285652788)

---

### ورود به پنل

صفحه ورود نمایش داده می‌شود. در صورت تمایل می‌توانید زبان را به فارسی تغییر دهید.

نام کاربری و رمز عبور سرور خود (اطلاعات دریافت شده از IONOS) را وارد کنید:

![صفحه ورود](https://github.com/user-attachments/assets/30ac2bde-59bc-4379-af1d-5c8846485210)

---

### پنل مدیریت

این پنل مدیریت سرور شماست. از اینجا می‌توانید کاربران را اضافه یا حذف کنید:

![پنل مدیریت](https://github.com/user-attachments/assets/5262345c-7f4d-47d4-bc38-34dff8dd7111)

در پنل روش‌های مختلفی برای لایه‌های مختلف وجود دارد. در حال حاضر فقط ۳ لایه اول در ایران کار می‌کنند و پیشنهاد می‌شود از لایه اول استفاده کنید چون عملکرد بهتری دارد:

![روش‌های مختلف](https://github.com/user-attachments/assets/33037acb-db2d-442b-b1e0-eef5177ed1d1)

### **روش جایگزین:** همچنین می‌توانید از دستورات زیر برای اضافه یا حذف کاربران استفاده کنید (مرحله ۴ تا ۶ را ببینید).

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

اطلاعات را وارد کنید:
- SSH Host: IP سرور
- Port: **22**
- Username: نام کاربری شما
- Password: رمز عبور شما

![Fill SSH Info](https://github.com/user-attachments/assets/b232e341-4d59-4f2b-804d-d923f31a03e6)

روی **Save** کلیک کنید و سپس **Connect**.

✅ اتصال برقرار شد!

---

## استفاده در Android (Net Mod)

قدم به قدم:

![Android Step 1](https://github.com/user-attachments/assets/72e7e385-83cf-4139-98df-4d41a5097916)

![Android Step 2](https://github.com/user-attachments/assets/c308415b-1484-448d-8c9d-69c5c97aab2d)

![Android Step 3](https://github.com/user-attachments/assets/86f3cea3-3d09-48bd-93f0-7824ffa10cb1)

![Android Step 4](https://github.com/user-attachments/assets/9062ea58-d7bc-400c-92bb-0b00a830757a)

![Android Step 5](https://github.com/user-attachments/assets/2847c64f-7061-4860-96b8-c131cc672031)

**تنظیمات Android:**
- Host: IP سرور
- Port: **22**
- Username: نام کاربری
- Password: رمز عبور

---

## نکات مهم

- پورت 22 در برخی شبکه‌ها ممکن است فیلتر شود
- برای استفاده روزمره لایه ۴ (Nginx) بهتر است
- این روش برای یادگیری و تست عالی است

---
