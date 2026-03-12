# Layer 7: Iran Optimized (gRPC) - Tuned for Iranian ISPs

> **⭐⭐⭐⭐⭐ Best for Iran (tuned for DPI/throttling bypass)**
> Port 443 - VLESS + gRPC + Real TLS + Iran-specific optimizations

[← Back to main guide](../README.en.md)

---

## What is this method?

This method is based on **Layer 7: Real Domain** but with additional optimizations specifically designed to bypass Iranian ISP DPI (Deep Packet Inspection) and throttling.

**Iran-specific tuning:**
- gRPC keepalive pings (prevents idle connection kills by ISPs)
- TLS 1.2-1.3 + h2 ALPN (Chrome/Android fingerprint normalization)
- Small buffers (16KB, survives packet loss)
- Short idle timeouts (avoids flow analysis)
- Stats API enabled for monitoring

**Why use this over Real Domain:**
- Better stability on Iranian networks
- Survives ISP connection resets
- Optimized for high packet-loss environments
- Built-in DPI countermeasures

**Security:** ⭐⭐⭐⭐⭐
**Stealth:** ⭐⭐⭐⭐⭐
**Iran Stability:** ⭐⭐⭐⭐⭐

---

## Main Requirement: Domain

You need a domain for this method.

**Option 1: DuckDNS (free and recommended)**
- Completely free
- Easy to set up
- You get a subdomain (e.g., myproxy.duckdns.org)

**Option 2: Paid domain**
- Buy from any domain registrar
- Full control
- More professional

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
- Server IP (write this down!)
- Username: root
- Password

---

--------------------------------------------------
Step 2: Get Free Domain (DuckDNS)
--------------------------------------------------

**For full guide with screenshots:** [Guide to Getting a Free Domain from DuckDNS](../get-free-domain.en.md)

### Summary:

### Step 1: Sign up on DuckDNS

Go to: https://duckdns.org

Login with GitHub or Google.

### Step 2: Create Subdomain

Choose a name (e.g.):
```
myproxy123.duckdns.org
```

Enter your server IP in the IP box.

Copy your TOKEN (keep it safe).

---

--------------------------------------------------
Step 3: SSH Connection
--------------------------------------------------

**[Guide to Connecting to Server with SSH](../ssh-connection.en.md)**

Summary:
```bash
ssh root@SERVER-IP
```

---

--------------------------------------------------
Step 4: Install Layer 7 (Iran Optimized)
--------------------------------------------------

Run this command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-iran-optimized/install.sh -o install.sh && bash install.sh
```

**During installation you'll be asked:**
1. Your domain (e.g.: myproxy123.duckdns.org)
2. Your email (for Let's Encrypt)
3. DuckDNS token (if using a .duckdns.org domain)

The script will:
- Obtain valid TLS certificate
- Set up VLESS gRPC on port 443
- Apply Iran-specific DPI countermeasures
- Enable gRPC keepalive tuning
- Enable stats API for monitoring

---

--------------------------------------------------
Step 5: Add User
--------------------------------------------------

Create a user for each person. After adding a user, **2 JSON configs** will be displayed:
- iOS config (for NPV Tunnel)
- Android config (for NetMod)

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-iran-optimized/add-user.sh -o add-user.sh && bash add-user.sh
```

**Note:** If you add the same username again, the same config will be returned.

---

--------------------------------------------------
Step 6: Monitor Users
--------------------------------------------------

To view connected users and server status:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/view-users.sh -o view-users.sh && bash view-users.sh
```

---

--------------------------------------------------
Step 7: Delete User (if needed)
--------------------------------------------------

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer7-iran-optimized/delete-user.sh -o delete-user.sh && bash delete-user.sh username
```

After deletion, the user can no longer connect with their previous config.

---

## iOS Usage

[iOS Connection Guide (NPV Tunnel)](../layer7-real-domain/iOS-SETUP.en.md)

---

## Android Usage

[Android Connection Guide (NetMod)](../layer7-real-domain/ANDROID-SETUP.en.md)

---

## Auto DNS Update (optional)

If server IP changes, run this on server:

```bash
curl "https://www.duckdns.org/update?domains=myproxy123&token=YOUR_TOKEN&ip="
```

For automatic update every 5 minutes:

```bash
crontab -e
```

Add this line:
```
*/5 * * * * curl -fs "https://www.duckdns.org/update?domains=myproxy123&token=YOUR_TOKEN&ip=" >/dev/null
```

---

## Important Notes

- This is the **best method for users in Iran**
- Passes DPI, SNI filtering, and Active Probing
- Has valid browser certificate
- gRPC keepalive prevents idle disconnections
- TLS fingerprint matches Chrome/Android browsers
- For iOS: NPV Tunnel
- For Android: NetMod / V2RayNG
- Keep domain and UUID secure

---

## Final Summary

| Question | Answer |
|----------|--------|
| Fully free? | Yes (with DuckDNS) |
| Hard to block? | Very hard |
| Suitable for Iran? | Best option |
| Need domain? | Yes (DuckDNS is free) |
| Survives DPI? | Yes |

---
