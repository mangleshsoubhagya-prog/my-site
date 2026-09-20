// =====================================================
// ASSIGN LIST - FINAL
// =====================================================

// ================= FIREBASE =================

const firebaseConfig = {
    apiKey: "AIzaSyBHe44S_oU2ndgRlea4OI_nKt9N5oQ9XNE",
    authDomain: "reportssystem-4fad7.firebaseapp.com",
    projectId: "reportssystem-4fad7",
    storageBucket: "reportssystem-4fad7.firebasestorage.app",
    messagingSenderId: "402469731114",
    appId: "1:402469731114:web:dcf97312036971f2977c53"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// ================= CLOUDINARY =================

const CLOUDINARY_CLOUD = "dhs6u2y6l";
const CLOUDINARY_PRESET = "expense_upload";

// ================= VARIABLES =================

let allData = [];
let filteredData = [];

let currentPage = 1;
let rowsPerPage = 50;
let activeFilter = "all";
let sortDirection = {};

let activeCompleteRow = null;

// ================= HELPERS =================

function cleanIndusId(value) {
    if (value === undefined || value === null) return "";
    return String(value).replace(/\D/g, "").trim();
}

function getIndusId(row) {

    if (!row || typeof row !== "object") {
        return "";
    }

    // Direct common fields
    const directFields = [
        "Indus ID",
        "Indus Id",
        "INDUS ID",
        "INDUS Id",
        "INDUS_ID",
        "IndusID",
        "IndusId",
        "indusId",
        "indus_id",
        "INDUSID",
        "Indus Id ",
        "Indus ID "
    ];

    for (const field of directFields) {
        if (
            row[field] !== undefined &&
            row[field] !== null &&
            String(row[field]).trim() !== ""
        ) {
            return cleanIndusId(row[field]);
        }
    }

    // Flexible search:
    // Indus ID / Indus Id / INDUS_ID / IndusID
    for (const key of Object.keys(row)) {

        const normalizedKey = String(key)
            .toLowerCase()
            .replace(/[\s_\-.]/g, "");

        if (normalizedKey === "indusid") {

            const value = row[key];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return cleanIndusId(value);
            }
        }
    }

    return "";
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch (e) {
        return null;
    }
}

function dateObject(value) {
    if (!value) return null;

    if (value && typeof value.toDate === "function") {
        return value.toDate();
    }

    const d = new Date(value);

    return isNaN(d.getTime()) ? null : d;
}

function isToday(value) {
    const d = dateObject(value);

    if (!d) return false;

    const now = new Date();

    return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    );
}

