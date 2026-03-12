# Windows Connection Guide - Layer 6 (Stunnel)

[← Back to Layer 6 Main Guide](./README.en.md) | [← Home](../README.en.md)

---

## Method Using PowerShell

### Step 1: Open PowerShell

Right-click Start and select **PowerShell**.

### Step 2: Connect SSH with SOCKS Proxy

```powershell
ssh -D 1080 -N username@SERVER-IP -p 443
```

**Note:** Port **443** for Layer 6 - Double security SSH + TLS

### Step 3: Configure Browser

#### Firefox:
Settings → Network Settings → Manual proxy → SOCKS5: `127.0.0.1:1080`

#### Chrome:
Use **Proxy SwitchyOmega** extension

✅ Connected successfully!

---

## Important Notes

- This method has double encryption (SSH + TLS)
- More secure than Layer 4
- PowerShell window must remain open

---

**Made with ❤️ for internet freedom**

