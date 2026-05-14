============================
mcp setup "PPOB adnanpay"
1. Configure MCP
Set up your MCP client.
Details:
Add this configuration to ~/.config/opencode/opencode.json:
After adding the configuration, run the following command to authenticate:
This will open your browser to complete the OAuth authentication flow.
Need help?View OpenCode docs
Code:
File: Code
```
1{
2  "$schema": "https://opencode.ai/config.json",
3  "mcp": {
4    "supabase": {
5      "type": "remote",
6      "url": "https://mcp.supabase.com/mcp?project_ref=wprbrqmimwwukrhuawms",
7      "enabled": true
8    }
9  }
10}
```

File: Code
```
opencode mcp auth supabase
```

2. Install Agent Skills (Optional)
Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
Details:
npx skills add supabase/agent-skills
Code:
File: Code
```
npx skills add supabase/agent-skills
```





SUPABASE

https://wprbrqmimwwukrhuawms.supabase.co
sb_publishable_JJvv3WSbG2zfVU_Ua7_Utg_zhyqxWPE

postgresql://postgres:[YOUR-PASSWORD]@db.wprbrqmimwwukrhuawms.supabase.co:5432/postgres
supabase login
supabase init
supabase link --project-ref wprbrqmimwwukrhuawms


service_role
secret
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcmJycW1pbXd3dWtyaHVhd21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NTg3MywiZXhwIjoyMDkyMzQxODczfQ.ttx6S4Yr9p0KXl-eZ9Gg5IgAC8X0qRqadOiCYx1uOFc
This key has the ability to bypass Row Level Security. Never share it publicly. If leaked, generate a new JWT secret immediately. Prefer using Secret API keys instead.

Publishable key
This key is safe to use in a browser if you have enabled Row Level Security (RLS) for your tables and configured policies.


New publishable key
Name	API Key	
default
No description
sb_publishable_JJvv3WSbG2zfVU_Ua7_Utg_zhyqxWPE


Publishable keys can be safely shared publicly

Secret keys
These API keys allow privileged access to your project's APIs. Use in servers, functions, workers or other backend components of your application.



New secret key
Name	API Key	
default
No description
sb_secret_nQgll
Z_CcKvL-bc3RKJD1A_1q0Dr1Ra


 
NEXT_PUBLIC_SUPABASE_URL=https://wprbrqmimwwukrhuawms.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_JJvv3WSbG2zfVU_Ua7_Utg_zhyqxWPE



=========================================
DIGIFLAZ
Pengaturan Koneksi Edit Koneksi API
docs api : https://developer.digiflazz.com/api/
Development
Production
Pengaturan
Webhook
Keamanan Data
Demi keamanan akun Anda, Mohon tidak memberikan informasi Production Key kepada pihak lain .

Development Mode
Koneksi API Anda masih dalam development / test, silahkan ubah ke production untuk dapat bertransaksi. Pastikan juga Anda sudah memiliki Production Key.

Informasi Pengguna

Username
racufig5E1rg
 
Development Key
dev-33b28300-8287-11ec-adb2-692ea50f5ef5
 
Production Key
Whitelist IP

Lebih dari 1 IP Statis?
Pisahkan setiap IP dengan koma (,) Contoh: 192.1.1.1,192.1.1.2

Development IP
147.139.174.214
Production IP
147.139.174.214



===================================
============================

midtrans
Midtrans
Midtrans provides API keys for online payment integration and offers a user-friendly template and customizable interface that easy to implement.
API Keys
Merchant ID
G909085052

Client Key
SB-Mid-client-1MSPDrIDg0a71w-h

Server Key
SB-Mid-server-qJvT62BTwM7X169rmYTew6dK

https://docs.midtrans.com/reference/credential-exchange-copy#example-public-key-generation