function formatDate(value) {
    const d = dateObject(value);

    if (!d) return "";

    return d.toLocaleString("en-IN");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =====================================================
// FIREBASE - ASSIGNED TASKS
// =====================================================
function listenAssignedSites() {

    db.collection("assignImports").onSnapshot(snapshot => {

        allData = [];

        snapshot.forEach(doc => {

            const d = doc.data();

            if (!d.data || typeof d.data !== "object") {
                return;
            }

            const row = {

                ...d.data,

                firestoreId: doc.id,

                assignedTo: d.assignedTo || "",
                assignedTime: d.assignedTime || "",

                projectId: d.projectId || "",
                projectName: d.projectName || "",

                completed: d.completed === true,
                completedBy: d.completedBy || "",
                completedTime: d.completedTime || "",

                sensorSerial: d.sensorSerial || "",

                videoUrl: d.videoUrl || "",
                photoUrl: d.photoUrl || "",
                csvUrl: d.csvUrl || "",

                pendingStatus: d.pendingStatus || "",
                remark: d.remark || "",

                remarkBy: d.remarkBy || "",
                remarkTime: d.remarkTime || "",

                imported: true,

                importId: d.importId || "",
                importName: d.importName || "",
                importedAt: d.importedAt || "",

                assigned: d.assigned === true,

                status: d.status || ""
            };

            // Duplicate Indus ID allowed
            // हर Firebase document अलग record रहेगा
            allData.push(row);

        });

        console.log(
            "================================="
        );

        console.log(
            "ASSIGN IMPORT TOTAL:",
            allData.length
        );

        console.log(
            "ASSIGNED:",
            allData.filter(
                row => row.assigned === true
            ).length
        );

        console.log(
            "UNASSIGNED:",
            allData.filter(
                row => row.assigned !== true
            ).length
        );

        console.log(
            "================================="
        );

        currentPage = 1;

        renderTable();

        updateCounts();

        // अगर Total Record popup खुला हुआ है
        const popup =
            document.getElementById(
                "totalRecordPopup"
            );

        if (
            popup &&
            popup.style.display === "flex"
        ) {
            renderTotalRecordList();
        }

    }, error => {

        console.error(
            "Firebase assignImports error:",
            error
        );

        alert(
            "Assign Import data load nahi hua:\n" +
            error.message
        );

    });
}
function getStatus(row) {

    // COMPLETED
    if (
        row.completed === true ||
        String(row.pendingStatus || "").toLowerCase() === "completed" ||
        String(row.status || "").toLowerCase() === "completed"
    ) {
        return "Completed";
    }

    // HOLD
    if (
        String(row.pendingStatus || "").toLowerCase() === "hold" ||
        String(row.status || "").toLowerCase() === "hold" ||
        String(row.remark || "").trim() !== "" ||
        String(row.Remark || "").trim() !== ""
    ) {
        return "Hold";
    }

    // ASSIGNED
    if (
        row.assigned === true ||
        String(row.assignedTo || "").trim() !== ""
    ) {
        return "Assigned";
    }

    // PENDING
    return "Pending";
}

// =====================================================
// FILTER UI
// =====================================================

function createFilterUI() {

    const buttons =
        document.querySelector(".toolbarButtons");

    if (!buttons) return;

    if (document.getElementById("assignFilterBox")) {
        return;
    }

    const box = document.createElement("div");

    box.id = "assignFilterBox";

    box.innerHTML = `
        <select
            id="assignFilter"
            class="selectBox"
            onchange="changeAssignFilter()"
        >

            <option value="today">
                Today's Assign Task
            </option>

            <option value="hold">
                Hold Name
            </option>

            <option value="all">
                All Assign Task
            </option>

            <option value="completed">
                Completed
            </option>

        </select>
    `;

    buttons.insertBefore(
        box,
        buttons.firstChild
    );
}

function changeAssignFilter() {

    const select =
        document.getElementById("assignFilter");

    activeFilter =
        select ? select.value : "today";

    currentPage = 1;

    renderTable();
}

// =====================================================
// SEARCH
// =====================================================

function getSearchValue() {

    const input =
        document.getElementById("globalSearch");

    return input
        ? input.value.trim().toLowerCase()
        : "";
}

function globalSearch() {

    currentPage = 1;

    renderTable();
}
// =====================================================
// FILTER DATA - CARD + ASSIGN FILTER SUPPORT
// =====================================================
function getFilteredData() {

    let data = Array.isArray(allData)
        ? [...allData]
        : [];

    // -----------------------------------------
    // CARD FILTER
    // -----------------------------------------
    const cardFilter =
        window.cardListFilter || "assigned";
        


    // =========================================
    // TOTAL RECORDS
    // =========================================
    if (cardFilter === "total") {
        return data;
    }


    // =========================================
    // ASSIGNED
    // =========================================
    if (cardFilter === "assigned") {

        data = data.filter(row =>
            row.assigned === true ||
            row.assignedTo
        );

    }


    // =========================================
    // HOLD
    // =========================================
    else if (cardFilter === "hold") {

        data = data.filter(row =>
            String(row.pendingStatus || "").toLowerCase() === "hold" ||
            String(row.status || "").toLowerCase() === "hold" ||
            !!row.remark ||
            !!row.Remark
        );

    }


    // =========================================
    // COMPLETED
    // =========================================
    else if (cardFilter === "completed") {

        data = data.filter(row =>
            row.completed === true ||
            String(row.pendingStatus || "").toLowerCase() === "completed" ||
            String(row.status || "").toLowerCase() === "completed"
        );

    }


    // =========================================
    // PENDING
    // =========================================
    else if (cardFilter === "pending") {

        data = data.filter(row => {

            const isCompleted =
                row.completed === true ||
                String(row.pendingStatus || "").toLowerCase() === "completed" ||
                String(row.status || "").toLowerCase() === "completed";

            const isHold =
                String(row.pendingStatus || "").toLowerCase() === "hold" ||
                String(row.status || "").toLowerCase() === "hold" ||
                !!row.remark ||
                !!row.Remark;

            const isAssigned =
                row.assigned === true ||
                !!row.assignedTo;

            return !isCompleted &&
                   !isHold &&
                   !isAssigned;
        });

    }


    // =========================================
    // NORMAL ASSIGN FILTER
    // =========================================
    if (
        cardFilter === "assigned" &&
        activeFilter === "today"
    ) {

        const today = new Date().toDateString();

        data = data.filter(row => {

            if (!row.assignedTime) return false;

            const d = row.assignedTime?.toDate
                ? row.assignedTime.toDate()
                : new Date(row.assignedTime);

            return d.toDateString() === today;
        });

    }


    if (
        cardFilter === "assigned" &&
        activeFilter === "hold"
    ) {

        data = data.filter(row =>
            String(row.pendingStatus || "").toLowerCase() === "hold" ||
            String(row.status || "").toLowerCase() === "hold" ||
            !!row.remark ||
            !!row.Remark
        );

    }


    if (
        cardFilter === "assigned" &&
        activeFilter === "completed"
    ) {

        data = data.filter(row =>
            row.completed === true ||
            String(row.pendingStatus || "").toLowerCase() === "completed" ||
            String(row.status || "").toLowerCase() === "completed"
        );

    }


    return data;
}
// =====================================================
// TABLE
// =====================================================
function renderTable() {

    const tableBody = document.querySelector("#assignTable tbody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    filteredData = getFilteredData();

const data = filteredData;

data.forEach(row => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escapeHtml(row.indusId || row["Indus ID"] || "")}</td>

            <td>${escapeHtml(
                row.name ||
                row.siteName ||
                row["Site Name"] ||
                ""
            )}</td>

            <td>${escapeHtml(
                row.techName ||
                row["Tech Name"] ||
                ""
            )}</td>

            <td>${escapeHtml(
                row.techContact ||
                row["Tech Contact No."] ||
                ""
            )}</td>

            <td>${escapeHtml(
                row.fscName ||
                row["FSC Name"] ||
                ""
            )}</td>

            <td>${escapeHtml(
                row.fscContact ||
                row["FSC Contact No."] ||
                ""
            )}</td>

            <td>${escapeHtml(row.assignedTo || "")}</td>

            <td>
                <button
                    class="action-btn complete-btn"
                    onclick="openCompleteModal('${row.firestoreId}')">
                    Complete
                </button>

                <button
                    class="action-btn hold-btn"
                    onclick="openHoldModal('${row.firestoreId}')">
                    Hold
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    showPage();
}function updateCounts() {

    // =====================================================
    // SAFE DATA
    // =====================================================

    const data = Array.isArray(allData)
        ? allData
        : [];


    // =====================================================
    // HELPERS
    // =====================================================

    function isCompleted(row) {

        return (
            row.completed === true ||
            String(row.pendingStatus || "").toLowerCase() === "completed" ||
            String(row.status || "").toLowerCase() === "completed"
        );

    }


    function isHold(row) {

        return (
            String(row.pendingStatus || "").toLowerCase() === "hold" ||
            String(row.status || "").toLowerCase() === "hold" ||
            !!row.remark ||
            !!row.Remark
        );

    }


    function isAssigned(row) {

        return (
            row.assigned === true ||
            !!row.assignedTo
        );

    }


    // =====================================================
    // COUNTS
    // =====================================================

    const totalCount =
        data.length;


    const completedCount =
        data.filter(row =>
            isCompleted(row)
        ).length;


    const holdCount =
        data.filter(row =>
            isHold(row) &&
            !isCompleted(row)
        ).length;


    const assignedCount =
        data.filter(row =>
            isAssigned(row) &&
            !isCompleted(row) &&
            !isHold(row)
        ).length;


    const pendingCount =
        data.filter(row =>
            !isCompleted(row) &&
            !isHold(row) &&
            !isAssigned(row)
        ).length;


    // =====================================================
    // SAVE COUNTS
    // =====================================================

    window.dashboardCounts = {

        total: totalCount,

        assigned: assignedCount,

        hold: holdCount,

        completed: completedCount,

        pending: pendingCount

    };


    // =====================================================
    // UPDATE MAIN CARD NUMBERS
    // =====================================================
const elements = {

    total: [
        "totalRecords",
        "totalRecordCount",
        "totalCount"
    ],

    assigned: [
        "assignedRecords",
        "assignedRecordCount",
        "assignedCount",
        "Assign Task"
    ],

    hold: [
        "holdRecords",
        "holdRecordCount",
        "holdCount",
        "Hold Name"
    ],

    completed: [
        "completedRecords",
        "completedRecordCount",
        "completedCount",
        "completeRecords",
        "completeCount",
        "Complite List"
    ],

    pending: [
        "pendingRecords",
        "pendingRecordCount",
        "pendingCount"
    ]

};
    function updateElement(ids, value) {

        ids.forEach(function(id) {

            const el =
                document.getElementById(id);

            if (el) {

                el.innerText =
                    value;

                el.textContent =
                    value;

            }

        });

    }


    updateElement(
        elements.total,
        totalCount
    );


    updateElement(
        elements.assigned,
        assignedCount
    );


    updateElement(
        elements.hold,
        holdCount
    );


    updateElement(
        elements.completed,
        completedCount
    );


    updateElement(
        elements.pending,
        pendingCount
    );


    // =====================================================
    // OLD DISPLAY COUNTS
    // =====================================================

    const filteredData =
        getFilteredData();


    const showingElement =
        document.getElementById(
            "showingRecords"
        );


    const filteredElement =
        document.getElementById(
            "filteredRecords"
        );


    if (showingElement) {

        showingElement.innerText =
            filteredData.length;

    }


    if (filteredElement) {

        filteredElement.innerText =
            holdCount;

    }


    // =====================================================
    // TOTAL POPUP COUNT
    // =====================================================

    const popupTotal =
        document.getElementById(
            "popupTotalCount"
        );


    const popupAssigned =
        document.getElementById(
            "popupAssignedCount"
        );


    const popupUnassigned =
        document.getElementById(
            "popupUnassignedCount"
        );


    if (popupTotal) {

        popupTotal.innerText =
            totalCount;

    }


    if (popupAssigned) {

        popupAssigned.innerText =
            data.filter(row =>
                isAssigned(row)
            ).length;

    }


    if (popupUnassigned) {

        popupUnassigned.innerText =
            data.filter(row =>
                !isAssigned(row)
            ).length;

    }


    // =====================================================
    // REFRESH PAGE
    // =====================================================

    if (typeof showPage === "function") {

        showPage();

    }

}
function createTotalRecordPopup() {

    if (document.getElementById("totalRecordPopup")) return;

    const div = document.createElement("div");

    div.id = "totalRecordPopup";

    div.innerHTML = `
        <div class="total-popup-box">

            <div class="total-popup-header">

                <div>
                    <h2 id="totalPopupTitle">
                        Total Records
                    </h2>
                </div>

                <button onclick="closeTotalRecordPopup()">
                    ×
                </button>

            </div>

            <div class="total-summary">

                <div>
                    <b id="popupTotalCount">0</b>
                    <span>Total</span>
                </div>

                <div>
                    <b id="popupUnassignedCount">0</b>
                    <span>Unassigned</span>
                </div>

                <div>
                    <b id="popupAssignedCount">0</b>
                    <span>Assigned</span>
                </div>

            </div>

            <div
                id="totalPopupBack"
                style="
                    display:none;
                    padding:0 15px 12px;
                "
            >
                <button
                    onclick="totalPopupBack()"
                    style="
                        border:none;
                        background:#eee;
                        padding:9px 15px;
                        border-radius:8px;
                        cursor:pointer;
                        font-weight:bold;
                    "
                >
                    ← Back
                </button>
            </div>

            <div
                class="total-record-search"
                id="totalPopupSearchBox"
            >
                <input
                    type="text"
                    id="totalRecordSearch"
                    placeholder="Search Project / Tech / Indus ID..."
                    oninput="renderTotalPopup()"
                >
            </div>

            <div id="totalRecordList"></div>

        </div>
    `;

    document.body.appendChild(div);


    const style = document.createElement("style");

    style.innerHTML = `

        #totalRecordPopup {

            display:none;

            position:fixed;

            inset:0;

            background:rgba(0,0,0,.65);

            z-index:99999;

            align-items:center;

            justify-content:center;

            padding:15px;
        }


        .total-popup-box {

            width:100%;

            max-width:1100px;

            max-height:90vh;

            overflow:hidden;

            background:#fff;

            border-radius:18px;

            box-shadow:
                0 20px 60px rgba(0,0,0,.3);
        }


        .total-popup-header {

            display:flex;

            justify-content:space-between;

            align-items:center;

            padding:18px 22px;

            border-bottom:1px solid #ddd;
        }


        .total-popup-header h2 {

            margin:0;

            font-size:21px;
        }


        .total-popup-header button {

            border:0;

            background:#f1f1f1;

            width:38px;

            height:38px;

            border-radius:50%;

            font-size:25px;

            cursor:pointer;
        }


        .total-summary {

            display:flex;

            gap:12px;

            padding:15px;
        }


        .total-summary > div {

            flex:1;

            padding:14px;

            border-radius:12px;

            background:#f5f7fb;

            text-align:center;
        }


        .total-summary b {

            display:block;

            font-size:24px;
        }


        .total-summary span {

            font-size:13px;
        }


        .total-record-search {

            padding:0 15px 15px;
        }


        .total-record-search input {

            width:100%;

            box-sizing:border-box;

            padding:12px;

            border:1px solid #ddd;

            border-radius:10px;

            outline:none;
        }


        #totalRecordList {

            max-height:55vh;

            overflow:auto;

            padding:0 15px 20px;
        }


        .hierarchy-item {

            border:1px solid #e2e2e2;

            border-radius:12px;

            padding:15px;

            margin-bottom:10px;

            background:#fff;

            cursor:pointer;

            transition:.2s;
        }


        .hierarchy-item:hover {

            box-shadow:
                0 5px 18px rgba(0,0,0,.10);

            transform:translateY(-1px);
        }


        .hierarchy-top {

            display:flex;

            justify-content:space-between;

            align-items:center;

            gap:10px;
        }


        .hierarchy-name {

            font-size:16px;

            font-weight:700;
        }


        .hierarchy-count {

            background:#168a45;

            color:white;

            padding:6px 11px;

            border-radius:20px;

            font-size:13px;

            font-weight:bold;

            white-space:nowrap;
        }


        .hierarchy-sub {

            margin-top:5px;

            color:#666;

            font-size:13px;
        }


        .total-record-item {

            border:1px solid #e2e2e2;

            border-radius:12px;

            padding:13px;

            margin-bottom:10px;

            background:#fff;
        }


        .total-record-top {

            display:flex;

            justify-content:space-between;

            gap:10px;
        }


        .total-record-info {

            flex:1;
        }


        .total-record-info b {

            font-size:15px;
        }


        .total-record-info small {

            display:block;

            color:#666;

            margin-top:3px;
        }


        .assign-record-btn,
        .unassign-record-btn,
        .hold-record-btn {

            border:0;

            padding:9px 14px;

            border-radius:8px;

            cursor:pointer;

            color:#fff;

            font-weight:600;
        }


        .assign-record-btn {

            background:#168a45;
        }


        .unassign-record-btn {

            background:#d62828;
        }


        .hold-record-btn {

            background:#e67e22;
        }


        .assigned-label {

            color:#168a45;

            font-weight:600;
        }


        .unassigned-label {

            color:#d69e00;

            font-weight:600;
        }


        @media(max-width:600px) {

            .total-summary {

                flex-direction:column;
            }


            .total-record-top {

                flex-direction:column;
            }


            .assign-record-btn,
            .unassign-record-btn,
            .hold-record-btn {

                width:100%;
            }
        }

    `;

    document.head.appendChild(style);
}


// =====================================================
// OPEN POPUP
// =====================================================

function openTotalRecordPopup() {

    let popup =
        document.getElementById("totalRecordPopup");

    if (!popup) {

        createTotalRecordPopup();

        popup =
            document.getElementById("totalRecordPopup");
    }

    popup.style.display = "flex";

    totalPopupLevel = "project";

    selectedTotalProject = null;

    selectedTotalTech = null;

    const search =
        document.getElementById("totalRecordSearch");

    if (search) {
        search.value = "";
    }

    // IMPORTANT:
    // Agar kisi card se popup nahi khula hai,
    // to default Total Records rahega.
    if (!window.popupCardFilter) {
        window.popupCardFilter = "total";
    }

    renderTotalPopup();
}
// =====================================================
// CLOSE POPUP
// =====================================================

function closeTotalRecordPopup() {

    const popup =
        document.getElementById("totalRecordPopup");

    if (popup) {

        popup.style.display = "none";
    }
}


// =====================================================
// GET PROJECT NAME
// =====================================================

function getRowProjectName(row) {

    return (
        row.projectName ||
        row.project ||
        row["Project Name"] ||
        row["PROJECT NAME"] ||
        row.importName ||
        "Unknown Project"
    );
}


// =====================================================
// GET TECH NAME
// =====================================================

function getRowTechName(row) {

    return (
        row.techName ||
        row["Tech Name"] ||
        row["TECH NAME"] ||
        row.fscName ||
        row["FSC Name"] ||
        "Unknown Tech"
    );
}


// =====================================================
// GET INDUS ID
// =====================================================

function getRowIndusId(row) {

    return (
        row.indusId ||
        row["Indus ID"] ||
        row["INDUS ID"] ||
        row["INDUS_ID"] ||
        ""
    );
}


// =====================================================
// BACK BUTTON
// =====================================================

function totalPopupBack() {

    if (totalPopupLevel === "record") {

        totalPopupLevel = "tech";

        selectedTotalTech = null;

        renderTotalPopup();

        return;
    }


    if (totalPopupLevel === "tech") {

        totalPopupLevel = "project";

        selectedTotalProject = null;

        renderTotalPopup();

        return;
    }
}
function normalizeHeader(value) {

    return String(value || "")
        .toLowerCase()
        .replace(/[\s._\-\/()]+/g, "")
        .trim();

}


function getHeaderValue(row, aliases) {

    if (!row) return "";

    const data =
        row.data && typeof row.data === "object"
            ? row.data
            : row;

    const keys =
        Object.keys(data);

    const normalizedMap = {};

    keys.forEach(key => {

        normalizedMap[
            normalizeHeader(key)
        ] = key;

    });


    for (const alias of aliases) {

        const normalizedAlias =
            normalizeHeader(alias);

        const matchedKey =
            normalizedMap[normalizedAlias];

        if (
            matchedKey !== undefined &&
            data[matchedKey] !== undefined &&
            data[matchedKey] !== null &&
            String(data[matchedKey]).trim() !== ""
        ) {

            return data[matchedKey];

        }

    }


    return "";

}


// =====================================================
// FLEXIBLE IMPORT HEADER MAPPING
// =====================================================

function getImportedFields(row) {

    return {

        srNo: getHeaderValue(row, [
            "Sr No",
            "Sr. No",
            "Sr. No.",
            "S No",
            "S.No",
            "Serial No",
            "Serial Number"
        ]),

        indusId: getHeaderValue(row, [
            "Indus ID",
            "Indus Id",
            "INDUS ID",
            "ITL/BIL ID",
            "IndusID",
            "Indus Id."
        

        ]) || getRowIndusId(row),

        siteName: getHeaderValue(row, [
            "Site Name",
            "SiteName",
            "Site",
            "Name"
        ]),

        lat: getHeaderValue(row, [
            "Lat",
            "Latitude"
        ]),

        long: getHeaderValue(row, [
            "Long",
            "Longitude",
            "Lng",
            "Lon"
        ]),

        techName: getHeaderValue(row, [
            "Tech Name",
            "Technician Name",
            "Technician",
            "Tech",
            "FSC Name"
        ]) || getRowTechName(row),

        techNumber: getHeaderValue(row, [
            "Tech Number",
            "Tech No",
            "Tech Contact",
            "Tech Contact No",
            "Tech Contact No.",
            "Technician Number",
            "Technician Contact",
            "Technician Contact No"
        ]),

        fscName: getHeaderValue(row, [
            "FSC Name",
            "FSE",
            "FSC Name."
        ]),

        fscNumber: getHeaderValue(row, [
            "FSC Number",
            "FSC No",
            "FSE Contact",
            "FSC Contact No",
            "FSC Contact No.",
            "FSC Mobile",
            "FSC Phone"
        ])

    };

}
function renderTotalPopup() {

    const list =
        document.getElementById("totalRecordList");

    if (!list) return;

    const back =
        document.getElementById("totalPopupBack");

    const title =
        document.getElementById("totalPopupTitle");

    const searchInput =
        document.getElementById("totalRecordSearch");


    // =====================================================
    // GET ALL IMPORTED DATA
    // =====================================================

    let records =
        Array.isArray(allData)
            ? allData.filter(row => row.imported === true)
            : [];


    const cardFilter =
        window.popupCardFilter || "total";


    // =====================================================
    // CARD FILTER
    // =====================================================

    if (cardFilter === "pending") {

        records = records.filter(row => {

            const completed =
                row.completed === true ||
                String(row.pendingStatus || "").toLowerCase() === "completed" ||
                String(row.status || "").toLowerCase() === "completed";

            const hold =
                String(row.pendingStatus || "").toLowerCase() === "hold" ||
                String(row.status || "").toLowerCase() === "hold" ||
                String(row.remark || "").trim() !== "" ||
                String(row.Remark || "").trim() !== "";

            const assigned =
                row.assigned === true ||
                String(row.assignedTo || "").trim() !== "";

            return !completed &&
                   !hold &&
                   !assigned;
        });

    }


    else if (cardFilter === "hold") {

        records = records.filter(row => {

            return (
                String(row.pendingStatus || "").toLowerCase() === "hold" ||
                String(row.status || "").toLowerCase() === "hold" ||
                String(row.remark || "").trim() !== "" ||
                String(row.Remark || "").trim() !== ""
            );

        });

    }


    else if (cardFilter === "completed") {

        records = records.filter(row => {

            return (
                row.completed === true ||
                String(row.pendingStatus || "").toLowerCase() === "completed" ||
                String(row.status || "").toLowerCase() === "completed"
            );

        });

    }


    else if (cardFilter === "assigned") {

        records = records.filter(row => {

            const completed =
                row.completed === true ||
                String(row.pendingStatus || "").toLowerCase() === "completed" ||
                String(row.status || "").toLowerCase() === "completed";

            const hold =
                String(row.pendingStatus || "").toLowerCase() === "hold" ||
                String(row.status || "").toLowerCase() === "hold" ||
                String(row.remark || "").trim() !== "" ||
                String(row.Remark || "").trim() !== "";

            const assigned =
                row.assigned === true ||
                String(row.assignedTo || "").trim() !== "";

            return assigned &&
                   !completed &&
                   !hold;

        });

    }


    // =====================================================
    // POPUP SUMMARY
    // =====================================================

    const completedCount =
        records.filter(row =>
            row.completed === true ||
            String(row.pendingStatus || "").toLowerCase() === "completed" ||
            String(row.status || "").toLowerCase() === "completed"
        ).length;


    const holdCount =
        records.filter(row =>
            String(row.pendingStatus || "").toLowerCase() === "hold" ||
            String(row.status || "").toLowerCase() === "hold" ||
            !!row.remark ||
            !!row.Remark
        ).length;


    const assignedCount =
        records.filter(row =>
            row.assigned === true ||
            !!row.assignedTo
        ).length;


    const unassignedCount =
        records.length - assignedCount;


    const popupTotalCount =
        document.getElementById("popupTotalCount");

    const popupAssignedCount =
        document.getElementById("popupAssignedCount");

    const popupUnassignedCount =
        document.getElementById("popupUnassignedCount");


    if (popupTotalCount) {
        popupTotalCount.innerText =
            records.length;
    }

    if (popupAssignedCount) {
        popupAssignedCount.innerText =
            assignedCount;
    }

    if (popupUnassignedCount) {
        popupUnassignedCount.innerText =
            unassignedCount;
    }


    // =====================================================
    // PROJECT LEVEL
    // =====================================================

    if (totalPopupLevel === "project") {

        if (back) {
            back.style.display = "none";
        }


        if (title) {

            if (cardFilter === "total") {
                title.innerText =
                    "Total Records → Project";
            }
            else if (cardFilter === "pending") {
                title.innerText =
                    "Pending → Project";
            }
            else if (cardFilter === "hold") {
                title.innerText =
                    "Hold → Project";
            }
            else if (cardFilter === "completed") {
                title.innerText =
                    "Completed → Project";
            }
            else if (cardFilter === "assigned") {
                title.innerText =
                    "Assigned → Project";
            }

        }


        if (searchInput) {
            searchInput.placeholder =
                "Search Project Name...";
        }


        const projects = {};


        records.forEach(row => {

            const projectId =
                row.projectId ||
                getRowProjectName(row);

            const projectName =
                getRowProjectName(row);


            if (!projects[projectId]) {

                projects[projectId] = {

                    id: projectId,

                    name: projectName,

                    rows: []

                };

            }


            projects[projectId].rows.push(row);

        });


        let projectArray =
            Object.values(projects);


        const search =
            String(searchInput?.value || "")
                .toLowerCase()
                .trim();


        if (search) {

            projectArray =
                projectArray.filter(project =>
                    String(project.name)
                        .toLowerCase()
                        .includes(search)
                );

        }


        list.innerHTML = "";


        if (!projectArray.length) {

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Project Found
                </div>
            `;

            return;
        }


        projectArray.forEach(project => {

            const item =
                document.createElement("div");


            item.className =
                "hierarchy-item";


            // =============================================
            // PROJECT CLICK
            // =============================================

            item.onclick = function(event) {

                event.stopPropagation();


                selectedTotalProject =
                    project.id;


                // Assigned me pehle Assign Name dikhega
                if (cardFilter === "assigned") {

                    totalPopupLevel =
                        "assign";

                    window.selectedTotalAssignName =
                        null;

                }
                else {

                    totalPopupLevel =
                        "tech";

                }


                if (searchInput) {
                    searchInput.value = "";
                }


                renderTotalPopup();

            };


            item.innerHTML = `

                <div class="hierarchy-top">

                    <div>

                        <div class="hierarchy-name">
                            📁 ${escapeHtml(project.name)}
                        </div>

                        <div class="hierarchy-sub">
                            Project
                        </div>

                    </div>


                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                            flex-wrap:wrap;
                            justify-content:flex-end;
                        "
                    >

                        <div class="hierarchy-count">
                            ${project.rows.length}
                        </div>


                        ${
                            cardFilter === "total"
                            ?
                            `
                            <button
                                type="button"
                                class="delete-project-btn"
                            >
                                🗑 Empty
                            </button>
                            `
                            :
                            ""
                        }

                    </div>

                </div>
            `;


            const deleteBtn =
                item.querySelector(
                    ".delete-project-btn"
                );


            if (deleteBtn) {

                deleteBtn.onclick =
                    function(event) {

                        event.stopPropagation();

                        deleteProjectById(
                            project.id,
                            project.name
                        );

                    };

            }


            list.appendChild(item);

        });


        return;
    }


    // =====================================================
    // ASSIGN NAME LEVEL
    // ONLY FOR ASSIGNED CARD
    // =====================================================

    if (
        totalPopupLevel === "assign" &&
        cardFilter === "assigned"
    ) {

        if (back) {
            back.style.display = "block";
        }


        if (title) {
            title.innerText =
                "Assigned → Assign Name";
        }


        if (searchInput) {
            searchInput.placeholder =
                "Search Assign Name...";
        }


        const projectRows =
            records.filter(row => {

                const projectId =
                    row.projectId ||
                    getRowProjectName(row);


                return (
                    String(projectId) ===
                    String(selectedTotalProject)
                );

            });


        const assignNames = {};


        projectRows.forEach(row => {

            const assignName =
                String(row.assignedTo || "")
                    .trim() ||
                "Unknown Assign Name";


            if (!assignNames[assignName]) {

                assignNames[assignName] = {

                    name: assignName,

                    rows: []

                };

            }


            assignNames[assignName].rows.push(row);

        });


        let assignArray =
            Object.values(assignNames);


        const search =
            String(searchInput?.value || "")
                .toLowerCase()
                .trim();


        if (search) {

            assignArray =
                assignArray.filter(assign =>
                    String(assign.name)
                        .toLowerCase()
                        .includes(search)
                );

        }


        list.innerHTML = "";


        if (!assignArray.length) {

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Assign Name Found
                </div>
            `;

            return;
        }


        assignArray.forEach(assign => {

            const item =
                document.createElement("div");


            item.className =
                "hierarchy-item";


            item.style.cursor =
                "pointer";


            item.onclick =
                function(event) {

                    event.stopPropagation();


                    window.selectedTotalAssignName =
                        assign.name;


                    totalPopupLevel =
                        "tech";


                    if (searchInput) {
                        searchInput.value = "";
                    }


                    renderTotalPopup();

                };


            item.innerHTML = `

                <div class="hierarchy-top">

                    <div>

                        <div class="hierarchy-name">
                            👤 ${escapeHtml(assign.name)}
                        </div>

                        <div class="hierarchy-sub">
                            Assign Name
                        </div>

                    </div>


                    <div style="
    display:flex;
    align-items:center;
    gap:8px;
">

    <div class="hierarchy-count">
        ${assign.rows.length}
    </div>

<button
    type="button"
    onclick="
        event.stopPropagation();

        const rows = allData.filter(row =>
            String(row.assignedTo || '').trim() ===
            String('${assign.name}').trim() &&
            String(row.projectId || getRowProjectName(row)) ===
            String('${selectedTotalProject}')
        );

        if (!rows.length) {
            alert('No records found');
            return;
        }

        const data = rows.map(row => ({
            'Indus ID': getRowIndusId(row),
            'Name': row.name || row.siteName || row['Site Name'] || '',
            'Tech Name': getRowTechName(row),
            'Tech Contact No.': row.techContact || row['Tech Contact No.'] || '',
            'FSC Name': row.fscName || row['FSC Name'] || '',
            'FSC Contact No.': row.fscContact || row['FSC Contact No.'] || '',
            'Area': row.area || row['Area'] || '',
            'AOM Name': row.aomName || row['AOM Name'] || '',
            'AOM Contact No.': row.aomContact || row['AOM Contact No.'] || '',
            'Lat': row.lat || row['Lat'] || '',
            'Long': row.long || row['Long'] || '',
            'Remark': row.remark || row.Remark || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Assigned'
        );

        XLSX.writeFile(
            workbook,
            '${assign.name}_Assigned.xlsx'
        );
    "
    style="
    width:36px;
    height:36px;
    border:1px solid rgba(59,130,246,0.35);
    border-radius:50%;
    cursor:pointer;
    font-size:18px;
    font-weight:700;
    background:linear-gradient(135deg,#3b82f6,#6366f1);
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:0 4px 12px rgba(59,130,246,0.35);
"
    title="Download"
>
    ⬇
</button>
    <button
        type="button"
        onclick="
            event.stopPropagation();
            window.selectedTotalAssignName = null;
            totalPopupLevel = 'project';
            selectedTotalProject = null;
            renderTotalPopup();
        "
        style="
    width:36px;
    height:36px;
    border:1px solid rgba(239,68,68,0.35);
    border-radius:50%;
    cursor:pointer;
    font-size:18px;
    font-weight:700;
    background:linear-gradient(135deg,#ef4444,#dc2626);
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:0 4px 12px rgba(239,68,68,0.35);
"
        title="Cancel"
    >
        ✕
    </button>

</div>

                </div>
            `;


            list.appendChild(item);

        });


        return;
    }


    // =====================================================
    // TECH LEVEL
    // =====================================================

    if (totalPopupLevel === "tech") {

        if (back) {
            back.style.display = "block";
        }


        if (title) {

            if (cardFilter === "assigned") {

                title.innerText =
                    "Assign Name → Tech Name";

            }
            else if (cardFilter === "completed") {

                title.innerText =
                    "Completed → Tech Name";

            }
            else if (cardFilter === "hold") {

                title.innerText =
                    "Hold → Tech Name";

            }
            else if (cardFilter === "pending") {

                title.innerText =
                    "Pending → Tech Name";

            }
            else {

                title.innerText =
                    "Project → Tech Name";

            }

        }


        if (searchInput) {
            searchInput.placeholder =
                "Search Tech Name...";
        }


        const projectRows =
            records.filter(row => {

                const projectId =
                    row.projectId ||
                    getRowProjectName(row);


                const projectMatch =
                    String(projectId) ===
                    String(selectedTotalProject);


                if (!projectMatch) {
                    return false;
                }


                // Assigned popup me Assign Name bhi match hoga
                if (cardFilter === "assigned") {

                    return (
                        String(row.assignedTo || "").trim() ===
                        String(
                            window.selectedTotalAssignName || ""
                        ).trim()
                    );

                }


                return true;

            });


        const techs = {};


        projectRows.forEach(row => {

            const tech =
                getRowTechName(row);


            if (!techs[tech]) {

                techs[tech] = {

                    name: tech,

                    rows: []

                };

            }


            techs[tech].rows.push(row);

        });


        let techArray =
            Object.values(techs);


        const search =
            String(searchInput?.value || "")
                .toLowerCase()
                .trim();


        if (search) {

            techArray =
                techArray.filter(tech =>
                    String(tech.name)
                        .toLowerCase()
                        .includes(search)
                );

        }


        list.innerHTML = "";


        if (!techArray.length) {

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Tech Found
                </div>
            `;

            return;
        }


        // =================================================
        // TECH LIST
        // =================================================

        techArray.forEach(tech => {

            const item =
                document.createElement("div");


            item.className =
                "hierarchy-item";


            item.style.cursor =
                "pointer";


            // =============================================
            // TECH CLICK
            // =============================================

            item.onclick =
                function(event) {

                    event.stopPropagation();


                    selectedTotalTech =
                        tech.name;


                    totalPopupLevel =
                        "record";


                    if (searchInput) {
                        searchInput.value = "";
                    }


                    renderTotalPopup();

                };


            item.innerHTML = `

                <div class="hierarchy-top">

                    <div>

                        <div class="hierarchy-name">
                            👨‍🔧 ${escapeHtml(tech.name)}
                        </div>

                        <div class="hierarchy-sub">
                            Tech Name
                        </div>

                    </div>


                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                            flex-wrap:wrap;
                            justify-content:flex-end;
                        "
                    >

                        <div class="hierarchy-count">
                            ${tech.rows.length}
                        </div>


                        ${
                            cardFilter === "assigned"
                            ?
                            `

                            `
                            :
                            ""
                        }

                    </div>

                </div>
            `;


            // =============================================
            // DOWNLOAD BUTTON
            // =============================================

            const downloadBtn =
                item.querySelector(
                    ".download-tech-btn"
                );


            if (downloadBtn) {

                downloadBtn.onclick =
                    function(event) {

                        event.stopPropagation();

                        downloadTechRecords(
                            tech.rows,
                            tech.name
                        );

                    };

            }


            list.appendChild(item);

        });


        return;
    }


    // =====================================================
    // RECORD LEVEL
    // =====================================================

    if (totalPopupLevel === "record") {

        if (back) {
            back.style.display = "block";
        }


        if (title) {

            if (cardFilter === "assigned") {

                title.innerText =
                    "Tech → Records";

            }
            else {

                title.innerText =
                    "Tech → Records";

            }

        }


        if (searchInput) {

            searchInput.placeholder =
                "Search Indus ID / Name...";

        }


        let techRows =
            records.filter(row => {

                const projectId =
                    row.projectId ||
                    getRowProjectName(row);


                const tech =
                    getRowTechName(row);


                const projectMatch =
                    String(projectId) ===
                    String(selectedTotalProject);


                const techMatch =
                    String(tech) ===
                    String(selectedTotalTech);


                if (!projectMatch ||
                    !techMatch) {

                    return false;

                }


                // Assigned popup me Assign Name bhi check
                if (cardFilter === "assigned") {

                    return (
                        String(row.assignedTo || "").trim() ===
                        String(
                            window.selectedTotalAssignName || ""
                        ).trim()
                    );

                }


                return true;

            });


        const search =
            String(searchInput?.value || "")
                .toLowerCase()
                .trim();


        if (search) {

            techRows =
                techRows.filter(row => {

                    const text = [

                        getRowIndusId(row),

                        row.name,

                        row.siteName,

                        row["Site Name"],

                        getRowTechName(row),

                        row.assignedTo,

                        row.remark,

                        row.Remark

                    ]
                    .join(" ")
                    .toLowerCase();


                    return text.includes(search);

                });

        }


        list.innerHTML = "";


        if (!techRows.length) {

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Records Found
                </div>
            `;

            return;
        }


        // =================================================
        // RECORD LIST
        // =================================================

        techRows.forEach(row => {
const imported =
    getImportedFields(row);


const indus =
    imported.indusId;


const name =
    imported.siteName;


const lat =
    imported.lat;


const long =
    imported.long;


const tech =
    imported.techName;


const techNumber =
    imported.techNumber;


const fscName =
    imported.fscName;


const fscNumber =
    imported.fscNumber;


const srNo =
    imported.srNo;

            const isCompleted =
                row.completed === true ||
                String(row.pendingStatus || "").toLowerCase() === "completed" ||
                String(row.status || "").toLowerCase() === "completed";


            const isHold =
                String(row.pendingStatus || "").toLowerCase() === "hold" ||
                String(row.status || "").toLowerCase() === "hold" ||
                !!row.remark ||
                !!row.Remark;


            const isAssigned =
                row.assigned === true ||
                !!row.assignedTo;


            const item =
                document.createElement("div");


            item.className =
                "total-record-item";


            let statusText =
                "Pending";


            if (isCompleted) {

                statusText =
                    "Completed";

            }
            else if (isHold) {

                statusText =
                    "Hold";

            }
            else if (isAssigned) {

                statusText =
                    "Assigned";

            }


            item.innerHTML = `

                <div class="total-record-top">

                    <div class="total-record-info">
<b>
    Sr. No:
    ${escapeHtml(srNo || "-")}
</b>

<small>
    Indus ID:
    ${escapeHtml(indus || "-")}
</small>

<small>
    Site Name:
    ${escapeHtml(name || "-")}
</small>

<small>
    Lat:
    ${escapeHtml(lat || "-")}
</small>

<small>
    Long:
    ${escapeHtml(long || "-")}
</small>

<small>
    Tech Name:
    ${escapeHtml(tech || "-")}
</small>

<small>
    Tech Number:
    ${escapeHtml(techNumber || "-")}
</small>

<small>
    FSC Name:
    ${escapeHtml(fscName || "-")}
</small>

<small>
    FSC Number:
    ${escapeHtml(fscNumber || "-")}
</small>

                        <small>
                            Status:
                            ${escapeHtml(statusText)}
                        </small>


                        ${
                            isAssigned
                            ?
                            `
                            <small class="assigned-label">
                                Assigned To:
                                ${escapeHtml(
                                    row.assignedTo || ""
                                )}
                            </small>
                            `
                            :
                            ""
                        }


                        ${
                            isHold
                            ?
                            `
                            <small>
                                Remark:
                                ${escapeHtml(
                                    row.remark ||
                                    row.Remark ||
                                    ""
                                )}
                            </small>
                            `
                            :
                            ""
                        }

                    </div>


                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                            justify-content:flex-end;
                        "
                    >

                        ${
                            cardFilter === "total" &&
                            !isCompleted
                            ?
                            (
                                isAssigned
                                ?
                                `
                                <button
                                    class="unassign-record-btn"
                                    onclick="
                                        event.stopPropagation();
                                        unassignRecordById(
                                            '${row.firestoreId}'
                                        );
                                    "
                                >
                                    Unassign
                                </button>
                                `
                                :
                                `
                                <button
                                    class="assign-record-btn"
                                    onclick="
                                        event.stopPropagation();
                                        openAssignPopupById(
                                            '${row.firestoreId}'
                                        );
                                    "
                                >
                                    Assign
                                </button>
                                `
                            )
                            :
                            ""
                        }


                        ${
                            cardFilter === "total" &&
                            !isCompleted
                            ?
                            `
                            <button
                                class="hold-record-btn"
                                onclick="
                                    event.stopPropagation();
                                    openHoldById(
                                        '${row.firestoreId}'
                                    );
                                "
                            >
                                Hold
                            </button>
                            `
                            :
                            ""
                        }


                        ${
                            cardFilter === "assigned" &&
                            !isCompleted
                            ?
                            `
                            <button
    class="complete-record-btn"
    onclick="
        event.stopPropagation();
        openCompleteById(
            '${row.firestoreId}'
        );
    "
    title="Complete Task"
    style="
        width:38px;
        height:38px;
        border:1px solid rgba(34,197,94,0.35);
        border-radius:50%;
        cursor:pointer;
        font-size:17px;
        font-weight:700;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 4px 12px rgba(34,197,94,0.35);
    "
>
    ✓
</button>
                            `
                            :
                            ""
                        }

                    </div>

                </div>
            `;


            list.appendChild(item);

        });


        return;
    }

}
// =====================================================
// OLD FUNCTION COMPATIBILITY
// =====================================================

function renderTotalRecordList() {

    renderTotalPopup();
}
function openAssignPopupById(id) {

    const row = allData.find(
        r => r.firestoreId === id
    );

    if (!row) {
        alert("Record not found");
        return;
    }

    const name = prompt(
        "Enter Assign Name:"
    );

    if (name === null) return;

    const assignName = name.trim();

    if (!assignName) {
        alert("Please enter Assign Name");
        return;
    }

    saveTotalRecordAssignment(
        row,
        assignName
    );
}


async function saveTotalRecordAssignment(row, assignName) {

    if (!row.firestoreId) {
        alert("Firestore ID missing");
        return;
    }

    try {

        await firebase.firestore()
            .collection("assignImports")
            .doc(row.firestoreId)
            .update({

                assigned: true,

                assignedTo: assignName,

                assignedTime:
                    firebase.firestore.FieldValue
                    .serverTimestamp(),

                pendingStatus: "Assigned",

                status: "Assigned"
            });

        alert("Record Assigned Successfully");

        renderTotalRecordList();

    } catch (error) {

        console.error(
            "Assign error:",
            error
        );

        alert(
            "Assign failed: " +
            error.message
        );
    }
}

async function unassignRecordById(id) {

    if (!confirm(
        "Are you sure you want to Unassign this record?"
    )) {
        return;
    }

    try {

        await db
            .collection("assignImports")
            .doc(id)
            .update({

                assigned: false,

                assignedTo: "",

                assignedTime:
                    firebase.firestore
                        .FieldValue
                        .delete(),

                pendingStatus: "Pending",

                status: "Pending"
            });

        alert(
            "Record Unassigned Successfully"
        );

    } catch (error) {

        console.error(
            "Unassign error:",
            error
        );

        alert(
            "Unassign failed:\n" +
            error.message
        );
    }
}
// =====================================================
// PAGINATION
// =====================================================

function showPage() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredData.length /
                rowsPerPage
            )
        );

    const pageInfo =
        document.getElementById(
            "pageInfo"
        );

    const totalPagesElement =
        document.getElementById(
            "totalPages"
        );

    if (pageInfo) {

        pageInfo.textContent =
            `Page ${currentPage} / ${totalPages}`;
    }

    if (totalPagesElement) {

        totalPagesElement.textContent =
            totalPages;
    }
}

