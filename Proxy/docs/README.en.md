# Complete, Secure, and Professional Proxy Solution

For Ubuntu Servers – Suitable for Regular and Professional Users

English Guide
=====================================================================

## What is this project and what is it for?

This project allows you to turn your VPS server into a **private proxy** that:

- Communication is **fully encrypted**
- No third-party software needed on your system
- Users only have access to the proxy (not the server itself)
- Perfect for personal, work, small team, or testing use

If you want to:
- Use the internet from a static IP
- Have a dedicated and secure proxy
- Have full control over users

This tool is built exactly for this purpose.

---

## Compatibility (What devices does it work on?)

This proxy can be used on all systems:

- iOS (NPV Tunnel app)
- Android (Net Mod / V2RayNG app)
- Windows
- Linux
- macOS

---

## Prerequisites

Before starting, you only need these:
- A VPS server with Ubuntu operating system
- Root access to the server
- Regular internet (nothing special required)

---

## How to Use This Guide

**Important:** Follow the steps in order, one by one. Complete each step before moving to the next.

---

--------------------------------------------------
Step 1: Purchase VPS Server
--------------------------------------------------

**If you already have a Linux server with Ubuntu, skip this step and go to Step 2.**

To get started, you need to get a VPS server.
Any VPS with Ubuntu operating system can be used.

**To purchase from IONOS (recommended):** [Guide to Purchasing Server from IONOS](./buy-ionos-server.en.md)

### Important notes:
- Operating system must be **Ubuntu**
- Even a cheap plan is completely sufficient
- Server location depends on your needs

After purchasing the server, get the following information from your provider's panel:
- **Server IP** (very important)
- **Username:** root
- **Initial password**

Keep this information safe.

---

--------------------------------------------------
Step 2: Connect to Server via SSH
--------------------------------------------------

For connecting to the server via SSH, refer to the complete guide:

**[Guide to Connecting to Server with SSH](./ssh-connection.en.md)**

### Summary:
```bash
ssh root@SERVER-IP
```

After connecting, continue below.

---

--------------------------------------------------
Choose Installation Method
--------------------------------------------------

### You have 7 different methods:

| Method | Difficulty | Best For | Port |
|--------|-----------|----------|------|
| **Layer 3: Basic SSH** | ⭐ Easy | Start and test | 22 |
| **Layer 4: Nginx** | ⭐⭐ Easy | Daily use | 443 |
| **Layer 6: Stunnel** | ⭐⭐⭐ Medium | High security | 443 |
| **Layer 7: V2Ray VMess** | ⭐⭐⭐⭐ Advanced | Hard censorship | 443 |
| **Layer 7: V2Ray VLESS** | ⭐⭐⭐⭐ Advanced | Hard censorship | 443 |
| **Layer 7: Real Domain (VLESS/Trojan)** | ⭐⭐⭐⭐⭐ Advanced | Best security | 443 |
| **Layer 7: Iran Optimized (gRPC)** | ⭐⭐⭐⭐⭐ Advanced | Iran DPI bypass | 443 |

---

### 📚 Complete guide for each method:

At the moment, Layer 3 appears to work more reliably than other layers in Iran.
However, the connection quality and internet bandwidth (speed) mainly depend on the hosting country’s network capacity and international connectivity, rather than the tunneling layer itself.

- [Layer 3: Basic SSH](./layer3-basic/README.en.md) - Simplest method to get started
- [Layer 4: Nginx](./layer4-nginx/README.en.md) - Recommended for daily use
- [Layer 6: Stunnel](./layer6-stunnel/README.en.md) - Double security with TLS wrapper
- [Layer 7: V2Ray VMess](./layer7-v2ray-vmess/README.en.md) - Advanced obfuscation
- [Layer 7: V2Ray VLESS](./layer7-v2ray-vless/README.en.md) - Modern and lightweight protocol
- [Layer 7: Real Domain + TLS](./layer7-real-domain/README.en.md) - Best overall method
- [Layer 7: Iran Optimized (gRPC)](./layer7-iran-optimized/README.en.md) - Tuned for Iranian ISP DPI/throttling

---

--------------------------------------------------
Uninstall (if needed)
--------------------------------------------------

If you want to completely remove the proxy:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/uninstall.sh -o uninstall.sh && bash uninstall.sh
```

**Note:** If you have reset the server or are reinstalling, run this command on your computer to remove the old SSH key:

```bash
ssh-keygen -R SERVER-IP
```

Example:
```bash
ssh-keygen -R 87.106.68.203
```

---

--------------------------------------------------
Very Important Security Notes
--------------------------------------------------

- All outgoing traffic is logged under your IP name
- Responsibility for use lies with the server owner
- Use a strong password
- This tool is designed for personal and controlled use

---
