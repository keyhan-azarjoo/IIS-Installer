# لایه ۴: Nginx - پیشنهادی برای استفاده روزمره

> **⭐⭐ بهترین گزینه برای استفاده روزانه**
> پورت 443 (HTTPS) - سخت‌تر برای فیلتر شدن

[← بازگشت به راهنمای اصلی](../README.fa.md)

---

## این روش چیست؟

روشی که SSH را روی پورت 443 (همان پورت HTTPS) اجرا می‌کند.
در اکثر شبکه‌ها این پورت باز است.

**مزایا:**
- پورت 443 تقریباً همیشه باز است
- شبیه ترافیک HTTPS معمولی
- فیلتر کردن آن سخت است
- نصب هنوز آسان است

**نسبت به لایه ۳:**
- امنیت بهتر
- سخت‌تر برای مسدود شدن
- سرعت تقریباً یکسان

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
مرحله ۳: نصب لایه ۴ (Nginx)
--------------------------------------------------

این دستور را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer4-nginx/install.sh -o install.sh && bash install.sh
```

نصب خودکار انجام می‌شود.
Nginx روی پورت 443 راه‌اندازی می‌شود.

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
- Port: **443** (مهم!)
- Username: نام کاربری شما
- Password: رمز عبور شما
![photo_6039717998622346545_y](https://github.com/user-attachments/assets/3c56188b-0c9e-4b3e-bc1a-1d60b3853ded)



روی **Save** کلیک کنید و سپس **Connect**.

✅ اتصال برقرار شد!

---

## استفاده در Android (Net Mod)

قدم به قدم:

![Android Step 1](https://github.com/user-attachments/assets/72e7e385-83cf-4139-98df-4d41a5097916)

![Android Step 2](https://github.com/user-attachments/assets/c308415b-1484-448d-8c9d-69c5c97aab2d)

![Android Step 3](https://github.com/user-attachments/assets/86f3cea3-3d09-48bd-93f0-7824ffa10cb1)

![photo_6039717998622346547_y](https://github.com/user-attachments/assets/6099a3ff-2e14-4db4-a384-9c4f20e4494c)


![Android Step 5](https://github.com/user-attachments/assets/2847c64f-7061-4860-96b8-c131cc672031)

**تنظیمات Android:**
- Host: IP سرور
- Port: **443** (مهم!)
- Username: نام کاربری
- Password: رمز عبور

---

## نکات مهم

- حتماً پورت **443** را استفاده کنید (نه 22)
- این روش برای استفاده روزمره عالی است
- فیلتر کردن آن سخت‌تر از لایه ۳ است
- برای امنیت بیشتر، لایه ۶ یا ۷ را امتحان کنید

---