function nextPage() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredData.length /
                rowsPerPage
            )
        );

    if (currentPage < totalPages) {

        currentPage++;

        renderTable();
    }
}

function prevPage() {

    if (currentPage > 1) {

        currentPage--;

        renderTable();
    }
}

function changePageSize() {

    rowsPerPage =
        Number(
            document.getElementById(
                "pageSize"
            ).value
        );

    currentPage = 1;

renderTable();

updateCounts();
}

// =====================================================
// SORT
// =====================================================

function sortTable(columnIndex) {

    sortDirection[columnIndex] =
        !sortDirection[columnIndex];

    const asc =
        sortDirection[columnIndex];

    const fields = [

        row => getIndusId(row),

        row =>
            row["Site Name"] ||
            row["Site"] ||
            "",

        row =>
            row["Tech Name"] ||
            "",

        row =>
            row["Tech Contact no"] ||
            row["Tech Contact No."] ||
            "",

        row =>
            row.assignedTo ||
            "",

        row =>
            row["FSE Name"] ||
            row["FSC Name"] ||
            "",

        row =>
            row["FSE Contact"] ||
            row["FSC Contact"] ||
            ""
    ];

    filteredData.sort((a, b) => {

        const A =
            String(
                fields[columnIndex](a) || ""
            ).toLowerCase();

        const B =
            String(
                fields[columnIndex](b) || ""
            ).toLowerCase();

        if (
            !isNaN(A) &&
            !isNaN(B)
        ) {

            return asc
                ? Number(A) - Number(B)
                : Number(B) - Number(A);
        }

        return asc
            ? A.localeCompare(B)
            : B.localeCompare(A);
    });

    renderTable();
}

