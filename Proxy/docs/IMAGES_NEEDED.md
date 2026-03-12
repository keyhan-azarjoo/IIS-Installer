# 📸 راهنمای تصاویر مورد نیاز / Images Needed Guide

این فایل لیست تمام تصاویری که باید برای کامل کردن مستندات تهیه شوند را نشان می‌دهد.

This file lists all images needed to complete the documentation.

---

## 📁 ساختار پوشه تصاویر / Images Folder Structure

```
ssh-socks-proxy/
├── images/
│   ├── vps-providers/          # تصاویر خرید سرور
│   │   ├── digitalocean-1.png
│   │   ├── digitalocean-2.png
│   │   ├── vultr-1.png
│   │   ├── vultr-2.png
│   │   └── hetzner-1.png
│   ├── ios/                    # تصاویر iOS
│   │   ├── npv-tunnel-1.png
│   │   ├── npv-tunnel-2.png
│   │   ├── npv-tunnel-3.png
│   │   └── npv-tunnel-4.png
│   ├── android/                # تصاویر Android
│   │   ├── netmod-1.png
│   │   ├── netmod-2.png
│   │   ├── v2rayng-1.png
│   │   └── v2rayng-2.png
│   ├── windows/                # تصاویر Windows
│   │   ├── putty-1.png
│   │   ├── putty-2.png
│   │   └── v2rayn-1.png
│   └── macos/                  # تصاویر macOS
│       ├── terminal-1.png
│       └── v2rayx-1.png
```

---

## 1️⃣ تصاویر خرید سرور VPS / VPS Purchase Screenshots

### DigitalOcean

**digitalocean-1.png** - صفحه اصلی و ثبت‌نام
- نمای صفحه اول DigitalOcean
- دکمه "Sign up" مشخص شده
- URL: https://www.digitalocean.com/

**digitalocean-2.png** - انتخاب Droplet
- صفحه ایجاد Droplet
- انتخاب Ubuntu 22.04/24.04
- انتخاب پلن $4-6/month
- مشخص کردن گزینه‌های مهم

**digitalocean-3.png** - تکمیل خرید
- اطلاعات سرور (IP address)
- دکمه "Access Console"
- نمای نهایی

### Vultr

**vultr-1.png** - صفحه اصلی
- صفحه اصلی Vultr
- دکمه "Sign Up"
- URL: https://www.vultr.com/

**vultr-2.png** - Deploy Server
- انتخاب Ubuntu
- انتخاب پلن $3.50-5/month
- مشخص کردن location

**vultr-3.png** - Server Information
- IP سرور
- اطلاعات دسترسی
- دکمه Console

### Hetzner

**hetzner-1.png** - صفحه اصلی
- URL: https://www.hetzner.com/
- دکمه ثبت‌نام

**hetzner-2.png** - Create Server
- انتخاب Ubuntu
- انتخاب پلن
- Location selection

---

## 2️⃣ تصاویر iOS (NPV Tunnel)

### نصب و راه‌اندازی پایه (لایه 3 و 4)

**ios-npv-install.png** - App Store
- صفحه NPV Tunnel در App Store
- دکمه "Get" یا نصب
- آیکون اپلیکیشن

**ios-npv-home.png** - صفحه اصلی اپ
- صفحه اول NPV Tunnel
- دکمه "+" برای افزودن
- لیست اتصالات خالی

**ios-npv-add-ssh.png** - انتخاب نوع
- منوی انتخاب نوع اتصال
- گزینه "SSH" مشخص شده
- سایر گزینه‌ها (SSH+SSL، V2Ray)

**ios-npv-config-layer3.png** - تنظیمات لایه 3
- فرم تنظیمات SSH
- فیلدها:
  - Name: "My Proxy"
  - Server: "1.2.3.4"
  - Port: "22"
  - Username: "myuser"
  - Password: "********"
- دکمه Save

**ios-npv-config-layer4.png** - تنظیمات لایه 4
- مشابه بالا اما:
  - Port: "443"
- بقیه تنظیمات مشابه

**ios-npv-connected.png** - وضعیت متصل
- نشان دادن VPN icon در status bar
- دکمه "Disconnect"
- وضعیت: "Connected"
- آمار: Upload/Download

