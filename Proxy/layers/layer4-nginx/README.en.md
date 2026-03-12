# Layer 4: Nginx - Recommended for Daily Use

> **⭐⭐ Best choice for daily usage**
> Port 443 (HTTPS) - Harder to filter

[← Back to main guide](../README.en.md)

---

## What is this method?

Method that runs SSH over port 443 (same as HTTPS).
This port is open in most networks.

**Advantages:**
- Port 443 is almost always open
- Looks like regular HTTPS traffic
- Hard to filter
- Still easy to install

**Compared to Layer 3:**
- Better security
- Harder to block
- Similar speed

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
Step 3: Install Layer 4 (Nginx)
--------------------------------------------------

Run this command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer4-nginx/install.sh -o install.sh && bash install.sh
```

Installation runs automatically.
Nginx will be configured on port 443.

---

--------------------------------------------------
Step 4: Add User
--------------------------------------------------

Create a user for each person:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/add-user.sh -o add-user.sh && bash add-user.sh
```

Enter username and password.

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
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/common/delete-user.sh -o delete-user.sh && bash delete-user.sh username
```

---

## iOS Usage (NPV Tunnel)

### Step 1: Install App

Go to App Store and search:
**NPV Tunnel**

![NPV App Store](https://github.com/user-attachments/assets/22d012dd-eea8-4bde-9146-3a0e52154a88)

---

### Step 2: Go to Config

![Config Tab](https://github.com/user-attachments/assets/2497ee34-fcb2-4575-9e42-2b930b8d0b8d)

---

### Step 3: Add Configuration

Click **+**.

![Add Config](https://github.com/user-attachments/assets/a9b01bb9-f03d-4d5e-bcf7-d920b44660a4)

Select **Add Config Manually**.

![Add Manually](https://github.com/user-attachments/assets/b87227d4-5b41-443f-8707-2a322d2c018f)

---

### Step 4: Select SSH Config

![SSH Config](https://github.com/user-attachments/assets/ac804061-e32d-423a-8387-69d25e326e27)

---

### Step 5: Enter Information

Fill in:
- SSH Host: Server IP
- Port: **443** (important!)
- Username: Your username
- Password: Your password
![photo_6039717998622346545_y](https://github.com/user-attachments/assets/d9369f78-a81d-441e-a7cc-527f1c97bfcc)



Click **Save** then **Connect**.

✅ Connected successfully!

---

## Android Usage (Net Mod)

Step by step:

![Android Step 1](https://github.com/user-attachments/assets/72e7e385-83cf-4139-98df-4d41a5097916)

![Android Step 2](https://github.com/user-attachments/assets/c308415b-1484-448d-8c9d-69c5c97aab2d)

![Android Step 3](https://github.com/user-attachments/assets/86f3cea3-3d09-48bd-93f0-7824ffa10cb1)

![photo_6039717998622346547_y](https://github.com/user-attachments/assets/e77498f0-3db3-438a-b7b3-68f958ac3a15)


![Android Step 5](https://github.com/user-attachments/assets/2847c64f-7061-4860-96b8-c131cc672031)

**Android settings:**
- Host: Server IP
- Port: **443** (important!)
- Username: Your username
- Password: Your password

---

## Important Notes

- Make sure to use port **443** (not 22)
- This method is great for daily use
- Harder to filter than Layer 3
- For more security, try Layer 6 or 7

---

**Made with ❤️ for internet freedom**