// =====================================================
// COMPLETE MODAL
// =====================================================

function createCompleteModal() {

    if (
        document.getElementById(
            "completeModal"
        )
    ) {
        return;
    }

    const div =
        document.createElement("div");

    div.id =
        "completeModal";

    div.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.65);
        display:none;
        align-items:center;
        justify-content:center;
        z-index:99999;
        padding:15px;
    `;

    div.innerHTML = `

        <div
            style="
                width:100%;
                max-width:500px;
                background:white;
                border-radius:18px;
                padding:22px;
                max-height:90vh;
                overflow:auto;
            "
        >

            <h2>✅ Complete Task</h2>

            <div
                id="completeTaskInfo"
                style="
                    margin:12px 0;
                    padding:10px;
                    background:#f3f3f3;
                    border-radius:10px;
                "
            ></div>

            <label>
                Sensor Sr. No.
            </label>

            <input
                type="text"
                id="sensorSerialInput"
                placeholder="Enter Sensor Sr. No."
                style="width:100%;padding:10px;margin:6px 0 14px;"
                oninput="checkCompleteForm()"
            >

            <label>
                Video
            </label>

            <input
                type="file"
                id="taskVideoInput"
                accept="video/*"
                style="width:100%;margin:6px 0 14px;"
                onchange="checkCompleteForm()"
            >

            <label>
                Reports Photo
            </label>

            <input
                type="file"
                id="taskPhotoInput"
                accept="image/*"
                multiple
                style="width:100%;margin:6px 0 14px;"
                onchange="checkCompleteForm()"
            >

            <label>
                Reports CSV / Excel
            </label>

            <input
                type="file"
                id="taskCsvInput"
                accept=".csv,.xlsx,.xls"
                style="width:100%;margin:6px 0 18px;"
                onchange="checkCompleteForm()"
            >

            <div
                id="completeUploadStatus"
                style="
                    display:none;
                    margin-bottom:12px;
                    font-weight:600;
                "
            ></div>

            <div
                style="
                    display:flex;
                    gap:10px;
                "
            >

                <button
                    onclick="closeCompleteModal()"
                    style="flex:1;padding:12px;"
                >
                    Cancel
                </button>
                <button
    onclick="downloadHoldCurrentRecord()"
    style="
        flex:1;
        padding:12px;
        border:0;
        border-radius:10px;
        cursor:pointer;
    "
