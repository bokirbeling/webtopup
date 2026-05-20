# E2E Payment Flow Simulation Evidence

## Steps Executed Successfully on live server (demo.hanzserver.online)

### 1. Register test user
- **Request**: POST `/api/auth/register`
  ```json
  {"email": "e2e-simulation-4@example.com", "password": "TestPassword123!"}
  ```
- **Response**: 201 Created

### 2. Login to get token
- **Request**: POST `/api/auth/login`
  ```json
  {"email": "e2e-simulation-4@example.com", "password": "TestPassword123!"}
  ```
- **Response**: 200 OK
  - **Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImUyZS1zaW11bGF0aW9uLTRAZXhhbXBsZS5jb20iLCJyb2xlIjoicGVuZ2d1bmEiLCJpYXQiOjE3NzkyNTExNzUsImV4cCI6MTc3OTI1NDc3NSwic3ViIjoiOTc2NjI1YzEtODc2YS00NWI1LWI5NzgtMjFkZDU5Mzk1ZGIzIn0.WU-4eA54iTMuVUzQs0v3xVFJjT-Hc3NT-zFnPpk3Ofk`

### 3. Catalog Search Axis Product
- **Request**: GET `/api/catalog/products?limit=10&search=pulsa`
- **Response**: Picked cheapest Axis 10.000 (SKU: `pulsa-axis-1779023214345-501`, ID: `1002`) with price `940000` (Rp 9.400).

### 4. Create Order with provider digiflazz
- **Request**: POST `/api/orders`
  ```json
  {
    "product_id": null,
    "product_code": "pulsa-axis-1779023214345-501",
    "provider": "digiflazz",
    "amount_minor": 940000,
    "customer_ref": "081234567890",
    "metadata": {}
  }
  ```
- **Response**: 201 Created
  - **order_id**: `c9577605-ac85-4cbe-88aa-2d2ae68ef143`
  - **invoice_code**: `INV-20260520-000003`
  - **status**: `pending_payment`

### 5. Initialize Midtrans Snap Payment
- **Request**: POST `/api/payments/midtrans/initialize`
  ```json
  {
    "order_id": "c9577605-ac85-4cbe-88aa-2d2ae68ef143",
    "idempotency_key": "idemp-1779251484"
  }
  ```
- **Response**: 201 Created
  - **payment_id**: `ec9ebcb3-4dc2-477b-aa43-7961d7920a82`
  - **token**: `4cc49e78-97a7-48db-9dcd-590ffceed258`
  - **redirect_url**: `https://app.sandbox.midtrans.com/snap/v4/redirection/4cc49e78-97a7-48db-9dcd-590ffceed258`

### 6. Simulate Midtrans settlement webhook
- **Request**: POST `/api/payments/midtrans/webhook`
  - **Signature (SHA512)**: `7eb762ce94b3117a4c57b5115166b865adb66e3758d688d32e44a0b4006a642f6e9c6c2b69f46753dfe57aa41f7a1d4372735cd2aea430b86ba5b3cd7507096d`
- **Response**: 200 OK
  ```json
  {
    "code": "PROCESSED",
    "message": "Webhook processed and order transitioned."
  }
  ```

### 7. Background Fulfillment Transition
- **History observed via GET `/api/orders?limit=5`**:
  - `pending_payment` -> `paid` -> `fulfillment_pending` -> `success` status successfully in the background.

### 8. Database Fulfillments Record
- **Supabase Fulfillments Table**:
  ```json
  [
    {
      "id": "a9e6844e-2597-4438-b535-b022a578079d",
      "order_id": "c9577605-ac85-4cbe-88aa-2d2ae68ef143",
      "provider": "digiflazz",
      "attempt_no": 1,
      "provider_fulfillment_id": "mock-c9577605-ac85-4cbe-88aa-2d2ae68ef143",
      "provider_reference": "c9577605-ac85-4cbe-88aa-2d2ae68ef143",
      "status": "success",
      "serial_number": "MOCK-SN-INV-20260520-000003",
      "request_payload": {
        "order_id": "c9577605-ac85-4cbe-88aa-2d2ae68ef143",
        "customer_ref": "081234567890",
        "product_code": "pulsa-axis-1779023214345-501",
        "provider_mode": "mock"
      },
      "response_payload": {
        "sn": "MOCK-SN-INV-20260520-000003",
        "ref_id": "c9577605-ac85-4cbe-88aa-2d2ae68ef143",
        "status": "Sukses",
        "message": "Mock Digiflazz fulfillment succeeded.",
        "provider_mode": "mock"
      }
    }
  ]
  ```
