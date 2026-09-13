document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    const roleFilter = document.getElementById("roleFilter");
    const skillFilter = document.getElementById("skillFilter");
    const regionFilter = document.getElementById("regionFilter");
    const stateFilter = document.getElementById("stateFilter");
    const cityFilter = document.getElementById("cityFilter");
    const experienceFilter = document.getElementById("experienceFilter");

    const results = document.getElementById("results");
    const loading = document.getElementById("loading");
    const resultCount = document.getElementById("resultCount");
    const searchStatus = document.getElementById("searchStatus");


    /* =====================================================
       LOCATION DATA
    ===================================================== */

    const locations = {

        "India": {

            "Andhra Pradesh": [
                "Visakhapatnam",
                "Vijayawada",
                "Guntur",
                "Tirupati",
                "Nellore",
                "Kurnool"
            ],

            "Arunachal Pradesh": [
                "Itanagar"
            ],

            "Assam": [
                "Guwahati",
                "Dibrugarh",
                "Silchar"
            ],

            "Bihar": [
                "Patna",
                "Gaya",
                "Muzaffarpur"
            ],

            "Chhattisgarh": [
                "Raipur",
                "Bhilai",
                "Bilaspur"
            ],

            "Goa": [
                "Panaji",
                "Margao",
                "Vasco da Gama"
            ],

            "Gujarat": [
                "Ahmedabad",
                "Surat",
                "Vadodara",
                "Rajkot",
                "Gandhinagar"
            ],

            "Haryana": [
                "Gurugram",
                "Faridabad",
                "Panipat",
                "Ambala"
            ],

            "Himachal Pradesh": [
                "Shimla",
                "Dharamshala",
                "Solan"
            ],

            "Jharkhand": [
                "Ranchi",
                "Jamshedpur",
                "Dhanbad"
            ],

            "Karnataka": [
                "Bengaluru",
                "Mysuru",
                "Mangaluru",
                "Hubballi",
                "Belagavi",
                "Shivamogga"
            ],

            "Kerala": [
                "Thiruvananthapuram",
                "Kochi",
                "Kozhikode",
                "Thrissur",
                "Kollam"
            ],

            "Madhya Pradesh": [
                "Bhopal",
                "Indore",
                "Gwalior",
                "Jabalpur",
                "Ujjain"
            ],

            "Maharashtra": [
                "Mumbai",
                "Pune",
                "Nagpur",
                "Nashik",
                "Thane"
            ],

            "Manipur": [
                "Imphal"
            ],

            "Meghalaya": [
                "Shillong"
            ],

            "Mizoram": [
                "Aizawl"
            ],

            "Nagaland": [
                "Kohima",
                "Dimapur"
            ],

            "Odisha": [
                "Bhubaneswar",
                "Cuttack",
                "Rourkela",
                "Puri"
            ],

            "Punjab": [
                "Chandigarh",
                "Ludhiana",
                "Amritsar",
                "Jalandhar",
                "Patiala"
            ],

            "Rajasthan": [
                "Jaipur",
                "Jodhpur",
                "Udaipur",
                "Kota",
                "Ajmer"
            ],

            "Sikkim": [
                "Gangtok"
            ],

            "Tamil Nadu": [
                "Chennai",
                "Coimbatore",
                "Madurai",
                "Salem",
                "Tiruchirappalli",
                "Tiruppur"
            ],

            "Telangana": [
                "Hyderabad",
                "Warangal",
                "Nizamabad",
                "Karimnagar",
                "Khammam",
                "Secunderabad"
            ],

            "Tripura": [
                "Agartala"
            ],

            "Uttar Pradesh": [
                "Lucknow",
                "Noida",
                "Ghaziabad",
                "Kanpur",
                "Agra",
                "Varanasi",
                "Prayagraj"
            ],

            "Uttarakhand": [
                "Dehradun",
                "Haridwar",
                "Nainital",
                "Haldwani"
            ],

            "West Bengal": [
                "Kolkata",
                "Siliguri",
                "Howrah",
                "Durgapur"
            ],

            "Delhi": [
                "New Delhi",
                "Delhi"
            ]
        },

        "United States": {

            "California": [
                "Los Angeles",
                "San Francisco",
                "San Diego",
                "San Jose",
                "Sacramento"
            ],

            "Texas": [
                "Houston",
                "Dallas",
                "Austin",
                "San Antonio"
            ],

            "New York": [
                "New York City",
                "Buffalo",
                "Rochester"
            ],

            "Florida": [
                "Miami",
                "Orlando",
                "Tampa",
                "Jacksonville"
            ],

            "Washington": [
                "Seattle",
                "Spokane",
                "Tacoma"
            ]
        },

        "United Kingdom": {

            "England": [
                "London",
                "Manchester",
                "Birmingham",
                "Liverpool",
                "Leeds"
            ],

            "Scotland": [
                "Edinburgh",
                "Glasgow",
                "Aberdeen"
            ],

            "Wales": [
                "Cardiff",
                "Swansea",
                "Newport"
            ]
        },

        "Canada": {

            "Ontario": [
                "Toronto",
                "Ottawa",
                "Mississauga",
                "Hamilton"
            ],

            "British Columbia": [
                "Vancouver",
                "Victoria",
                "Surrey"
            ],

            "Quebec": [
                "Montreal",
                "Quebec City",
                "Laval"
            ]
        },

        "Australia": {

            "New South Wales": [
                "Sydney",
                "Newcastle",
                "Wollongong"
            ],

            "Victoria": [
                "Melbourne",
                "Geelong"
            ],

            "Queensland": [
                "Brisbane",
                "Gold Coast",
                "Cairns"
            ]
        },

        "United Arab Emirates": {

            "Dubai": [
                "Dubai"
            ],

            "Abu Dhabi": [
                "Abu Dhabi"
            ],

            "Sharjah": [
                "Sharjah"
            ]
        },

        "Singapore": {

            "Singapore": [
                "Singapore"
            ]
        }
    };


    /* =====================================================
       LOCATION FILTERS
    ===================================================== */

    function loadStates() {

        if (!regionFilter || !stateFilter || !cityFilter) {
            return;
        }

        const country = regionFilter.value;

        stateFilter.innerHTML = "";
        cityFilter.innerHTML = "";
        cityFilter.disabled = true;

        cityFilter.innerHTML = `
            <option value="">Select state first</option>
        `;

        if (!country || !locations[country]) {

            stateFilter.disabled = true;

            stateFilter.innerHTML = `
                <option value="">Select region first</option>
            `;

            return;
        }

        stateFilter.disabled = false;

        stateFilter.innerHTML = `
            <option value="">Select state</option>
        `;

        Object.keys(locations[country])
            .sort()
            .forEach(state => {

                const option = document.createElement("option");

                option.value = state;
                option.textContent = state;

                stateFilter.appendChild(option);
            });
    }


    function loadCities() {

        if (!regionFilter || !stateFilter || !cityFilter) {
            return;
        }

        const country = regionFilter.value;
        const state = stateFilter.value;

        cityFilter.innerHTML = "";

        if (
            !country ||
            !state ||
            !locations[country] ||
            !locations[country][state]
        ) {

            cityFilter.disabled = true;

            cityFilter.innerHTML = `
                <option value="">Select state first</option>
            `;

            return;
        }

        cityFilter.disabled = false;

        cityFilter.innerHTML = `
            <option value="">Select city</option>
        `;

        [...locations[country][state]]
            .sort()
            .forEach(city => {

                const option = document.createElement("option");

                option.value = city;
                option.textContent = city;

                cityFilter.appendChild(option);
            });
    }


    if (regionFilter) {
        regionFilter.addEventListener("change", loadStates);
    }

    if (stateFilter) {
        stateFilter.addEventListener("change", loadCities);
    }


    /* =====================================================
       CATEGORY BUTTONS
    ===================================================== */

    document.querySelectorAll(".category").forEach(categoryButton => {

        categoryButton.addEventListener("click", () => {

            const group =
                categoryButton.closest(".category-group");

            if (!group) {
                return;
            }

            const panel =
                group.querySelector(".subcategory-panel");

            if (!panel) {
                return;
            }

            document.querySelectorAll(".category-group")
                .forEach(otherGroup => {

                    if (otherGroup === group) {
                        return;
                    }

                    const otherPanel =
                        otherGroup.querySelector(
                            ".subcategory-panel"
                        );

                    const otherButton =
                        otherGroup.querySelector(".category");

                    if (otherPanel) {
                        otherPanel.classList.remove("open");
                    }

                    if (otherButton) {
                        otherButton.classList.remove("selected");
                    }
                });

            panel.classList.toggle("open");
            categoryButton.classList.toggle("selected");
        });
    });


    /* =====================================================
       SUBCATEGORY BUTTONS
    ===================================================== */

    document.querySelectorAll(
        ".subcategory-list button"
    ).forEach(button => {

        button.addEventListener("click", () => {

            const role = button.dataset.role;
            const skill = button.dataset.skill;

            if (role) {

                if (searchInput) {
                    searchInput.value = role;
                }

                if (roleFilter) {
                    roleFilter.value = role;
                }

            } else if (skill) {

                if (searchInput) {
                    searchInput.value = skill;
                }

                if (skillFilter) {
                    skillFilter.value = skill;
                }
            }

            performSearch();
        });
    });


    /* =====================================================
       QUICK SEARCH
    ===================================================== */

    window.quickSearch = function(query) {

        if (!searchInput) {
            return;
        }

        searchInput.value = query || "";

        performSearch();
    };


    /* =====================================================
       SEARCH BUTTON
    ===================================================== */

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            performSearch
        );
    }


    /* =====================================================
       ENTER KEY SEARCH
    ===================================================== */

    if (searchInput) {

        searchInput.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                performSearch();
            }
        });
    }


    /* =====================================================
       MAIN SEARCH
    ===================================================== */

    async function performSearch() {

        if (!searchInput) {
            return;
        }

        const query = searchInput.value.trim();

        const role = roleFilter
            ? roleFilter.value
            : "";

        const skill = skillFilter
            ? skillFilter.value
            : "";

        const country = regionFilter
            ? regionFilter.value
            : "";

        const state = stateFilter
            ? stateFilter.value
            : "";

        const city = cityFilter
            ? cityFilter.value
            : "";

        const experience = experienceFilter
            ? experienceFilter.value
            : "";


        if (!query && !role && !skill) {

            searchInput.focus();

            if (searchStatus) {
                searchStatus.textContent =
                    "Enter a role or skill to search";
            }

            return;
        }


        /* =================================================
           BUILD LOCATION
        ================================================= */

        let location = "";

        if (city) {

            location =
                `${city}, ${state}, ${country}`;

        } else if (state) {

            location =
                `${state}, ${country}`;

        } else if (country) {

            location = country;
        }


        /* =================================================
           SEARCH UI
        ================================================= */

        if (loading) {
            loading.classList.remove("hidden");
        }

        if (results) {
            results.innerHTML = "";
        }

        if (resultCount) {
            resultCount.textContent = "0";
        }

        if (searchStatus) {
            searchStatus.textContent =
                "Searching live sources...";
        }

        if (searchButton) {

            searchButton.disabled = true;
            searchButton.classList.add("loading");

            const originalText =
                searchButton.dataset.originalText ||
                searchButton.textContent;

            searchButton.dataset.originalText =
                originalText;

            searchButton.textContent =
                "Searching...";
        }


        try {

            const response = await fetch(
                "/recruit",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        role:
                            role || query,

                        skills:
                            skill
                                ? [skill]
                                : [],

                        location:
                            location,

                        experience:
                            experience
                    })
                }
            );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            const candidates =
                Array.isArray(data.results)
                    ? data.results
                    : [];


            displayResults(candidates);

        }

        catch (error) {

            console.error(
                "TalentReach search error:",
                error
            );


            if (results) {

                results.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-icon">
                            ⚠
                        </div>

                        <h3>
                            Search could not be completed
                        </h3>

                        <p>
                            Check that the TalentReach
                            backend is running.
                        </p>

                    </div>
                `;
            }


            if (resultCount) {
                resultCount.textContent = "0";
            }

            if (searchStatus) {
                searchStatus.textContent =
                    "Search error";
            }
        }

        finally {

            if (loading) {
                loading.classList.add("hidden");
            }

            if (searchButton) {

                searchButton.disabled = false;
                searchButton.classList.remove("loading");

                searchButton.textContent =
                    searchButton.dataset.originalText ||
                    "Search";
            }
        }
    }


    /* =====================================================
       DISPLAY SEARCH RESULTS
    ===================================================== */

    function displayResults(candidates) {

        if (resultCount) {
            resultCount.textContent =
                candidates.length;
        }

        if (searchStatus) {

            searchStatus.textContent =
                candidates.length
                    ? `${candidates.length} candidates found`
                    : "No candidates found";
        }


        if (!results) {
            return;
        }


        if (!candidates.length) {

            results.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ⌕
                    </div>

                    <h3>
                        No candidates found
                    </h3>

                    <p>
                        Try another role,
                        skill or location.
                    </p>

                </div>
            `;

            return;
        }


        results.innerHTML =
            candidates.map((candidate, index) => {

                const title =
                    candidate.title ||
                    candidate.name ||
                    "Candidate";

                const description =
                    candidate.content ||
                    candidate.description ||
                    "Candidate profile";

                const safeDescription =
                    String(description).substring(0, 250);

                const url =
                    candidate.url ||
                    "#";


                return `

                    <div class="candidate-card">

                        <div class="candidate-main">

                            <div class="avatar">
                                ${escapeHTML(
                                    getInitials(title)
                                )}
                            </div>

                            <div class="candidate-text-content">

                                <div class="candidate-name">
                                    ${escapeHTML(title)}
                                </div>

                                <div class="candidate-role">
                                    ${escapeHTML(
                                        safeDescription
                                    )}
                                </div>

                                <div class="skills">

                                    <span class="skill">
                                        Live Result
                                    </span>

                                    <span class="skill">
                                        Public Profile
                                    </span>

                                </div>

                            </div>

                        </div>


                        <div class="candidate-actions">

                            <div>

                                <div class="match">
                                    Result ${index + 1}
                                </div>

                                <div class="source">
                                    TalentReach
                                </div>

                            </div>


                            ${
                                url !== "#"
                                    ? `
                                        <a
                                            class="view-button"
                                            href="${escapeHTML(url)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View Profile →
                                        </a>
                                    `
                                    : ""
                            }


                            <button
                                class="talent-pool-button"
                                data-index="${index}"
                                type="button"
                            >
                                + Add to Talent Pool
                            </button>

                        </div>

                    </div>
                `;
            }).join("");


        /* =================================================
           TALENT POOL BUTTON EVENTS
        ================================================= */

        results.querySelectorAll(
            ".talent-pool-button"
        ).forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.index);

                const candidate =
                    candidates[index];

                if (!candidate) {
                    return;
                }


                if (button.dataset.candidateId) {

                    removeCandidateFromTalentPool(
                        candidate,
                        button
                    );

                    return;
                }


                saveCandidateToTalentPool(
                    candidate,
                    button
                );
            });
        });
    }


    /* =====================================================
       ADD CANDIDATE TO TALENT POOL
    ===================================================== */

    async function saveCandidateToTalentPool(
        candidate,
        button
    ) {

        if (!candidate) {

            alert(
                "Candidate information is missing."
            );

            return;
        }


        button.disabled = true;
        button.textContent = "Adding...";


        try {

            const response =
                await fetch(
                    "/candidates",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name:
                                candidate.title ||
                                candidate.name ||
                                "Candidate",

                            email:
                                candidate.email ||
                                null,

                            linkedin_url:
                                candidate.url ||
                                null,

                            current_role:
                                candidate.current_role ||
                                candidate.title ||
                                candidate.role ||
                                null,

                            company:
                                candidate.company ||
                                null,

                            location:
                                candidate.location ||
                                null,

                            skills:
                                Array.isArray(candidate.skills)
                                    ? candidate.skills.join(", ")
                                    : candidate.skills || null,

                            experience:
                                candidate.experience ||
                                candidate.experience_years ||
                                null,

                            status:
                                "New"
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "Talent Pool server response:",
                    data
                );

                throw new Error(
                    data.detail ||
                    data.message ||
                    "Could not save candidate"
                );
            }


            if (data.candidate_id) {

                button.dataset.candidateId =
                    data.candidate_id;
            }


            button.disabled = false;

            button.textContent =
                "✓ In Talent Pool";

            button.classList.add("added");


            if (searchStatus) {

                searchStatus.textContent =
                    "Candidate added to Talent Pool";
            }


            console.log(
                "Candidate saved:",
                data
            );

        }

        catch (error) {

            console.error(
                "Talent Pool error:",
                error
            );


            button.disabled = false;

            button.textContent =
                "+ Add to Talent Pool";


            alert(
                "Could not add candidate:\n\n" +
                error.message
            );
        }
    }


    /* =====================================================
       REMOVE CANDIDATE FROM TALENT POOL
    ===================================================== */

    async function removeCandidateFromTalentPool(
        candidate,
        button
    ) {

        const candidateId =
            button.dataset.candidateId;


        if (!candidateId) {

            alert(
                "Candidate ID was not found."
            );

            return;
        }


        button.disabled = true;
        button.textContent = "Removing...";


        try {

            const response =
                await fetch(
                    `/candidates/${candidateId}`,
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    data.message ||
                    "Could not remove candidate"
                );
            }


            delete button.dataset.candidateId;

            button.disabled = false;

            button.textContent =
                "+ Add to Talent Pool";

            button.classList.remove("added");


            if (searchStatus) {

                searchStatus.textContent =
                    "Candidate removed from Talent Pool";
            }


            console.log(
                "Candidate removed:",
                data
            );

        }

        catch (error) {

            console.error(
                "Talent Pool remove error:",
                error
            );


            button.disabled = false;

            button.textContent =
                "✓ In Talent Pool";


            alert(
                "Could not remove candidate:\n\n" +
                error.message
            );
        }
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function getInitials(text) {

        return String(text)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0))
            .join("")
            .toUpperCase();
    }


    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    if (stateFilter) {
        stateFilter.disabled = true;
        stateFilter.innerHTML = `
            <option value="">
                Select region first
            </option>
        `;
    }

    if (cityFilter) {
        cityFilter.disabled = true;
        cityFilter.innerHTML = `
            <option value="">
                Select state first
            </option>
        `;
    }


    document.querySelectorAll(
        ".subcategory-panel"
    ).forEach(panel => {

        panel.classList.remove("open");
    });


    /* =====================================================
       OUTREACH SYSTEM
    ===================================================== */

    const outreachNav =
        document.getElementById("outreachNav");

    const outreachPage =
        document.getElementById("outreachPage");


    let outreachCandidates = [];
    let selectedOutreachCandidate = null;


    /* =====================================================
       OUTREACH BRAND
    ===================================================== */

    const RECRUITER_NAME =
        "Sai Ganesh";

    const RECRUITER_BRAND =
        "In SAI AI Recruiter";


    /* =====================================================
       OPEN OUTREACH
    ===================================================== */

    if (outreachNav) {

        outreachNav.addEventListener(
            "click",
            loadOutreachPage
        );
    }


    /* =====================================================
       LOAD OUTREACH PAGE
    ===================================================== */

    async function loadOutreachPage() {

        if (!outreachPage) {
            return;
        }


        selectedOutreachCandidate = null;


        outreachPage.innerHTML = `

            <main>

                <section class="outreach-section">

                    <div class="section-label">
                        CANDIDATE ENGAGEMENT
                    </div>

                    <h1>
                        Outreach
                    </h1>

                    <p>
                        Reach candidates with personalized
                        recruitment emails.
                    </p>


                    <div class="outreach-stats">

                        <div class="outreach-stat-card">

                            <strong id="outreachTotal">
                                0
                            </strong>

                            <span>
                                Talent Pool
                            </span>

                        </div>


                        <div class="outreach-stat-card">

                            <strong id="outreachSelected">
                                0
                            </strong>

                            <span>
                                Selected
                            </span>

                        </div>


                        <div class="outreach-stat-card">

                            <strong id="outreachEmailsSent">
                                0
                            </strong>

                            <span>
                                Emails Sent
                            </span>

                        </div>


                        <div class="outreach-stat-card">

                            <strong id="outreachReplies">
                                0
                            </strong>

                            <span>
                                Replies
                            </span>

                        </div>

                    </div>


                    <div class="outreach-card">

                        <div class="outreach-card-header">

                            <div>

                                <div class="section-label">
                                    TALENT POOL
                                </div>

                                <h2>
                                    Select candidates
                                </h2>

                                <p>
                                    Choose a candidate from your
                                    Talent Pool to start outreach.
                                </p>

                            </div>


                            <button
                                type="button"
                                id="refreshOutreachCandidates"
                            >
                                ↻ Refresh
                            </button>

                        </div>


                        <div
                            id="outreachCandidateList"
                            class="outreach-candidate-list"
                        >

                            <div class="outreach-loading">
                                Loading Talent Pool...
                            </div>

                        </div>

                    </div>


                    <div
                        id="outreachComposer"
                        class="outreach-card"
                        style="display:none;"
                    >

                        <div class="outreach-card-header">

                            <div>

                                <div class="section-label">
                                    EMAIL OUTREACH
                                </div>

                                <h2>
                                    Create recruitment email
                                </h2>

                                <p class="email-direction-note">
                                    Your recruiter message to the selected candidate
                                </p>

                            </div>

                        </div>


                        <div class="outreach-email-header">

                            <div class="email-person">

                                <span class="email-label">
                                    From
                                </span>

                                <div class="email-value">

                                    <strong>
                                        ${RECRUITER_NAME}
                                    </strong>

                                    <span>
                                        ${RECRUITER_BRAND}
                                    </span>

                                </div>

                            </div>


                            <div class="email-person">

                                <span class="email-label">
                                    To
                                </span>

                                <div class="email-value">

                                    <input
                                        id="outreachEmail"
                                        type="email"
                                        placeholder="candidate@email.com"
                                    >

                                </div>

                            </div>

                        </div>


                        <div class="outreach-field">

                            <label for="outreachSubject">
                                Subject
                            </label>

                            <input
                                id="outreachSubject"
                                type="text"
                                placeholder="Career Opportunity | In SAI AI Recruiter"
                            >

                        </div>


                        <div class="outreach-field">

                            <label for="outreachMessage">
                                Message
                            </label>

                            <textarea
                                id="outreachMessage"
                                rows="12"
                                placeholder="Your personalized recruitment message will appear here..."
                            ></textarea>

                        </div>


                        <div class="outreach-actions">

                            <button
                                type="button"
                                id="generateEmailButton"
                            >
                                ✦ Generate with AI
                            </button>


                            <button
                                type="button"
                                id="saveDraftButton"
                            >
                                Save Draft
                            </button>


                            <button
                                type="button"
                                id="sendEmailButton"
                            >
                                Send Email
                            </button>

                        </div>


                        <div
                            id="outreachMessageStatus"
                            class="outreach-message-status"
                        ></div>

                    </div>


                    <div class="outreach-card">

                        <div class="section-label">
                            OUTREACH HISTORY
                        </div>

                        <h2>
                            Recent outreach
                        </h2>


                        <div
                            id="outreachHistory"
                            class="outreach-history"
                        >

                            <div class="outreach-empty">
                                No outreach has been sent yet.
                            </div>

                        </div>

                    </div>

                </section>

            </main>
        `;


        addOutreachStyles();

        setupOutreachEvents();

        await loadOutreachCandidates();

        loadOutreachHistory();
    }


    /* =====================================================
       LOAD TALENT POOL CANDIDATES
    ===================================================== */

    async function loadOutreachCandidates() {

        const list =
            document.getElementById(
                "outreachCandidateList"
            );

        const refreshButton =
            document.getElementById(
                "refreshOutreachCandidates"
            );


        if (!list) {
            return;
        }


        list.innerHTML = `
            <div class="outreach-loading">
                Loading Talent Pool...
            </div>
        `;


        if (refreshButton) {

            refreshButton.disabled = true;
            refreshButton.classList.add("loading");

            refreshButton.dataset.originalText =
                refreshButton.dataset.originalText ||
                refreshButton.textContent;

            refreshButton.textContent =
                "↻ Refreshing...";
        }


        try {

            const response =
                await fetch("/candidates");


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            outreachCandidates =
                Array.isArray(data)
                    ? data
                    : [];


            const total =
                document.getElementById(
                    "outreachTotal"
                );


            if (total) {
                total.textContent =
                    outreachCandidates.length;
            }


            displayOutreachCandidates();

        }

        catch (error) {

            console.error(
                "Outreach candidate error:",
                error
            );


            list.innerHTML = `

                <div class="outreach-empty">

                    <h3>
                        Could not load candidates
                    </h3>

                    <p>
                        Make sure your Talent Pool
                        backend is running.
                    </p>

                </div>
            `;

        }

        finally {

            if (refreshButton) {

                refreshButton.disabled = false;
                refreshButton.classList.remove("loading");

                refreshButton.textContent =
                    refreshButton.dataset.originalText ||
                    "↻ Refresh";
            }
        }
    }


    /* =====================================================
       DISPLAY TALENT POOL CANDIDATES
    ===================================================== */

    function displayOutreachCandidates() {

        const list =
            document.getElementById(
                "outreachCandidateList"
            );


        if (!list) {
            return;
        }


        if (!outreachCandidates.length) {

            list.innerHTML = `

                <div class="outreach-empty">

                    <div class="empty-icon">
                        ✦
                    </div>

                    <h3>
                        No candidates in Talent Pool
                    </h3>

                    <p>
                        Add candidates to your Talent Pool
                        before starting outreach.
                    </p>

                </div>
            `;

            return;
        }


        list.innerHTML =
            outreachCandidates.map(
                (candidate, index) => {

                    const name =
                        candidate.name ||
                        candidate.full_name ||
                        "Candidate";


                    const role =
                        candidate.current_role ||
                        candidate.role ||
                        candidate.title ||
                        "Role not specified";


                    const location =
                        candidate.location ||
                        "Location not specified";


                    const email =
                        candidate.email ||
                        "";


                    return `

                        <div
                            class="outreach-candidate"
                            data-index="${index}"
                        >

                            <label>

                                <input
                                    type="radio"
                                    name="outreachCandidate"
                                    value="${index}"
                                >


                                <span
                                    class="outreach-candidate-info"
                                >

                                    <strong>
                                        ${escapeHTML(name)}
                                    </strong>


                                    <span>
                                        ${escapeHTML(role)}
                                    </span>


                                    <span>
                                        ${escapeHTML(location)}
                                    </span>


                                    ${
                                        email
                                            ? `
                                                <span>
                                                    ${escapeHTML(email)}
                                                </span>
                                            `
                                            : `
                                                <span class="no-email">
                                                    Email not available
                                                </span>
                                            `
                                    }

                                </span>

                            </label>

                        </div>
                    `;
                }
            ).join("");


        list.querySelectorAll(
            'input[name="outreachCandidate"]'
        ).forEach(radio => {

            radio.addEventListener(
                "change",
                () => {

                    const index =
                        Number(radio.value);

                    selectOutreachCandidate(
                        outreachCandidates[index]
                    );
                }
            );
        });
    }


    /* =====================================================
       SELECT OUTREACH CANDIDATE
    ===================================================== */

    function selectOutreachCandidate(candidate) {

        if (!candidate) {
            return;
        }


        selectedOutreachCandidate =
            candidate;


        const composer =
            document.getElementById(
                "outreachComposer"
            );


        const selectedCount =
            document.getElementById(
                "outreachSelected"
            );


        if (selectedCount) {
            selectedCount.textContent = "1";
        }


        if (!composer) {
            return;
        }


        composer.style.display = "block";


        const emailInput =
            document.getElementById(
                "outreachEmail"
            );


        const subjectInput =
            document.getElementById(
                "outreachSubject"
            );


        const messageInput =
            document.getElementById(
                "outreachMessage"
            );


        if (emailInput) {

            emailInput.value =
                candidate.email ||
                "";
        }


        if (subjectInput) {

            subjectInput.value =
                createRecruitmentSubject(
                    candidate
                );
        }


        if (messageInput) {

            messageInput.value =
                createRecruitmentEmail(
                    candidate
                );
        }


        composer.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* =====================================================
       CREATE RECRUITMENT SUBJECT
    ===================================================== */

    function createRecruitmentSubject(candidate) {

        const role =
            candidate.current_role ||
            candidate.role ||
            candidate.title ||
            "";


        const cleanRole =
            String(role)
                .replace(/\s+/g, " ")
                .trim();


        return cleanRole
            ? `Career Opportunity: ${cleanRole} | ${RECRUITER_BRAND}`
            : `Career Opportunity | ${RECRUITER_BRAND}`;
    }


    /* =====================================================
       CANDIDATE INFORMATION HELPERS
    ===================================================== */

    function getCandidateSkills(candidate) {

        const skills =
            candidate.skills;


        if (Array.isArray(skills)) {

            return skills
                .filter(Boolean)
                .map(skill =>
                    String(skill).trim()
                )
                .filter(Boolean);
        }


        if (typeof skills === "string") {

            return skills
                .split(",")
                .map(skill =>
                    skill.trim()
                )
                .filter(Boolean);
        }


        return [];
    }


    function getCandidateExperience(candidate) {

        const experience =
            candidate.experience ||
            candidate.experience_years ||
            candidate.years_of_experience ||
            "";


        return String(experience).trim();
    }


    /* =====================================================
       CREATE RECRUITMENT EMAIL
    ===================================================== */

    function createRecruitmentEmail(candidate) {

        const name =
            candidate.name ||
            candidate.full_name ||
            "there";


        const role =
            candidate.current_role ||
            candidate.role ||
            candidate.title ||
            "";


        const location =
            candidate.location ||
            "";


        const experience =
            getCandidateExperience(
                candidate
            );


        const skills =
            getCandidateSkills(
                candidate
            );


        const displayRole =
            role ||
            "your professional background";


        let personalization = "";


        if (skills.length) {

            const skillText =
                skills
                    .slice(0, 4)
                    .join(", ");


            personalization =
                `Your background, particularly your experience with ${skillText}, caught our attention.`;

        } else if (experience) {

            personalization =
                `Your professional experience of ${experience} stood out to us.`;

        } else if (location) {

            personalization =
                `Your profile and background in ${location} caught our attention.`;

        } else {

            personalization =
                "Your profile and professional background caught our attention.";
        }


        let opportunityLine =
            `We are currently exploring candidates for a ${displayRole} opportunity`;


        opportunityLine += location
            ? ", and your profile appears relevant to what we are looking for."
            : ", and your profile appears relevant.";


        return `Hi ${name},

I came across your profile and wanted to reach out regarding a potential career opportunity.

${personalization}

${opportunityLine}

I would be happy to share more information about the role, including the responsibilities, expectations and organization, and learn more about what you are looking for in your next opportunity.

Would you be open to a brief conversation to explore whether this could be a good fit?

Best regards,
${RECRUITER_NAME}
${RECRUITER_BRAND}`;
    }


    /* =====================================================
       GENERATE AI EMAIL
    ===================================================== */

    async function generatePersonalizedEmail() {

        if (!selectedOutreachCandidate) {

            alert(
                "Please select a candidate first."
            );

            return;
        }


        const message =
            document.getElementById(
                "outreachMessage"
            );


        const subject =
            document.getElementById(
                "outreachSubject"
            );


        const generateButton =
            document.getElementById(
                "generateEmailButton"
            );


        if (!message || !subject) {
            return;
        }


        const candidateId =
            selectedOutreachCandidate.id;


        if (!candidateId) {

            alert(
                "This candidate does not have a valid Talent Pool ID."
            );

            return;
        }


        if (generateButton) {

            generateButton.disabled = true;

            generateButton.textContent =
                "✦ Generating...";
        }


        message.value =
            "AI is creating a personalized recruitment email...";


        try {

            const response =
                await fetch(
                    "/generate-email",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            candidate_id:
                                Number(candidateId),

                            email_type:
                                "initial_outreach",

                            tone:
                                "professional"
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    data.message ||
                    "AI email generation failed"
                );
            }


            if (
                data.status !== "success" ||
                !data.email
            ) {

                throw new Error(
                    "AI returned an empty email."
                );
            }


            let generatedEmail =
                String(data.email).trim();


            generatedEmail =
                generatedEmail.replace(
                    /TalentReach AI Recruiter/gi,
                    RECRUITER_BRAND
                );


            generatedEmail =
                generatedEmail.replace(
                    /TalentReach/gi,
                    RECRUITER_BRAND
                );


            if (
                !generatedEmail
                    .toLowerCase()
                    .includes(
                        RECRUITER_BRAND.toLowerCase()
                    )
            ) {

                generatedEmail +=
                    `\n\nBest regards,\n${RECRUITER_NAME}\n${RECRUITER_BRAND}`;
            }


            message.value =
                generatedEmail;


            subject.value =
                data.subject ||
                createRecruitmentSubject(
                    selectedOutreachCandidate
                );


            showOutreachStatus(
                "✓ Personalized AI recruitment email generated."
            );

        }

        catch (error) {

            console.error(
                "AI email generation error:",
                error
            );


            message.value = "";


            showOutreachStatus(
                "AI email generation failed."
            );


            alert(
                "Could not generate the AI email.\n\n" +
                error.message
            );

        }

        finally {

            if (generateButton) {

                generateButton.disabled = false;

                generateButton.textContent =
                    "✦ Generate with AI";
            }
        }
    }


    /* =====================================================
       SAVE OUTREACH DRAFT
    ===================================================== */

    function saveOutreachDraft() {

        if (!selectedOutreachCandidate) {

            alert(
                "Please select a candidate first."
            );

            return;
        }


        const emailInput =
            document.getElementById(
                "outreachEmail"
            );


        const subjectInput =
            document.getElementById(
                "outreachSubject"
            );


        const messageInput =
            document.getElementById(
                "outreachMessage"
            );


        if (
            !emailInput ||
            !subjectInput ||
            !messageInput
        ) {

            alert(
                "Email composer could not be found."
            );

            return;
        }


        const email =
            emailInput.value.trim();


        const subject =
            subjectInput.value.trim();


        const message =
            messageInput.value.trim();


        if (!email) {

            alert(
                "Please enter the candidate's email address."
            );

            return;
        }


        if (!subject) {

            alert(
                "Please enter an email subject."
            );

            return;
        }


        if (!message) {

            alert(
                "Please enter an email message."
            );

            return;
        }


        const draft = {

            candidate_id:
                selectedOutreachCandidate.id ||
                null,

            candidate_name:
                selectedOutreachCandidate.name ||
                selectedOutreachCandidate.full_name ||
                "Candidate",

            email:
                email,

            subject:
                subject,

            message:
                message,

            status:
                "Draft",

            created_at:
                new Date().toISOString()
        };


        const drafts =
            JSON.parse(
                localStorage.getItem(
                    "talentreach_outreach_drafts"
                ) || "[]"
            );


        drafts.unshift(draft);


        localStorage.setItem(
            "talentreach_outreach_drafts",
            JSON.stringify(drafts)
        );


        showOutreachStatus(
            "✓ Outreach draft saved successfully."
        );
    }


    /* =====================================================
       SEND EMAIL THROUGH GMAIL
    ===================================================== */

    async function sendOutreachEmail() {

        if (!selectedOutreachCandidate) {

            alert(
                "Please select a candidate first."
            );

            return;
        }


        const emailElement =
            document.getElementById(
                "outreachEmail"
            );


        const subjectElement =
            document.getElementById(
                "outreachSubject"
            );


        const messageElement =
            document.getElementById(
                "outreachMessage"
            );


        if (
            !emailElement ||
            !subjectElement ||
            !messageElement
        ) {

            alert(
                "Email composer could not be found."
            );

            return;
        }


        const email =
            emailElement.value.trim();


        const subject =
            subjectElement.value.trim();


        const message =
            messageElement.value.trim();


        if (!email) {

            alert(
                "This candidate does not have an email address. Please enter the email address first."
            );

            return;
        }


        if (!subject) {

            alert(
                "Please enter an email subject."
            );

            return;
        }


        if (!message) {

            alert(
                "Please enter an email message."
            );

            return;
        }


        const sendButton =
            document.getElementById(
                "sendEmailButton"
            );


        if (sendButton) {

            sendButton.disabled = true;

            sendButton.textContent =
                "Opening Gmail...";
        }


        const gmailURL =
            "https://mail.google.com/mail/?view=cm" +
            "&fs=1" +
            "&to=" +
            encodeURIComponent(email) +
            "&su=" +
            encodeURIComponent(subject) +
            "&body=" +
            encodeURIComponent(message);


        window.open(
            gmailURL,
            "_blank"
        );


        const outreach = {

            candidate_id:
                selectedOutreachCandidate.id ||
                null,

            candidate_name:
                selectedOutreachCandidate.name ||
                selectedOutreachCandidate.full_name ||
                "Candidate",

            email:
                email,

            subject:
                subject,

            message:
                message,

            status:
                "Opened in Gmail",

            created_at:
                new Date().toISOString()
        };


        const history =
            JSON.parse(
                localStorage.getItem(
                    "talentreach_outreach_history"
                ) || "[]"
            );


        history.unshift(outreach);


        localStorage.setItem(
            "talentreach_outreach_history",
            JSON.stringify(history)
        );


        showOutreachStatus(
            "Gmail opened with the recruiter email ready to send."
        );


        loadOutreachHistory();


        if (sendButton) {

            sendButton.disabled = false;

            sendButton.textContent =
                "Send Email";
        }
    }


    /* =====================================================
       OUTREACH EVENTS
    ===================================================== */

    function setupOutreachEvents() {

        const refreshButton =
            document.getElementById(
                "refreshOutreachCandidates"
            );


        const generateButton =
            document.getElementById(
                "generateEmailButton"
            );


        const saveButton =
            document.getElementById(
                "saveDraftButton"
            );


        const sendButton =
            document.getElementById(
                "sendEmailButton"
            );


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadOutreachCandidates
            );
        }


        if (generateButton) {

            generateButton.addEventListener(
                "click",
                generatePersonalizedEmail
            );
        }


        if (saveButton) {

            saveButton.addEventListener(
                "click",
                saveOutreachDraft
            );
        }


        if (sendButton) {

            sendButton.addEventListener(
                "click",
                sendOutreachEmail
            );
        }
    }


    /* =====================================================
       OUTREACH STATUS
    ===================================================== */

    function showOutreachStatus(message) {

        const status =
            document.getElementById(
                "outreachMessageStatus"
            );


        if (!status) {
            return;
        }


        status.textContent =
            message;
    }


    /* =====================================================
       OUTREACH HISTORY
    ===================================================== */

    function loadOutreachHistory() {

        const historyContainer =
            document.getElementById(
                "outreachHistory"
            );


        if (!historyContainer) {
            return;
        }


        const history =
            JSON.parse(
                localStorage.getItem(
                    "talentreach_outreach_history"
                ) || "[]"
            );


        const emailsSent =
            document.getElementById(
                "outreachEmailsSent"
            );


        if (emailsSent) {
            emailsSent.textContent =
                history.length;
        }


        if (!history.length) {

            historyContainer.innerHTML = `

                <div class="outreach-empty">
                    No outreach has been sent yet.
                </div>
            `;

            return;
        }


        historyContainer.innerHTML =
            history
                .slice(0, 10)
                .map(item => {

                    const candidateName =
                        item.candidate_name ||
                        "Candidate";


                    const email =
                        item.email ||
                        "";


                    const subject =
                        item.subject ||
                        "No subject";


                    const createdAt =
                        item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleString()
                            : "";


                    return `

                        <div class="outreach-history-item">

                            <div class="outreach-history-main">

                                <strong>
                                    ${escapeHTML(
                                        candidateName
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        subject
                                    )}
                                </p>

                                <small>
                                    ${escapeHTML(email)}
                                    ${
                                        createdAt
                                            ? ` · ${escapeHTML(createdAt)}`
                                            : ""
                                    }
                                </small>

                            </div>


                            <span class="outreach-history-status">
                                Opened in Gmail
                            </span>

                        </div>
                    `;
                })
                .join("");
    }


    /* =====================================================
       OUTREACH STYLES
    ===================================================== */

    function addOutreachStyles() {

        if (
            document.getElementById(
                "talentreachOutreachStyles"
            )
        ) {

            return;
        }


        const style =
            document.createElement("style");


        style.id =
            "talentreachOutreachStyles";


        style.textContent = `

            /* ==========================================
               OUTREACH PAGE
            =========================================== */

            .outreach-section {

                max-width: 1200px;

                margin: 0 auto;

                padding-bottom: 60px;

            }


            /* ==========================================
               STATS
            =========================================== */

            .outreach-stats {

                display: grid;

                grid-template-columns:
                    repeat(4, 1fr);

                gap: 14px;

                margin: 24px 0;

            }


            .outreach-stat-card {

                padding: 18px;

                border-radius: 14px;

                border:
                    1px solid
                    rgba(255,255,255,0.10);

            }


            .outreach-stat-card strong {

                display: block;

                font-size: 24px;

                margin-bottom: 4px;

            }


            .outreach-stat-card span {

                opacity: 0.65;

                font-size: 13px;

            }


            /* ==========================================
               CARDS
            =========================================== */

            .outreach-card {

                margin-top: 18px;

                padding: 22px;

                border-radius: 16px;

                border:
                    1px solid
                    rgba(255,255,255,0.10);

                overflow: hidden;

            }


            .outreach-card-header {

                display: flex;

                justify-content:
                    space-between;

                align-items:
                    center;

                gap: 18px;

                margin-bottom: 20px;

            }


            .outreach-card-header h2 {

                margin:
                    3px 0 5px;

                font-size: 20px;

            }


            .outreach-card-header p {

                margin: 0;

                opacity: 0.65;

                font-size: 13px;

            }


            .email-direction-note {

                font-size: 12px !important;

                opacity: 0.55 !important;

            }


            /* ==========================================
               CANDIDATE LIST
            =========================================== */

            .outreach-candidate-list {

                display: grid;

                gap: 9px;

            }


            .outreach-candidate {

                padding: 13px 15px;

                border-radius: 11px;

                border:
                    1px solid
                    rgba(255,255,255,0.08);

                cursor: pointer;

                transition:
                    transform 0.15s ease,
                    border-color 0.15s ease,
                    background 0.15s ease;

            }


            .outreach-candidate:hover {

                transform:
                    translateY(-1px);

                border-color:
                    rgba(255,255,255,0.18);

            }


            .outreach-candidate label {

                display: flex;

                align-items: center;

                gap: 12px;

                cursor: pointer;

                min-width: 0;

            }


            .outreach-candidate input[type="radio"] {

                flex:
                    0 0 auto;

            }


            .outreach-candidate-info {

                display: flex;

                flex-direction: column;

                gap: 2px;

                min-width: 0;

                max-width: 100%;

                overflow-wrap: anywhere;

                word-break: break-word;

            }


            .outreach-candidate-info strong {

                font-size: 15px;

                overflow-wrap: anywhere;

                word-break: break-word;

            }


            .outreach-candidate-info span {

                opacity: 0.65;

                font-size: 12px;

                overflow-wrap: anywhere;

                word-break: break-word;

            }


            .outreach-candidate-info
            .no-email {

                opacity: 0.5;

            }


            /* ==========================================
               EMAIL HEADER
            =========================================== */

            .outreach-email-header {

                display: grid;

                gap: 9px;

                margin-bottom: 18px;

                padding: 14px 16px;

                border-radius: 12px;

                border:
                    1px solid
                    rgba(255,255,255,0.09);

                background:
                    rgba(255,255,255,0.025);

            }


            .email-person {

                display: grid;

                grid-template-columns:
                    45px minmax(0, 1fr);

                align-items: center;

                gap: 10px;

                min-width: 0;

            }


            .email-label {

                font-size: 10px;

                font-weight: 700;

                text-transform: uppercase;

                letter-spacing:
                    0.08em;

                opacity: 0.45;

            }


            .email-value {

                display: flex;

                flex-direction: column;

                gap: 2px;

                min-width: 0;

            }


            .email-value strong {

                font-size: 13px;

                font-weight: 600;

            }


            .email-value span {

                font-size: 11px;

                opacity: 0.55;

            }


            .email-value input {

                width: 100%;

                min-width: 0;

                box-sizing: border-box;

                padding:
                    8px 10px;

                border-radius: 7px;

                border:
                    1px solid
                    rgba(255,255,255,0.10);

                background:
                    rgba(255,255,255,0.035);

                color: inherit;

                font-family: inherit;

                font-size: 13px;

                outline: none;

            }


            .email-value input:focus {

                border-color:
                    rgba(255,255,255,0.25);

            }


            /* ==========================================
               FIELDS
            =========================================== */

            .outreach-field {

                margin-bottom: 15px;

            }


            .outreach-field label {

                display: block;

                margin-bottom: 6px;

                font-weight: 600;

                font-size: 12px;

            }


            .outreach-field input,
            .outreach-field textarea {

                width: 100%;

                box-sizing: border-box;

                padding:
                    10px 12px;

                border-radius: 8px;

                border:
                    1px solid
                    rgba(255,255,255,0.10);

                background:
                    rgba(255,255,255,0.035);

                color: inherit;

                font-family: inherit;

                font-size: 13px;

                outline: none;

            }


            .outreach-field input:focus,
            .outreach-field textarea:focus {

                border-color:
                    rgba(255,255,255,0.24);

            }


            .outreach-field textarea {

                resize: vertical;

                min-height: 220px;

                line-height: 1.55;

            }


            /* ==========================================
               ACTION BUTTONS
            =========================================== */

            .outreach-actions {

                display: flex;

                flex-wrap: wrap;

                gap: 9px;

                margin-top: 16px;

            }


            .outreach-actions button,
            .outreach-card-header button {

                padding:
                    9px 14px;

                border-radius: 8px;

                border:
                    1px solid
                    rgba(255,255,255,0.10);

                cursor: pointer;

                font-family: inherit;

                font-size: 12px;

                transition:
                    opacity 0.15s ease,
                    transform 0.15s ease,
                    border-color 0.15s ease;

            }


            .outreach-actions button:hover,
            .outreach-card-header button:hover {

                border-color:
                    rgba(255,255,255,0.22);

                transform:
                    translateY(-1px);

            }


            .outreach-actions button:disabled,
            .outreach-card-header button:disabled {

                opacity: 0.55;

                cursor: not-allowed;

                transform: none;

            }


            /* ==========================================
               LOADING BUTTON
            =========================================== */

            #searchButton.loading,
            #refreshOutreachCandidates.loading {

                cursor: wait;

                opacity: 0.65;

            }


            /* ==========================================
               STATUS
            =========================================== */

            .outreach-message-status {

                margin-top: 12px;

                padding: 9px 11px;

                border-radius: 8px;

                min-height: 16px;

                font-size: 12px;

                opacity: 0.75;

            }


            /* ==========================================
               HISTORY
            =========================================== */

            .outreach-history {

                display: grid;

                gap: 9px;

                margin-top: 15px;

            }


            .outreach-history-item {

                display: flex;

                justify-content:
                    space-between;

                align-items:
                    center;

                gap: 15px;

                padding: 13px;

                border-radius: 10px;

                border:
                    1px solid
                    rgba(255,255,255,0.08);

                min-width: 0;

            }


            .outreach-history-main {

                min-width: 0;

                overflow-wrap: anywhere;

            }


            .outreach-history-item p {

                margin:
                    4px 0;

                font-size: 12px;

                overflow-wrap: anywhere;

            }


            .outreach-history-item small {

                opacity: 0.5;

                font-size: 10px;

                overflow-wrap: anywhere;

            }


            .outreach-history-status {

                flex:
                    0 0 auto;

                font-size: 10px;

                opacity: 0.6;

            }


            /* ==========================================
               LOADING / EMPTY
            =========================================== */

            .outreach-loading,
            .outreach-empty {

                padding: 32px 16px;

                text-align: center;

                opacity: 0.65;

                font-size: 13px;

            }


            /* ==========================================
               SEARCH RESULT TEXT SAFETY
            =========================================== */

            .candidate-card,
            .candidate-main,
            .candidate-text-content,
            .candidate-name,
            .candidate-role,
            .skills,
            .skill,
            .source,
            .match {

                max-width: 100%;

                overflow-wrap: anywhere;

                word-break: break-word;

            }


            .candidate-text-content {

                min-width: 0;

            }


            .candidate-name {

                font-size: 15px;

                line-height: 1.3;

            }


            .candidate-role {

                line-height: 1.45;

            }


            /* ==========================================
               MOBILE
            =========================================== */

            @media (max-width: 800px) {

                .outreach-stats {

                    grid-template-columns:
                        repeat(2, 1fr);

                }


                .outreach-history-item {

                    align-items:
                        flex-start;

                    flex-direction:
                        column;

                }

            }


            @media (max-width: 500px) {

                .outreach-stats {

                    grid-template-columns:
                        1fr 1fr;

                }


                .outreach-card {

                    padding: 16px;

                }


                .outreach-card-header {

                    flex-direction:
                        column;

                    align-items:
                        flex-start;

                }


                .email-person {

                    grid-template-columns:
                        40px minmax(0, 1fr);

                }


                .outreach-actions {

                    flex-direction:
                        column;

                }


                .outreach-actions button {

                    width: 100%;

                }

            }

        `;


        document.head.appendChild(style);
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    addOutreachStyles();

});