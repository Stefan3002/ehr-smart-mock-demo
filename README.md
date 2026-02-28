# SMART Sandbox -- Local Setup

## 1. Start HAPI FHIR Server

Clone the official HAPI FHIR JPA Server:

``` bash
git clone https://github.com/hapifhir/hapi-fhir-jpaserver-starter.git
cd hapi-fhir-jpaserver-starter
docker compose up
```

FHIR base URL:

http://localhost:8080/fhir

Verify the server is running:

http://localhost:8080/fhir/metadata

------------------------------------------------------------------------

## 2. Serve the SMART App Locally (Python)

From the directory containing `index.html`, `app.js`, `fhir-adapter.js`, run:

``` bash
python3 -m http.server 5174
```

Open in browser:

http://localhost:5174/

⚠ Always use `localhost`, not `0.0.0.0`

------------------------------------------------------------------------

## 3. Launch via SMART Sandbox

Go to:

https://launch.smarthealthit.org/

Configure:

-   App Launch URL: http://localhost:5174/
-   FHIR Version: R4
-   Select a test patient (1000 for demo purposes)

Click **Launch App**.

------------------------------------------------------------------------

## 4. SMART Flow Summary

1.  Launcher redirects to your app with `iss` and `launch` parameters.
2.  Your app calls `FHIR.oauth2.authorize()`.
3.  After login, SMART redirects back to your app.
4.  `FHIR.oauth2.ready()` provides:
    -   FHIR base URL
    -   Patient ID
    -   Access token

All further FHIR requests must include:

    Authorization: Bearer <access_token>
    Accept: application/fhir+json

------------------------------------------------------------------------

## 4. Screenshots
<img width="2913" height="2000" alt="Screenshot from 2026-02-28 02-53-46" src="https://github.com/user-attachments/assets/5fae3f47-1a10-46b5-94f2-259b17dae427" />
<img width="871" height="907" alt="image" src="https://github.com/user-attachments/assets/cd244fed-b369-4b44-8480-f4af860bff21" />

