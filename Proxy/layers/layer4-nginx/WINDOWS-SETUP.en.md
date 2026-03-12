# Windows Connection Guide - Layer 4 (Nginx)

[← Back to Layer 4 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method 1: Using PowerShell (Windows 10 and above)

### Step 1: Open PowerShell

Right-click Start button and select **PowerShell**.

### Step 2: Connect SSH with SOCKS Proxy

Run this command:

```powershell
ssh -D 1080 -N username@SERVER-IP -p 443
```

**Note:**
- Replace `username` with your username
- Replace `SERVER-IP` with your server IP
- Port `443` for Layer 4 (HTTPS)

Example:
```powershell
ssh -D 1080 -N myuser@185.xxx.xxx.xxx -p 443
```

Enter your password.

### Step 3: Configure Browser

#### For Firefox:
1. Settings → Network Settings
2. Manual proxy configuration
3. SOCKS Host: `127.0.0.1`
4. Port: `1080`
5. Select SOCKS v5

#### For Chrome:
Use **Proxy SwitchyOmega** extension:
1. Install from Chrome Web Store
2. New Profile → Proxy Profile
3. Protocol: SOCKS5
4. Server: `127.0.0.1`
5. Port: `1080`

✅ Connected successfully!

---

## Method 2: Using PuTTY

### Step 1: Download and Install

Download PuTTY from:
https://www.putty.org/

### Step 2: Connection Settings

1. **Host Name**: `username@SERVER-IP`
2. **Port**: `443`
3. Go to **Connection → SSH → Tunnels**
4. **Source port**: `1080`
5. **Destination**: Leave empty
6. Select **Dynamic**
7. Click **Add**
8. Return to **Session** and click **Open**

Enter your password.

### Step 3: Configure Browser

Like Method 1, configure browser to use `127.0.0.1:1080`.

---

## Important Notes

- PowerShell or PuTTY window must remain open
- Port **443** looks like HTTPS and is harder to filter
- This method is recommended for daily use

---

**Made with ❤️ for internet freedom**