### لایه 6 (Stunnel)

**ios-npv-add-ssl.png** - انتخاب SSH+SSL
- منوی انتخاب
- "SSH + SSL" مشخص شده

**ios-npv-config-layer6.png** - تنظیمات لایه 6
- Server: IP
- Port: 443
- SSL: ON (مشخص شده)
- Username/Password

### لایه 7 (V2Ray)

**ios-npv-import-json.png** - Import از Clipboard
- دکمه "Import from Clipboard"
- پیام تأیید

**ios-npv-v2ray-config.png** - پیکربندی V2Ray
- نمایش تنظیمات V2Ray
- Protocol: VMess
- UUID visible
- Port: 443

---

## 3️⃣ تصاویر Android

### Net Mod (لایه 3، 4)

**android-netmod-install.png** - Google Play
- صفحه Net Mod در Play Store
- دکمه Install
- آیکون اپ

**android-netmod-home.png** - صفحه اصلی
- منوی اصلی Net Mod
- گزینه "SSH Tunnel" مشخص شده

**android-netmod-config.png** - تنظیمات SSH
- Server: IP
- Port: 22 یا 443
- Username
- Password
- دکمه Connect

**android-netmod-connected.png** - متصل شده
- VPN key icon در notification
- وضعیت Connected
- آمار

### V2RayNG (لایه 7)

**android-v2rayng-install.png** - Play Store یا GitHub
- صفحه دانلود V2RayNG
- دکمه Install

**android-v2rayng-home.png** - صفحه اصلی
- لیست سرورها (خالی)
- دکمه "+" برای افزودن

**android-v2rayng-import.png** - Import Config
- منوی Import
- "Import config from clipboard" مشخص شده

**android-v2rayng-config.png** - پیکربندی VMess
- نمایش تنظیمات
- Address, Port, UUID
- Protocol: VMess

**android-v2rayng-connected.png** - متصل
- سرور فعال (تیک سبز)
- دکمه Connect
- آمار سرعت

---

## 4️⃣ تصاویر Windows

### PuTTY (SSH)

**windows-putty-download.png** - صفحه دانلود
- https://www.putty.org/
- لینک دانلود مشخص شده

**windows-putty-session.png** - تنظیمات Session
- Host Name: IP
- Port: 22 یا 443
- Connection type: SSH
- دکمه Save/Open

**windows-putty-tunnels.png** - تنظیمات Tunnels
- Connection → SSH → Tunnels
- Source port: 1080
- Type: Dynamic (انتخاب شده)
- دکمه Add

**windows-putty-connected.png** - متصل شده
- پنجره Terminal باز
- لاگین موفق
- پیام خوش‌آمدگویی

### V2RayN (V2Ray)

**windows-v2rayn-download.png** - صفحه GitHub
- Release page
- فایل exe مشخص شده

**windows-v2rayn-interface.png** - رابط کاربری
- پنجره اصلی V2RayN
- لیست سرورها
- دکمه‌های Add/Import

**windows-v2rayn-add-vmess.png** - افزودن سرور VMess
- Servers → Add VMess server
- فرم تنظیمات
- فیلدها پر شده

**windows-v2rayn-connected.png** - متصل
- System Proxy: Enabled
- سرور فعال مشخص شده
- آمار در system tray

---

## 5️⃣ تصاویر macOS

### Terminal (SSH)

**macos-terminal-open.png** - باز کردن Terminal
- Spotlight search با "terminal"
- Terminal.app مشخص شده

**macos-terminal-ssh.png** - دستور SSH
- دستور ssh تایپ شده
- اتصال موفق
- پروکسی فعال

### Browser Configuration

**macos-firefox-proxy.png** - تنظیمات Firefox
- Settings → Network Settings
- Manual proxy configuration
- SOCKS Host: 127.0.0.1
- Port: 1080
- SOCKS v5 و Proxy DNS تیک خورده

**macos-system-proxy.png** - System Proxy Settings
- System Preferences → Network
- Advanced → Proxies
- SOCKS Proxy enabled
- 127.0.0.1:1080

---

## 6️⃣ تصاویر عمومی

### Server Connection

