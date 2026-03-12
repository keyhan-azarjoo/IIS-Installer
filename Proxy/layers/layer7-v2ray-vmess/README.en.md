# Layer 7: V2Ray VMess - Advanced Obfuscation

> **⭐⭐⭐⭐ For hard censorship**
> Port 443 - VMess protocol with WebSocket

[← Back to main guide](../README.en.md)

---

## What is this method?

V2Ray with VMess protocol - an advanced protocol that fully obfuscates traffic.
Uses WebSocket to look exactly like normal web traffic.

**Advantages:**
- Very advanced obfuscation
- Passes hard censorship
- Looks like real web traffic
- Powerful VMess protocol

**Compared to previous layers:**
- Hardest to detect
- Best for hard censorship environments
- More complex installation and configuration
- Requires V2Ray client

---

--------------------------------------------------
Step 1: Purchase VPS Server
--------------------------------------------------

**If you already have a Linux server with Ubuntu, skip this step and go to Step 2.**

**To purchase from IONOS (recommended):** [Guide to Purchasing Server from IONOS](../buy-ionos-server.en.md)

### Purchase notes:
- Operating system: **Ubuntu**
- Cheap plan is sufficient
- Location is your choice

**Required information from server:**
- Server IP
- Username: root
- Password

---

--------------------------------------------------
Step 2: SSH Connection
--------------------------------------------------

**[Guide to Connecting to Server with SSH](../ssh-connection.en.md)**

Summary:
```bash
ssh root@SERVER-IP
```

---

--------------------------------------------------
Step 3: Install Layer 7 (V2Ray VMess)
--------------------------------------------------

Run this command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vmess/install.sh -o install.sh && bash install.sh
```

Installation runs automatically.
V2Ray with VMess will be configured on port 443.

---

--------------------------------------------------
Step 4: Add User
--------------------------------------------------

Create a user for each person. After adding a user, **2 JSON configs** will be displayed:
- iOS config (for NPV Tunnel)
- Android config (for NetMod)

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vmess/add-user.sh -o add-user.sh && bash add-user.sh
```

**Note:** If you add the same username again, the same config will be returned.

---

--------------------------------------------------
Step 5: Monitor Users
--------------------------------------------------

To view connected users and server status:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/view-users.sh -o view-users.sh && bash view-users.sh
```

---

--------------------------------------------------
Step 6: Delete User (if needed)
--------------------------------------------------

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-v2ray-vmess/delete-user.sh -o delete-user.sh && bash delete-user.sh username
```

After deletion, the user can no longer connect with their previous config.

---

## iOS Usage

[iOS Connection Guide (NPV Tunnel)](./iOS-SETUP.md)

---

## Android Usage

[Android Connection Guide (NetMod)](./ANDROID-SETUP.md)

---

## Important Notes

- This method requires V2Ray client (not SSH)
- For iOS: NPV Tunnel
- For Android: NetMod
- Best method for hard censorship
- Keep UUID and link secure

---

**Made with ❤️ for internet freedom**

