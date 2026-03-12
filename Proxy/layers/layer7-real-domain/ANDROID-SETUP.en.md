# Android Connection Guide - Layer 7 (Real Domain + TLS)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Required App

**NetMod (Net Mod Syna)**

---

## Step 1: Install App

Search on **Google Play**: **NetMod** or **Net Mod Syna**

---

## Step 2: Get JSON Config

On the server, run the add user command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-real-domain/add-user.sh -o add-user.sh && bash add-user.sh
```

After running, **2 JSON configs** will be displayed (iOS and Android). Copy the **Android** config.

<img width="1536" height="1357" alt="Screenshot 2026-01-29 102803" src="https://github.com/user-attachments/assets/e3088f63-c1af-412a-adc0-a8ee458b7947" />


---

## Step 3: Add Config in NetMod

1. Open **NetMod** app

2. Tap **Add**

![Click Add](https://github.com/user-attachments/assets/ac324b74-daec-4182-85b1-ea746e8c4401)

3. Select **JSON Config**

![Select JSON Config](https://github.com/user-attachments/assets/b9874cfd-8168-4fa9-91ee-b39b1d593316)

4. Tap **Open Editor**

![Open Editor](https://github.com/user-attachments/assets/9fb5852d-6007-4762-9d52-9fbf9cac801c)

5. Paste the Android JSON config, tap the checkbox, and save

![Paste JSON and save](https://github.com/user-attachments/assets/f17d62bc-ded1-40c7-b214-50913316ae48)

6. Select the saved config and tap **Connect**

![Select and connect](https://github.com/user-attachments/assets/7640d0dd-d860-4a61-85ba-a9c602281b84)

---

## Important Notes

- The **inbounds** field in the JSON must not be empty. Without it, NetMod will not accept the config
- This method uses a valid TLS certificate (Let's Encrypt)
- Your traffic looks exactly like a normal HTTPS website
- Keep UUID and config secure
- If you add the same username again, the same config will be returned

---

**Made with love for internet freedom**

