# راهنمای اتصال با Android - لایه ۷ (دامنه واقعی + TLS)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## اپلیکیشن مورد نیاز

**NetMod (Net Mod Syna)**

---

## مرحله ۱: نصب اپلیکیشن

از **Google Play** جستجو کنید: **NetMod** یا **Net Mod Syna**

---

## مرحله ۲: دریافت کانفیگ JSON

روی سرور، دستور اضافه کردن کاربر را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-real-domain/add-user.sh -o add-user.sh && bash add-user.sh
```

بعد از اجرا، **۲ کانفیگ JSON** نمایش داده می‌شود (iOS و Android). کانفیگ **Android** را کپی کنید.

<img width="1536" height="1357" alt="Screenshot 2026-01-29 102803" src="https://github.com/user-attachments/assets/e3088f63-c1af-412a-adc0-a8ee458b7947" />


---

## مرحله ۳: اضافه کردن کانفیگ در NetMod

1. اپلیکیشن **NetMod** را باز کنید

2. روی **Add** کلیک کنید

![Click Add](https://github.com/user-attachments/assets/ac324b74-daec-4182-85b1-ea746e8c4401)

3. گزینه **JSON Config** را انتخاب کنید

![Select JSON Config](https://github.com/user-attachments/assets/b9874cfd-8168-4fa9-91ee-b39b1d593316)

4. روی **Open Editor** کلیک کنید

![Open Editor](https://github.com/user-attachments/assets/9fb5852d-6007-4762-9d52-9fbf9cac801c)

5. کانفیگ JSON مربوط به Android را paste کنید، تیک بزنید و ذخیره کنید

![Paste JSON and save](https://github.com/user-attachments/assets/f17d62bc-ded1-40c7-b214-50913316ae48)

6. کانفیگ ذخیره شده را انتخاب کنید و **Connect** بزنید

![Select and connect](https://github.com/user-attachments/assets/7640d0dd-d860-4a61-85ba-a9c602281b84)

---

## نکات مهم

- فیلد **inbounds** در JSON نباید خالی باشد. بدون آن، NetMod کانفیگ را قبول نمی‌کند
- این روش از گواهی TLS معتبر (Let's Encrypt) استفاده می‌کند
- ترافیک شما دقیقا شبیه یک وبسایت HTTPS معمولی است
- UUID و کانفیگ را ایمن نگه دارید
- اگر همان نام کاربری را دوباره اضافه کنید، همان کانفیگ برگردانده می‌شود

---
