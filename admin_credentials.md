# PakVerify — Admin Login Credentials Reference

> **All 15 accounts have been created/updated in the database.**  
> Run `python backend/create_admins.py` again at any time to reset passwords.

---

## Super Admin Credentials (All Provinces)

| Province | Name | CNIC | Password | Email |
|---|---|---|---|---|
| **Punjab** | Tahir Raza | `35202-2222222-2` | `Admin@Punjab123` | admin.punjab@pakverify.gov.pk |
| **Sindh** | Shahid Ali | `42101-1111111-1` | `Admin@Sindh123` | admin.sindh@pakverify.gov.pk |
| **KPK** | Zameer Khan | `17301-3333333-3` | `Admin@KPK123` | admin.kpk@pakverify.gov.pk |
| **Balochistan** | Barkat Mengal | `65401-5555555-5` | `Admin@Balo123` | admin.balochistan@pakverify.gov.pk |
| **ICT (Islamabad)** | Rashid Ahmed | `61101-7777777-7` | `Admin@ICT123` | admin.ict@pakverify.gov.pk |
| **Gilgit-Baltistan** | Zulqarnain Mir | `71401-4444444-4` | `Admin@GB123` | admin.gb@pakverify.gov.pk |
| **AJK** | Sardar Aqeel Ahmed | `13302-8888888-8` | `Admin@AJK123` | admin.ajk@pakverify.gov.pk |

---

## Police Staff Credentials

| Province | Name | CNIC | Password | Email |
|---|---|---|---|---|
| **Punjab** | Inspector Usman Tariq | `35202-6666666-6` | `Staff@Punjab123` | staff.punjab@pakverify.gov.pk |
| **Sindh** | Inspector Asam Khan | `42101-5555555-5` | `Staff@Sindh123` | staff.sindh@pakverify.gov.pk |
| **KPK** | Inspector Haroon Yusuf | `17301-9999999-9` | `Staff@KPK123` | staff.kpk@pakverify.gov.pk |
| **Balochistan** | Inspector Siraj Baloch | `65401-6666666-6` | `Staff@Balo123` | staff.balochistan@pakverify.gov.pk |
| **ICT** | Inspector Farhan Malik | `61101-2222222-2` | `Staff@ICT123` | staff.ict@pakverify.gov.pk |

---

## Police Authority Credentials

| Province | Name | CNIC | Password | Email |
|---|---|---|---|---|
| **Punjab** | SP Tariq Malik | `35202-7777777-7` | `Auth@Punjab123` | authority.punjab@pakverify.gov.pk |
| **Sindh** | SP Mian Riaz | `42101-6666666-6` | `Auth@Sindh123` | authority.sindh@pakverify.gov.pk |
| **KPK** | DSP Karan Wali | `17301-4444444-4` | `Auth@KPK123` | authority.kpk@pakverify.gov.pk |

---

## Login Instructions

1. Go to `/login` on the portal
2. Enter **CNIC** (with dashes, e.g. `42101-1111111-1`)
3. Enter **Password** from the table above
4. Enter the **OTP code** — use **`123456`** as the universal development bypass OTP
5. You'll be redirected to the correct dashboard for your role

> [!NOTE]
> Super Admins land on `/admin/dashboard`  
> Police Staff land on `/staff/dashboard`  
> Police Authority land on `/authority/dashboard`

> [!TIP]
> **Development OTP Bypass**: In development mode, you can always use **`123456`** as the OTP code regardless of what was generated.  
> Each fresh login attempt also generates a new OTP shown in the Django backend console.

## Refreshed Staff OTPs (as of last reset)

| Name | CNIC | Current OTP | Password |
|---|---|---|---|
| SI Asif Nawaz | `00000-0000002-0` | `707140` | See above or use `123456` |
| Inspector Asam Khan | `42101-5555555-5` | `514530` | `Staff@Sindh123` |
| Inspector Usman Tariq | `35202-6666666-6` | `104098` | `Staff@Punjab123` |
| Inspector Haroon Yusuf | `17301-9999999-9` | `524907` | `Staff@KPK123` |
| Inspector Siraj Baloch | `65401-6666666-6` | `533419` | `Staff@Balo123` |
| Inspector Farhan Malik | `61101-2222222-2` | `727625` | `Staff@ICT123` |