>
    ⬇ Download
</button>

                <button
                    id="submitCompleteBtn"
                    onclick="submitCompleteTask()"
                    disabled
                    style="
                        flex:1;
                        padding:12px;
                        opacity:.5;
                    "
                >
                    Submit
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(div);
}
function downloadHoldCurrentRecord() {

    const id =
        window.currentHoldRecordId;

    if (!id) {
        alert("Hold record select nahi hai");
        return;
    }

    const row =
        allData.find(r => r.firestoreId === id);

    if (!row) {
        alert("Record not found");
        return;
    }

    downloadTechRecords(
        [row],
        getRowTechName(row) || "Hold_Record"
    );
}
// =====================================================
// OPEN COMPLETE
// =====================================================

function openCompleteById(id) {

    const row =
        allData.find(
            x => x.firestoreId === id
        );

    if (row) {
        openCompleteModal(row);
    }
}

function openCompleteModal(row) {

    createCompleteModal();

    activeCompleteRow =
        row;

    const modal =
        document.getElementById(
            "completeModal"
        );

    const info =
        document.getElementById(
            "completeTaskInfo"
        );

    info.innerHTML = `

        <b>Indus ID:</b>
        ${escapeHtml(getIndusId(row))}

        <br>

        <b>Site:</b>
        ${escapeHtml(
            row["Site Name"] ||
            row["Site"] ||
            ""
        )}

        <br>

        <b>Tech:</b>
        ${escapeHtml(
            row["Tech Name"] ||
            ""
        )}
    `;

    document.getElementById(
        "sensorSerialInput"
    ).value = "";

    document.getElementById(
        "taskVideoInput"
    ).value = "";

    document.getElementById(
        "taskPhotoInput"
    ).value = "";

    document.getElementById(
        "taskCsvInput"
    ).value = "";

    const status =
        document.getElementById(
            "completeUploadStatus"
        );

    if (status) {
        status.style.display = "none";
        status.textContent = "";
    }

    checkCompleteForm();

    modal.style.display =
        "flex";
}

// =====================================================
// CHECK COMPLETE FORM
// =====================================================

function checkCompleteForm() {

    const sensor =
        document.getElementById(
            "sensorSerialInput"
        );

    const video =
        document.getElementById(
            "taskVideoInput"
        );

    const photo =
        document.getElementById(
            "taskPhotoInput"
        );

    const csv =
        document.getElementById(
            "taskCsvInput"
        );

    const button =
        document.getElementById(
            "submitCompleteBtn"
        );

    if (!button) return;

    const ready =
        sensor &&
        sensor.value.trim() &&
        video &&
        video.files.length &&
        photo &&
        photo.files.length &&
        csv &&
        csv.files.length;

    button.disabled =
        !ready;

    button.style.opacity =
        ready ? "1" : ".5";

    button.style.cursor =
        ready ? "pointer" : "not-allowed";
}

// =====================================================
// CLOSE COMPLETE
// =====================================================

