# iOS Connection Guide - Layer 7 (V2Ray VLESS)

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
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vless/add-user.sh -o add-user.sh && bash add-user.sh
```

After running, **2 JSON configs** will be displayed (iOS and Android). Copy the **iOS** config.

<img width="597" alt="add-user output" src="https://github.com/user-attachments/assets/72e160d2-a380-4f5e-befb-9a7e8e071b7c" />

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

![photo_6042023025965731191_y](https://github.com/user-attachments/assets/869573b5-834e-42ad-bfcd-356049ce3613)

7. Select the saved config and tap **Connect**

![Select and connect](https://github.com/user-attachments/assets/e8f8dc31-def6-4efc-9259-bee71bd73a81)

---

## Important Notes

- Keep UUID and config secure
- If you add the same username again, the same config will be returned
- Since the certificate is self-signed, Allow Insecure is enabled in the config

---

**Made with love for internet freedom**

