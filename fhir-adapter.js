const updateFrontend = (probability, lastPoll) => {
    if(probability != null) {
        const riskDOM = document.querySelector("#risk-container");
        riskDOM.textContent = probability
    }
    const timeDOM = document.querySelector("#time-container");
    timeDOM.textContent = heartAttackObj.lastPoll
}

function computeAge(birthDate) {
    // birthDate is "YYYY-MM-DD"
    if (!birthDate || typeof birthDate !== "string") return null;

    const parts = birthDate.split("-");
    if (parts.length < 3) return null;

    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

    const today = new Date();
    let age = today.getFullYear() - y;

    const hadBirthday =
        today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);

    if (!hadBirthday) age -= 1;
    return age;
}

function sexToBinary(gender) {
    // Encoding: male=1, female=0, else null
    if (gender === "male") return 1;
    if (gender === "female") return 0;
    return null;
}

async function fhirGetJson(url, accessToken) {
    // Make the request with appropriate headers; throw an error if the response is not OK; return the parsed JSON
    const headers = { Accept: "application/fhir+json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`FHIR request failed (${res.status} ${res.statusText}): ${url}`);
    }
    return await res.json();
}

async function latestObservationValue(fhirBaseUrl, patientId, loincCode, accessToken) {
    // Get the latest Observation for the given patient and LOINC code, and return the valueQuantity.value if it's a number, else null
    const base = String(fhirBaseUrl || "").replace(/\/$/, "");
    const subject = encodeURIComponent(`Patient/${patientId}`);
    const code = encodeURIComponent(`http://loinc.org|${loincCode}`);

    // Standard FHIR search: latest Observation for patient + code
    const url = `${base}/Observation?subject=${subject}&code=${code}&_sort=-date&_count=1`;

    const bundle = await fhirGetJson(url, accessToken);

    const obs = bundle && bundle.entry && bundle.entry[0] && bundle.entry[0].resource;
    const vq = obs && obs.valueQuantity;
    const value = vq && vq.value;

    return typeof value === "number" ? value : null;
}

async function buildHeartAttackFeatures({ fhirBaseUrl, patientId, accessToken }) {
    // Layer that translates from FHIR to the minimal feature vector needed for the heart attack model; also tracks which features are missing
    const base = String(fhirBaseUrl || "").replace(/\/$/, "");

    // 1) Patient -> age + sex
    const patient = await fhirGetJson(`${base}/Patient/${encodeURIComponent(patientId)}`, accessToken);
    const age = computeAge(patient.birthDate);
    const sex = sexToBinary(patient.gender);

    // 2) Observations -> chol + trestbps
    const chol = await latestObservationValue(base, patientId, "2093-3", accessToken);
    const trestbps = await latestObservationValue(base, patientId, "8480-6", accessToken);

    const features = { age, sex, chol, trestbps };

    const missing = Object.keys(features).filter((k) => features[k] == null);

    return { features, missing };
}

async function onPredictClick(demoMode = true) {
    const fhirBaseUrl = demoMode ? "http://localhost:8080/fhir" : window.fhirBaseUrl;
    const patientId = window.patientId;
    const authToken = window.accessToken;

    const { features, missing } = await buildHeartAttackFeatures({ fhirBaseUrl, patientId, authToken });

    if (missing.length) {
        // Show friendly UI message instead of calling the model
        console.log("Missing data:", missing);
        return;
    }
    console.log(features)

    // Send only the minimal feature vector to your model backend
    const res = await fetch("http://localhost:8000/predict/heart-attack/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
    });
    heartAttackObj.lastPoll = 0
    const prediction = await res.json();
    // Print the risk in frontend
    const probabilityPercentage = (prediction.result.probability * 100).toFixed(2);
    updateFrontend(probabilityPercentage, heartAttackObj.lastPoll);
    console.dir(prediction, { depth: null });
}

const startPoll = (pollRate = 3000) => {
    console.log("Attempting to start poll...");

    if (heartAttackObj.pollIntervalId !== null) {
        console.log("Poll already running. Not starting another interval.");
        return;
    }

    measureTime()
    console.log("Starting poll with pollRate:", pollRate);
    heartAttackObj.pollIntervalId = setInterval(() => {
        console.log("Interval triggered at", new Date().toISOString());
        onPredictClick();
    }, pollRate);
};

const stopPoll = () => {
    if (heartAttackObj.pollIntervalId !== null) {
        clearInterval(heartAttackObj.pollIntervalId);
        heartAttackObj.pollIntervalId = null;
        console.log("Polling stopped.");
    }
    // if (heartAttackObj.measureTimeIntervalId !== null) {
    //     clearInterval(heartAttackObj.measureTimeIntervalId);
    //     heartAttackObj.measureTimeIntervalId = null;
    //     console.log("Measure time stopped.");
    // }
};

(function attachListeners() {
    document.querySelector("#start-poll-btn").addEventListener("click", () => startPoll())
    document.querySelector("#stop-poll-btn").addEventListener("click", () => stopPoll())
})()

const measureTime = () => {
    if (heartAttackObj.measureTimeIntervalId !== null) {
        console.log("Measure time already running. Not starting another interval.");
        return;
    }
    heartAttackObj.measureTimeIntervalId = setInterval(() => {
        heartAttackObj.lastPoll += 1;
        updateFrontend(null, heartAttackObj.lastPoll);
    }, 1000);
}
const heartAttackObj = {
    pollIntervalId: null, // Store interval ID globally
    measureTimeIntervalId: null, // Store measureTime interval ID globally
    lastPoll: 0, // Track seconds since last poll
}

window.adapter = onPredictClick