function closeCompleteModal() {

    const modal =
        document.getElementById(
            "completeModal"
        );

    if (modal) {
        modal.style.display =
            "none";
    }

    activeCompleteRow =
        null;
}

// =====================================================
// CLOUDINARY
// =====================================================

async function uploadToCloudinary(file) {

    if (!file) return "";

    const url =
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;

    const form =
        new FormData();

    form.append(
        "file",
        file
    );

    form.append(
        "upload_preset",
        CLOUDINARY_PRESET
    );

    const response =
        await fetch(
            url,
            {
                method: "POST",
                body: form
            }
        );

    if (!response.ok) {

        throw new Error(
            "Cloudinary upload failed"
        );
    }

    const result =
        await response.json();

    return result.secure_url || "";
}

// =====================================================
// COMPLETE TASK
// =====================================================

async function submitCompleteTask() {

    if (!activeCompleteRow) {

        alert(
            "Task select nahi hai."
        );

        return;
    }

    const sensorSerial =
        document.getElementById(
            "sensorSerialInput"
        ).value.trim();

    const videoFile =
        document.getElementById(
            "taskVideoInput"
        ).files[0];

    const photoFiles =
        Array.from(
            document.getElementById(
                "taskPhotoInput"
            ).files
        );

    const csvFile =
        document.getElementById(
            "taskCsvInput"
        ).files[0];

    // Mandatory
    if (!sensorSerial) {

        alert(
            "Sensor Sr. No. fill karein."
        );

        return;
    }

    if (!videoFile) {

        alert(
            "Video select karein."
        );

        return;
    }

    if (!photoFiles.length) {

        alert(
            "Reports Photo select karein."
        );

        return;
    }

    if (!csvFile) {

        alert(
            "Reports CSV / Excel select karein."
        );

        return;
    }

    const button =
        document.getElementById(
            "submitCompleteBtn"
        );

    const uploadStatus =
        document.getElementById(
            "completeUploadStatus"
        );

    button.disabled = true;

    button.textContent =
        "Uploading...";

    button.style.opacity = ".6";

    if (uploadStatus) {

        uploadStatus.style.display =
            "block";

        uploadStatus.textContent =
            "⏳ Video upload ho raha hai...";
    }

    try {

        // VIDEO
        const videoUrl =
            await uploadToCloudinary(
                videoFile
            );

        // PHOTOS
        const photoUrls = [];

        for (
            let i = 0;
            i < photoFiles.length;
            i++
        ) {

            if (uploadStatus) {

                uploadStatus.textContent =
                    `⏳ Photo ${i + 1} / ${photoFiles.length} upload ho raha hai...`;
            }

            const url =
                await uploadToCloudinary(
                    photoFiles[i]
                );

            if (url) {
                photoUrls.push(url);
            }
        }

        // CSV
        if (uploadStatus) {

            uploadStatus.textContent =
                "⏳ Reports CSV / Excel upload ho raha hai...";
        }

        const csvUrl =
            await uploadToCloudinary(
                csvFile
            );

        // USER
        const user =
            getCurrentUser();

        const completedBy =
            user?.name ||
            user?.userName ||
            user?.email ||
            "User";

        const firestoreId =
            activeCompleteRow.firestoreId;

        const indusId =
            getIndusId(
                activeCompleteRow
            );

        const batch =
            db.batch();

        // PENDING SITE UPDATE

       const pendingRef =
    db.collection(
        "assignImports"
    ).doc(
        firestoreId
    );

        batch.update(
            pendingRef,
            {

                completed: true,

                completedBy:
                    completedBy,

                completedTime:
                    firebase.firestore.FieldValue
                        .serverTimestamp(),

                sensorSerial:
                    sensorSerial,

                videoUrl:
                    videoUrl,

                photoUrl:
                    photoUrls,

                csvUrl:
                    csvUrl,

                status:
                    "Completed",

                pendingStatus:
                    "Completed"
            }
        );

        // REPORTS RECORD

        const reportRef =
            db.collection(
                "reports"
            ).doc();

        batch.set(
            reportRef,
            {

                indusId:
                    indusId,

                type:
                    "TaskComplete",

                taskCompleted:
                    true,

                sensorSerial:
                    sensorSerial,

                videoUrl:
                    videoUrl,

                photoUrl:
                    photoUrls,

                csvUrl:
                    csvUrl,

                projectId:
                    activeCompleteRow.projectId ||
                    "",

                completedBy:
                    completedBy,

                createdAt:
                    firebase.firestore.FieldValue
                        .serverTimestamp()
            }
        );

        if (uploadStatus) {

            uploadStatus.textContent =
                "⏳ Firebase me data save ho raha hai...";
        }

        await batch.commit();

        alert(
            "✅ Task Successfully Completed"
        );

        closeCompleteModal();

        renderTable();

    } catch (error) {

        console.error(
            "Complete Error:",
            error
        );

        alert(
            "Task complete nahi hua:\n" +
            error.message
        );

    } finally {

        if (button) {

            button.textContent =
                "Submit";

            checkCompleteForm();
        }
    }
}
// =====================================================
// HOLD MODAL
// =====================================================

let activeHoldRow = null;

function createHoldModal() {

    if (document.getElementById("holdModal")) {
        return;
    }

    const div =
        document.createElement("div");

    div.id = "holdModal";

    div.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.65);
        display:none;
        align-items:center;
        justify-content:center;
        z-index:999999;
        padding:15px;
    `;

    div.innerHTML = `

        <div
            style="
                width:100%;
                max-width:450px;
                background:white;
                border-radius:18px;
                padding:22px;
                box-shadow:0 15px 50px rgba(0,0,0,.35);
            "
        >

            <h2 style="margin-bottom:15px;">
                🟡 Hold Task
            </h2>

            <div
                id="holdTaskInfo"
                style="
                    margin-bottom:15px;
                    padding:12px;
                    background:#f3f3f3;
                    border-radius:10px;
                "
            ></div>

            <label
                style="
                    display:block;
                    font-weight:600;
                    margin-bottom:6px;
                "
            >
                Hold Type / Remark
            </label>

            <textarea
                id="holdRemarkInput"
                placeholder="Hold ka reason / type likhein..."
                style="
                    width:100%;
                    min-height:120px;
                    padding:12px;
                    border:1px solid #ccc;
                    border-radius:10px;
                    resize:vertical;
                    font-family:inherit;
                "
            ></textarea>

            <div
                style="
                    display:flex;
                    gap:10px;
                    margin-top:15px;
                "
            >

                <button
                    onclick="closeHoldModal()"
                    style="
                        flex:1;
                        padding:12px;
                        border:0;
                        border-radius:10px;
                        cursor:pointer;
                    "
                >
                    Cancel
                </button>
                <button
    onclick="downloadHoldCurrentRecord()"
    style="
        flex:1;
        padding:12px;
        border:0;
        border-radius:10px;
        cursor:pointer;
    "
>
    ⬇ Download
</button>

                <button
                    onclick="submitHoldTask()"
                    style="
                        flex:1;
                        padding:12px;
                        border:0;
                        border-radius:10px;
                        background:#f59e0b;
                        color:white;
                        font-weight:600;
                        cursor:pointer;
                    "
                >
                    Submit Hold
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(div);
}


// =====================================================
// OPEN HOLD
// =====================================================

function openHoldById(id) {

    const row =
        allData.find(
            x => x.firestoreId === id
        );

    if (row) {
        openHoldModal(row);
    }
}


function openHoldModal(row) {

    createHoldModal();

    activeHoldRow = row;

    const info =
        document.getElementById(
            "holdTaskInfo"
        );

    info.innerHTML = `

        <b>Indus ID:</b>
        ${escapeHtml(getIndusId(row))}

        <br>

        <b>Site:</b>
        ${escapeHtml(
            row["Site Name"] ||
            row["Site"] ||
            ""
        )}

        <br>

        <b>Tech:</b>
        ${escapeHtml(
            row["Tech Name"] ||
            ""
        )}

        <br>

        <b>Assign Name:</b>
        ${escapeHtml(
            row.assignedTo ||
            ""
        )}

    `;

    document.getElementById(
        "holdRemarkInput"
    ).value =
        row.remark ||
        row.Remark ||
        "";

    document.getElementById(
        "holdModal"
    ).style.display = "flex";
}


// =====================================================
// CLOSE HOLD
// =====================================================

function closeHoldModal() {

    const modal =
        document.getElementById(
            "holdModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

    activeHoldRow = null;
}


// =====================================================
// SUBMIT HOLD
// =====================================================

async function submitHoldTask() {

    if (!activeHoldRow) {
        alert("Task select nahi hai.");
        return;
    }

    const input =
        document.getElementById(
            "holdRemarkInput"
        );

    const remark =
        input
            ? input.value.trim()
            : "";

    if (!remark) {

        alert(
            "Hold Type / Remark likhein."
        );

        return;
    }

    try {

        const user =
            getCurrentUser();

        const holdBy =
            user?.name ||
            user?.userName ||
            user?.email ||
            "User";

        const ref =
    db.collection(
        "assignImports"
    ).doc(
        activeHoldRow.firestoreId
    );

       await ref.update({

    pendingStatus: "Hold",

    remark: remark,

    remarkBy: holdBy,

    remarkTime:
        firebase.firestore
            .FieldValue
            .serverTimestamp(),

    status: "Hold"

});
updateCounts();
        alert(
            "🟡 Task Hold ho gaya."
        );

        closeHoldModal();

    }
    catch (error) {

        console.error(
            "Hold Error:",
            error
        );

        alert(
            "Hold save nahi hua:\n" +
            error.message
        );

    }
}

// =====================================================
// EXCEL EXPORT
// =====================================================

function exportExcel() {

    if (
        typeof XLSX === "undefined"
    ) {

        alert(
            "Excel library load nahi hui."
        );

        return;
    }

    const rows =
        filteredData.map(row => ({

            "Indus ID":
                getIndusId(row),

            "Site Name":
                row["Site Name"] ||
                row["Site"] ||
                "",

            "Tech Name":
                row["Tech Name"] ||
                "",

            "Tech Contact":
                row["Tech Contact no"] ||
                row["Tech Contact No."] ||
                "",

            "Assigned To":
                row.assignedTo ||
                "",

            "FSC Name":
                row["FSE Name"] ||
                row["FSC Name"] ||
                "",

            "FSC Contact":
                row["FSE Contact"] ||
                row["FSC Contact"] ||
                "",

            "Status":
                getStatus(row),

            "Assigned Time":
                formatDate(
                    row.assignedTime
                ),

            "Completed By":
                row.completedBy ||
                "",

            "Completed Time":
                formatDate(
                    row.completedTime
                )
        }));

    const worksheet =
        XLSX.utils.json_to_sheet(
            rows
        );

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Assign Task"
    );

    XLSX.writeFile(
        workbook,
        "Assign_Task.xlsx"
    );
}

// =====================================================
// IMPORT PROGRESS
// =====================================================

