# Layer 3: Basic SSH - Simplest Method

> **⭐ Easiest way to start**
> Port 22 - Great for testing and learning

[← Back to main guide](../README.en.md)

---

## What is this method?

The simplest proxy method using standard SSH on port 22.

**Advantages:**
- Very easy installation (5 minutes)
- No complex configuration needed
- Standard SSH encryption

**Limitations:**
- Port 22 may be filtered in some networks
- Not suitable for hard censorship

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
Step 3: Install Layer 3
--------------------------------------------------

Run this command:

```bash
curl -fsSL https://raw.githubusercontent.com/keyhan-azarjoo/Proxy/main/layer3-basic/install.sh -o install.sh && bash install.sh
```

Installation runs automatically.

---

--------------------------------------------------
Step 3.1: Access the Management Panel
--------------------------------------------------

After the installation is complete, open the following URL in your browser:

```
https://server-IP:8443
```

> **Note:** Replace `server-IP` with your actual server IP address.

![Management Panel](https://github.com/user-attachments/assets/a038a374-91ff-44e4-803b-455d732f3ed2)

---

### SSL Certificate Warning

Your browser will show a security warning. This is because we use a self-signed SSL certificate, and it is completely safe.

Click **Advanced**:

![SSL Warning](https://github.com/user-attachments/assets/4a18b53a-eaaa-4e51-b9c7-d21812eb855e)

Then click **Proceed to IP (unsafe)**:

> We use a self-signed SSL certificate so the panel works over HTTPS (without needing to purchase a certificate). Because of this, the browser does not find this site in its trusted certificate list.

![Proceed](https://github.com/user-attachments/assets/4f763fcc-5bb8-4c0a-b96f-e09285652788)

---

### Log In to the Panel

The login page will appear. You can change the language to Persian if you prefer.

Enter the username and password of your server (the credentials you received from IONOS):

![Login Page](https://github.com/user-attachments/assets/30ac2bde-59bc-4379-af1d-5c8846485210)

---

### Management Panel

This is your server management panel. You can add or delete users from here:

![Management Panel](https://github.com/user-attachments/assets/5262345c-7f4d-47d4-bc38-34dff8dd7111)

The panel offers different methods for different layers. Currently, only the first 3 layers work in Iran, and it is recommended to use the first one as it performs better:

![Different Methods](https://github.com/user-attachments/assets/33037acb-db2d-442b-b1e0-eef5177ed1d1)

### **Alternative method:** You can also use the commands below to add or delete users (see Steps 4 through 6).

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
- Port: **22**
- Username: Your username
- Password: Your password

![Fill SSH Info](https://github.com/user-attachments/assets/b232e341-4d59-4f2b-804d-d923f31a03e6)

Click **Save** then **Connect**.

✅ Connected successfully!

---

## Android Usage (Net Mod)

Step by step:

![Android Step 1](https://github.com/user-attachments/assets/72e7e385-83cf-4139-98df-4d41a5097916)

![Android Step 2](https://github.com/user-attachments/assets/c308415b-1484-448d-8c9d-69c5c97aab2d)

![Android Step 3](https://github.com/user-attachments/assets/86f3cea3-3d09-48bd-93f0-7824ffa10cb1)

![Android Step 4](https://github.com/user-attachments/assets/9062ea58-d7bc-400c-92bb-0b00a830757a)

![Android Step 5](https://github.com/user-attachments/assets/2847c64f-7061-4860-96b8-c131cc672031)

**Android settings:**
- Host: Server IP
- Port: **22**
- Username: Your username
- Password: Your password

---

## Important Notes

- Port 22 may be filtered in some networks
- For daily use, Layer 4 (Nginx) is better
- This method is great for learning and testing

---

**Made with ❤️ for internet freedom**

