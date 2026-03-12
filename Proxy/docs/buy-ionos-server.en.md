# Guide to Purchasing VPS Server from IONOS

[← Back to main guide](./README.en.md)

---

## Why IONOS?

IONOS is one of the reputable VPS providers in Europe that:
- Has reasonable pricing
- Provides stable servers
- Has a simple user panel

**Note:** You can use any other VPS provider, as long as the operating system is Ubuntu.

---

--------------------------------------------------
Step 1: Purchase VPS Server
--------------------------------------------------

Purchase link:
https://www.ionos.co.uk/servers/vps

![VPS Selection](https://github.com/user-attachments/assets/76de78dc-0a84-47ae-9a58-b3665330b168)

### When purchasing, pay attention to these points:
- Operating system must be **Ubuntu**
- Even a cheap plan is completely sufficient
- Server location depends on your needs

![VPS Selection](https://github.com/user-attachments/assets/823cb7b2-8a84-40fd-9caa-d85563ede9ee)

---

--------------------------------------------------
Step 2: Access IONOS Panel
--------------------------------------------------

After purchase, log in to the IONOS user panel:

https://my.ionos.co.uk/home/products
Or directly:
https://my.ionos.co.uk/server

<img width="1182" height="1388" alt="IONOS Panel" src="https://github.com/user-attachments/assets/46a45e79-c30c-44ca-b8cb-3508616e72f7" />

---

--------------------------------------------------
Step 3: Get Server Information
--------------------------------------------------

On the server page, you will see very important information:

- **Server IP** (very important)
- **Username:** root
- **Initial password**

<img width="1182" height="1387" alt="Server Info" src="https://github.com/user-attachments/assets/8cf364c3-a090-4f20-b496-ab45ed2f3659" />

**Keep this information safe.** You will need it in the next steps.

---

## Resetting / Changing Your Public IP (Free Method)

If you need a new IP address, follow these steps:

1. In the left sidebar, go to **Network → Public IP**.
2. Click **Create**.

![Create IP](https://github.com/user-attachments/assets/85b7cecb-7d75-47a8-872a-32edb35b7a9d)

3. Select your server and confirm creation.

![Confirm Create IP](https://github.com/user-attachments/assets/aab669b2-5f44-40fc-84a0-5277b3906233)
![IP Notice](https://github.com/user-attachments/assets/c010ec53-8cd7-47ce-8059-677a721c13d5)

> IONOS may display a £5 charge notice for additional IP addresses.  
> The charge only applies if you keep more than one IP for more than 3 days.  
> If you create a new IP and delete the previous one immediately, you will not be charged.

4. After the new IP is created, open your IP list.
5. Select the old IP address and delete it (ensure the new IP is already active).

![Delete Old IP](https://github.com/user-attachments/assets/5406de4c-c8d7-469e-9385-6e278539700b)

6. Go back to the **Server** page and restart the server.

![Restart Server](https://github.com/user-attachments/assets/76901ad5-ff76-4988-a0d8-89117e5e39bd)

After the restart, your server will operate with the new IP address.

---

## Reinstalling the Operating System (Full Reset)

If you want to completely reset your server and start from scratch:

1. Go to **Actions → Reinstall Image**.

![Reinstall Image](https://github.com/user-attachments/assets/ec3fec58-e90f-4216-909f-fc226aea3531)

2. Select your preferred Ubuntu version.
3. Click **Reinstall** and confirm.

![Confirm Reinstall](https://github.com/user-attachments/assets/317a6846-5717-45c9-a263-df22c524b80a)

> ⚠️ Warning:
> - This will permanently delete all data on the server.
> - All configurations will be removed.
> - New login credentials will be generated.

After the process completes, your server will be clean and ready for a fresh setup.


## Next Step

Now that you have purchased the server and have its information, return to the main guide and continue from **Step 2 (SSH Connection)**:

- [← Back to main guide](./README.en.md)

Or go directly to your preferred installation method:
- [Layer 3: Basic SSH](./layer3-basic/README.en.md)
- [Layer 4: Nginx (Recommended)](./layer4-nginx/README.en.md)
- [Layer 6: Stunnel](./layer6-stunnel/README.en.md)
- [Layer 7: V2Ray VMess](./layer7-v2ray-vmess/README.en.md)
- [Layer 7: Real Domain](./layer7-real-domain/README.en.md)

---

**Made with love for internet freedom**

