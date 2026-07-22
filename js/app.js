(() => {
  "use strict";
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const cfg = window.PROHUB_FIREBASE_CONFIG;
  let auth,
    db,
    user = null,
    profile = {},
    role = "student",
    activeView = "home";
  let deferredInstallPrompt = null;
  let wizard = {
    step: 0,
    school: "Oklahoma State University Institute of Technology",
    department: "ETDE / Instrumentation",
    term: "Fall 2026",
    displayName: "",
    interests: ["Technology", "Sports"],
    theme: "orange",
    appearance: "dark",
    weather: "Okmulgee, OK",
    schoolColor: "#ff7300",
    logoUrl: "",
    enrollment: "qr-code",
    notifications: "all",
    favoriteTeams: [
      "OKC Thunder",
      "Oklahoma Sooners",
      "Oklahoma State Cowboys",
    ],
    quickLinks: ["Outlook", "Canvas", "YouTube"],
    widgets: [
      "courses",
      "announcements",
      "calendar",
      "weather",
      "quicklinks",
      "notes",
      "sports",
      "notebook",
      "entertainment",
    ],
    wallpaper: "gradient",
    aiTutor: true,
    aiAssistant: true,
    officeHours: "",
    canvasUrl: "https://canvas.okstate.edu/",
    outlookUrl: "https://outlook.office.com/",
  };
  const ADMIN_ROLES = ["admin", "chair", "assistant_dean"];
  const FACULTY_ROLES = ["instructor", "ta", ...ADMIN_ROLES];
  const isAdminRole = (r = role) => ADMIN_ROLES.includes(r);
  const isFacultyRole = (r = role) => FACULTY_ROLES.includes(r);
  const roleLabel = (r = role) => ({admin:"Overall Administrator",chair:"Department Chair",assistant_dean:"Assistant Dean",instructor:"Instructor",ta:"Teaching Assistant",student:"Student",guest:"Guest"}[r] || "Student");
  const navByRole = {
    student: [["home","Home"],["family","Family Space"],["courses","Courses"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
    guest: [["home","Home"],["family","Family Space"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["settings","My Space"]],
    ta: [["home","Home"],["family","Family Space"],["courses","Courses"],["marketplace","Department Library"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
    instructor: [["home","Home"],["family","Family Space"],["courses","Courses"],["templates","Course Library"],["marketplace","Department Library"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
    chair: [["home","Home"],["family","Family Space"],["courses","Courses"],["templates","Course Library"],["people","People & Roles"],["marketplace","Department Library"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
    assistant_dean: [["home","Home"],["family","Family Space"],["courses","Courses"],["templates","Course Library"],["people","People & Roles"],["marketplace","Department Library"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
    admin: [["home","Home"],["family","Family Space"],["courses","Courses"],["templates","Course Library"],["people","People & Roles"],["marketplace","Department Library"],["notebooks","Notebooks"],["calendar","Calendar"],["sportsHub","Sports Hub"],["entertainment","Entertainment"],["help","How to Use"],["chat","Messages"],["settings","My Space"]],
  };
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  const APP_VERSION = "10.1";
  function compareVersions(a,b){const x=String(a).split(".").map(n=>parseInt(n,10)||0),y=String(b).split(".").map(n=>parseInt(n,10)||0),m=Math.max(x.length,y.length);for(let i=0;i<m;i++){if((x[i]||0)>(y[i]||0))return 1;if((x[i]||0)<(y[i]||0))return-1}return 0}
  async function performCleanUpdate(){try{if("serviceWorker"in navigator){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()))}if("caches"in window){const n=await caches.keys();await Promise.all(n.map(x=>caches.delete(x)))}}finally{const u=new URL(location.href);u.searchParams.set("_prohub_update",Date.now());location.replace(u.toString())}}
  function showUpdateBanner(v,m){if(document.getElementById("prohubVersionBanner"))return;const b=document.createElement("div");b.id="prohubVersionBanner";b.className="version-update-banner";b.innerHTML=`<div><b>Version ${esc(v)} is available.</b><span>${esc(m||"Click update to load the newest Pro Hub files.")}</span></div><button class="btn primary" id="prohubUpdateNow">Update now</button><button class="btn ghost" id="prohubUpdateLater">Later</button>`;document.body.appendChild(b);prohubUpdateNow.onclick=performCleanUpdate;prohubUpdateLater.onclick=()=>b.remove()}
  async function checkForAppUpdate(){try{const r=await fetch(`./version.json?_=${Date.now()}`,{cache:"no-store"});if(!r.ok)return;const v=await r.json();if(v.version&&compareVersions(v.version,APP_VERSION)>0)showUpdateBanner(v.version,v.message)}catch(e){console.debug("Version check unavailable",e)}}
  addEventListener("load",()=>{setTimeout(checkForAppUpdate,1500);setInterval(checkForAppUpdate,1800000)});

  const safeArray = (v) =>
    Array.isArray(v)
      ? v
      : typeof v === "string"
        ? v
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];
  const now = () => firebase.database.ServerValue.TIMESTAMP;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2800);
  }
  function errText(e) {
    return e?.message || String(e || "Unknown error");
  }
  function initials(name) {
    return (name || user?.email || "PX")
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
  }
  function modal(html) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-backdrop" id="modal"><div class="modal">${html}</div></div>`,
    );
  }
  function closeModal() {
    document.getElementById("modal")?.remove();
  }
  window.closeModal = closeModal;
  function applyTheme() {
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    document.body.dataset.theme =
      profile.appearance === "light" ||
      (profile.appearance === "system" && prefersLight)
        ? "light"
        : "dark";
    document.body.classList.remove("theme-blue", "theme-green", "theme-purple");
    if (["blue", "green", "purple"].includes(profile.theme))
      document.body.classList.add("theme-" + profile.theme);
  }

  try {
    if (!cfg) throw new Error("Firebase configuration was not loaded.");
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.database();
  } catch (e) {
    app.innerHTML = `<section class="center"><div class="error"><b>Startup error</b><br>${esc(errText(e))}</div></section>`;
    return;
  }

  auth.onAuthStateChanged(async (u) => {
    user = u;
    if (!u) {
      renderAuth();
      return;
    }
    try {
      await bootstrapUser();
    } catch (e) {
      app.innerHTML = `<section class="center"><div class="card"><h2>Unable to open workspace</h2><div class="error">${esc(errText(e))}</div><div class="actions"><button class="btn" onclick="firebase.auth().signOut()">Sign out</button></div></div></section>`;
    }
  });

  function renderAuth() {
    app.innerHTML = `<section class="auth-shell"><div class="card"><div class="brand"><div class="logo">PX</div><div><div class="muted">PRO HUB X</div><h1>Classroom Homebase 8.3</h1></div></div><p class="muted">A personal workspace with courses, announcements, chat, QR enrollment, and faculty tools.</p><div id="authError"></div><div class="grid two"><div class="field"><label>Email</label><input id="email" type="email" autocomplete="email"></div><div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password"></div></div><div class="actions" style="margin-top:18px"><button class="btn ghost" id="googleBtn">Continue with Google</button><button class="btn" id="createBtn">Create account</button><button class="btn primary" id="loginBtn">Sign in</button></div></div></section>`;
    const show = (e) =>
      (document.getElementById("authError").innerHTML =
        `<div class="error">${esc(errText(e))}</div>`);
    document.getElementById("loginBtn").onclick = async () => {
      try {
        await auth.signInWithEmailAndPassword(
          document.getElementById("email").value.trim(),
          document.getElementById("password").value,
        );
      } catch (e) {
        show(e);
      }
    };
    document.getElementById("createBtn").onclick = async () => {
      try {
        await auth.createUserWithEmailAndPassword(
          document.getElementById("email").value.trim(),
          document.getElementById("password").value,
        );
      } catch (e) {
        show(e);
      }
    };
    document.getElementById("googleBtn").onclick = async () => {
      try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch (e) {
        show(e);
      }
    };
  }

  async function bootstrapUser() {
    const [pSnap, rSnap, oSnap, blockedSnap] = await Promise.all([
      db.ref(`users/${user.uid}`).once("value"),
      db.ref(`roles/${user.uid}`).once("value"),
      db.ref("system/ownerUid").once("value"),
      db.ref(`blockedAccounts/${user.uid}`).once("value"),
    ]);
    if (blockedSnap.exists()) {
      app.innerHTML = `<section class="center"><div class="auth-card"><h2>Account removed</h2><p class="muted">An administrator removed this account from Pro Hub X.</p><button class="btn" id="removedSignOut">Sign out</button></div></section>`;
      document.getElementById("removedSignOut").onclick = () => auth.signOut();
      return;
    }
    profile = pSnap.val() || {};
    let storedRole = rSnap.val();
    const bootstrapEmail = String(window.PROHUB_OWNER_EMAIL || "").trim().toLowerCase();
    const signedInEmail = String(user.email || "").trim().toLowerCase();
    const ownerMatchesUid = oSnap.exists() && oSnap.val() === user.uid;
    const ownerMatchesEmail = bootstrapEmail && signedInEmail === bootstrapEmail;
    // Version 6 owner recovery: the configured owner email can reclaim the owner UID
    // and administrator role after older builds accidentally stored Student.
    if (ownerMatchesEmail && !ownerMatchesUid) {
      await db.ref("system/ownerEmail").set(signedInEmail).catch(() => {});
      await db.ref("system/ownerUid").set(user.uid);
    }
    if (ownerMatchesUid || ownerMatchesEmail) {
      if (storedRole !== "admin") await db.ref(`roles/${user.uid}`).set("admin");
      storedRole = "admin";
      if (profile.requestedRole || profile.facultyRequestStatus) {
        await db.ref(`users/${user.uid}`).update({requestedRole:null, facultyRequestStatus:null, updatedAt:now()}).catch(()=>{});
        profile.requestedRole = null;
        profile.facultyRequestStatus = null;
      }
    }
    role = storedRole || "student";
    if (profile.accountStatus === "disabled" && !isAdminRole(role)) {
      app.innerHTML = `<section class="center"><div class="auth-card"><h2>Account disabled</h2><p class="muted">Your Pro Hub X access has been disabled by an administrator.</p><button class="btn" id="disabledSignOut">Sign out</button></div></section>`;
      document.getElementById("disabledSignOut").onclick = () => auth.signOut();
      return;
    }
    if (!oSnap.exists()) {
      renderFirstRun();
      return;
    }
    if (!pSnap.exists()) {
      wizard.displayName = user.displayName || user.email.split("@")[0];
      renderPersonalOnboarding();
      return;
    }
    applyTheme();
    renderShell();
    const match = location.hash.match(/^#join=([A-Z0-9]{6})$/i);
    if (match) {
      activeView = "courses";
      renderShell();
      setTimeout(() => showJoin(match[1]), 0);
    }
  }

  function wizardFrame(title, body, total = 10, currentStep = wizard.step) {
    const pct = ((currentStep + 1) / total) * 100;
    app.innerHTML = `<section class="wizard-shell"><div class="card wizard-card"><div class="brand"><div class="logo">PX</div><div><div class="muted">FULL HOMEBASE SETUP</div><h2>${esc(title)}</h2></div><div style="margin-left:auto" class="muted">${currentStep + 1} of ${total}</div></div><div class="progress"><i style="width:${pct}%"></i></div><div style="margin-top:24px">${body}</div><div id="wizardError"></div></div></section>`;
  }
  function checkGrid(name, items, selected) {
    return `<div class="choice-grid">${items.map((x) => `<label class="choice"><input type="checkbox" name="${name}" value="${esc(x)}" ${selected.includes(x) ? "checked" : ""}><span>${esc(x)}</span></label>`).join("")}</div>`;
  }
  function radioGrid(name, items, selected) {
    return `<div class="choice-grid">${items.map(([v, l, d]) => `<label class="choice"><input type="radio" name="${name}" value="${esc(v)}" ${selected === v ? "checked" : ""}><span><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></label>`).join("")}</div>`;
  }
  function checkedValues(name) {
    return [...document.querySelectorAll(`[name="${name}"]:checked`)].map(
      (x) => x.value,
    );
  }
  function renderFirstRun() {
    const steps = [
      [
        "Welcome to Pro Hub X",
        `<div class="hero-setup"><h2>The homebase for your department.</h2><p>Set up school branding, semesters, communication, faculty access, AI tools, and your own personal dashboard. Students and faculty will only see a polished sign-in and their customized workspace.</p></div>`,
      ],
      [
        "School Identity",
        `<div class="grid two"><div class="field"><label>School name</label><input id="school" value="${esc(wizard.school)}"></div><div class="field"><label>Department or program</label><input id="department" value="${esc(wizard.department)}"></div><div class="field"><label>School accent color</label><input id="schoolColor" type="color" value="${esc(wizard.schoolColor)}"></div><div class="field"><label>Logo image URL (optional)</label><input id="logoUrl" value="${esc(wizard.logoUrl)}" placeholder="https://..."></div></div>`,
      ],
      [
        "Semester System",
        `<div class="field"><label>Current semester</label><input id="term" value="${esc(wizard.term)}" placeholder="Fall 2026"></div><div class="panel"><h3>Built for changing class rosters</h3><p class="muted">Each semester course gets a new student list, chat, announcements, attendance, grades, calendar, join code, and QR code. Course templates remain reusable.</p></div>`,
      ],
      [
        "Enrollment & Communication",
        `${radioGrid(
          "enrollment",
          [
            [
              "qr-code",
              "QR Code + Join Code",
              "Recommended for quick classroom enrollment",
            ],
            [
              "approval",
              "Instructor Approval",
              "Students request access before joining",
            ],
            [
              "invite",
              "Email Invitation",
              "Instructor adds students by school email",
            ],
          ],
          wizard.enrollment,
        )}<div class="field"><label>Default notification level</label><select id="notifications"><option value="all">All classroom messages</option><option value="important">Important announcements only</option><option value="digest">Daily digest</option></select></div>`,
      ],
      [
        "Administrator Profile",
        `<div class="grid two"><div class="field"><label>Display name</label><input id="displayName" value="${esc(wizard.displayName || user.displayName || "Michael Williams")}"></div><div class="field"><label>Weather location</label><input id="weather" value="${esc(wizard.weather)}"></div><div class="field"><label>Office hours (optional)</label><input id="officeHours" value="${esc(wizard.officeHours)}" placeholder="Tue/Thu 8:00–11:30 AM"></div><div class="field"><label>Wallpaper</label><select id="wallpaper"><option value="gradient">Modern Gradient</option><option value="clean">Clean Minimal</option><option value="campus">Campus Style</option><option value="tech">Technology Grid</option><option value="blueprint">Blueprint</option><option value="carbon">Carbon Fiber</option></select></div></div>`,
      ],
      [
        "Look & Feel",
        `<div class="grid two"><div class="field"><label>Appearance</label><select id="appearance"><option value="dark">Dark</option><option value="light">Light</option><option value="system">Follow device</option></select></div><div class="field"><label>Accent color</label><select id="theme"><option value="orange">Orange</option><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option></select></div></div><p class="muted">Every student and instructor may later choose their own appearance without changing anyone else's dashboard.</p>`,
      ],
      [
        "Interests & Teams",
        `<div class="field"><label>Your interests</label>${checkGrid("interests", ["Technology", "Sports", "Education", "Gaming", "Automation", "Electronics", "Hydraulics", "AI", "Music", "Fitness"], safeArray(wizard.interests))}</div><div class="field"><label>Favorite teams</label>${checkGrid("teams", ["OKC Thunder", "Oklahoma Sooners", "Oklahoma State Cowboys", "Dallas Cowboys", "Kansas City Chiefs"], safeArray(wizard.favoriteTeams))}</div>`,
      ],
      [
        "Home Dashboard",
        `<p class="muted">Choose the widgets shown when you open Pro Hub X. Required classroom alerts always remain available.</p>${checkGrid("widgets", ["courses", "announcements", "calendar", "weather", "quicklinks", "notes", "sports", "search", "tasks", "notebook", "entertainment", "AI assistant"], safeArray(wizard.widgets))}`,
      ],
      [
        "Connections & AI",
        `<div class="grid two"><div class="field"><label>Canvas address</label><input id="canvasUrl" value="${esc(wizard.canvasUrl)}"></div><div class="field"><label>Outlook address</label><input id="outlookUrl" value="${esc(wizard.outlookUrl)}"></div></div>${checkGrid("aiTools", ["AI Tutor", "AI Instructor Assistant"], [...(wizard.aiTutor ? ["AI Tutor"] : []), ...(wizard.aiAssistant ? ["AI Instructor Assistant"] : [])])}<p class="muted">These switches prepare the interface. AI document grounding can be connected later without changing student accounts.</p>`,
      ],
      [
        "Ready to Build",
        `<div class="hero-setup"><h2>Everything is ready.</h2><p>Pro Hub X will create your administrator role, school workspace, semester system, personal dashboard, classroom communication foundation, and default settings.</p><div class="summary-chips"><span>${esc(wizard.school)}</span><span>${esc(wizard.department)}</span><span>${esc(wizard.term)}</span><span>${esc(wizard.theme)} theme</span></div></div>`,
      ],
    ];
    const [title, body] = steps[wizard.step];
    wizardFrame(
      title,
      body +
        `<div class="actions wizard-actions" style="margin-top:22px">${wizard.step ? '<button class="btn" id="back">Back</button>' : ""}<button class="btn primary" id="next">${wizard.step === steps.length - 1 ? "Finish & Open Homebase" : "Continue"}</button></div>`,
      steps.length,
    );
    ["theme", "appearance", "wallpaper", "notifications"].forEach((id) => {
      if (document.getElementById(id))
        document.getElementById(id).value = wizard[id];
    });
    if (wizard.step)
      document.getElementById("back").onclick = () => {
        saveWizardFields();
        wizard.step--;
        renderFirstRun();
      };
    document.getElementById("next").onclick = async () => {
      saveWizardFields();
      if (wizard.step < steps.length - 1) {
        wizard.step++;
        renderFirstRun();
        return;
      }
      await finishFirstRun();
    };
  }
  function saveWizardFields() {
    const val = (id) => document.getElementById(id)?.value;
    [
      "school",
      "department",
      "term",
      "displayName",
      "weather",
      "theme",
      "appearance",
      "schoolColor",
      "logoUrl",
      "notifications",
      "officeHours",
      "wallpaper",
      "canvasUrl",
      "outlookUrl",
    ].forEach((k) => {
      if (val(k) !== undefined) wizard[k] = String(val(k)).trim();
    });
    const enrollment = document.querySelector('[name="enrollment"]:checked');
    if (enrollment) wizard.enrollment = enrollment.value;
    if (document.querySelector('[name="interests"]'))
      wizard.interests = checkedValues("interests");
    if (document.querySelector('[name="teams"]'))
      wizard.favoriteTeams = checkedValues("teams");
    if (document.querySelector('[name="widgets"]'))
      wizard.widgets = checkedValues("widgets");
    if (document.querySelector('[name="aiTools"]')) {
      const a = checkedValues("aiTools");
      wizard.aiTutor = a.includes("AI Tutor");
      wizard.aiAssistant = a.includes("AI Instructor Assistant");
    }
  }
  async function finishFirstRun() {
    const box = document.getElementById("wizardError");
    const btn = document.getElementById("next");
    btn.disabled = true;
    btn.textContent = "Building your homebase…";
    try {
      const ownerRef = db.ref("system/ownerUid");
      const result = await ownerRef.transaction(
        (current) => current || user.uid,
      );
      if (result.snapshot.val() !== user.uid)
        throw new Error(
          "Another administrator has already initialized this workspace. Refresh and sign in again.",
        );
      await db.ref(`roles/${user.uid}`).set("admin");
      const profileData = {
        uid: user.uid,
        email: user.email || "",
        displayName: wizard.displayName || user.displayName || "Administrator",
        roleLabel: "Overall Administrator",
        theme: wizard.theme,
        appearance: wizard.appearance,
        weather: wizard.weather,
        interests: safeArray(wizard.interests),
        favoriteTeams: safeArray(wizard.favoriteTeams),
        widgets: safeArray(wizard.widgets),
        wallpaper: wizard.wallpaper,
        officeHours: wizard.officeHours,
        quickLinks: [
          { label: "Outlook", url: wizard.outlookUrl },
          { label: "Canvas", url: wizard.canvasUrl },
          { label: "YouTube", url: "https://youtube.com/" },
        ],
        notifications: wizard.notifications,
        onboardingComplete: true,
        createdAt: now(),
        updatedAt: now(),
      };
      const updates = {};
      updates[`users/${user.uid}`] = profileData;
      updates["system/setupComplete"] = true;
      updates["system/ownerEmail"] = user.email || "";
      updates["system/version"] = "7.0.0";
      updates["organization"] = {
        school: wizard.school,
        department: wizard.department,
        currentTerm: wizard.term,
        schoolColor: wizard.schoolColor,
        logoUrl: wizard.logoUrl,
        enrollmentMode: wizard.enrollment,
        aiTutorEnabled: wizard.aiTutor,
        aiAssistantEnabled: wizard.aiAssistant,
        createdAt: now(),
        updatedAt: now(),
      };
      updates["facultyDirectory"] = {
        michaelWilliams: { name: "Michael Williams", title: "Overall Administrator", department: wizard.department, status: "active" },
        jesseLittle: { name: "Jesse Little", title: "Instructor", department: wizard.department, status: "active" },
        darrel: { name: "Darrel", title: "Instructor", department: wizard.department, status: "active" },
        cullum: { name: "Cullum", title: "Instructor", department: wizard.department, status: "active" },
        matthew: { name: "Matthew", title: "Instructor", department: wizard.department, status: "active" },
        carlosIze: { name: "Carlos Ize", title: "Instructor", department: wizard.department, status: "active" },
      };
      updates["semesters/current"] = {
        name: wizard.term,
        status: "active",
        createdAt: now(),
      };
      await db.ref().update(updates);
      profile = profileData;
      role = "admin";
      applyTheme();
      renderShell();
      toast("Your full homebase is ready");
    } catch (e) {
      box.innerHTML = `<div class="error">Setup error: ${esc(errText(e))}</div>`;
      btn.disabled = false;
      btn.textContent = "Finish & Open Homebase";
    }
  }
  function renderPersonalOnboarding() {
    let step = 0;
    const data = {
      displayName: user.displayName || user.email.split("@")[0],
      weather: "",
      theme: "orange",
      appearance: "dark",
      wallpaper: "gradient",
      interests: ["Technology"],
      favoriteTeams: [],
      widgets: [
        "courses",
        "announcements",
        "calendar",
        "weather",
        "quicklinks",
        "notes",
      ],
      requestedRole: "student",
    quickLinks: [
        { label: "Outlook", url: "https://outlook.office.com/" },
        { label: "Canvas", url: "https://canvas.okstate.edu/" },
      ],
    };
    function save() {
      const val = (id) => document.getElementById(id)?.value;
      if (val("obName") !== undefined) data.displayName = val("obName").trim();
      if (val("obWeather") !== undefined)
        data.weather = val("obWeather").trim();
      if (val("obTheme") !== undefined) data.theme = val("obTheme");
      if (val("obAppearance") !== undefined)
        data.appearance = val("obAppearance");
      if (val("obWallpaper") !== undefined) data.wallpaper = val("obWallpaper");
      if (val("obRequestedRole") !== undefined) data.requestedRole = val("obRequestedRole");
      if (document.querySelector('[name="obInterests"]'))
        data.interests = checkedValues("obInterests");
      if (document.querySelector('[name="obTeams"]'))
        data.favoriteTeams = checkedValues("obTeams");
      if (document.querySelector('[name="obWidgets"]'))
        data.widgets = checkedValues("obWidgets");
    }
    function draw() {
      const pages = [
        [
          "Welcome",
          `<h2>Make Pro Hub X your space.</h2><p class="muted">Your courses, instructor announcements, and required alerts stay connected. The look, interests, links, and personal widgets are yours.</p>`,
        ],
        [
          "Profile",
          `<div class="grid two"><div class="field"><label>Display name</label><input id="obName" value="${esc(data.displayName)}"></div><div class="field"><label>Weather location</label><input id="obWeather" value="${esc(data.weather)}" placeholder="City, State"></div><div class="field"><label>I am joining as</label><select id="obRequestedRole"><option value="student">Student</option><option value="instructor">Instructor / Faculty</option></select><div class="muted" style="margin-top:6px">Instructor access requires administrator approval.</div></div></div>`,
        ],
        [
          "Style",
          `<div class="grid two"><div class="field"><label>Theme</label><select id="obTheme"><option value="orange">Orange</option><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option></select></div><div class="field"><label>Appearance</label><select id="obAppearance"><option value="dark">Dark</option><option value="light">Light</option><option value="system">Follow device</option></select></div><div class="field"><label>Wallpaper</label><select id="obWallpaper"><option value="gradient">Modern Gradient</option><option value="clean">Clean Minimal</option><option value="campus">Campus Style</option><option value="tech">Technology Grid</option><option value="blueprint">Blueprint</option><option value="carbon">Carbon Fiber</option></select></div></div>`,
        ],
        [
          "Interests",
          `${checkGrid("obInterests", ["Technology", "Sports", "Education", "Gaming", "Automation", "Electronics", "Hydraulics", "AI", "Music", "Fitness"], data.interests)}<h3>Favorite teams</h3>${checkGrid("obTeams", ["OKC Thunder", "Oklahoma Sooners", "Oklahoma State Cowboys", "Dallas Cowboys", "Kansas City Chiefs"], data.favoriteTeams)}`,
        ],
        [
          "Dashboard",
          `<p class="muted">Choose your starting widgets. You can change them later.</p>${checkGrid("obWidgets", ["courses", "announcements", "calendar", "weather", "quicklinks", "notes", "sports", "search", "tasks", "notebook", "entertainment", "AI assistant"], data.widgets)}`,
        ],
        [
          "Ready",
          `<div class="hero-setup"><h2>Your personal homebase is ready.</h2><p>Join a class with its QR code or six-character code. Your dashboard can keep changing as your interests and courses change.</p></div>`,
        ],
      ];
      const [title, body] = pages[step];
      wizardFrame(
        title,
        body +
          `<div id="obErr"></div><div class="actions wizard-actions" style="margin-top:20px">${step ? '<button class="btn" id="obBack">Back</button>' : ""}<button class="btn primary" id="obNext">${step === pages.length - 1 ? "Open My Homebase" : "Continue"}</button></div>`,
        pages.length,
        step,
      );
      ["obTheme", "obAppearance", "obWallpaper"].forEach((id) => {
        if (document.getElementById(id))
          document.getElementById(id).value =
            data[id.replace("ob", "").replace(/^./, (c) => c.toLowerCase())];
      });
      if (document.getElementById("obRequestedRole")) document.getElementById("obRequestedRole").value = data.requestedRole || "student";
      document.getElementById("obBack")?.addEventListener("click", () => {
        save();
        step--;
        draw();
      });
      document.getElementById("obNext").onclick = async () => {
        save();
        if (step < pages.length - 1) {
          step++;
          draw();
          return;
        }
        try {
          profile = {
            uid: user.uid,
            email: user.email || "",
            ...data,
            onboardingComplete: true,
            notifications: "all",
            createdAt: now(),
            updatedAt: now(),
          };
          const ownerSnap = await db.ref("system/ownerUid").once("value");
          const defaultRole = ownerSnap.val() === user.uid ? "admin" : "student";
          await db
            .ref(`roles/${user.uid}`)
            .transaction((current) => current || defaultRole);
          if (defaultRole !== "admin" && data.requestedRole === "instructor") {
            await db.ref(`facultyRequests/${user.uid}`).set({
              uid: user.uid,
              email: user.email || "",
              displayName: profile.displayName || user.email || "Faculty applicant",
              requestedRole: "instructor",
              status: "pending",
              requestedAt: now(),
            });
            profile.facultyRequestStatus = "pending";
          }
          await db.ref(`users/${user.uid}`).set(profile);
          role = (await db.ref(`roles/${user.uid}`).once("value")).val() || defaultRole;
          applyTheme();
          renderShell();
        } catch (e) {
          document.getElementById("obErr").innerHTML =
            `<div class="error">${esc(errText(e))}</div>`;
        }
      };
    }
    draw();
  }
  function renderShell() {
    const nav = navByRole[role] || navByRole.student;
    if (!nav.some((n) => n[0] === activeView)) activeView = "home";
    app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand"><div class="logo">PX</div><div><b>Pro Hub X</b><div class="muted" style="font-size:.8rem">${esc(roleLabel().toUpperCase())}</div></div></div><nav class="nav">${nav.map(([id, label]) => `<button data-view="${id}" class="${activeView === id ? "active" : ""}">${esc(label)}</button>`).join("")}</nav></aside><main class="main"><header class="topbar"><div><div class="muted">${esc(profile.weather || "Your homebase")}</div><h1 id="viewTitle">${esc(nav.find((n) => n[0] === activeView)?.[1] || "Home")}</h1></div><div style="display:flex;align-items:center;gap:10px"><div><b>${esc(profile.displayName || user.email)}</b><div class="muted" style="font-size:.8rem">${esc(user.email || "")}</div></div><div class="avatar">${esc(initials(profile.displayName))}</div></div></header><section id="view"></section></main></div>`;
    document.querySelectorAll("[data-view]").forEach(
      (b) =>
        (b.onclick = () => {
          activeView = b.dataset.view;
          renderShell();
        }),
    );
    renderView();
  }
  async function renderView() {
    const v = document.getElementById("view");
    v.innerHTML = '<div class="spinner"></div>';
    try {
      if (activeView === "home") await home(v);
      if (activeView === "courses") await courses(v);
      if (activeView === "templates") await templates(v);
      if (activeView === "people") await people(v);
      if (activeView === "marketplace") await marketplace(v);
      if (activeView === "chat") await chat(v);
      if (activeView === "family") await familySpace(v);
      if (activeView === "notebooks") await notebooks(v);
      if (activeView === "calendar") await calendarPage(v);
      if (activeView === "sportsHub") await sportsHub(v);
      if (activeView === "entertainment") await entertainment(v);
      if (activeView === "help") await helpCenter(v);
      if (activeView === "settings") await settings(v);
    } catch (e) {
      v.innerHTML = `<div class="error">${esc(errText(e))}</div>`;
    }
  }
  function localWeatherIcon(text=""){const t=String(text).toLowerCase();if(t.includes("thunder"))return"⛈️";if(/snow|sleet|ice/.test(t))return"❄️";if(/rain|shower/.test(t))return"🌧️";if(/fog|haze/.test(t))return"🌫️";if(/cloud|overcast/.test(t))return"☁️";if(/partly|mostly sunny/.test(t))return"🌤️";if(/sunny|clear/.test(t))return"☀️";return"🌡️"}
  function normalizeWeatherKey(v){const r=String(v||"Okmulgee, OK").trim().toLowerCase(),a={"okmulgee":"okmulgee, ok","tulsa":"tulsa, ok","bixby":"bixby, ok","stillwater":"stillwater, ok","oklahoma city":"oklahoma city, ok"};return a[r]||r}
  async function loadLocalWeatherData(){const r=await fetch(`./weather-data.json?_=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`Local weather file returned ${r.status}`);return r.json()}

  async function travelFetchJson(url, label) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`${label} returned ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("json")) {
      throw new Error(`${label} did not return JSON`);
    }
    return response.json();
  }

  async function getTravelForecast(coords) {
    const lat = Number(coords.latitude).toFixed(4);
    const lon = Number(coords.longitude).toFixed(4);
    const point = await travelFetchJson(
      `https://api.weather.gov/points/${lat},${lon}`,
      "National Weather Service"
    );
    const props = point.properties || {};
    const [daily, hourly] = await Promise.all([
      travelFetchJson(props.forecast, "NWS daily forecast"),
      travelFetchJson(props.forecastHourly, "NWS hourly forecast")
    ]);
    return {
      name: props.relativeLocation?.properties?.city || "Current location",
      state: props.relativeLocation?.properties?.state || "",
      current: (hourly.properties?.periods || [])[0] || null,
      periods: (daily.properties?.periods || []).slice(0, 14),
      source: "Live GPS · weather.gov"
    };
  }

  function buildTravelDays(periods) {
    return (periods || []).slice(0, 14).reduce((items, period) => {
      const key = String(period.startTime || "").slice(0, 10);
      let day = items.find(item => item.key === key);
      if (!day) {
        day = {
          key,
          label: items.length
            ? new Date(`${key}T12:00`).toLocaleDateString([], { weekday: "short" })
            : "Today",
          text: period.shortForecast,
          high: null,
          low: null,
          rain: 0
        };
        items.push(day);
      }
      if (period.isDaytime) day.high = period.temperature;
      else day.low = period.temperature;
      day.rain = Math.max(day.rain, period.probabilityOfPrecipitation?.value || 0);
      return items;
    }, []).slice(0, 7);
  }

  async function loadLiveWeather(options = {}) {
    const box = document.getElementById("liveWeatherCard");
    if (!box) return;

    const travelMode = options.travel === true || profile.weatherMode === "travel";
    box.innerHTML = `<div class="weather-loading"><div class="spinner small-spinner"></div><p class="muted">${travelMode ? "Getting your current location…" : "Loading the latest saved forecast…"}</p></div>`;

    try {
      let weather;
      let current;
      let days;
      let data = null;
      let selectedKey = null;

      if (travelMode) {
        if (!navigator.geolocation) {
          throw new Error("This browser does not support location services.");
        }
        const coords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            position => resolve(position.coords),
            () => reject(new Error("Location permission was not granted.")),
            { timeout: 12000, maximumAge: 300000 }
          );
        });
        weather = await getTravelForecast(coords);
        current = weather.current || weather.periods[0] || {};
        days = buildTravelDays(weather.periods);
      } else {
        data = await loadLocalWeatherData();
        const requested = normalizeWeatherKey(profile.weather);
        selectedKey = data.locations?.[requested] ? requested : "okmulgee, ok";
        weather = data.locations?.[selectedKey];
        if (!weather || !weather.periods?.length) {
          throw new Error(weather?.error || weather?.message || "Run Update Weather Data once in GitHub Actions.");
        }
        current = weather.current || weather.periods[0] || {};
        days = buildTravelDays(weather.periods);
      }

      const cards = days.map(day => `
        <div class="forecast-day">
          <small>${esc(day.label)}</small>
          <span class="forecast-icon">${localWeatherIcon(day.text)}</span>
          <b>${day.high ?? "—"}°</b>
          <span>${day.low ?? "—"}°</span>
          <small>${day.rain}% rain</small>
        </div>`).join("");

      box.innerHTML = `
        <div class="weather-toolbar">
          <div class="weather-place">
            <b>${esc(weather.name)}, ${esc(weather.state || "")}</b>
            <small>${travelMode ? "Live GPS · weather.gov" : "GitHub cached · weather.gov"}</small>
          </div>
          <div class="actions">
            <button class="btn ghost" id="weatherHomeMode">Home weather</button>
            <button class="btn ghost" id="weatherTravelMode">Travel mode</button>
            <button class="btn ghost" id="weatherRefresh">Refresh</button>
            ${travelMode ? "" : '<button class="btn ghost" id="weatherSearch">Change city</button>'}
          </div>
        </div>
        <div class="weather-current-v8">
          <div class="weather-main">
            <span class="weather-big-icon">${localWeatherIcon(current.shortForecast)}</span>
            <div>
              <div class="weather-temp">${current.temperature ?? "—"}°</div>
              <b>${esc(current.shortForecast || "Current conditions")}</b>
            </div>
          </div>
          <div class="weather-details">
            <div><span>Humidity</span><b>${current.relativeHumidity?.value ?? "—"}%</b></div>
            <div><span>Wind</span><b>${esc(String(current.windSpeed || "—"))}</b></div>
            <div><span>Rain chance</span><b>${current.probabilityOfPrecipitation?.value ?? 0}%</b></div>
            <div><span>Mode</span><b>${travelMode ? "Travel" : "Home"}</b></div>
            <div><span>Location</span><b>${travelMode ? "Device GPS" : "Saved city"}</b></div>
            <div><span>Refresh</span><b>${travelMode ? "On demand" : "Hourly"}</b></div>
          </div>
        </div>
        <div class="forecast-strip forecast-seven">${cards}</div>
        <div class="data-credit">${travelMode ? "Travel mode follows your current device location." : "Home mode uses the reliable GitHub-cached forecast."}</div>`;

      document.getElementById("weatherHomeMode").onclick = async () => {
        profile.weatherMode = "home";
        await db.ref(`users/${user.uid}/weatherMode`).set("home");
        loadLiveWeather({ travel: false });
      };

      document.getElementById("weatherTravelMode").onclick = async () => {
        profile.weatherMode = "travel";
        await db.ref(`users/${user.uid}/weatherMode`).set("travel");
        loadLiveWeather({ travel: true });
      };

      document.getElementById("weatherRefresh").onclick = () => {
        loadLiveWeather({ travel: travelMode });
      };

      const searchButton = document.getElementById("weatherSearch");
      if (searchButton) {
        searchButton.onclick = () => {
          const optionsHtml = Object.entries(data.locations || {}).map(([key, city]) =>
            `<option value="${esc(key)}" ${key === selectedKey ? "selected" : ""}>${esc(city.name)}, ${esc(city.state)}</option>`
          ).join("");
          modal(`<h2>Change home weather city</h2><div class="field"><select id="weatherCityInput">${optionsHtml}</select></div><div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveWeatherCity">Save</button></div>`);
          document.getElementById("saveWeatherCity").onclick = async () => {
            profile.weather = document.getElementById("weatherCityInput").value;
            profile.weatherMode = "home";
            await db.ref(`users/${user.uid}`).update({
              weather: profile.weather,
              weatherMode: "home"
            });
            closeModal();
            loadLiveWeather({ travel: false });
          };
        };
      }
    } catch (error) {
      box.innerHTML = `<div class="error compact">${esc(errText(error))}</div><div class="actions"><button class="btn ghost" id="weatherRetry">Try again</button><button class="btn ghost" id="weatherUseHome">Use home weather</button></div><p class="muted">Travel mode needs GPS permission and live access to weather.gov. Home mode remains available.</p>`;
      document.getElementById("weatherRetry").onclick = () => loadLiveWeather(options);
      document.getElementById("weatherUseHome").onclick = async () => {
        profile.weatherMode = "home";
        await db.ref(`users/${user.uid}/weatherMode`).set("home");
        loadLiveWeather({ travel: false });
      };
    }
  }

  const SPORTS_CATALOG = {
    "OKC Thunder": {sport:"basketball",league:"nba",id:"25"},
    "Oklahoma Sooners Football": {sport:"football",league:"college-football",id:"201"},
    "Oklahoma Sooners Basketball": {sport:"basketball",league:"mens-college-basketball",id:"201"},
    "Oklahoma State Football": {sport:"football",league:"college-football",id:"197"},
    "Oklahoma State Basketball": {sport:"basketball",league:"mens-college-basketball",id:"197"},
    "Dallas Cowboys": {sport:"football",league:"nfl",id:"6"},
    "Kansas City Chiefs": {sport:"football",league:"nfl",id:"12"},
    "Texas Rangers": {sport:"baseball",league:"mlb",id:"13"},
    "St. Louis Cardinals": {sport:"baseball",league:"mlb",id:"24"},
    "Dallas Stars": {sport:"hockey",league:"nhl",id:"9"}
  };
  function normalizedSportsTeams() {
    const saved = Array.isArray(profile.sportsTeams) ? profile.sportsTeams : [];
    if (saved.length) return saved.filter(x=>x && x.label && x.sport && x.league && x.id);
    const legacy = safeArray(profile.favoriteTeams);
    const out=[];
    legacy.forEach(label=>{
      if (label === "Oklahoma Sooners") {
        out.push({label:"Oklahoma Sooners Football",...SPORTS_CATALOG["Oklahoma Sooners Football"]},{label:"Oklahoma Sooners Basketball",...SPORTS_CATALOG["Oklahoma Sooners Basketball"]});
      } else if (label === "Oklahoma State Cowboys") {
        out.push({label:"Oklahoma State Football",...SPORTS_CATALOG["Oklahoma State Football"]},{label:"Oklahoma State Basketball",...SPORTS_CATALOG["Oklahoma State Basketball"]});
      } else if (SPORTS_CATALOG[label]) out.push({label,...SPORTS_CATALOG[label]});
    });
    return out;
  }
  function sportsTeamKey(t){ return `${t.sport}|${t.league}|${t.id}`; }
  function gameFromEvent(event, teamLabel) {
    const comp = event?.competitions?.[0];
    const competitors = comp?.competitors || [];
    if (!comp || !competitors.length) return null;
    const mine = competitors.find(x => (x.team?.displayName || "").toLowerCase().includes(teamLabel.replace("OKC ","Oklahoma City ").toLowerCase().split(" ")[0])) || competitors[0];
    const other = competitors.find(x => x !== mine) || competitors[1];
    const state = event.status?.type?.state || "pre";
    const detail = event.status?.type?.shortDetail || event.status?.type?.detail || "Scheduled";
    return {name:event.name || teamLabel, date:event.date, state, detail, mine:mine?.score, other:other?.score, opponent:other?.team?.shortDisplayName || other?.team?.displayName || "Opponent"};
  }
  async function fetchTeamSchedule(team) {
    const data = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(team.sport)}/${encodeURIComponent(team.league)}/teams/${encodeURIComponent(team.id)}/schedule`).then(r=>r.ok?r.json():Promise.reject(new Error("Score feed unavailable")));
    const games=[];
    (data.events || []).forEach(e=>{ const g=gameFromEvent(e,team.label); if(g) games.push(g); });
    games.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const nowMs=Date.now();
    return games.find(g=>g.state==="in") || games.find(g=>new Date(g.date).getTime()>=nowMs-3*60*60*1000 && g.state!=="post") || [...games].reverse().find(g=>g.state==="post") || null;
  }
  async function loadSportsScores() {
    const box = document.getElementById("sportsScores");
    if (!box) return;
    const teams = normalizedSportsTeams();
    if (!teams.length) { box.innerHTML = '<div class="empty compact">Choose teams in Sports Hub or My Space.</div>'; return; }
    const rows=[];
    for (const team of teams.slice(0,8)) {
      try { rows.push({team,game:await fetchTeamSchedule(team)}); }
      catch (_) { rows.push({team,game:null,error:true}); }
    }
    box.innerHTML = rows.map(({team,game,error}) => game ? `<div class="score-row"><div><b>${esc(team.label)}</b><div class="muted">vs ${esc(game.opponent)} · ${esc(game.detail)}</div></div><div class="score-value">${game.state==="pre" ? new Date(game.date).toLocaleDateString([], {month:"short",day:"numeric"}) : `${esc(game.mine ?? "-")}–${esc(game.other ?? "-")}`}</div></div>` : `<div class="score-row"><div><b>${esc(team.label)}</b><div class="muted">${error?"Feed unavailable":"No current game found"}</div></div></div>`).join("") + '<div class="data-credit">Scores and schedules supplied by ESPN public web feeds. Availability varies by league.</div>';
  }
  async function sportsHub(v) {
    const selected=normalizedSportsTeams();
    const selectedKeys=new Set(selected.map(sportsTeamKey));
    const presets=Object.entries(SPORTS_CATALOG).map(([label,t])=>({label,...t}));
    v.innerHTML=`<div class="page-heading"><div><h2>Sports Hub</h2><p class="muted">Build your own sports dashboard. Add presets or connect another ESPN-supported team using its sport, league, and team ID.</p></div><button class="btn primary" id="saveSports">Save Sports</button></div>
      <div class="grid two"><section class="panel"><h3>Quick Add Teams</h3><div class="check-grid">${presets.map((t,i)=>`<label><input type="checkbox" class="sportsPreset" data-index="${i}" ${selectedKeys.has(sportsTeamKey(t))?"checked":""}> ${esc(t.label)}</label>`).join("")}</div></section>
      <section class="panel"><h3>Add Any Supported Team</h3><p class="muted">One team per line: Display Name | sport | league | ESPN team ID</p><textarea id="customSports" rows="10" placeholder="Example: Dallas Mavericks | basketball | nba | 6">${esc(selected.filter(t=>!presets.some(p=>sportsTeamKey(p)===sportsTeamKey(t))).map(t=>`${t.label} | ${t.sport} | ${t.league} | ${t.id}`).join("\n"))}</textarea><p class="muted">Examples of league codes: nba, nfl, mlb, nhl, college-football, mens-college-basketball, womens-college-basketball, eng.1. The public score feed may not support every sport.</p></section></div>
      <section class="panel"><h3>Your Current Sports Cards</h3><div id="sportsScores"><div class="spinner small-spinner"></div><p class="muted">Loading…</p></div></section>`;
    loadSportsScores();
    document.getElementById("saveSports").onclick=async()=>{
      try {
        const teams=[];
        document.querySelectorAll(".sportsPreset:checked").forEach(x=>teams.push(presets[Number(x.dataset.index)]));
        const custom=document.getElementById("customSports").value.split(/\n+/).map(line=>{
          const p=line.split("|").map(x=>x.trim());
          return {label:p[0],sport:p[1],league:p[2],id:p[3]};
        }).filter(t=>t.label&&t.sport&&t.league&&t.id&&/^[a-z0-9._-]+$/i.test(t.sport)&&/^[a-z0-9._-]+$/i.test(t.league)&&/^[a-z0-9._-]+$/i.test(t.id));
        custom.forEach(t=>{if(!teams.some(x=>sportsTeamKey(x)===sportsTeamKey(t))) teams.push(t);});
        profile.sportsTeams=teams;
        await db.ref(`users/${user.uid}/sportsTeams`).set(teams);
        toast("Sports Hub saved");
        sportsHub(v);
      } catch(e){ toast(errText(e)); }
    };
  }
  function imageFileToBackground(file) {
    return new Promise((resolve,reject)=>{
      if (!file || !file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error("Could not read image."));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error("Unsupported image."));
        img.onload=()=>{
          const maxW=1600,maxH=1000,scale=Math.min(1,maxW/img.width,maxH/img.height);
          const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
          canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
          const data=canvas.toDataURL("image/jpeg",.78);
          if (data.length>900000) return reject(new Error("The compressed picture is still too large. Choose a smaller image."));
          resolve(data);
        }; img.src=reader.result;
      }; reader.readAsDataURL(file);
    });
  }

  async function home(v) {
    const memberships =
      (await db.ref(`userCourses/${user.uid}`).once("value")).val() || {};
    const courseIds = Object.keys(memberships);
    let courseCount = 0;
    const announcements = [];
    for (const id of courseIds) {
      const [cs, as] = await Promise.all([
        db.ref(`courses/${id}`).once("value"),
        db.ref(`courseAnnouncements/${id}`).limitToLast(5).once("value"),
      ]);
      const c = cs.val();
      if (c?.status === "active" || !c?.status) courseCount++;
      Object.entries(as.val() || {}).forEach(([aid, a]) =>
        announcements.push({
          id: aid,
          courseId: id,
          course: c?.name || "Course",
          ...a,
        }),
      );
    }
    const visibleNow = Date.now();
    const visibleAnnouncements = announcements.filter(a => (!a.publishAt || a.publishAt <= visibleNow) && (!a.expiresAt || a.expiresAt > visibleNow) && (a.audience !== "faculty" || isFacultyRole()));
    visibleAnnouncements.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const enabledWidgets = safeArray(profile.widgets).length
      ? safeArray(profile.widgets)
      : ["courses","announcements","calendar","weather","quicklinks","notes","tasks","notebook","entertainment"];
    const preferredOrder = safeArray(profile.widgetOrder);
    const widgets = [
      ...preferredOrder.filter((x) => enabledWidgets.includes(x)),
      ...enabledWidgets.filter((x) => !preferredOrder.includes(x)),
    ];
    const links = Array.isArray(profile.quickLinks) ? profile.quickLinks : [];
    const tasks = Array.isArray(profile.tasks) ? profile.tasks : [];
    const events = Array.isArray(profile.events) ? profile.events : [];
    const cards = {
      courses: `<article class="panel widget"><div class="muted">Active courses</div><div class="stat">${courseCount}</div><button class="btn ghost" data-home-view="courses">Open courses</button></article>`,
      announcements: `<article class="panel widget wide"><div class="widget-head"><h3>Announcements</h3></div>${
        visibleAnnouncements.length
          ? visibleAnnouncements
              .slice(0, 6)
              .map(
                (a) =>
                  `<div class="mini-row announcement-${esc(a.priority||"normal")}"><div><b>${esc(a.title || "Announcement")}</b><div class="muted">${esc(a.course)} · ${esc(a.body || "")}</div>${a.attachmentUrl?`<a target="_blank" rel="noopener" href="${esc(a.attachmentUrl)}">Open attachment</a>`:""}</div><span class="tag">${esc(a.priority||"normal")}</span></div>`,
              )
              .join("")
          : '<div class="empty compact">No new announcements.</div>'
      }</article>`,
      calendar: `<article class="panel widget wide"><div class="widget-head"><h3>Personal Calendar</h3><div class="actions"><button class="btn tiny" data-home-view="calendar">View Calendar</button><button class="btn tiny" id="addEvent">+ Event</button></div></div>${
        events.length
          ? events
              .slice()
              .sort((a, b) => String(a.date).localeCompare(String(b.date)))
              .slice(0, 5)
              .map(
                (e, i) =>
                  `<div class="mini-row"><div><b>${esc(e.title)}</b><div class="muted">${esc(e.date)} ${esc(e.time || "")}</div></div><button class="icon-btn" data-del-event="${i}" aria-label="Delete">×</button></div>`,
              )
              .join("")
          : '<div class="empty compact">No personal events yet.</div>'
      }</article>`,
      weather: `<article class="panel widget wide"><div class="widget-head"><h3>Live Weather</h3><span class="tag">${esc(profile.weather || "Set location")}</span></div><div id="liveWeatherCard"><div class="spinner small-spinner"></div><p class="muted">Loading current weather…</p></div></article>`,
      quicklinks: `<article class="panel widget"><h3>Quick links</h3><div class="link-stack">${
        links
          .filter((l) => l?.label && l?.url)
          .map(
            (l) =>
              `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(l.url)}">${esc(l.label)}</a>`,
          )
          .join("") || '<p class="muted">Add links in My Space.</p>'
      }</div></article>`,
      notes: `<article class="panel widget wide"><h3>Private notebook</h3><textarea id="homeNotes" placeholder="Write a quick note…">${esc(profile.notes || "")}</textarea><button class="btn ghost" id="saveNotes">Save note</button></article>`,
      sports: `<article class="panel widget wide"><div class="widget-head"><h3>Live Sports</h3><span class="tag">Scores & schedules</span></div><div id="sportsScores"><div class="spinner small-spinner"></div><p class="muted">Loading your teams…</p></div></article>`,
      search: `<article class="panel widget wide"><h3>Google Search</h3><form id="googleSearch" class="search-row"><input id="searchQuery" placeholder="Search the web"><button class="btn primary">Search</button></form></article>`,
      tasks: `<article class="panel widget wide"><div class="widget-head"><h3>Tasks</h3><button class="btn tiny" id="addTask">+ Task</button></div>${tasks.length ? tasks.map((t, i) => `<div class="mini-row ${t.done ? "done" : ""}"><label><input type="checkbox" data-task-toggle="${i}" ${t.done ? "checked" : ""}> ${esc(t.text)}</label><button class="icon-btn" data-del-task="${i}" aria-label="Delete">×</button></div>`).join("") : '<div class="empty compact">No tasks yet.</div>'}</article>`,
      notebook: `<article class="panel widget"><h3>Notebook</h3><p class="muted">Type notes or draw with a mouse, finger, or tablet stylus.</p><button class="btn ghost" data-home-view="notebooks">Open notebooks</button></article>`,
      entertainment: `<article class="panel widget"><h3>Entertainment</h3><p class="muted">Your streaming, music, and video shortcuts.</p><button class="btn ghost" data-home-view="entertainment">Open entertainment</button></article>`,
      "AI assistant": `<article class="panel widget"><h3>AI Assistant</h3><p class="muted">Open ChatGPT with a classroom-focused starter prompt.</p><a class="btn ghost" target="_blank" rel="noopener" href="https://chatgpt.com/">Open Assistant</a></article>`,
    };
    v.innerHTML = `<div class="home-hero ${esc(profile.backgroundImage ? "custom-background" : (profile.wallpaper || "gradient"))}" id="homeHero"><div><div class="muted">PRO HUB X 7.0</div><h2>${esc(profile.displayName || user.email)}</h2><p>Your personal workspace and classroom connection in one place.</p></div><span class="role-pill">${esc(profile.facultyRequestStatus === "pending" && role === "student" ? "Faculty approval pending" : roleLabel())}</span></div><div class="widget-grid">${widgets.map((w) => cards[w] || "").join("")}</div>`;
    if (profile.backgroundImage) document.getElementById("homeHero").style.backgroundImage = `linear-gradient(90deg,rgba(4,12,24,.82),rgba(4,12,24,.35)),url("${profile.backgroundImage.replace(/"/g, "%22")}")`;
    loadLiveWeather();
    loadSportsScores();
    document.querySelectorAll("[data-home-view]").forEach(
      (b) =>
        (b.onclick = () => {
          activeView = b.dataset.homeView;
          renderShell();
        }),
    );
    document
      .getElementById("saveNotes")
      ?.addEventListener("click", async () => {
        profile.notes = document.getElementById("homeNotes").value;
        await db.ref(`users/${user.uid}/notes`).set(profile.notes);
        toast("Note saved");
      });
    document.getElementById("googleSearch")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("searchQuery").value.trim();
      if (q)
        window.open(
          "https://www.google.com/search?q=" + encodeURIComponent(q),
          "_blank",
          "noopener",
        );
    });
    document.getElementById("addTask")?.addEventListener("click", () => {
      modal(
        `<h2>Add task</h2><div class="field"><label>Task</label><input id="newTaskText"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveTask">Add</button></div>`,
      );
      document.getElementById("saveTask").onclick = async () => {
        const text = document.getElementById("newTaskText").value.trim();
        if (!text) return;
        profile.tasks = [
          ...tasks,
          { text, done: false, createdAt: Date.now() },
        ];
        await db.ref(`users/${user.uid}/tasks`).set(profile.tasks);
        closeModal();
        home(v);
      };
    });
    document.querySelectorAll("[data-task-toggle]").forEach(
      (x) =>
        (x.onchange = async () => {
          tasks[+x.dataset.taskToggle].done = x.checked;
          profile.tasks = tasks;
          await db.ref(`users/${user.uid}/tasks`).set(tasks);
          home(v);
        }),
    );
    document.querySelectorAll("[data-del-task]").forEach(
      (x) =>
        (x.onclick = async () => {
          tasks.splice(+x.dataset.delTask, 1);
          profile.tasks = tasks;
          await db.ref(`users/${user.uid}/tasks`).set(tasks);
          home(v);
        }),
    );
    document.getElementById("addEvent")?.addEventListener("click", () => {
      modal(
        `<h2>Add personal event</h2><div class="field"><label>Title</label><input id="eventTitle"></div><div class="grid two"><div class="field"><label>Date</label><input id="eventDate" type="date"></div><div class="field"><label>Time</label><input id="eventTime" type="time"></div></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveEvent">Add</button></div>`,
      );
      document.getElementById("saveEvent").onclick = async () => {
        const title = document.getElementById("eventTitle").value.trim(),
          date = document.getElementById("eventDate").value;
        if (!title || !date) return;
        profile.events = [
          ...events,
          { title, date, time: document.getElementById("eventTime").value },
        ];
        await db.ref(`users/${user.uid}/events`).set(profile.events);
        closeModal();
        home(v);
      };
    });
    document.querySelectorAll("[data-del-event]").forEach(
      (x) =>
        (x.onclick = async () => {
          events.splice(+x.dataset.delEvent, 1);
          profile.events = events;
          await db.ref(`users/${user.uid}/events`).set(events);
          home(v);
        }),
    );
  }
  async function courses(v) {
    const ids = Object.keys(
      (await db.ref(`userCourses/${user.uid}`).once("value")).val() || {},
    );
    const data = [];
    for (const id of ids) {
      const s = await db.ref(`courses/${id}`).once("value");
      if (s.exists()) data.push({ id, ...s.val() });
    }
    const active = data.filter((c) => (c.status || "active") === "active"),
      archived = data.filter((c) => c.status === "archived");
    v.innerHTML = `<div class="actions"><button class="btn" id="joinCourse">Join with Code</button>${isFacultyRole() ? '<button class="btn primary" id="newCourse">Create Semester Course</button>' : ""}</div><h3 style="margin-top:18px">Current Courses</h3><div class="list">${active.length ? active.map((c) => `<div class="item"><div><b>${esc(c.name)}</b><div class="muted">${esc(c.term || "")} · ${esc(c.section || "")}</div></div><div><span class="tag">active</span> <button class="btn ghost" data-open-course="${c.id}">Open</button></div></div>`).join("") : '<div class="empty">No active courses yet.</div>'}</div><h3 style="margin-top:22px">Archived Courses</h3><div class="list">${archived.length ? archived.map((c) => `<div class="item"><div><b>${esc(c.name)}</b><div class="muted">${esc(c.term || "")} · ${esc(c.section || "")}</div></div><button class="btn ghost" data-open-course="${c.id}">Review</button></div>`).join("") : '<div class="empty">No archived courses.</div>'}</div>`;
    document.getElementById("joinCourse").onclick = () => showJoin();
    document
      .getElementById("newCourse")
      ?.addEventListener("click", showCreateCourse);
    document
      .querySelectorAll("[data-open-course]")
      .forEach((b) => (b.onclick = () => openCourse(b.dataset.openCourse)));
  }
  function showJoin(prefill = "") {
    modal(
      `<h2>Join a course</h2><div class="field"><label>Six-character join code</label><input id="joinCode" maxlength="6" value="${esc(prefill)}"></div><div id="joinErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="doJoin">Join</button></div>`,
    );
    document.getElementById("doJoin").onclick = async () => {
      try {
        const code = document
          .getElementById("joinCode")
          .value.trim()
          .toUpperCase();
        const s = await db.ref(`joinCodes/${code}`).once("value");
        if (!s.exists()) throw new Error("Join code not found.");
        const cid = s.val();
        await db.ref().update({
          [`courseMembers/${cid}/${user.uid}`]: "student",
          [`userCourses/${user.uid}/${cid}`]: true,
        });
        closeModal();
        toast("Course joined");
        renderView();
      } catch (e) {
        document.getElementById("joinErr").innerHTML =
          `<div class="error">${esc(errText(e))}</div>`;
      }
    };
  }
  function randomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
  async function uniqueJoinCode() {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = randomCode();
      const snap = await db.ref(`joinCodes/${code}`).once("value");
      if (!snap.exists()) return code;
    }
    throw new Error("Could not generate a unique join code. Please try again.");
  }
  function showCreateCourse() {
    modal(
      `<h2>Create a fresh semester course</h2><div class="grid two"><div class="field"><label>Course name</label><input id="ccName" placeholder="ETDE 1363 Devices & Standards"></div><div class="field"><label>Semester</label><input id="ccTerm" value="Fall 2026"></div><div class="field"><label>Section</label><input id="ccSection" placeholder="001"></div><div class="field"><label>Template ID (optional)</label><input id="ccTemplate"></div></div><div id="ccErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="ccGo">Create</button></div>`,
    );
    document.getElementById("ccGo").onclick = async () => {
      const err = document.getElementById("ccErr");
      try {
        const name = document.getElementById("ccName").value.trim(),
          term = document.getElementById("ccTerm").value.trim(),
          section = document.getElementById("ccSection").value.trim();
        if (!name || !term)
          throw new Error("Course name and semester are required.");
        const ref = db.ref("courses").push();
        const id = ref.key,
          code = await uniqueJoinCode(),
          course = {
            name,
            term,
            section,
            ownerUid: user.uid,
            templateId:
              document.getElementById("ccTemplate").value.trim() || null,
            status: "active",
            joinCode: code,
            createdAt: now(),
          };
        await ref.set(course);
        try {
          await db.ref(`courseMembers/${id}/${user.uid}`).set("instructor");
          await db.ref(`userCourses/${user.uid}/${id}`).set(true);
          await db.ref(`joinCodes/${code}`).set(id);
        } catch (e) {
          await Promise.allSettled([
            ref.remove(),
            db.ref(`courseMembers/${id}/${user.uid}`).remove(),
            db.ref(`userCourses/${user.uid}/${id}`).remove(),
            db.ref(`joinCodes/${code}`).remove(),
          ]);
          throw e;
        }
        closeModal();
        toast("Course created");
        renderView();
      } catch (e) {
        err.innerHTML = `<div class="error">${esc(errText(e))}</div>`;
      }
    };
  }
  async function openCourse(id) {
    const [cSnap, mSnap, aSnap] = await Promise.all([
      db.ref(`courses/${id}`).once("value"),
      db.ref(`courseMembers/${id}/${user.uid}`).once("value"),
      db.ref(`courseAnnouncements/${id}`).limitToLast(20).once("value"),
    ]);
    const c = cSnap.val();
    if (!c) return;
    const memberRole = mSnap.val(),
      canManage = isAdminRole() || memberRole === "instructor";
    const joinUrl = location.href.split("#")[0] + "#join=" + c.joinCode;
    const anns = aSnap.val() || {};
    const courseNow = Date.now();
    const displayedAnns = Object.entries(anns).filter(([,a]) => canManage || ((!a.publishAt || a.publishAt <= courseNow) && (!a.expiresAt || a.expiresAt > courseNow) && a.audience !== "faculty"));
    modal(
      `<h2>${esc(c.name)}</h2><p class="muted">${esc(c.term)} · ${esc(c.section)}</p><div class="grid two"><div><h3>Enrollment</h3><div class="field"><label>Join code</label><input readonly value="${esc(c.joinCode)}"></div><button class="btn ghost" id="copyJoin">Copy enrollment link</button></div><div><img class="qr" alt="Course QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}"></div></div><hr><div class="widget-head"><h3>Announcements</h3>${canManage && c.status === "active" ? '<button class="btn tiny" id="newAnnouncement">+ Announcement</button>' : ""}</div><div class="list">${
        displayedAnns
          .reverse()
          .map(
            ([aid, a]) =>
              `<div class="item announcement-${esc(a.priority||"normal")}"><div><div class="actions"><b>${esc(a.title)}</b><span class="tag">${esc(a.priority||"normal")}</span>${canManage&&a.publishAt>Date.now()?'<span class="tag">scheduled</span>':''}</div><div class="muted">${esc(a.body || "")}</div>${a.attachmentUrl?`<a target="_blank" rel="noopener" href="${esc(a.attachmentUrl)}">Open attachment/resource</a>`:""}${canManage&&a.publishAt?`<small class="muted">Publishes ${new Date(a.publishAt).toLocaleString()}</small>`:""}</div>${canManage ? `<button class="icon-btn" data-del-ann="${aid}">×</button>` : ""}</div>`,
          )
          .join("") || '<div class="empty compact">No announcements yet.</div>'
      }</div><div class="actions"><button class="btn" onclick="closeModal()">Close</button>${canManage && c.status === "active" ? '<button class="btn danger" id="archiveCourse">Archive Semester</button>' : ""}</div>`,
    );
    document.getElementById("copyJoin").onclick = async () => {
      await navigator.clipboard.writeText(joinUrl);
      toast("Enrollment link copied");
    };
    document
      .getElementById("newAnnouncement")
      ?.addEventListener("click", () => {
        closeModal();
        modal(
          `<h2>New announcement</h2><div class="field"><label>Title</label><input id="annTitle"></div><div class="field"><label>Message</label><textarea id="annBody"></textarea></div><div class="grid two"><div class="field"><label>Priority</label><select id="annPriority"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div class="field"><label>Audience</label><select id="annAudience"><option value="all">Entire course</option><option value="students">Students</option><option value="faculty">Course faculty</option></select></div><div class="field"><label>Publish date/time (optional)</label><input id="annPublish" type="datetime-local"></div><div class="field"><label>Expire date/time (optional)</label><input id="annExpire" type="datetime-local"></div></div><div class="field"><label>Attachment or resource URL (optional)</label><input id="annAttachment" type="url" placeholder="https://..."></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveAnn">Post announcement</button></div>`,
        );
        document.getElementById("saveAnn").onclick = async () => {
          const title = document.getElementById("annTitle").value.trim();
          if (!title) return;
          await db.ref(`courseAnnouncements/${id}`).push({
            title,
            body: document.getElementById("annBody").value.trim(),
            priority: document.getElementById("annPriority")?.value || "normal",
            audience: document.getElementById("annAudience")?.value || "all",
            publishAt: document.getElementById("annPublish")?.value ? new Date(document.getElementById("annPublish").value).getTime() : Date.now(),
            expiresAt: document.getElementById("annExpire")?.value ? new Date(document.getElementById("annExpire").value).getTime() : null,
            attachmentUrl: document.getElementById("annAttachment")?.value.trim() || "",
            authorUid: user.uid,
            authorName: profile.displayName || user.email,
            createdAt: now(),
          });
          closeModal();
          toast("Announcement posted");
        };
      });
    document.querySelectorAll("[data-del-ann]").forEach(
      (b) =>
        (b.onclick = async () => {
          await db
            .ref(`courseAnnouncements/${id}/${b.dataset.delAnn}`)
            .remove();
          closeModal();
          toast("Announcement deleted");
        }),
    );
    document
      .getElementById("archiveCourse")
      ?.addEventListener("click", async () => {
        if (
          !confirm(
            "Archive this course? Students, chat, and records stay preserved.",
          )
        )
          return;
        await db.ref(`courses/${id}/status`).set("archived");
        if (c.joinCode) await db.ref(`joinCodes/${c.joinCode}`).remove();
        closeModal();
        toast("Course archived");
        renderView();
      });
  }
  async function templates(v) {
    const all =
      (await db.ref(`templates/${user.uid}`).once("value")).val() || {};
    v.innerHTML = `<div class="actions"><button class="btn primary" id="newTemplate">New Course Template</button></div><div class="list" style="margin-top:16px">${
      Object.entries(all)
        .map(
          ([id, t]) =>
            `<div class="item"><div><b>${esc(t.name)}</b><div class="muted">Reusable materials; no students or chat</div></div><span class="tag">Private</span></div>`,
        )
        .join("") ||
      '<div class="empty">Create a reusable course template for materials used across semesters.</div>'
    }</div>`;
    document.getElementById("newTemplate").onclick = () => {
      modal(
        `<h2>New course template</h2><div class="field"><label>Name</label><input id="tName"></div><div class="field"><label>Description</label><textarea id="tDesc"></textarea></div><div id="tErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="tSave">Save</button></div>`,
      );
      document.getElementById("tSave").onclick = async () => {
        try {
          await db.ref(`templates/${user.uid}`).push({
            name: document.getElementById("tName").value.trim(),
            description: document.getElementById("tDesc").value.trim(),
            ownerUid: user.uid,
            createdAt: now(),
          });
          closeModal();
          renderView();
        } catch (e) {
          document.getElementById("tErr").innerHTML =
            `<div class="error">${esc(errText(e))}</div>`;
        }
      };
    };
  }
  async function people(v) {
    const [usersSnap, rolesSnap, requestsSnap, directorySnap] = await Promise.all([
      db.ref("users").once("value"),
      db.ref("roles").once("value"),
      db.ref("facultyRequests").once("value"),
      db.ref("facultyDirectory").once("value"),
    ]);
    const us = usersSnap.val() || {}, rs = rolesSnap.val() || {};
    const requests = requestsSnap.val() || {}, directory = directorySnap.val() || {};
    const pending = Object.entries(requests).filter(([,x]) => x.status === "pending");
    const faculty = Object.entries(us).filter(([uid]) => ["ta","instructor","chair","assistant_dean","admin"].includes(rs[uid]));
    const students = Object.entries(us).filter(([uid]) => !rs[uid] || rs[uid] === "student");
    const accountRow = ([uid,p]) => `<div class="item"><div><b>${esc(p.displayName || p.email)}</b><div class="muted">${esc(p.email || "")} ${p.department ? `· ${esc(p.department)}` : ""}</div></div><div class="actions"><span class="tag">${esc(rs[uid] || "student")}</span>${uid !== user.uid ? `<button class="btn ghost" data-role-uid="${uid}" data-current="${esc(rs[uid] || "student")}">Manage</button><button class="btn danger" data-delete-person="${uid}" data-person-name="${esc(p.displayName || p.email || "Account")}" data-person-email="${esc(p.email || "")}">Delete</button>` : ""}</div></div>`;
    v.innerHTML = `<div class="panel"><h3>People & Faculty Approval</h3><p class="muted">Everyone keeps a customizable personal homebase. Roles only control classroom and administrative tools.</p></div>
      <h3 style="margin-top:18px">Pending Faculty Requests (${pending.length})</h3><div class="list">${pending.length ? pending.map(([uid,x]) => `<div class="item"><div><b>${esc(x.displayName || x.email)}</b><div class="muted">${esc(x.email || "")}</div></div><div><button class="btn primary" data-approve-faculty="${uid}">Approve Instructor</button> <button class="btn ghost" data-deny-faculty="${uid}">Deny</button></div></div>`).join("") : '<div class="empty">No pending faculty requests.</div>'}</div>
      <h3 style="margin-top:22px">Faculty Accounts</h3><div class="list">${faculty.length ? faculty.map(accountRow).join("") : '<div class="empty">No faculty accounts yet.</div>'}</div>
      <h3 style="margin-top:22px">Students</h3><div class="list">${students.length ? students.map(accountRow).join("") : '<div class="empty">No student accounts yet.</div>'}</div>
      <h3 style="margin-top:22px">Department Faculty Directory</h3><div class="actions"><button class="btn primary" id="addDirectoryFaculty">Add Faculty Directory Entry</button></div><div class="list" style="margin-top:12px">${Object.entries(directory).map(([id,x]) => `<div class="item"><div><b>${esc(x.name)}</b><div class="muted">${esc(x.title || "Instructor")} · ${esc(x.department || "")}</div></div><button class="btn ghost" data-delete-directory="${id}">Remove</button></div>`).join("") || '<div class="empty">No directory entries.</div>'}</div>`;
    document.querySelectorAll("[data-role-uid]").forEach(b => b.onclick = () => changeRole(b.dataset.roleUid, b.dataset.current));
    document.querySelectorAll("[data-delete-person]").forEach(b => b.onclick = () => confirmDeletePerson(
      b.dataset.deletePerson, b.dataset.personName, b.dataset.personEmail
    ));
    document.querySelectorAll("[data-approve-faculty]").forEach(b => b.onclick = async () => {
      const uid=b.dataset.approveFaculty;
      await db.ref(`roles/${uid}`).set("instructor");
      await db.ref(`facultyRequests/${uid}`).update({status:"approved", reviewedBy:user.uid, reviewedAt:now()});
      await db.ref(`users/${uid}/facultyRequestStatus`).set("approved");
      toast("Instructor approved"); renderView();
    });
    document.querySelectorAll("[data-deny-faculty]").forEach(b => b.onclick = async () => {
      const uid=b.dataset.denyFaculty;
      await db.ref(`facultyRequests/${uid}`).update({status:"denied", reviewedBy:user.uid, reviewedAt:now()});
      await db.ref(`users/${uid}/facultyRequestStatus`).set("denied");
      toast("Faculty request denied"); renderView();
    });
    document.querySelectorAll("[data-delete-directory]").forEach(b => b.onclick = async () => { await db.ref(`facultyDirectory/${b.dataset.deleteDirectory}`).remove(); renderView(); });
    document.getElementById("addDirectoryFaculty").onclick = () => {
      modal(`<h2>Add Faculty Directory Entry</h2><div class="field"><label>Name</label><input id="fdName"></div><div class="field"><label>Title</label><input id="fdTitle" value="Instructor"></div><div class="field"><label>Department</label><input id="fdDepartment" value="${esc(profile.department || "ETDE / Instrumentation")}"></div><div id="fdErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveDirectoryFaculty">Save</button></div>`);
      document.getElementById("saveDirectoryFaculty").onclick = async () => { try { const name=document.getElementById("fdName").value.trim(); if(!name) throw new Error("Enter a faculty name."); await db.ref("facultyDirectory").push({name,title:document.getElementById("fdTitle").value.trim()||"Instructor",department:document.getElementById("fdDepartment").value.trim(),status:"active",createdAt:now()}); closeModal(); renderView(); } catch(e){document.getElementById("fdErr").innerHTML=`<div class="error">${esc(errText(e))}</div>`;} };
    };
  }
  async function deletePersonFromProHub(uid, name, email) {
    const ownerUid = (await db.ref("system/ownerUid").once("value")).val();
    if (uid === user.uid) throw new Error("You cannot delete your current account.");
    if (uid === ownerUid) throw new Error("The workspace owner cannot be deleted.");

    const updates = {
      [`blockedAccounts/${uid}`]: {uid, name:name||"", email:email||"", removedBy:user.uid, removedAt:now()},
      [`users/${uid}`]: null,
      [`roles/${uid}`]: null,
      [`facultyRequests/${uid}`]: null,
      [`userCourses/${uid}`]: null,
      [`userCalendars/${uid}`]: null,
      [`userSports/${uid}`]: null,
      [`userEntertainment/${uid}`]: null,
      [`userWidgets/${uid}`]: null,
      [`userTasks/${uid}`]: null,
      [`userNotes/${uid}`]: null,
      [`userQuickLinks/${uid}`]: null,
      [`notebooks/${uid}`]: null,
      [`templates/${uid}`]: null,
      [`homeProfiles/${uid}`]: null,
      [`homeNotes/${uid}`]: null,
      [`homeReminders/${uid}`]: null
    };

    const memberships = (await db.ref("courseMembers").once("value")).val() || {};
    Object.entries(memberships).forEach(([cid, members]) => {
      if (members && Object.prototype.hasOwnProperty.call(members, uid)) {
        updates[`courseMembers/${cid}/${uid}`] = null;
      }
    });
    await db.ref().update(updates);
  }

  function confirmDeletePerson(uid, name, email) {
    modal(`<h2>Delete person from Pro Hub?</h2>
      <div class="warning"><b>${esc(name || email || "Selected account")}</b><div class="muted">${esc(email || "")}</div></div>
      <p>This removes the selected Pro Hub profile, role, course memberships, calendar, notebooks, and personal dashboard data. It also blocks this UID from returning to this workspace.</p>
      <p class="muted">Firebase Authentication is separate. For complete identity deletion, also remove the user in Firebase Console → Authentication → Users.</p>
      <div class="field"><label>Type DELETE to confirm</label><input id="deletePersonConfirm"></div>
      <div id="deletePersonErr"></div>
      <div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" id="deletePersonNow" disabled>Delete person</button></div>`);
    const input = document.getElementById("deletePersonConfirm");
    const button = document.getElementById("deletePersonNow");
    input.oninput = () => button.disabled = input.value.trim().toUpperCase() !== "DELETE";
    button.onclick = async () => {
      try {
        button.disabled = true;
        button.textContent = "Deleting…";
        await deletePersonFromProHub(uid, name, email);
        closeModal();
        toast("Person removed from Pro Hub");
        renderView();
      } catch (error) {
        button.disabled = false;
        button.textContent = "Delete person";
        document.getElementById("deletePersonErr").innerHTML = `<div class="error">${esc(errText(error))}</div>`;
      }
    };
  }

  function changeRole(uid, current) {
    modal(`<h2>Manage account</h2><div class="field"><label>Role</label><select id="roleSelect"><option value="student">Student</option><option value="ta">Teaching Assistant</option><option value="instructor">Instructor</option><option value="chair">Department Chair</option><option value="assistant_dean">Assistant Dean</option><option value="admin">Overall Administrator</option><option value="guest">Guest</option></select></div><div class="field"><label>Department</label><input id="roleDepartment" placeholder="ETDE / Instrumentation"></div><div class="field"><label>Account access</label><select id="accountStatus"><option value="active">Active</option><option value="disabled">Disabled in Pro Hub X</option></select></div><div id="roleErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveRole">Save</button></div>`);
    document.getElementById("roleSelect").value = current;
    Promise.all([db.ref(`users/${uid}/department`).once("value"), db.ref(`users/${uid}/accountStatus`).once("value")]).then(([d,s]) => {document.getElementById("roleDepartment").value=d.val()||""; document.getElementById("accountStatus").value=s.val()||"active";});
    document.getElementById("saveRole").onclick = async () => { try { await db.ref(`roles/${uid}`).set(document.getElementById("roleSelect").value); await db.ref(`users/${uid}`).update({department:document.getElementById("roleDepartment").value.trim(),accountStatus:document.getElementById("accountStatus").value,updatedAt:now()}); closeModal(); toast("Account updated"); renderView(); } catch(e){document.getElementById("roleErr").innerHTML=`<div class="error">${esc(errText(e))}</div>`;} };
  }
  async function marketplace(v) {
    const m = (await db.ref("marketplace").once("value")).val() || {};
    v.innerHTML = `<div class="actions">${isFacultyRole() ? '<button class="btn primary" id="publishResource">Publish Resource</button>' : ""}</div><div class="panel" style="margin-top:16px"><h3>Department Resource Library</h3><p class="muted">Faculty publish labs, rubrics, templates, and links. Importing creates an independent template copy.</p></div><div class="list" style="margin-top:16px">${
      Object.entries(m)
        .map(
          ([id, x]) =>
            `<div class="item"><div><b>${esc(x.title)}</b><div class="muted">${esc(x.type || "Resource")} · ${esc(x.description || "")}</div></div><div>${x.url ? `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(x.url)}">Preview</a>` : ""} <button class="btn ghost" data-import="${id}">Import Copy</button></div></div>`,
        )
        .join("") ||
      '<div class="empty">No department resources have been published yet.</div>'
    }</div>`;
    document
      .getElementById("publishResource")
      ?.addEventListener("click", () => {
        modal(
          `<h2>Publish department resource</h2><div class="field"><label>Title</label><input id="pubTitle"></div><div class="grid two"><div class="field"><label>Type</label><select id="pubType"><option>Lab</option><option>Exam</option><option>Rubric</option><option>Presentation</option><option>Template</option><option>Link</option></select></div><div class="field"><label>Preview or file URL</label><input id="pubUrl" placeholder="https://..."></div></div><div class="field"><label>Description</label><textarea id="pubDesc"></textarea></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="savePub">Publish</button></div>`,
        );
        document.getElementById("savePub").onclick = async () => {
          const title = document.getElementById("pubTitle").value.trim();
          if (!title) return;
          await db.ref("marketplace").push({
            title,
            type: document.getElementById("pubType").value,
            url: document.getElementById("pubUrl").value.trim(),
            description: document.getElementById("pubDesc").value.trim(),
            ownerUid: user.uid,
            ownerName: profile.displayName || user.email,
            createdAt: now(),
          });
          closeModal();
          marketplace(v);
        };
      });
    document.querySelectorAll("[data-import]").forEach(
      (b) =>
        (b.onclick = async () => {
          const x = m[b.dataset.import];
          if (!x) return;
          await db.ref(`templates/${user.uid}`).push({
            name: x.title,
            description: x.description || "",
            resourceUrl: x.url || "",
            resourceType: x.type || "Resource",
            importedFrom: b.dataset.import,
            ownerUid: user.uid,
            createdAt: now(),
          });
          toast("Independent copy added to Course Library");
        }),
    );
  }

  async function familySpace(v) {
    const membership = (await db.ref(`familyMembersByUser/${user.uid}`).once("value")).val() || {};
    const familyIds = Object.keys(membership);
    v.innerHTML = `<div class="page-heading"><div><h2>Family Space</h2><p class="muted">A shared private area that connects Pro Hub Classroom and Pro Hub Home.</p></div><button class="btn primary" id="createFamily">Create Family</button></div>
      <div class="grid two" style="margin-top:16px">
        <div class="panel"><h3>Join a family</h3><p class="muted">Enter the family invite code shared by a family administrator.</p><div class="field"><label>Invite code</label><input id="familyCode" maxlength="12" placeholder="Example: WILLIAMS7"></div><button class="btn" id="joinFamily">Join Family</button></div>
        <div class="panel"><h3>Your family spaces</h3><div id="familyList" class="list"><div class="spinner"></div></div></div>
      </div><div id="familyWorkspace" style="margin-top:16px"></div>`;

    const list = document.getElementById("familyList");
    const families = [];
    for (const fid of familyIds) {
      const f = (await db.ref(`families/${fid}`).once("value")).val();
      if (f) families.push([fid, f]);
    }
    list.innerHTML = families.map(([fid,f]) => `<button class="item family-open" data-family="${esc(fid)}"><div><b>${esc(f.name || "Family")}</b><div class="muted">${esc(f.inviteCode || "")}</div></div><span>Open ›</span></button>`).join("") || '<div class="empty">You have not joined a family space yet.</div>';
    document.querySelectorAll(".family-open").forEach(b => b.onclick = () => openFamilyWorkspace(b.dataset.family));

    document.getElementById("createFamily").onclick = () => {
      modal(`<h2>Create Family Space</h2><div class="field"><label>Family name</label><input id="newFamilyName" placeholder="Williams Family"></div><div class="field"><label>Invite code</label><input id="newFamilyCode" maxlength="12" placeholder="WILLIAMS7"></div><div id="familyErr"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveFamily">Create</button></div>`);
      document.getElementById("saveFamily").onclick = async () => {
        const name = document.getElementById("newFamilyName").value.trim();
        const code = document.getElementById("newFamilyCode").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
        if (!name || code.length < 5) {
          document.getElementById("familyErr").innerHTML='<div class="error">Enter a family name and an invite code of at least five letters or numbers.</div>';
          return;
        }
        try {
          const exists = (await db.ref(`familyInviteCodes/${code}`).once("value")).exists();
          if (exists) throw new Error("That invite code is already being used.");
          const ref = db.ref("families").push();
          const fid = ref.key;
          const updates = {};
          updates[`families/${fid}`] = {name, inviteCode:code, ownerUid:user.uid, createdAt:now()};
          updates[`familyInviteCodes/${code}`] = fid;
          updates[`familyMembers/${fid}/${user.uid}`] = {role:"admin", name:profile.displayName || user.email, joinedAt:now()};
          updates[`familyMembersByUser/${user.uid}/${fid}`] = true;
          await db.ref().update(updates);
          closeModal(); toast("Family Space created"); familySpace(v);
        } catch(e) { document.getElementById("familyErr").innerHTML=`<div class="error">${esc(errText(e))}</div>`; }
      };
    };

    document.getElementById("joinFamily").onclick = async () => {
      const code = document.getElementById("familyCode").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
      try {
        const fid = (await db.ref(`familyInviteCodes/${code}`).once("value")).val();
        if (!fid) throw new Error("Invite code not found.");
        const updates = {};
        updates[`familyJoinRequests/${fid}/${user.uid}`] = {uid:user.uid, name:profile.displayName || user.email, email:user.email || "", status:"pending", requestedAt:now()};
        await db.ref().update(updates);
        toast("Join request sent to the family administrator");
      } catch(e) { toast(errText(e)); }
    };
  }

  async function openFamilyWorkspace(fid) {
    const v = document.getElementById("familyWorkspace");
    if (!v) return;
    const f = (await db.ref(`families/${fid}`).once("value")).val();
    const myMember = (await db.ref(`familyMembers/${fid}/${user.uid}`).once("value")).val();
    if (!f || !myMember) { v.innerHTML='<div class="error">You do not have access to this Family Space.</div>'; return; }
    const admin = myMember.role === "admin";
    v.innerHTML = `<div class="panel"><div class="page-heading"><div><h2>${esc(f.name || "Family")}</h2><p class="muted">Invite code: <b>${esc(f.inviteCode || "")}</b></p></div></div>
      <div class="actions message-tabs">
        <button class="btn primary" data-family-tab="chat">Family Chat</button>
        <button class="btn ghost" data-family-tab="list">Shared List</button>
        <button class="btn ghost" data-family-tab="calendar">Family Calendar</button>
        ${admin ? '<button class="btn ghost" data-family-tab="members">Members & Requests</button>' : ''}
      </div></div><div id="familyTab" style="margin-top:16px"></div>`;
    document.querySelectorAll("[data-family-tab]").forEach(b => b.onclick = async () => {
      document.querySelectorAll("[data-family-tab]").forEach(x=>x.className="btn ghost"); b.className="btn primary";
      const tab=b.dataset.familyTab;
      if(tab==="chat") await loadFamilyChat(fid);
      if(tab==="list") await loadFamilyList(fid);
      if(tab==="calendar") await loadFamilyCalendar(fid);
      if(tab==="members") await loadFamilyMembers(fid);
    });
    await loadFamilyChat(fid);
  }

  async function loadFamilyChat(fid) {
    const area=document.getElementById("familyTab");
    await loadMessageThread(`familyChats/${fid}`, area, "Family Chat");
  }

  async function loadFamilyList(fid) {
    const area=document.getElementById("familyTab");
    const data=(await db.ref(`familyLists/${fid}`).once("value")).val() || {};
    area.innerHTML=`<div class="panel"><h3>Shared Family List</h3><div class="list">${Object.entries(data).map(([id,x])=>`<div class="item"><label><input type="checkbox" data-family-check="${id}" ${x.done?"checked":""}> ${esc(x.text)}</label><button class="btn ghost" data-family-delete="${id}">Delete</button></div>`).join("") || '<div class="empty">No items yet.</div>'}</div><div class="grid two" style="margin-top:14px"><input id="familyListText" placeholder="Groceries, reminders, gift ideas…"><button class="btn primary" id="addFamilyItem">Add item</button></div></div>`;
    document.getElementById("addFamilyItem").onclick=async()=>{const text=document.getElementById("familyListText").value.trim();if(!text)return;await db.ref(`familyLists/${fid}`).push({text,done:false,createdBy:user.uid,createdAt:now()});loadFamilyList(fid);};
    document.querySelectorAll("[data-family-check]").forEach(x=>x.onchange=()=>db.ref(`familyLists/${fid}/${x.dataset.familyCheck}/done`).set(x.checked));
    document.querySelectorAll("[data-family-delete]").forEach(x=>x.onclick=async()=>{await db.ref(`familyLists/${fid}/${x.dataset.familyDelete}`).remove();loadFamilyList(fid);});
  }

  async function loadFamilyCalendar(fid) {
    const area=document.getElementById("familyTab");
    const data=(await db.ref(`familyCalendar/${fid}`).once("value")).val() || {};
    const events=Object.entries(data).map(([id,x])=>({id,...x})).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    area.innerHTML=`<div class="panel"><h3>Family Calendar</h3><div class="list">${events.map(e=>`<div class="item"><div><b>${esc(e.title)}</b><div class="muted">${esc(e.date || "")}${e.time?` · ${esc(e.time)}`:""}</div></div><button class="btn ghost" data-family-event-delete="${e.id}">Delete</button></div>`).join("") || '<div class="empty">No family events yet.</div>'}</div><div class="grid three" style="margin-top:14px"><input id="familyEventTitle" placeholder="Event"><input id="familyEventDate" type="date"><input id="familyEventTime" type="time"></div><button class="btn primary" id="addFamilyEvent" style="margin-top:12px">Add event</button></div>`;
    document.getElementById("addFamilyEvent").onclick=async()=>{const title=document.getElementById("familyEventTitle").value.trim(),date=document.getElementById("familyEventDate").value;if(!title||!date)return;await db.ref(`familyCalendar/${fid}`).push({title,date,time:document.getElementById("familyEventTime").value,createdBy:user.uid,createdAt:now()});loadFamilyCalendar(fid);};
    document.querySelectorAll("[data-family-event-delete]").forEach(x=>x.onclick=async()=>{await db.ref(`familyCalendar/${fid}/${x.dataset.familyEventDelete}`).remove();loadFamilyCalendar(fid);});
  }

  async function loadFamilyMembers(fid) {
    const area=document.getElementById("familyTab");
    const members=(await db.ref(`familyMembers/${fid}`).once("value")).val() || {};
    const requests=(await db.ref(`familyJoinRequests/${fid}`).once("value")).val() || {};
    area.innerHTML=`<div class="grid two"><div class="panel"><h3>Members</h3><div class="list">${Object.entries(members).map(([uid,m])=>`<div class="item"><div><b>${esc(m.name || uid)}</b><div class="muted">${esc(m.role || "member")}</div></div></div>`).join("")}</div></div><div class="panel"><h3>Pending Requests</h3><div class="list">${Object.entries(requests).filter(([,r])=>r.status==="pending").map(([uid,r])=>`<div class="item"><div><b>${esc(r.name || r.email)}</b><div class="muted">${esc(r.email || "")}</div></div><div><button class="btn primary" data-family-approve="${uid}">Approve</button> <button class="btn ghost" data-family-deny="${uid}">Deny</button></div></div>`).join("") || '<div class="empty">No pending requests.</div>'}</div></div></div>`;
    document.querySelectorAll("[data-family-approve]").forEach(b=>b.onclick=async()=>{const uid=b.dataset.familyApprove,r=requests[uid];const updates={};updates[`familyMembers/${fid}/${uid}`]={role:"member",name:r.name||r.email,joinedAt:now()};updates[`familyMembersByUser/${uid}/${fid}`]=true;updates[`familyJoinRequests/${fid}/${uid}/status`]="approved";await db.ref().update(updates);loadFamilyMembers(fid);});
    document.querySelectorAll("[data-family-deny]").forEach(b=>b.onclick=async()=>{await db.ref(`familyJoinRequests/${fid}/${b.dataset.familyDeny}/status`).set("denied");loadFamilyMembers(fid);});
  }


  async function chat(v) {
    const faculty = isFacultyRole();
    const leadership = isAdminRole();
    v.innerHTML = `<div class="page-heading"><div><h2>Communication Center</h2><p class="muted">Course conversations stay with each semester. Faculty-only rooms are hidden from students and protected by Firebase rules.</p></div></div>
      <div class="actions message-tabs">
        <button class="btn primary" data-msg-tab="course">Course Chat</button>
        ${faculty ? '<button class="btn ghost" data-msg-tab="faculty">Faculty Lounge</button>' : ''}
        ${leadership ? '<button class="btn ghost" data-msg-tab="leadership">Leadership Chat</button>' : ''}
      </div><div id="messageArea" style="margin-top:16px"></div>`;
    document.querySelectorAll("[data-msg-tab]").forEach((b) => b.onclick = () => {
      document.querySelectorAll("[data-msg-tab]").forEach(x => x.className="btn ghost");
      b.className="btn primary";
      if (b.dataset.msgTab === "course") renderCourseChat();
      if (b.dataset.msgTab === "faculty") loadPrivateRoom("facultyChats/general", "Faculty Lounge", "Private room for instructors, teaching assistants, chairs, the assistant dean, and administrators.");
      if (b.dataset.msgTab === "leadership") loadPrivateRoom("leadershipChats/general", "Leadership Chat", "Private room for the overall administrator, department chair, and assistant dean.");
    });
    await renderCourseChat();
  }

  async function renderCourseChat() {
    const area = document.getElementById("messageArea");
    const ids = Object.keys((await db.ref(`userCourses/${user.uid}`).once("value")).val() || {});
    area.innerHTML = `<div class="panel"><h3>Course Chat</h3><p class="muted">Students and course staff can use this room. Select an active semester course.</p><select id="chatCourse"><option value="">Select course</option></select></div><div id="chatThread" style="margin-top:16px"></div>`;
    for (const id of ids) {
      try {
        const c = (await db.ref(`courses/${id}`).once("value")).val();
        if (c?.status === "active") document.getElementById("chatCourse")?.insertAdjacentHTML("beforeend", `<option value="${esc(id)}">${esc(c.name)} — ${esc(c.term)}</option>`);
      } catch (_) {}
    }
    document.getElementById("chatCourse").onchange = () => loadChat(document.getElementById("chatCourse").value);
  }

  async function loadChat(cid) {
    if (!cid) { const t=document.getElementById("chatThread"); if(t)t.innerHTML=""; return; }
    await loadMessageThread(`courseChats/${cid}`, document.getElementById("chatThread"), "Course Chat");
  }

  async function loadPrivateRoom(path, title, description) {
    const area = document.getElementById("messageArea");
    area.innerHTML = `<div class="panel"><h3>${esc(title)}</h3><p class="muted">${esc(description)}</p></div><div id="privateThread" style="margin-top:16px"></div>`;
    await loadMessageThread(path, document.getElementById("privateThread"), title);
  }

  async function loadMessageThread(path, area, title) {
    if (!area) return;
    const snap = await db.ref(path).limitToLast(60).once("value");
    const entries = Object.entries(snap.val() || {}).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
    area.innerHTML = `<div class="panel"><div class="list message-list">${entries.map(([id,m]) => `<div class="item"><div><b>${esc(m.name || "User")}</b><div>${esc(m.text || "")}</div><small class="muted">${m.createdAt && typeof m.createdAt === "number" ? new Date(m.createdAt).toLocaleString() : ""}</small></div></div>`).join("") || '<div class="empty">No messages yet. Start the conversation.</div>'}</div><div class="field" style="margin-top:14px"><label>Message</label><textarea id="messageText" placeholder="Type a message…"></textarea></div><div class="actions"><button class="btn primary" id="sendMessage">Send</button></div></div>`;
    const send = async () => {
      const input=document.getElementById("messageText"), text=input?.value.trim();
      if (!text) return;
      const btn=document.getElementById("sendMessage"); if(btn) btn.disabled=true;
      try {
        await db.ref(path).push({uid:user.uid,name:profile.displayName || user.email,text,createdAt:now()});
        if (path.startsWith("courseChats/")) await loadChat(path.split("/")[1]); else await loadPrivateRoom(path, title, path.startsWith("leadershipChats") ? "Private room for the overall administrator, department chair, and assistant dean." : "Private room for instructors, teaching assistants, chairs, the assistant dean, and administrators.");
      } catch(e) { toast(errText(e)); if(btn) btn.disabled=false; }
    };
    document.getElementById("sendMessage").onclick=send;
    document.getElementById("messageText").onkeydown=(e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter") send(); };
    area.querySelector(".message-list")?.lastElementChild?.scrollIntoView({block:"end"});
  }

  function monthGrid(events, monthDate = new Date()) {
    const y = monthDate.getFullYear(), m = monthDate.getMonth();
    const first = new Date(y,m,1), days = new Date(y,m+1,0).getDate();
    const cells = [];
    for (let i=0;i<first.getDay();i++) cells.push('<div class="cal-day muted-day"></div>');
    for (let d=1; d<=days; d++) {
      const iso = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dayEvents = events.filter(e=>e.date===iso);
      cells.push(`<button class="cal-day" data-cal-date="${iso}"><b>${d}</b>${dayEvents.slice(0,3).map(e=>`<span>${esc(e.title)}</span>`).join("")}${dayEvents.length>3?`<small>+${dayEvents.length-3} more</small>`:""}</button>`);
    }
    return `<div class="calendar-month"><div class="cal-weekdays">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<b>${x}</b>`).join("")}</div><div class="cal-grid">${cells.join("")}</div></div>`;
  }

  async function calendarPage(v) {
    const events = Array.isArray(profile.events) ? profile.events : [];
    const selected = window.__prohubCalendarMonth ? new Date(window.__prohubCalendarMonth) : new Date();
    v.innerHTML = `<div class="page-heading"><div><h2>Personal Calendar</h2><p class="muted">Your events stay private to your account. Course announcements remain in Courses and on Home.</p></div><div class="actions"><button class="btn ghost" id="prevMonth">←</button><span class="tag">${selected.toLocaleDateString([], {month:"long",year:"numeric"})}</span><button class="btn ghost" id="nextMonth">→</button><button class="btn primary" id="calendarAdd">+ Event</button></div></div><div class="panel">${monthGrid(events,selected)}</div><div class="panel"><h3>Upcoming Events</h3>${events.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map((e,i)=>`<div class="mini-row"><div><b>${esc(e.title)}</b><div class="muted">${esc(e.date)} ${esc(e.time||"")}</div></div><button class="icon-btn" data-calendar-del="${i}">×</button></div>`).join("") || '<div class="empty compact">No events yet.</div>'}</div>`;
    const move=(delta)=>{ const n=new Date(selected); n.setMonth(n.getMonth()+delta); window.__prohubCalendarMonth=n.toISOString(); calendarPage(v); };
    document.getElementById("prevMonth").onclick=()=>move(-1); document.getElementById("nextMonth").onclick=()=>move(1);
    const addFor=(date="")=>{ modal(`<h2>Add calendar event</h2><div class="field"><label>Title</label><input id="calTitle"></div><div class="grid two"><div class="field"><label>Date</label><input id="calDate" type="date" value="${esc(date)}"></div><div class="field"><label>Time</label><input id="calTime" type="time"></div></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="calSave">Save</button></div>`); document.getElementById("calSave").onclick=async()=>{ const title=document.getElementById("calTitle").value.trim(), date=document.getElementById("calDate").value; if(!title||!date)return toast("Enter a title and date"); profile.events=[...events,{title,date,time:document.getElementById("calTime").value,createdAt:Date.now()}]; await db.ref(`users/${user.uid}/events`).set(profile.events); closeModal(); calendarPage(v); }; };
    document.getElementById("calendarAdd").onclick=()=>addFor();
    document.querySelectorAll("[data-cal-date]").forEach(b=>b.onclick=()=>addFor(b.dataset.calDate));
    document.querySelectorAll("[data-calendar-del]").forEach(b=>b.onclick=async()=>{ events.splice(+b.dataset.calendarDel,1); profile.events=events; await db.ref(`users/${user.uid}/events`).set(events); calendarPage(v); });
  }

  async function notebooks(v) {
    const snap=await db.ref(`notebooks/${user.uid}`).once("value");
    const notes=Object.entries(snap.val()||{}).map(([id,n])=>({id,...n})).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    v.innerHTML=`<div class="page-heading"><div><h2>My Notebooks</h2><p class="muted">Type, draw, highlight, and use engineering or graph paper. Notes are private to your account.</p></div><button class="btn primary" id="newNotebook">+ New Note</button></div><div class="notebook-layout"><aside class="panel notebook-list"><input id="noteSearch" placeholder="Search notes"><div id="noteList">${notes.map(n=>`<button class="note-item" data-open-note="${n.id}"><b>${esc(n.title||"Untitled")}</b><small>${esc(n.paper||"plain")} · ${n.updatedAt?new Date(n.updatedAt).toLocaleString():""}</small></button>`).join("")||'<div class="empty compact">No notes yet.</div>'}</div></aside><section class="panel" id="noteEditor"><div class="empty">Choose a note or create a new one.</div></section></div>`;
    const openNote=async(id)=>{
      const note=(await db.ref(`notebooks/${user.uid}/${id}`).once("value")).val()||{};
      const ed=document.getElementById("noteEditor");
      ed.innerHTML=`<div class="widget-head"><input class="note-title" id="nbTitle" value="${esc(note.title||"Untitled Note")}"><div class="actions"><button class="btn ghost" id="nbExport">Export PNG</button><button class="btn danger" id="nbDelete">Delete</button><button class="btn primary" id="nbSave">Save</button></div></div><div class="notebook-toolbar"><label>Paper <select id="nbPaper"><option value="plain">Plain</option><option value="ruled">Ruled</option><option value="graph">Graph</option><option value="engineering">Engineering</option></select></label><label>Ink <input id="nbColor" type="color" value="${esc(note.ink||'#ff7300')}"></label><label>Size <input id="nbSize" type="range" min="1" max="24" value="${Number(note.size)||4}"></label><button class="btn ghost" id="nbDraw">Pen</button><button class="btn ghost" id="nbHighlight">Highlighter</button><button class="btn ghost" id="nbErase">Eraser</button><button class="btn ghost" id="nbClear">Clear drawing</button></div><textarea id="nbText" class="notebook-text" placeholder="Type notes here...">${esc(note.text||"")}</textarea><div class="drawing-wrap ${esc(note.paper||'plain')}"><canvas id="nbCanvas"></canvas></div><p class="muted">Tip: your tablet pen, finger, or mouse can draw directly on the page.</p>`;
      document.getElementById("nbPaper").value=note.paper||"plain";
      const canvas=document.getElementById("nbCanvas"), wrap=canvas.parentElement, ctx=canvas.getContext("2d"); let mode="draw", drawing=false, last=null;
      const resize=()=>{ const data=canvas.toDataURL(); canvas.width=Math.max(700,wrap.clientWidth); canvas.height=700; if(note.drawingData||data){const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height); img.src=note.drawingData||data;} }; resize();
      const point=e=>{const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,p:e.pressure||.5};};
      canvas.onpointerdown=e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId);};
      canvas.onpointermove=e=>{if(!drawing)return; const q=point(e); ctx.lineCap="round";ctx.lineJoin="round";ctx.globalCompositeOperation=mode==="erase"?"destination-out":"source-over";ctx.globalAlpha=mode==="highlight"?.25:1;ctx.strokeStyle=document.getElementById("nbColor").value;ctx.lineWidth=(+document.getElementById("nbSize").value)*(mode==="highlight"?4:1)*(e.pointerType==="pen"?Math.max(.55,q.p*1.4):1);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(q.x,q.y);ctx.stroke();last=q;};
      canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;ctx.globalAlpha=1;};
      document.getElementById("nbDraw").onclick=()=>mode="draw"; document.getElementById("nbHighlight").onclick=()=>mode="highlight"; document.getElementById("nbErase").onclick=()=>mode="erase";
      document.getElementById("nbClear").onclick=()=>{if(confirm("Clear this drawing?"))ctx.clearRect(0,0,canvas.width,canvas.height);};
      document.getElementById("nbPaper").onchange=e=>wrap.className=`drawing-wrap ${e.target.value}`;
      document.getElementById("nbSave").onclick=async()=>{ const payload={title:document.getElementById("nbTitle").value.trim()||"Untitled Note",text:document.getElementById("nbText").value,paper:document.getElementById("nbPaper").value,ink:document.getElementById("nbColor").value,size:+document.getElementById("nbSize").value,drawingData:canvas.toDataURL("image/png"),updatedAt:Date.now()}; if(payload.drawingData.length>1900000)return toast("Drawing is too large. Clear part of it or use fewer strokes."); await db.ref(`notebooks/${user.uid}/${id}`).set(payload); toast("Notebook saved"); notebooks(v); };
      document.getElementById("nbDelete").onclick=async()=>{if(confirm("Delete this note?")){await db.ref(`notebooks/${user.uid}/${id}`).remove();notebooks(v);}};
      document.getElementById("nbExport").onclick=()=>{const a=document.createElement("a");a.download=(document.getElementById("nbTitle").value||"notebook")+".png";a.href=canvas.toDataURL("image/png");a.click();};
    };
    document.getElementById("newNotebook").onclick=async()=>{const ref=db.ref(`notebooks/${user.uid}`).push();await ref.set({title:"New Note",text:"",paper:"engineering",updatedAt:Date.now()});await openNote(ref.key);};
    document.querySelectorAll("[data-open-note]").forEach(b=>b.onclick=()=>openNote(b.dataset.openNote));
    document.getElementById("noteSearch").oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll(".note-item").forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(q));};
  }

  async function entertainment(v) {
    const defaults=[
      ["YouTube","https://www.youtube.com/","Video"],["Netflix","https://www.netflix.com/","Streaming"],["Hulu","https://www.hulu.com/","Streaming"],["Disney+","https://www.disneyplus.com/","Streaming"],["Prime Video","https://www.primevideo.com/","Streaming"],["Max","https://www.max.com/","Streaming"],["Paramount+","https://www.paramountplus.com/","Streaming"],["Peacock","https://www.peacocktv.com/","Streaming"],["Spotify","https://open.spotify.com/","Music"],["Audible","https://www.audible.com/","Audio"]
    ];
    const enabled=safeArray(profile.entertainmentServices).length?safeArray(profile.entertainmentServices):defaults.map(x=>x[0]);
    const custom=Array.isArray(profile.entertainmentLinks)?profile.entertainmentLinks:[];
    v.innerHTML=`<div class="page-heading"><div><h2>Entertainment</h2><p class="muted">A personal set of streaming, music, and video links. Each user chooses their own services.</p></div><button class="btn primary" id="editEntertainment">Customize</button></div><div class="ent-grid">${defaults.filter(x=>enabled.includes(x[0])).map(([name,url,type])=>`<a class="panel entertainment-card" target="_blank" rel="noopener" href="${url}"><span>${esc(type)}</span><h3>${esc(name)}</h3><p>Open ${esc(name)}</p></a>`).join("")}${custom.map(x=>`<a class="panel entertainment-card" target="_blank" rel="noopener" href="${esc(x.url)}"><span>Custom</span><h3>${esc(x.label)}</h3><p>Open link</p></a>`).join("")}</div>`;
    document.getElementById("editEntertainment").onclick=()=>{modal(`<h2>Customize Entertainment</h2><p class="muted">Choose services and add one custom link per line as Label | URL.</p>${checkGrid("entServices",defaults.map(x=>x[0]),enabled)}<div class="field"><label>Custom entertainment links</label><textarea id="entCustom" rows="6">${esc(custom.map(x=>`${x.label} | ${x.url}`).join("\n"))}</textarea></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" id="saveEntertainment">Save</button></div>`);document.getElementById("saveEntertainment").onclick=async()=>{const links=document.getElementById("entCustom").value.split(/\n+/).map(line=>{const p=line.split("|");return{label:(p.shift()||"").trim(),url:p.join("|").trim()};}).filter(x=>x.label&&/^https?:\/\//i.test(x.url));profile.entertainmentServices=checkedValues("entServices");profile.entertainmentLinks=links;await db.ref(`users/${user.uid}`).update({entertainmentServices:profile.entertainmentServices,entertainmentLinks:links,updatedAt:now()});closeModal();entertainment(v);};};
  }

  async function helpCenter(v) {
    const faculty=isFacultyRole(); const admin=isAdminRole();
    v.innerHTML=`<div class="page-heading"><div><h2>How to Use Pro Hub X</h2><p class="muted">Built-in directions for students, instructors, and administrators.</p></div><span class="tag">Signed in as ${esc(roleLabel())}</span></div><div class="help-grid">
      <details class="panel" open><summary>Start here: personalize your Homebase</summary><ol><li>Open <b>My Space</b>.</li><li>Choose appearance, accent, wallpaper, or upload a background picture.</li><li>Select Home widgets and place them in your preferred order.</li><li>Add weather location, favorite teams, and quick links.</li><li>Save My Space. These choices affect only your account.</li></ol></details>
      <details class="panel"><summary>Calendar, tasks, and notebooks</summary><ol><li>Use <b>Calendar</b> to add private events.</li><li>Use the Tasks widget for personal reminders.</li><li>Open <b>Notebooks</b>, create a note, choose paper, type, or draw with a stylus.</li><li>Press Save before leaving a drawing note. Export PNG makes a copy on your device.</li></ol></details>
      <details class="panel"><summary>Join and use a course</summary><ol><li>Open Courses.</li><li>Enter the instructor's join code or scan the QR link.</li><li>Course announcements appear inside the course and on Home.</li><li>Use Messages for course conversation.</li></ol></details>
      <details class="panel"><summary>Use private faculty communication</summary><ol><li>Open Messages.</li><li>Course Chat includes students enrolled in that course.</li><li>Faculty Lounge appears only for approved faculty and leadership roles.</li><li>Leadership Chat appears only for administrators, department chairs, and assistant deans.</li><li>Students cannot see or read either private room.</li></ol></details>
      ${faculty?`<details class="panel" open><summary>Instructor: create a course and announcement</summary><ol><li>Open <b>Courses</b> and choose Create Course.</li><li>Enter course name, term, and section. Share the QR code or join code.</li><li>Open the course and choose <b>+ Announcement</b>.</li><li>Add title, message, priority, optional publish time, expiration, and attachment link.</li><li>Scheduled announcements become visible after their publish time. Expired announcements stop appearing on Home.</li><li>Archive the course after the semester; records remain preserved.</li></ol></details><details class="panel"><summary>Instructor: reusable materials</summary><ol><li>Use Course Library for your private templates.</li><li>Use Department Library to publish a copy for other instructors.</li><li>Import Copy creates an editable copy without changing the original.</li></ol></details>`:""}
      ${admin?`<details class="panel" open><summary>Administrator: people and permissions</summary><ol><li>Open People & Roles.</li><li>Review pending faculty requests.</li><li>Assign Instructor, Teaching Assistant, Chair, Assistant Dean, Administrator, Student, or Guest.</li><li>Keep administrator access limited to trusted personnel.</li></ol></details>`:""}
      <details class="panel"><summary>Sports Hub</summary><ol><li>Open Sports Hub.</li><li>Select quick-add teams or enter a custom ESPN team feed.</li><li>Use the format Display Name | sport | league | team ID.</li><li>Save Sports. Your choices appear in the Home sports widget.</li></ol></details>
      <details class="panel"><summary>Install on a phone or tablet</summary><ol><li>Open My Space and choose Install Pro Hub X.</li><li>If the button is unavailable, use the browser menu and select Install app or Add to Home screen.</li><li>This creates an app icon and standalone full-screen experience.</li><li>A true Android home-screen widget would require a separate native Android companion app.</li></ol></details>
      <details class="panel"><summary>Entertainment and links</summary><ol><li>Open Entertainment.</li><li>Choose Customize to select streaming and music services.</li><li>Add custom services as Label | URL.</li><li>Entertainment choices are private and independent for each user.</li></ol></details>
      <details class="panel"><summary>Troubleshooting</summary><ol><li>Check the version shown on Home.</li><li>After an update, clear site data and unregister the old service worker.</li><li>Confirm the new Firebase rules were published.</li><li>For weather, use City, ST, such as Okmulgee, OK.</li></ol></details>
    </div>`;
  }

  async function settings(v) {
    const enabledWidgets = safeArray(profile.widgets);
    const preferredOrder = safeArray(profile.widgetOrder);
    const widgets = [...preferredOrder.filter(x=>enabledWidgets.includes(x)), ...enabledWidgets.filter(x=>!preferredOrder.includes(x))];
    const teams = safeArray(profile.favoriteTeams);
    const links = Array.isArray(profile.quickLinks) ? profile.quickLinks : [];
    v.innerHTML = `<div class="settings-grid"><div class="panel"><h3>Profile & Appearance</h3><div class="grid two"><div class="field"><label>Display name</label><input id="setName" value="${esc(profile.displayName || "")}"></div><div class="field"><label>Weather location</label><input id="setWeather" value="${esc(profile.weather || "")}"></div><div class="field"><label>Accent</label><select id="setTheme"><option value="orange">Orange</option><option value="blue">Blue</option><option value="green">Green</option><option value="purple">Purple</option></select></div><div class="field"><label>Appearance</label><select id="setAppearance"><option value="dark">Dark</option><option value="light">Light</option><option value="system">Follow device</option></select></div><div class="field"><label>Wallpaper</label><select id="setWallpaper"><option value="gradient">Modern Gradient</option><option value="clean">Clean Minimal</option><option value="campus">Campus Style</option><option value="tech">Technology Grid</option><option value="blueprint">Blueprint</option><option value="carbon">Carbon Fiber</option></select></div><div class="field"><label>Notification preference</label><select id="setNotifications"><option value="all">All classroom messages</option><option value="important">Important announcements</option><option value="digest">Daily digest</option></select></div></div><hr><h3>Custom Background Picture</h3><p class="muted">Upload a picture from this device or paste a direct HTTPS image address. Uploaded pictures are compressed before saving.</p><div class="grid two"><div class="field"><label>Upload picture</label><input id="setBackgroundFile" type="file" accept="image/*"></div><div class="field"><label>Picture URL</label><input id="setBackgroundUrl" value="${esc(profile.backgroundImage && !profile.backgroundImage.startsWith("data:") ? profile.backgroundImage : "")}" placeholder="https://..."></div></div><div class="actions"><button class="btn ghost" id="clearBackground" type="button">Remove custom picture</button></div></div><div class="panel"><h3>Interests & Sports</h3><label>Interests</label>${checkGrid("setInterests", ["Technology", "Sports", "Education", "Gaming", "Automation", "Electronics", "Hydraulics", "AI", "Music", "Fitness"], safeArray(profile.interests))}<div class="actions"><button class="btn ghost" id="openSportsHub" type="button">Customize Sports Hub</button></div><p class="muted">Add professional, college, or custom ESPN-supported teams from the Sports Hub.</p></div><div class="panel"><h3>Dashboard Widgets</h3>${checkGrid("setWidgets", ["courses", "announcements", "calendar", "weather", "quicklinks", "notes", "sports", "search", "tasks", "notebook", "entertainment", "AI assistant"], widgets)}</div><div class="panel"><h3>Homebase Layout Order</h3><p class="muted">Put one enabled widget per line in the order you want it to appear.</p><textarea id="setWidgetOrder" rows="10">${esc((Array.isArray(profile.widgetOrder) ? profile.widgetOrder : widgets).join("\n"))}</textarea></div><div class="panel"><h3>Quick Links</h3><p class="muted">Enter one link per line as Label | URL.</p><textarea id="setCustomLinks" rows="7">${esc(links.map((x) => `${x.label} | ${x.url}`).join("\n"))}</textarea><div class="field"><label>Office hours</label><input id="setOfficeHours" value="${esc(profile.officeHours || "")}"></div></div></div><div class="panel"><h3>Install on Phone or Tablet</h3><p class="muted">Install Pro Hub X as an app icon from your browser. Android home-screen widgets require a separate native Android app, but the installed app opens full-screen and works like an app.</p><button class="btn ghost" id="installApp" type="button">Install Pro Hub X</button></div><div class="actions sticky-actions"><button class="btn danger" id="signOut">Sign out</button><button class="btn primary" id="saveSettings">Save My Space</button></div>`;
    ["setTheme", "setAppearance", "setWallpaper", "setNotifications"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el)
          el.value =
            profile[
              id.replace("set", "").replace(/^./, (c) => c.toLowerCase())
            ] || el.value;
      },
    );
    document.getElementById("signOut").onclick = () => auth.signOut();
    document.getElementById("openSportsHub").onclick = () => { activeView="sportsHub"; renderShell(); };
    document.getElementById("installApp").onclick = async () => {
      if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; }
      else toast("Use your browser menu and choose Install app or Add to Home screen.");
    };
    document.getElementById("clearBackground").onclick = async () => {
      profile.backgroundImage = "";
      await db.ref(`users/${user.uid}/backgroundImage`).remove();
      document.getElementById("setBackgroundUrl").value = "";
      toast("Custom background removed");
    };
    document.getElementById("saveSettings").onclick = async () => {
      try {
      const links = document
        .getElementById("setCustomLinks")
        .value.split(/\n+/)
        .map((line) => {
          const parts = line.split("|");
          return {
            label: (parts.shift() || "").trim(),
            url: parts.join("|").trim(),
          };
        })
        .filter((x) => x.label && /^https?:\/\//i.test(x.url));
      let backgroundImage = profile.backgroundImage || "";
      const backgroundFile = document.getElementById("setBackgroundFile")?.files?.[0];
      const backgroundUrl = document.getElementById("setBackgroundUrl")?.value.trim();
      if (backgroundFile) backgroundImage = await imageFileToBackground(backgroundFile);
      else if (backgroundUrl) {
        if (!/^https:\/\//i.test(backgroundUrl)) throw new Error("Background picture URL must begin with https://");
        backgroundImage = backgroundUrl;
      }
      profile = {
        ...profile,
        displayName: document.getElementById("setName").value.trim(),
        weather: document.getElementById("setWeather").value.trim(),
        interests: checkedValues("setInterests"),
        widgets: checkedValues("setWidgets"),
        widgetOrder: document.getElementById("setWidgetOrder").value.split(/\n+/).map(x=>x.trim()).filter((x,i,a)=>x && a.indexOf(x)===i),
        theme: document.getElementById("setTheme").value,
        appearance: document.getElementById("setAppearance").value,
        wallpaper: document.getElementById("setWallpaper").value,
        backgroundImage,
        notifications: document.getElementById("setNotifications").value,
        officeHours: document.getElementById("setOfficeHours").value.trim(),
        quickLinks: links,
        updatedAt: now(),
      };
      await db.ref(`users/${user.uid}`).update(profile);
      applyTheme();
      toast("Your homebase settings were saved");
      renderShell();
      } catch (e) {
        toast(errText(e));
      }
    };
  }
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstallPrompt = e; });
  if ("serviceWorker" in navigator)
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("./service-worker.js").catch(() => {}),
    );

  const DEBUG_VERSION = "10.1";

  function debugStatusBadge(ok, label) {
    return `<span class="debug-badge ${ok ? "ok" : "bad"}">${ok ? "PASS" : "FAIL"} · ${esc(label)}</span>`;
  }

  async function debugFetchJson(url, label) {
    const started = performance.now();
    try {
      const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_debug=${Date.now()}`, {
        cache: "no-store"
      });
      const elapsed = Math.round(performance.now() - started);
      const type = response.headers.get("content-type") || "";
      if (!response.ok) {
        return { ok:false, label, detail:`HTTP ${response.status}`, elapsed };
      }
      if (!type.toLowerCase().includes("json")) {
        return { ok:false, label, detail:`Expected JSON, received ${type || "unknown type"}`, elapsed };
      }
      const data = await response.json();
      return { ok:true, label, detail:"Available", elapsed, data };
    } catch (error) {
      return { ok:false, label, detail:error.message || String(error), elapsed:Math.round(performance.now() - started) };
    }
  }

  async function collectDebugReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      appVersion: typeof APP_VERSION !== "undefined" ? APP_VERSION : "unknown",
      debugVersion: DEBUG_VERSION,
      pageUrl: location.href,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      platform: navigator.platform || "unknown",
      language: navigator.language || "unknown",
      serviceWorkerSupported: "serviceWorker" in navigator,
      cacheSupported: "caches" in window,
      firebaseReady: typeof firebase !== "undefined",
      signedIn: Boolean(typeof user !== "undefined" && user),
      checks: []
    };

    report.checks.push(await debugFetchJson("./version.json", "Version file"));
    report.checks.push(await debugFetchJson("./weather-data.json", "Weather data file"));

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        report.serviceWorkers = registrations.map(registration => ({
          scope: registration.scope,
          active: registration.active?.scriptURL || null,
          waiting: registration.waiting?.scriptURL || null,
          installing: registration.installing?.scriptURL || null
        }));
      } else {
        report.serviceWorkers = [];
      }
    } catch (error) {
      report.serviceWorkers = [];
      report.serviceWorkerError = error.message || String(error);
    }

    try {
      report.cacheNames = "caches" in window ? await caches.keys() : [];
    } catch (error) {
      report.cacheNames = [];
      report.cacheError = error.message || String(error);
    }

    try {
      report.firebaseConnected = Boolean(typeof db !== "undefined" && db);
      if (report.firebaseConnected && typeof user !== "undefined" && user) {
        const snap = await db.ref(".info/connected").once("value");
        report.firebaseRealtimeConnected = snap.val() === true;
      } else {
        report.firebaseRealtimeConnected = false;
      }
    } catch (error) {
      report.firebaseRealtimeConnected = false;
      report.firebaseError = error.message || String(error);
    }

    const versionCheck = report.checks.find(x => x.label === "Version file");
    report.deployedVersion = versionCheck?.data?.version || "unknown";
    report.versionMatches = report.deployedVersion === report.appVersion;

    const weatherCheck = report.checks.find(x => x.label === "Weather data file");
    report.weatherGeneratedAt = weatherCheck?.data?.generatedAt || null;
    report.weatherStatus = weatherCheck?.data?.status || "unknown";
    report.weatherLocations = Object.keys(weatherCheck?.data?.locations || {});
    report.weatherHasForecast = Object.values(weatherCheck?.data?.locations || {}).some(x => Array.isArray(x.periods) && x.periods.length > 0);

    return report;
  }

  function renderDebugReport(report) {
    const checks = [
      {ok:report.online, label:"Browser online", detail:report.online ? "Network connection detected" : "Browser reports offline"},
      {ok:report.versionMatches, label:"Version match", detail:`Running ${report.appVersion}; deployed ${report.deployedVersion}`},
      {ok:report.checks.find(x=>x.label==="Version file")?.ok, label:"version.json", detail:report.checks.find(x=>x.label==="Version file")?.detail || "Unavailable"},
      {ok:report.checks.find(x=>x.label==="Weather data file")?.ok, label:"weather-data.json", detail:report.checks.find(x=>x.label==="Weather data file")?.detail || "Unavailable"},
      {ok:report.weatherHasForecast, label:"Weather forecast populated", detail:report.weatherHasForecast ? `${report.weatherLocations.length} saved locations` : "Run Update Weather Data in GitHub Actions"},
      {ok:report.serviceWorkers?.length > 0, label:"Service worker registered", detail:report.serviceWorkers?.length ? `${report.serviceWorkers.length} registration(s)` : "No service worker found"},
      {ok:report.firebaseReady, label:"Firebase library", detail:report.firebaseReady ? "Loaded" : "Not loaded"},
      {ok:report.firebaseRealtimeConnected, label:"Firebase realtime connection", detail:report.firebaseRealtimeConnected ? "Connected" : "Not connected or not signed in"}
    ];

    return `
      <div class="debug-summary">
        <div><small>Running version</small><b>${esc(report.appVersion)}</b></div>
        <div><small>Deployed version</small><b>${esc(report.deployedVersion)}</b></div>
        <div><small>Service worker</small><b>${report.serviceWorkers?.length || 0}</b></div>
        <div><small>App caches</small><b>${report.cacheNames?.length || 0}</b></div>
      </div>
      <div class="debug-check-list">
        ${checks.map(item => `<div class="debug-check">${debugStatusBadge(Boolean(item.ok), item.label)}<p>${esc(item.detail)}</p></div>`).join("")}
      </div>
      <details class="debug-details">
        <summary>Technical details</summary>
        <pre>${esc(JSON.stringify(report, null, 2))}</pre>
      </details>
      <div class="actions">
        <button class="btn primary" id="debugRunAgain" type="button">Run checks again</button>
        <button class="btn ghost" id="debugCopyReport" type="button">Copy report</button>
        <button class="btn ghost" id="debugDownloadReport" type="button">Download report</button>
        <button class="btn danger" id="debugCleanUpdate" type="button">Clear app cache and reload</button>
      </div>`;
  }

  async function openSystemHealth() {
    modal(`<h2>Pro Hub System Health</h2><div id="debugHealthBody"><div class="weather-loading"><div class="spinner small-spinner"></div><p class="muted">Running diagnostics…</p></div></div>`);
    const body = document.getElementById("debugHealthBody");

    async function run() {
      body.innerHTML = `<div class="weather-loading"><div class="spinner small-spinner"></div><p class="muted">Running diagnostics…</p></div>`;
      const report = await collectDebugReport();
      window.__prohubLastDebugReport = report;
      body.innerHTML = renderDebugReport(report);

      document.getElementById("debugRunAgain").onclick = run;
      document.getElementById("debugCopyReport").onclick = async () => {
        const text = JSON.stringify(report, null, 2);
        try {
          await navigator.clipboard.writeText(text);
          toast("Debug report copied.");
        } catch {
          toast("Copy failed. Use Download report instead.");
        }
      };
      document.getElementById("debugDownloadReport").onclick = () => {
        const blob = new Blob([JSON.stringify(report, null, 2)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prohub-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
      document.getElementById("debugCleanUpdate").onclick = performCleanUpdate;
    }

    await run();
  }

  function installDebugButton() {
    if (document.getElementById("prohubDebugButton")) return;
    const button = document.createElement("button");
    button.id = "prohubDebugButton";
    button.className = "prohub-debug-button";
    button.type = "button";
    button.textContent = "System Health";
    button.onclick = openSystemHealth;
    document.body.appendChild(button);
  }

  
  async function runSetupWizard() {
    modal(`<h2>Pro Hub Setup Wizard</h2><div id="setupWizardBody"><div class="weather-loading"><div class="spinner small-spinner"></div><p class="muted">Checking your deployment…</p></div></div>`);
    const body = document.getElementById("setupWizardBody");
    const report = await collectDebugReport();
    const workflowReady = report.weatherHasForecast || report.weatherStatus === "ok" || report.weatherStatus === "partial";
    const steps = [
      [report.checks.find(x=>x.label==="Version file")?.ok,"GitHub Pages files",report.deployedVersion ? `Version ${report.deployedVersion} is deployed.` : "version.json unavailable."],
      [report.firebaseReady,"Firebase library",report.firebaseReady ? "Firebase loaded." : "Firebase did not load."],
      [report.firebaseRealtimeConnected,"Firebase connection",report.firebaseRealtimeConnected ? "Realtime Database connected." : "Sign in and verify Firebase configuration."],
      [report.checks.find(x=>x.label==="Weather data file")?.ok,"Weather data file","weather-data.json deployment check."],
      [workflowReady,"Weather workflow",workflowReady ? "Weather data has been generated." : "Upload .github/workflows/update-weather.yml and run it once."],
      [report.serviceWorkers?.length>0,"Service worker",report.serviceWorkers?.length ? "Registered." : "Reload after deployment."],
      [report.versionMatches,"Version match",`Running ${report.appVersion}; deployed ${report.deployedVersion}.`]
    ];
    body.innerHTML = `<div class="setup-progress">${steps.map((s,i)=>`<div class="setup-step ${s[0]?"complete":"attention"}"><span>${s[0]?"✓":"!"}</span><div><b>${i+1}. ${esc(s[1])}</b><p>${esc(s[2])}</p></div></div>`).join("")}</div><div class="actions"><button class="btn primary" id="setupRunAgain">Check again</button><button class="btn ghost" id="setupOpenHealth">Open System Health</button><button class="btn danger" id="setupCleanReload">Clean update</button></div><p class="muted">GitHub Desktop is recommended because it preserves the hidden <code>.github</code> folder.</p>`;
    document.getElementById("setupRunAgain").onclick = runSetupWizard;
    document.getElementById("setupOpenHealth").onclick = openSystemHealth;
    document.getElementById("setupCleanReload").onclick = performCleanUpdate;
  }
  function installSetupWizardButton() {
    if (document.getElementById("prohubSetupButton")) return;
    const button = document.createElement("button");
    button.id = "prohubSetupButton";
    button.className = "prohub-setup-button";
    button.textContent = "Setup";
    button.onclick = runSetupWizard;
    document.body.appendChild(button);
  }
  window.addEventListener("load",()=>setTimeout(installSetupWizardButton,1200));

window.addEventListener("load", () => {
    setTimeout(installDebugButton, 1000);
  });

})();