**server-ssh-connect.png** - اتصال اولیه به سرور
- دستور ssh root@IP
- پیام fingerprint
- ورود موفق

**server-install-running.png** - در حال نصب
- اسکریپت نصب در حال اجرا
- پیام‌های پیشرفت
- نوار پیشرفت (اگر وجود دارد)

**server-install-complete.png** - نصب کامل شد
- پیام‌های ✓ Completed
- اطلاعات اتصال نمایش داده شده
- دستورات بعدی

### Status Checking

**server-status-check.png** - بررسی وضعیت
- خروجی `bash status.sh`
- سرویس‌ها Running
- اطلاعات سیستم

**server-user-list.png** - لیست کاربران
- خروجی `bash list-users.sh`
- لیست کاربران فعال
- اطلاعات هر کاربر

---

## 📝 دستورالعمل‌های عکس‌برداری / Screenshot Guidelines

### کیفیت / Quality
- Resolution: حداقل 1920x1080 برای Desktop، 1080x1920 برای Mobile
- Format: PNG (برای وضوح بهتر)
- فشرده‌سازی: متوسط (تعادل بین سایز و کیفیت)

### محتوا / Content
- ✅ فقط قسمت مرتبط را نشان دهید
- ✅ اطلاعات حساس را سانسور کنید (IP واقعی، رمز عبور)
- ✅ از IP و اطلاعات مثال استفاده کنید
- ✅ رابط کاربری تمیز و واضح
- ❌ اطلاعات شخصی واقعی
- ❌ تصاویر بیش از حد بزرگ

### ویرایش / Editing
- از فلش‌ها و دایره‌ها برای مشخص کردن قسمت‌های مهم استفاده کنید
- رنگ قرمز یا نارنجی برای نکات مهم
- متن توضیحی روی تصویر (اختیاری)
- از abuse اطلاعات واقعی جلوگیری کنید

### نام‌گذاری فایل‌ها / File Naming
- از نام‌های توصیفی استفاده کنید
- lowercase با dash: `ios-npv-config-layer3.png`
- شماره‌گذاری برای سری تصاویر: `step-1.png`, `step-2.png`

---

## 🔄 به‌روزرسانی READMEs / Updating READMEs

بعد از تهیه تصاویر، در READMEs از این فرمت استفاده کنید:

```markdown
![توضیحات فارسی](../images/folder/filename.png)
*توضیحات تصویر به فارسی*

![English Description](../images/folder/filename.png)
*Image description in English*
```

مثال:
```markdown
![نصب NPV Tunnel](../images/ios/npv-install.png)
*صفحه نصب NPV Tunnel در App Store*

![NPV Tunnel Installation](../images/ios/npv-install.png)
*NPV Tunnel installation page in App Store*
```

---

## ✅ Checklist

پس از تهیه هر دسته تصاویر، تیک بزنید:

- [ ] VPS Providers (3 providers × 2-3 images = ~8 images)
- [ ] iOS NPV Tunnel (Layer 3/4/6/7 = ~10 images)
- [ ] Android Net Mod (Layer 3/4 = ~5 images)
- [ ] Android V2RayNG (Layer 7 = ~5 images)
- [ ] Windows PuTTY (~4 images)
- [ ] Windows V2RayN (~4 images)
- [ ] macOS Terminal (~3 images)
- [ ] Browser Configuration (~3 images)
- [ ] Server Setup (~5 images)
- [ ] Management Commands (~3 images)

**مجموع تقریبی: 50-60 تصویر**

---

## 💡 نکات اضافی / Additional Tips

1. **از Demo Account استفاده کنید**: برای اپلیکیشن‌ها از حساب تست استفاده کنید
2. **Mode تاریک/روشن**: ترجیحاً mode روشن برای وضوح بهتر
3. **Zoom مناسب**: اطمینان حاصل کنید متن‌ها خوانا هستند
4. **سری تصاویر**: برای فرآیندهای چند مرحله‌ای، همه مراحل را نشان دهید
5. **Before/After**: تصاویر قبل و بعد از تنظیمات مفید است

---

**نکته**: این تصاویر یکبار تهیه می‌شوند و برای همه لایه‌ها قابل استفاده مجدد هستند!
