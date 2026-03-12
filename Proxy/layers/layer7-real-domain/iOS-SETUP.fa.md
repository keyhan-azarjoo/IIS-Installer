# راهنمای اتصال با iOS - لایه ۷ (دامنه واقعی + TLS)

[← بازگشت به راهنمای اصلی لایه ۷](./README.fa.md) | [← صفحه اصلی](../README.fa.md)

---

## اپلیکیشن مورد نیاز

**NPV Tunnel**

---

## مرحله ۱: نصب اپلیکیشن

وارد **App Store** شوید و جستجو کنید: **NPV Tunnel**

---

## مرحله ۲: دریافت کانفیگ JSON

روی سرور، دستور اضافه کردن کاربر را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-real-domain/add-user.sh -o add-user.sh && bash add-user.sh
```

بعد از اجرا، **۲ کانفیگ JSON** نمایش داده می‌شود (iOS و Android). کانفیگ **iOS** را کپی کنید.

<img width="1536" height="1357" alt="Screenshot 2026-01-29 102803" src="https://github.com/user-attachments/assets/e3088f63-c1af-412a-adc0-a8ee458b7947" />

---

## مرحله ۳: اضافه کردن کانفیگ در NPV Tunnel

1. اپلیکیشن **NPV Tunnel** را باز کنید

2. به صفحه **Config** بروید

![Config page](https://github.com/user-attachments/assets/60c584db-692c-4dfc-9397-51937e95c5c3)

3. روی **+** کلیک کنید

![Click plus](https://github.com/user-attachments/assets/5bcc2142-acfd-440b-bf4b-4f0111b1affd)

4. گزینه **Add Config Manually** را انتخاب کنید

![Add config manually](https://github.com/user-attachments/assets/8cff8eeb-7ecb-4d64-b57d-943b11aff82a)

5. **V2Ray Config** را انتخاب کنید

![V2Ray Config](https://github.com/user-attachments/assets/f6cb1e96-ac04-4353-8cbb-fb653bc77194)

6. کانفیگ JSON مربوط به iOS را اینجا paste کنید و روی **Save** کلیک کنید

![photo_6042023025965731205_y](https://github.com/user-attachments/assets/19214c01-ff65-4b3f-9dc8-85af09bfbe25)

7. کانفیگ ذخیره شده را انتخاب کنید و **Connect** بزنید

![Select and connect](https://github.com/user-attachments/assets/e8f8dc31-def6-4efc-9259-bee71bd73a81)

---

## نکات مهم

- این روش از گواهی TLS معتبر (Let's Encrypt) استفاده می‌کند
- ترافیک شما دقیقا شبیه یک وبسایت HTTPS معمولی است
- UUID و کانفیگ را ایمن نگه دارید
- اگر همان نام کاربری را دوباره اضافه کنید، همان کانفیگ برگردانده می‌شود

---
