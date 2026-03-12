# Guide to Connecting to Server with SSH

[← Back to main guide](./README.en.md)

---

## What is SSH?

SSH (Secure Shell) is a secure protocol for remote connection to a server. With SSH, you can execute commands on the server.

---

--------------------------------------------------
Step 1: Install Appropriate Terminal
--------------------------------------------------

### Windows:
- **PowerShell** (pre-installed)
- Or [Windows Terminal](https://apps.microsoft.com/store/detail/windows-terminal/9N0DX20HK701) from Microsoft Store

### Mac:
- **Terminal** (pre-installed)
- In Applications → Utilities → Terminal

### Linux:
- **Terminal** (pre-installed)

---

--------------------------------------------------
Step 2: Connect to Server
--------------------------------------------------

Open the terminal and enter the following command:

```bash
ssh root@IP_ADDRESS
```

Replace `IP_ADDRESS` with your server's IP address.

**Example:**
```bash
ssh root@185.234.72.101
```

---

--------------------------------------------------
Step 3: Confirm Initial Connection
--------------------------------------------------

On the first connection, you will see a message similar to this:

```
The authenticity of host '185.234.72.101' can't be established.
ED25519 key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxx
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

**Type:** `yes` and press Enter.

---

--------------------------------------------------
Step 4: Enter Password
--------------------------------------------------

Enter the server password.

**Note:** When typing the password, nothing is displayed. This is normal. Just type and press Enter.

If everything is correct, you will enter the server and see something like this:

```
root@vps12345:~#
```

**Congratulations!** You are now connected to the server.

---

## Troubleshooting Common Issues

### "Connection refused" Error
- Server is not running or SSH is not enabled
- IP is incorrect

### "Connection timed out" Error
- Firewall is blocking the connection
- IP is incorrect

### "Permission denied" Error
- Password is incorrect
- Username is incorrect

### "Host key verification failed" or "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED" Error

This error occurs when you have reset the server or reinstalled it.

**Solution:** Run this command on your computer:

```bash
ssh-keygen -R SERVER-IP
```

Example:
```bash
ssh-keygen -R 87.106.68.203
```

Then connect with SSH again.

---

## Next Step

Now that you are connected to the server, return to the main guide and choose your preferred installation method:

- [← Back to main guide](./README.en.md)

Or go directly to your preferred installation method:
- [Layer 3: Basic SSH](./layer3-basic/README.en.md)
- [Layer 4: Nginx (Recommended)](./layer4-nginx/README.en.md)
- [Layer 6: Stunnel](./layer6-stunnel/README.en.md)
- [Layer 7: V2Ray VMess](./layer7-v2ray-vmess/README.en.md)
- [Layer 7: Real Domain](./layer7-real-domain/README.en.md)

---

**Made with love for internet freedom**

