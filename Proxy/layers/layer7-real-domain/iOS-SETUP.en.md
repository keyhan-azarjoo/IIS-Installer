# iOS Connection Guide - Layer 7 (Real Domain + TLS)

[← Back to Layer 7 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Required App

**NPV Tunnel**

---

## Step 1: Install App

Go to **App Store** and search: **NPV Tunnel**

---

## Step 2: Get JSON Config

On the server, run the add user command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-real-domain/add-user.sh -o add-user.sh && bash add-user.sh
```

After running, **2 JSON configs** will be displayed (iOS and Android). Copy the **iOS** config.

<img width="1536" height="1357" alt="Screenshot 2026-01-29 102803" src="https://github.com/user-attachments/assets/e3088f63-c1af-412a-adc0-a8ee458b7947" />

---

## Step 3: Add Config in NPV Tunnel

1. Open **NPV Tunnel** app

2. Go to the **Config** page

![Config page](https://github.com/user-attachments/assets/60c584db-692c-4dfc-9397-51937e95c5c3)

3. Tap the **+** button

![Click plus](https://github.com/user-attachments/assets/5bcc2142-acfd-440b-bf4b-4f0111b1affd)

4. Select **Add Config Manually**

![Add config manually](https://github.com/user-attachments/assets/8cff8eeb-7ecb-4d64-b57d-943b11aff82a)

5. Select **V2Ray Config**

![V2Ray Config](https://github.com/user-attachments/assets/f6cb1e96-ac04-4353-8cbb-fb653bc77194)

6. Paste the iOS JSON config and tap **Save**

![photo_6042023025965731205_y](https://github.com/user-attachments/assets/32ec412a-912b-427f-b4b8-aa55b8510f98)


7. Select the saved config and tap **Connect**

![Select and connect](https://github.com/user-attachments/assets/e8f8dc31-def6-4efc-9259-bee71bd73a81)

---

## Important Notes

- This method uses a valid TLS certificate (Let's Encrypt)
- Your traffic looks exactly like a normal HTTPS website
- Keep UUID and config secure
- If you add the same username again, the same config will be returned

---

**Made with love for internet freedom**

