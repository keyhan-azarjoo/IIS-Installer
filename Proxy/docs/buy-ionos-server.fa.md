# راهنمای خرید سرور VPS از IONOS

[← بازگشت به راهنمای اصلی](./README.fa.md)

---

## چرا IONOS؟

IONOS یکی از ارائه‌دهندگان معتبر VPS در اروپا است که:
- قیمت مناسب دارد
- سرورهای پایدار ارائه می‌دهد
- پنل کاربری ساده دارد

**توجه:** شما می‌توانید از هر ارائه‌دهنده VPS دیگری هم استفاده کنید، فقط کافیست سیستم‌عامل Ubuntu باشد.

---

--------------------------------------------------
مرحله ۱: خرید سرور VPS
--------------------------------------------------

لینک خرید:
https://www.ionos.co.uk/servers/vps

![VPS Selection](https://github.com/user-attachments/assets/76de78dc-0a84-47ae-9a58-b3665330b168)

### هنگام خرید به این نکات توجه کنید:
- سیستم‌عامل حتماً **Ubuntu**
- پلن ارزان هم کاملاً کافی است
- لوکیشن سرور به نیاز شما بستگی دارد

![VPS Selection](https://github.com/user-attachments/assets/823cb7b2-8a84-40fd-9caa-d85563ede9ee)

---

--------------------------------------------------
مرحله ۲: دسترسی به پنل IONOS
--------------------------------------------------

پس از خرید، وارد پنل کاربری IONOS شوید:

https://my.ionos.co.uk/home/products
یا مستقیماً:
https://my.ionos.co.uk/server

<img width="1182" height="1388" alt="IONOS Panel" src="https://github.com/user-attachments/assets/46a45e79-c30c-44ca-b8cb-3508616e72f7" />

---

--------------------------------------------------
مرحله ۳: دریافت اطلاعات سرور
--------------------------------------------------

در صفحه سرور اطلاعات بسیار مهمی می‌بینید:

- **IP سرور** (خیلی مهم)
- **نام کاربری:** root
- **رمز عبور اولیه**

<img width="1182" height="1387" alt="Server Info" src="https://github.com/user-attachments/assets/8cf364c3-a090-4f20-b496-ab45ed2f3659" />

**این اطلاعات را نگه دارید.** در مراحل بعدی به آنها نیاز دارید.

---
## تغییر / ریست کردن IP عمومی (روش رایگان)

اگر نیاز دارید IP سرور را تغییر دهید، مراحل زیر را انجام دهید:

1. از منوی سمت چپ وارد **Network → Public IP** شوید.
2. روی گزینه **Create** کلیک کنید.

![Create IP](https://github.com/user-attachments/assets/85b7cecb-7d75-47a8-872a-32edb35b7a9d)

3. سرور خود را انتخاب کرده و ایجاد IP جدید را تأیید کنید.

![Confirm Create IP](https://github.com/user-attachments/assets/aab669b2-5f44-40fc-84a0-5277b3906233)
![IP Notice](https://github.com/user-attachments/assets/c010ec53-8cd7-47ce-8059-677a721c13d5)

> ممکن است IONOS پیغام هزینه ۵ پوند برای IP اضافی نمایش دهد.  
> این هزینه فقط زمانی اعمال می‌شود که بیش از ۳ روز دو IP همزمان داشته باشید.  
> اگر IP جدید را ایجاد کنید و بلافاصله IP قبلی را حذف کنید، هیچ هزینه‌ای پرداخت نخواهید کرد.

4. بعد از ایجاد IP جدید، وارد لیست IPها شوید.
5. IP قدیمی را انتخاب کرده و حذف کنید (مطمئن شوید IP جدید فعال شده است).

![Delete Old IP](https://github.com/user-attachments/assets/5406de4c-c8d7-469e-9385-6e278539700b)

6. به صفحه **Server** برگردید و سرور را Restart کنید.

![Restart Server](https://github.com/user-attachments/assets/76901ad5-ff76-4988-a0d8-89117e5e39bd)

بعد از ریستارت، سرور با IP جدید فعال خواهد شد.

---

## نصب مجدد سیستم‌عامل (ریست کامل سرور)

اگر می‌خواهید سرور را کاملاً از ابتدا و به صورت تمیز راه‌اندازی کنید:

1. وارد بخش **Actions → Reinstall Image** شوید.

![Reinstall Image](https://github.com/user-attachments/assets/ec3fec58-e90f-4216-909f-fc226aea3531)

2. نسخه Ubuntu مورد نظر را انتخاب کنید.
3. روی **Reinstall** کلیک کرده و تأیید کنید.

![Confirm Reinstall](https://github.com/user-attachments/assets/317a6846-5717-45c9-a263-df22c524b80a)

> ⚠️ هشدار:
> - تمام اطلاعات سرور به طور کامل حذف می‌شود.
> - تمام تنظیمات پاک خواهد شد.
> - اطلاعات ورود جدید برای شما ایجاد می‌شود.

پس از اتمام فرآیند، سرور شما کاملاً تمیز و آماده راه‌اندازی مجدد خواهد بود.
## مرحله بعد

اکنون که سرور را خریدید و اطلاعات آن را دارید، به راهنمای اصلی برگردید و از **مرحله ۲ (اتصال SSH)** ادامه دهید:

- [← بازگشت به راهنمای اصلی](./README.fa.md)

یا مستقیماً به روش نصب مورد نظر بروید:
- [لایه ۳: SSH پایه](./layer3-basic/README.fa.md)
- [لایه ۴: Nginx (پیشنهادی)](./layer4-nginx/README.fa.md)
- [لایه ۶: Stunnel](./layer6-stunnel/README.fa.md)
- [لایه ۷: V2Ray VMess](./layer7-v2ray-vmess/README.fa.md)
- [لایه ۷: دامنه واقعی](./layer7-real-domain/README.fa.md)

---
