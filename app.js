require([
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/portal/Portal",
  "esri/portal/PortalItem",
  "esri/layers/FeatureLayer"
], function(OAuthInfo, esriId, Portal, PortalItem, FeatureLayer) {
  "use strict";
console.log("=== PEA ANALYSIS BUILD 2026-09-18 REV-1 ===");
  const c = window.APP_CONFIG;
  const byId = id => document.getElementById(id);
  const ui = {
    signIn: byId("signInButton"), signOut: byId("signOutButton"), user: byId("userLabel"),
    refresh: byId("refreshButton"), coverage: byId("coverageSelect"), details: byId("coverageDetails"),
    tiff: byId("selectedTiffName"), runDate: byId("selectedRunDate"), createdBy: byId("selectedCreatedBy"),
    pea: byId("peaNumber"), name: byId("analysisName"), counter: byId("analysisNameCounter"),
    run: byId("runButton"), progress: byId("progress"), status: byId("status"),
    jobDetails: byId("jobDetails"), results: byId("resultsCard"), summary: byId("resultSummary")
  };

  let portal = null, credential = null, layer = null, records = [], busy = false;
  validateConfig();
  const portalUrl = strip(c.portalUrl);
  const sharingUrl = portalUrl + "/sharing";
  const callbackUrl = new URL("oauth-callback.html", window.location.href).href;
  esriId.registerOAuthInfos([new OAuthInfo({
    appId: c.clientId,
    portalUrl: portalUrl,
    popup: true,
    flowType: "authorization-code",
    popupCallbackUrl: callbackUrl
  })]);

  ui.signIn.addEventListener("click", () => authenticate(true));
  ui.signOut.addEventListener("click", signOut);
  ui.refresh.addEventListener("click", loadRecords);
  ui.coverage.addEventListener("change", selectionChanged);
  ui.pea.addEventListener("input", validateForm);
  ui.name.addEventListener("input", () => { ui.counter.textContent = `${ui.name.value.length} / 256`; validateForm(); });
  ui.run.addEventListener("click", runAnalysis);
  initialize();

  async function initialize() {
    setSignedOut();
    setStatus("Checking for an existing ArcGIS Online session...", "info");
    try {
      credential = await esriId.checkSignInStatus(sharingUrl);
      await loadPortal();
      await loadRecords();
    } catch (_) {
      setSignedOut();
      setStatus("Sign in to load propagation coverage records.", "info");
    }
  }

  async function authenticate(prompt) {
    try {
      credential = esriId.findCredential(sharingUrl);
      if (!credential && prompt) credential = await esriId.getCredential(sharingUrl, { oAuthPopupConfirmation: false });
      if (!credential || !credential.token) throw new Error("ArcGIS authentication did not return a usable credential.");
      await loadPortal();
      await loadRecords();
    } catch (e) { setSignedOut(); setStatus(errorText(e), "error"); }
  }

  async function loadPortal() {
    portal = new Portal({ url: portalUrl, authMode: "immediate" });
    await portal.load();
    credential = esriId.findCredential(sharingUrl) || credential;
    ui.user.textContent = portal.user ? (portal.user.fullName || portal.user.username) : "Signed-in user";
    ui.signIn.hidden = true; ui.signOut.hidden = false;
    enableInputs(true);
  }

  function signOut() { if (busy) return; esriId.destroyCredentials(); setSignedOut(); setStatus("Signed out.", "info"); }
  function setSignedOut() {
    portal = credential = layer = null; records = [];
    ui.user.textContent = "Not signed in"; ui.signIn.hidden = false; ui.signOut.hidden = true;
    enableInputs(false); ui.coverage.innerHTML = '<option value="">Sign in to load records</option>';
    ui.details.hidden = true; ui.results.hidden = true;
  }
  function enableInputs(enabled) {
    ui.refresh.disabled = !enabled; ui.coverage.disabled = !enabled; ui.pea.disabled = !enabled; ui.name.disabled = !enabled;
    validateForm();
  }

  async function getLayer() {
    if (layer && layer.loaded) return layer;
    const item = new PortalItem({ id: c.coverageItemId, portal });
    await item.load();
    console.log("Coverage Item");
    console.log("Title:", item.title);
    console.log("Type:", item.type);
    console.log("URL:", item.url);
    console.log("Item:", item);
    layer = new FeatureLayer({ portalItem: item, layerId: Number(c.coverageLayerIndex) });
    await layer.load();
    const names = new Set(layer.fields.map(f => f.name.toLowerCase()));
    [layer.objectIdField, c.tiffNameField, c.runDatetimeField].forEach(name => {
      if (!name || !names.has(name.toLowerCase())) throw new Error(`Persistent Coverage Layer is missing required field: ${name}`);
    });
    return layer;
  }

  async function loadRecords() {
    if (!credential || busy) return;
    setBusy(true, "Loading persistent coverage records...");
    try {
      const lyr = await getLayer();
      const outFields = [lyr.objectIdField, c.tiffNameField, c.runDatetimeField];
      if (c.createdByField && lyr.fields.some(f => f.name.toLowerCase() === c.createdByField.toLowerCase())) outFields.push(c.createdByField);
      const q = lyr.createQuery();
      q.where = `${c.tiffNameField} IS NOT NULL`;
      q.outFields = outFields;
      q.returnGeometry = false;
      q.orderByFields = [`${c.runDatetimeField} DESC`, `${lyr.objectIdField} DESC`];
      const fs = await lyr.queryFeatures(q);
      records = fs.features.map(f => ({
        objectId: Number(f.attributes[lyr.objectIdField]),
        tiffName: clean(f.attributes[c.tiffNameField]),
        runDatetime: f.attributes[c.runDatetimeField],
        createdBy: c.createdByField ? clean(f.attributes[c.createdByField]) : ""
      })).sort((a,b) => dateNumber(b.runDatetime)-dateNumber(a.runDatetime) || b.objectId-a.objectId);
      populate(records);
      setStatus(records.length ? `${records.length.toLocaleString()} coverage records loaded. Most recent is first.` : "No coverage records are available.", records.length ? "success" : "info");
    } catch(e) {
      records=[]; ui.coverage.innerHTML='<option value="">Unable to load records</option>'; setStatus(errorText(e), "error");
    } finally { setBusy(false); }
  }

  function populate(items) {
    ui.coverage.innerHTML = "";
    const p=document.createElement("option"); p.value=""; p.textContent=items.length?"Select a propagation coverage record":"No records available"; p.selected=true; p.disabled=items.length>0; ui.coverage.appendChild(p);
    items.forEach(r => { const o=document.createElement("option"); o.value=String(r.objectId); o.textContent=[r.tiffName,formatDate(r.runDatetime),r.createdBy].filter(Boolean).join(" | "); ui.coverage.appendChild(o); });
    ui.coverage.disabled = !credential || !items.length;
  }

  function selectedRecord() { const id=Number(ui.coverage.value); return Number.isInteger(id) ? records.find(r=>r.objectId===id)||null : null; }
  function selectionChanged() {
    const r=selectedRecord();
    if (!r) { ui.details.hidden=true; validateForm(); return; }
    ui.tiff.textContent=r.tiffName; ui.runDate.textContent=formatDate(r.runDatetime); ui.createdBy.textContent=r.createdBy||"Not recorded"; ui.details.hidden=false;
    if (!ui.name.value.trim()) { ui.name.value=r.tiffName.replace(/\.(tif|tiff)$/i,"").slice(0,256); ui.counter.textContent=`${ui.name.value.length} / 256`; }
    validateForm();
  }

  function validateForm() {
    const valid=!!credential && !!selectedRecord() && /^\d+$/.test(ui.pea.value.trim()) && ui.name.value.trim().length>0 && ui.name.value.trim().length<=256;
    ui.run.disabled=busy||!valid; return valid;
  }

  async function runAnalysis() {
    if (!validateForm() || busy) return;
    const r=selectedRecord(); ui.results.hidden=true; ui.jobDetails.hidden=true;
    setBusy(true, `Submitting analysis for '${r.tiffName}'...`);
    try {
      const params={f:"json",token:credential.token};
      params[c.coverageObjectIdParameter]=r.objectId;
      params[c.peaNumberParameter]=ui.pea.value.trim();
      params[c.analysisNameParameter]=ui.name.value.trim();
      const submitted=await postForm(strip(c.webToolUrl)+"/submitJob",params);
      if (submitted.error) throw arcError(submitted.error);
      if (!submitted.jobId) throw new Error("The web tool did not return a job ID.");
      await monitor(submitted.jobId);
      
      ui.summary.textContent =
  "Market coverage analysis completed successfully.";

ui.results.hidden = false;

await loadRecords();

setStatus(
  "Coverage analysis completed successfully.",
  "success"
);
    
    } catch(e) { setStatus(errorText(e),"error"); }
    finally { setBusy(false); }
  }

  async function monitor(jobId) {
    const url=`${strip(c.webToolUrl)}/jobs/${encodeURIComponent(jobId)}`;
    for(let i=0;i<c.maxPollAttempts;i++) {
      const job=await getJson(url,{f:"json",token:credential.token});
      if(job.error) throw arcError(job.error);
      ui.jobDetails.hidden=false; ui.jobDetails.textContent=`Job ID: ${jobId}\nStatus: ${job.jobStatus||"Unknown"}`;
      if(job.jobStatus==="esriJobSucceeded") return job;
      if(["esriJobFailed","esriJobCancelled","esriJobTimedOut"].includes(job.jobStatus)) {
        const messages=(job.messages||[]).map(m=>m.description).filter(Boolean).join(" ");
        throw new Error(messages||`Analysis ended with ${job.jobStatus}.`);
      }
      setStatus(job.jobStatus==="esriJobExecuting"?"Propagation and FCC PEA analysis is running.":`Analysis status: ${job.jobStatus}`,"info");
      await delay(c.pollIntervalMs);
    }
    throw new Error("Job monitoring reached the configured polling safety limit.");
  }

  async function postForm(url,obj) {
    const body=new URLSearchParams(); Object.entries(obj).forEach(([k,v])=>{if(v!==null&&v!==undefined)body.append(k,String(v));});
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:body.toString()});
    const json=await response.json(); if(!response.ok) throw new Error(json.error?arcMessage(json.error):`HTTP ${response.status}`); return json;
  }
  async function getJson(url,obj) {
    const qs=new URLSearchParams(); Object.entries(obj).forEach(([k,v])=>qs.append(k,String(v)));
    const response=await fetch(`${url}?${qs}`,{method:"GET"}); const json=await response.json();
    if(!response.ok) throw new Error(json.error?arcMessage(json.error):`HTTP ${response.status}`); return json;
  }

  function setBusy(value,message) { busy=value; ui.progress.hidden=!value; if(message)setStatus(message,"info"); ui.refresh.disabled=value||!credential; ui.coverage.disabled=value||!credential||!records.length; ui.pea.disabled=value||!credential; ui.name.disabled=value||!credential; validateForm(); }
  function setStatus(message,type) { ui.status.className=`status ${type||"info"}`; ui.status.textContent=message; }
  function validateConfig() { if(!c)throw new Error("config.js did not load."); ["portalUrl","clientId","coverageItemId","webToolUrl"].forEach(k=>{if(!c[k]||String(c[k]).includes("REPLACE"))throw new Error(`Update ${k} in config.js.`);}); }
  function strip(v){return String(v||"").replace(/\/+$/,"");}
  function clean(v){return v==null?"":String(v).trim();}
  function dateNumber(v){if(v==null||v==="")return 0;if(typeof v==="number")return v;const n=Date.parse(v);return Number.isFinite(n)?n:0;}
  function formatDate(v){const n=dateNumber(v);if(!n)return "Date unavailable";return new Date(n).toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function arcMessage(e){return [e&&e.message,...((e&&e.details)||[])].filter(Boolean).join(" ")||"Unknown ArcGIS service error.";}
  function arcError(e){return new Error(arcMessage(e));}
  function errorText(e){return e&&e.message?e.message:String(e||"Unknown error.");}
});