function createImportProgress() {

    let box =
        document.getElementById(
            "importProgressBox"
        );

    if (box) return box;

    box =
        document.createElement("div");

    box.id =
        "importProgressBox";

    box.style.cssText = `
        position:fixed;
        top:20px;
        left:50%;
        transform:translateX(-50%);
        width:min(92%,520px);
        background:white;
        padding:18px;
        border-radius:16px;
        box-shadow:0 10px 40px rgba(0,0,0,.3);
        z-index:999999;
        display:none;
        font-family:Poppins,Arial;
    `;

    box.innerHTML = `

        <div
            id="importProgressText"
            style="
                font-weight:600;
                margin-bottom:10px;
            "
        >
            Preparing...
        </div>

        <div
            style="
                height:10px;
                background:#ddd;
                border-radius:20px;
                overflow:hidden;
            "
        >

            <div
                id="importProgressBar"
                style="
                    height:100%;
                    width:0%;
                    transition:.2s;
                    background:linear-gradient(
                        90deg,
                        #2196f3,
                        #00c853
                    );
                "
            ></div>

        </div>

        <div
            id="importProgressCount"
            style="
                text-align:right;
                font-size:13px;
                margin-top:7px;
            "
        >
            0 / 0
        </div>
    `;

    document.body.appendChild(box);

    return box;
}

function updateImportProgress(
    done,
    total,
    text
) {

    const box =
        createImportProgress();

    const percent =
        total
            ? Math.round(
                done / total * 100
            )
            : 0;

    box.style.display =
        "block";

    document.getElementById(
        "importProgressText"
    ).textContent =
        text;

    document.getElementById(
        "importProgressBar"
    ).style.width =
        percent + "%";

    document.getElementById(
        "importProgressCount"
    ).textContent =
        `${done} / ${total}`;
}

function finishImportProgress(
    message
) {

    updateImportProgress(
        1,
        1,
        message
    );

    setTimeout(() => {

        const box =
            document.getElementById(
                "importProgressBox"
            );

        if (box) {
            box.style.display =
                "none";
        }

    }, 3000);
}

// =====================================================
// IMPORT HELPERS
// =====================================================

function getImportProjectName(
    fileName
) {

    return String(fileName || "")
        .replace(/\.[^/.]+$/, "")
        .trim() ||
        "Imported Project";
}

function createImportId(
    fileName
) {

    const now =
        new Date();

    const stamp =
        now.getFullYear() +
        String(
            now.getMonth() + 1
        ).padStart(2, "0") +
        String(
            now.getDate()
        ).padStart(2, "0") +
        "_" +
        String(
            now.getHours()
        ).padStart(2, "0") +
        String(
            now.getMinutes()
        ).padStart(2, "0") +
        String(
            now.getSeconds()
        ).padStart(2, "0") +
        "_" +
        Date.now();

    return (
        "IMP_" +
        getImportProjectName(
            fileName
        )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            ) +
        "_" +
        stamp
    );
}

function normalizeImportDate(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "";
    }

    // Excel serial date
    if (
        typeof value === "number" &&
        XLSX.SSF
    ) {

        const p =
            XLSX.SSF.parse_date_code(
                value
            );

        if (p) {

            return (
                `${p.y}-` +
                `${String(p.m).padStart(2,"0")}-` +
                `${String(p.d).padStart(2,"0")}`
            );
        }
    }

    const text =
        String(value).trim();

    // DD-MM-YYYY
    let match =
        text.match(
            /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/
        );

    if (match) {

        return (
            `${match[3]}-` +
            `${String(match[2]).padStart(2,"0")}-` +
            `${String(match[1]).padStart(2,"0")}`
        );
    }

    const d =
        new Date(text);

    if (!isNaN(d.getTime())) {

        return (
            `${d.getFullYear()}-` +
            `${String(
                d.getMonth() + 1
            ).padStart(2,"0")}-` +
            `${String(
                d.getDate()
            ).padStart(2,"0")}`
        );
    }

    return text;
}

// =====================================================
// IMPORT EXCEL / CSV
// =====================================================

async function handleImport(event) {

    const input =
        event?.target ||
        document.getElementById(
            "importFile"
        );

    const file =
        input?.files?.[0];

    if (!file) return;

    if (
        typeof XLSX ===
        "undefined"
    ) {

        alert(
            "Excel Library load nahi hui."
        );

        input.value = "";

        return;
    }

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (
        ![
            "xlsx",
            "xls",
            "csv"
        ].includes(extension)
    ) {

        alert(
            "Sirf CSV, XLSX ya XLS file upload karein."
        );

        input.value = "";

        return;
    }

    try {

        updateImportProgress(
            0,
            0,
            "📂 File read ho rahi hai..."
        );

        const buffer =
            await file.arrayBuffer();

        const workbook =
            XLSX.read(
                buffer,
                {
                    type: "array",
                    cellDates: false
                }
            );

        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];

        if (!sheet) {

            throw new Error(
                "Sheet nahi mili."
            );
        }

        const rows =
            XLSX.utils.sheet_to_json(
                sheet,
                {
                    defval: ""
                }
            );

        if (!rows.length) {

            throw new Error(
                "File me data nahi mila."
            );
        }

        const importId =
            createImportId(
                file.name
            );

        const projectName =
            getImportProjectName(
                file.name
            );

        // Logical project ID.
        // Firebase Console me नया project नहीं बनाता.
        const projectId =
            projectName
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                ) +
            "_" +
            importId;

        let imported = 0;

        const batchLimit =
            450;

        updateImportProgress(
            0,
            rows.length,
            `📤 Importing... 0 / ${rows.length}`
        );

        // IMPORTANT:
        // Duplicate Indus ID को कोई check नहीं किया गया.
        // हर row Firebase में अलग document बनेगी.

        for (
            let start = 0;
            start < rows.length;
            start += batchLimit
        ) {

            const chunk =
                rows.slice(
                    start,
                    start + batchLimit
                );

            const batch =
                db.batch();

            chunk.forEach(row => {

                const data =
                    {
                        ...row
                    };

                // Date column को केवल Date column से पढ़ना.
                const dateKey =
                    Object.keys(data)
                        .find(
                            key =>
                                key
                                    .trim()
                                    .toLowerCase()
                                === "date"
                        );

                if (dateKey) {

                    data[dateKey] =
                        normalizeImportDate(
                            data[dateKey]
                        );
                }

                const ref =
    db.collection(
        "assignImports"
    ).doc();

                batch.set(
                    ref,
                    {

                        data: data,

                        projectId:
                            projectId,

                        projectName:
                            projectName,

                        importId:
                            importId,

                        importName:
                            file.name,

                        imported:
                            true,

                        assigned:
                            false,

                        completed:
                            false,

                        importedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()
                    }
                );
            });

            await batch.commit();

            imported +=
                chunk.length;

            updateImportProgress(
                imported,
                rows.length,
                `📤 Importing... ${imported} / ${rows.length}`
            );
        }

        // LAST IMPORT INFORMATION

        await db
            .collection(
                "pendingMeta"
            )
            .doc("header")
            .set(
                {

                    lastImportId:
                        importId,

                    lastImportName:
                        file.name,

                    lastImportProjectId:
                        projectId,

                    lastImportProjectName:
                        projectName,

                    lastImportCount:
                        imported,

                    lastImportTime:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp()

                },
                {
                    merge: true
                }
            );

        finishImportProgress(
            `✅ Import Complete — ${imported} Records`
        );

        alert(
            `✅ Import Complete\n\n` +
            `File: ${file.name}\n` +
            `Records Imported: ${imported}`
        );

        input.value = "";

    } catch (error) {

        console.error(
            "Import Error:",
            error
        );

        const box =
            document.getElementById(
                "importProgressBox"
            );

        if (box) {
            box.style.display =
                "none";
        }

        alert(
            "Import nahi hua:\n" +
            error.message
        );

        input.value = "";
    }
}
// =====================================================
// DELETE PROJECT
// =====================================================

async function deleteProjectById(projectId, projectName) {

    if (!projectId) {
        alert("Project ID nahi mila.");
        return;
    }

    const ok = confirm(
        "⚠️ Project Delete karna hai?\n\n" +
        "Project: " + projectName + "\n\n" +
        "Is project ke SAARE Assign Records delete ho jayenge.\n" +
        "Ye action undo nahi hoga."
    );

    if (!ok) return;

    try {

        updateImportProgress(
            0,
            1,
            "🗑️ Project delete ho raha hai..."
        );

        const snap = await db
            .collection("assignImports")
            .where("projectId", "==", projectId)
            .get();

        if (snap.empty) {

            alert(
                "Is project ka koi record nahi mila."
            );

            return;
        }

        const docs = snap.docs;

        let deleted = 0;

        const batchLimit = 450;

        for (
            let start = 0;
            start < docs.length;
            start += batchLimit
        ) {

            const chunk = docs.slice(
                start,
                start + batchLimit
            );

            const batch = db.batch();

            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            deleted += chunk.length;

            updateImportProgress(
                deleted,
                docs.length,
                `🗑️ Deleting... ${deleted} / ${docs.length}`
            );
        }

        finishImportProgress(
            `✅ ${projectName} Deleted`
        );

        alert(
            "✅ Project Delete ho gaya.\n\n" +
            "Project: " + projectName + "\n" +
            "Deleted Records: " + deleted
        );

        closeTotalRecordPopup();

    } catch (error) {

        console.error(
            "Delete Project Error:",
            error
        );

        alert(
            "❌ Project delete nahi hua:\n\n" +
            error.message
        );
    }
}
function setupButtons() {

    const refresh =
        document.querySelector(
            ".refreshBtn"
        );

    if (refresh) {

        refresh.onclick =
            function () {

                renderTable();
            };
    }

    const excel =
        document.querySelector(
            ".excelBtn"
        );

    if (excel) {

        excel.onclick =
            exportExcel;
    }
}
// =====================================================
// STEP 7 - PENDING CARD
// TOTAL RECORD DATA -> PROJECT -> TECH -> RECORDS
// =====================================================

let pendingCardLevel = "project";
let selectedPendingProject = "";
let selectedPendingTech = "";


// =====================================================
// OPEN PENDING CARD
// =====================================================
function openPendingCard() {

    pendingCardLevel = "project";
    selectedPendingProject = "";
    selectedPendingTech = "";

    const popup =
        document.getElementById("pendingCardPopup");

    // Existing correct popup hi use hoga
    if (!popup) {
        console.warn(
            "pendingCardPopup already existing popup not found."
        );
        return;
    }

    // Popup show karo
    popup.style.display = "flex";

    // Render
    renderPendingCard();
}
// =====================================================
// GET ALL TOTAL RECORD DATA
// =====================================================
// =====================================================
// STEP 7 - PENDING DATA SOURCE
// PENDING CARD = TOTAL RECORD DATA
// =====================================================

function getPendingCardRecords() {

    if (!Array.isArray(allData)) {
        return [];
    }

    return allData.filter(function(row) {

        return row &&
               typeof row === "object";

    });

}


// =====================================================
// RENDER PENDING CARD
// =====================================================

