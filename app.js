(async function connectToSmart() {
    const params = new URLSearchParams(window.location.search);
    const hasLaunch = params.has("iss") && params.has("launch");

    if (hasLaunch) {
        await FHIR.oauth2.authorize({
            clientId: "demo",
            scope: "launch/patient patient/Patient.read patient/Observation.read openid fhirUser",
            redirectUri: window.location.origin + "/",
        });

        return;
    }

    try {
        const client = await FHIR.oauth2.ready();

        const fhirBaseUrl = client.state.serverUrl; // == iss
        const patientId = client.patient.id;        // patient context
        const accessToken = client.state.tokenResponse?.access_token;

        console.log("SMART launch successful!");
        console.log("FHIR Base URL (iss):", fhirBaseUrl);
        console.log("Patient ID:", patientId);
        console.log("Access Token:", accessToken);

        window.fhirBaseUrl = fhirBaseUrl;
        window.patientId = patientId;
        window.accessToken = accessToken;

        await window.adapter()
    } catch (e) {
        console.log("Not in SMART launch context, or SMART handshake failed;");
        console.error(e);
    }

})()