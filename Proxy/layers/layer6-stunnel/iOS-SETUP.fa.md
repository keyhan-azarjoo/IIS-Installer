# راهنمای اتصال با iOS - لایه ۶ (Stunnel)

[← بازگشت به راهنمای اصلی لایه ۶](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## اپلیکیشن مورد نیاز

**NPV Tunnel** (رایگان در App Store)

---

## مرحله ۱: نصب اپلیکیشن

وارد **App Store** شوید و جستجو کنید:

**NPV Tunnel**

![NPV App Store](https://github.com/user-attachments/assets/22d012dd-eea8-4bde-9146-3a0e52154a88)

---

## مرحله ۲: ورود به Config

پس از باز شدن برنامه، به تب **Config** بروید.

![Config Tab](https://github.com/user-attachments/assets/2497ee34-fcb2-4575-9e42-2b930b8d0b8d)

---

## مرحله ۳: اضافه کردن تنظیمات

روی **+** کلیک کنید.

![Add Config](https://github.com/user-attachments/assets/a9b01bb9-f03d-4d5e-bcf7-d920b44660a4)

**Add Config Manually** را انتخاب کنید.

![Add Manually](https://github.com/user-attachments/assets/b87227d4-5b41-443f-8707-2a322d2c018f)

---

## مرحله ۴: انتخاب SSH Config

![SSH Config](https://github.com/user-attachments/assets/ac804061-e32d-423a-8387-69d25e326e27)

---

## مرحله ۵: وارد کردن اطلاعات

اطلاعات را وارد کنید:
- **SSH Host**: IP سرور
- **Port**: **443**
- **Username**: نام کاربری شما
- **Password**: رمز عبور شما

![Fill SSH Info](https://github.com/user-attachments/assets/b232e341-4d59-4f2b-804d-d923f31a03e6)

روی **Save** کلیک کنید و سپس **Connect**.

✅ اتصال برقرار شد!

---

## نکات مهم

- حتماً پورت **443** را استفاده کنید (لایه ۶)
- این روش امنیت دوبل دارد: SSH + TLS
- رمزنگاری بسیار قوی‌تر از لایه‌های قبلی

---