function renderPendingCard() {

    const list =
        document.getElementById(
            "pendingCardList"
        );

    if (!list) return;


    const title =
        document.getElementById(
            "pendingCardTitle"
        );

    const back =
        document.getElementById(
            "pendingCardBack"
        );

    const searchInput =
        document.getElementById(
            "pendingCardSearch"
        );


    const records =
        getPendingCardRecords();


    // =================================================
    // PROJECT LEVEL
    // =================================================

    if (pendingCardLevel === "project") {

        if (title)
            title.innerText =
                "Pending → Project";

        if (back)
            back.style.display =
                "none";

        if (searchInput)
            searchInput.placeholder =
                "Search Project...";


        const projects = {};


        records.forEach(function(row) {

            const projectName =
                getRowProjectName(row);


            if (!projects[projectName]) {

                projects[projectName] = {

                    name:
                        projectName,

                    rows: []

                };

            }


            projects[projectName]
                .rows
                .push(row);

        });


        let projectArray =
            Object.values(projects);


        const search =
            (
                searchInput?.value || ""
            )
            .toLowerCase()
            .trim();


        if (search) {

            projectArray =
                projectArray.filter(
                    function(project) {

                        return project.name
                            .toLowerCase()
                            .includes(search);

                    }
                );

        }


        list.innerHTML = "";


        if (!projectArray.length) {

            list.innerHTML = `

                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Project Found
                </div>

            `;

            return;
        }


        projectArray.forEach(
            function(project) {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "hierarchy-item";


                item.onclick =
                    function() {

                        selectedPendingProject =
                            project.name;

                        pendingCardLevel =
                            "tech";

                        if (searchInput)
                            searchInput.value =
                                "";

                        renderPendingCard();

                    };


                item.innerHTML = `

                    <div class="hierarchy-top">

                        <div>

                            <div class="hierarchy-name">

                                📁
                                ${escapeHtml(
                                    project.name
                                )}

                            </div>

                            <div class="hierarchy-sub">

                                Project

                            </div>

                        </div>


                        <div class="hierarchy-count">

                            ${project.rows.length}

                        </div>

                    </div>

                `;


                list.appendChild(item);

            }
        );


        return;
    }


    // =================================================
    // TECH LEVEL
    // =================================================

    if (pendingCardLevel === "tech") {

        if (title)
            title.innerText =
                "Pending → Tech Name";

        if (back)
            back.style.display =
                "block";

        if (searchInput)
            searchInput.placeholder =
                "Search Tech Name...";


        const projectRows =
            records.filter(
                function(row) {

                    return (
                        String(
                            getRowProjectName(row)
                        )
                        ===
                        String(
                            selectedPendingProject
                        )
                    );

                }
            );


        const techs = {};


        projectRows.forEach(
            function(row) {

                const tech =
                    getRowTechName(row);


                if (!techs[tech]) {

                    techs[tech] = {

                        name:
                            tech,

                        rows: []

                    };

                }


                techs[tech]
                    .rows
                    .push(row);

            }
        );


        let techArray =
            Object.values(techs);


        const search =
            (
                searchInput?.value || ""
            )
            .toLowerCase()
            .trim();


        if (search) {

            techArray =
                techArray.filter(
                    function(tech) {

                        return tech.name
                            .toLowerCase()
                            .includes(search);

                    }
                );

        }


        list.innerHTML = "";


        if (!techArray.length) {

            list.innerHTML = `

                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Tech Found
                </div>

            `;

            return;
        }


        techArray.forEach(
            function(tech) {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "hierarchy-item";


                item.onclick =
                    function() {

                        selectedPendingTech =
                            tech.name;

                        pendingCardLevel =
                            "record";

                        if (searchInput)
                            searchInput.value =
                                "";

                        renderPendingCard();

                    };


                item.innerHTML = `

                    <div class="hierarchy-top">

                        <div>

                            <div class="hierarchy-name">

                                👨‍🔧
                                ${escapeHtml(
                                    tech.name
                                )}

                            </div>

                            <div class="hierarchy-sub">

                                Tech Name

                            </div>

                        </div>


                        <div class="hierarchy-count">

                            ${tech.rows.length}

                        </div>

                    </div>

                `;


                list.appendChild(item);

            }
        );


        return;
    }


    // =================================================
    // RECORD LEVEL
    // =================================================

    if (pendingCardLevel === "record") {

        if (title)
            title.innerText =
                "Pending → Records";

        if (back)
            back.style.display =
                "block";

        if (searchInput)
            searchInput.placeholder =
                "Search Indus ID / Site Name...";


        let rows =
            records.filter(
                function(row) {

                    return (

                        String(
                            getRowProjectName(row)
                        )
                        ===
                        String(
                            selectedPendingProject
                        )

                    )
                    &&
                    (

                        String(
                            getRowTechName(row)
                        )
                        ===
                        String(
                            selectedPendingTech
                        )

                    );

                }
            );


        const search =
            (
                searchInput?.value || ""
            )
            .toLowerCase()
            .trim();


        if (search) {

            rows =
                rows.filter(
                    function(row) {

                        const text = [

                            getRowIndusId(row),

                            row.name,

                            row.siteName,

                            row["Site Name"],

                            getRowTechName(row),

                            row.assignedTo

                        ]
                        .join(" ")
                        .toLowerCase();


                        return text.includes(
                            search
                        );

                    }
                );

        }


        list.innerHTML = "";


        if (!rows.length) {

            list.innerHTML = `

                <div style="
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    No Records Found
                </div>

            `;

            return;
        }


        rows.forEach(
            function(row) {

                const indus =
                    getRowIndusId(row);


                const siteName =
                    row.name ||
                    row.siteName ||
                    row["Site Name"] ||
                    "";


                const tech =
                    getRowTechName(row);


                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "total-record-item";


                item.innerHTML = `

                    <div class="total-record-top">

                        <div class="total-record-info">

                            <b>
                                ${escapeHtml(
                                    indus
                                )}
                            </b>

                            <small>
                                Site:
                                ${escapeHtml(
                                    siteName
                                )}
                            </small>

                            <small>
                                Tech:
                                ${escapeHtml(
                                    tech
                                )}
                            </small>

                            <small>
                                Assign Name:
                                ${escapeHtml(
                                    row.assignedTo ||
                                    "-"
                                )}
                            </small>

                            <small>
                                Status:
                                Pending
                            </small>

                        </div>


                        <div
                            style="
                                display:flex;
                                gap:8px;
                                flex-wrap:wrap;
                                justify-content:flex-end;
                            "
                        >

                            <button
                                type="button"
                                class="assign-record-btn"
                                onclick="
                                    event.stopPropagation();
                                    openAssignPopupById(
                                        '${row.firestoreId}'
                                    );
                                "
                            >
                                👤 Assign
                            </button>


                            <button
                                type="button"
                                class="hold-record-btn"
                                onclick="
                                    event.stopPropagation();
                                    openHoldById(
                                        '${row.firestoreId}'
                                    );
                                "
                            >
                                🛑 Hold
                            </button>

                        </div>

                    </div>

                `;


                list.appendChild(item);

            }
        );

    }

}


// =====================================================
// BACK
// =====================================================

function pendingCardBack() {

    if (
        pendingCardLevel ===
        "record"
    ) {

        pendingCardLevel =
            "tech";

        selectedPendingTech =
            "";

        renderPendingCard();

        return;
    }


    if (
        pendingCardLevel ===
        "tech"
    ) {

        pendingCardLevel =
            "project";

        selectedPendingProject =
            "";

        renderPendingCard();

        return;
    }

}


// =====================================================
// CLOSE
// =====================================================

function closePendingCard() {

    const popup =
        document.getElementById(
            "pendingCardPopup"
        );

    if (popup) {

        popup.remove();

    }

}

// =====================================================
// START
// =====================================================

window.onload = function () {

    createCompleteModal();

    createHoldModal();

    createTotalRecordPopup();

    setupButtons();

    listenAssignedSites();

    setTimeout(() => {

        const filter =
            document.getElementById(
                "assignFilter"
            );

        if (filter) {

            filter.value = "all";

            activeFilter = "all";
        }

    }, 500);
};
// =====================================================
// CARD CLICK FILTER
// =====================================================

document.addEventListener("click", function (e) {

    const card = e.target.closest(
        ".stat-card, .summary-card, .count-card, .dashboard-card, .card"
    );

    if (!card) return;

    const text = (card.innerText || "").toLowerCase();

    let filter = null;

    if (
        text.includes("total records") ||
        text.includes("total record")
    ) {
        filter = "total";
    }

    else if (
    text.includes("assign task") ||
    text.includes("assigned")
) {
    filter = "assigned";
}

    else if (text.includes("hold")) {
        filter = "hold";
    }

    else if (
        text.includes("completed") ||
        text.includes("complete")
    ) {
        filter = "completed";
    }

    else if (text.includes("pending")) {
        filter = "pending";
    }

    if (!filter) return;

    window.cardListFilter = filter;

    currentPage = 1;

    renderTable();

});
function openCardPopup(type) {

    // Card ka filter save karo
    window.popupCardFilter = type;

    // Sabhi card popup Project se start honge
    totalPopupLevel = "project";

    selectedTotalProject = null;
    selectedTotalTech = null;

    // Assigned ke liye Assign Name selection clear
    window.selectedTotalAssignName = null;

    // Search clear
    const searchInput =
        document.getElementById("totalRecordSearch");

    if (searchInput) {
        searchInput.value = "";
    }

    // Popup open karo
    openTotalRecordPopup();
}
function enableDashboardCardClicks() {

    const cards =
        document.querySelectorAll(
            ".card, .stat-card, .dashboard-card, .summary-card"
        );

    cards.forEach(card => {

        // Agar pehle se click laga hai to duplicate na ho
        if (card.dataset.cardClickBound === "1") {
            return;
        }

        const text =
            card.innerText
                .toLowerCase()
                .trim();

        let type = null;


        // =========================
        // TOTAL
        // =========================

        if (
            text.includes("total records") ||
            text.includes("total record")
        ) {
            type = "total";
        }


        // =========================
        // ASSIGNED
        // =========================

        else if (
    text.includes("assigned") ||
    text.includes("assign")
) {
    type = "assigned";
}


        // =========================
        // HOLD
        // =========================

        else if (
            text.includes("hold")
        ) {
            type = "hold";
        }


        // =========================
        // COMPLETED
        // =========================

        else if (
            text.includes("completed") ||
            text.includes("complete")
        ) {
            type = "completed";
        }


        // =========================
        // PENDING
        // =========================

        else if (
            text.includes("pending")
        ) {
            type = "pending";
        }


        if (!type) {
            return;
        }


        card.dataset.cardClickBound = "1";


        card.style.cursor = "pointer";


        card.addEventListener("click", function(event) {

            // Agar card ke andar koi button/input hai
            // to us button ka normal action chale
            if (
                event.target.closest("button") ||
                event.target.closest("input") ||
                event.target.closest("select") ||
                event.target.closest("a")
            ) {
                return;
            }

            openCardPopup(type);
        });

    });
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        setTimeout(
            enableDashboardCardClicks,
            1000
        );

    }
);

setTimeout(
    enableDashboardCardClicks,
    2000
);

setTimeout(
    enableDashboardCardClicks,
    4000
);
