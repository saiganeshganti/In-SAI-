/* =========================================================
   TALENTREACH — TALENT POOL
   ========================================================= */


/* ---------------------------------------------------------
   Load Talent Pool
--------------------------------------------------------- */

async function loadTalentPool() {

    const loading =
        document.getElementById("poolLoading");

    const results =
        document.getElementById("talentPoolResults");

    const empty =
        document.getElementById("poolEmpty");

    const count =
        document.getElementById("poolCount");

    const status =
        document.getElementById("poolStatus");


    if (!results) {
        console.error("Talent Pool results container not found.");
        return;
    }


    try {

        if (loading) {
            loading.classList.remove("hidden");
        }

        if (empty) {
            empty.classList.add("hidden");
        }


        status.textContent =
            "Loading saved candidates...";


        const response =
            await fetch("/candidates");


        if (!response.ok) {

            throw new Error(
                "Unable to load candidates from server."
            );

        }


        const candidates =
            await response.json();


        console.log(
            "Talent Pool candidates:",
            candidates
        );


        if (loading) {
            loading.classList.add("hidden");
        }


        if (count) {
            count.textContent =
                candidates.length;
        }


        /* -------------------------------------------------
           No candidates
        ------------------------------------------------- */

        if (candidates.length === 0) {

            results.innerHTML = "";

            if (empty) {
                empty.classList.remove("hidden");
            }

            status.textContent =
                "No saved candidates";

            return;
        }


        if (empty) {
            empty.classList.add("hidden");
        }


        status.textContent =
            `${candidates.length} candidate${candidates.length === 1 ? "" : "s"} saved`;


        renderCandidates(candidates);


    } catch (error) {

        console.error(
            "Talent Pool error:",
            error
        );


        if (loading) {
            loading.classList.add("hidden");
        }


        status.textContent =
            "Unable to load Talent Pool";


        results.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚠
                </div>

                <h3>
                    Something went wrong
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;
    }
}


/* ---------------------------------------------------------
   Render candidates
--------------------------------------------------------- */

function renderCandidates(candidates) {

    const results =
        document.getElementById(
            "talentPoolResults"
        );


    results.innerHTML = "";


    candidates.forEach(candidate => {

        const card =
            document.createElement("div");


        card.className =
            "candidate-card";


        const initials =
            getInitials(
                candidate.name
            );


        /* -------------------------------------------------
           Skills
        ------------------------------------------------- */

        let skillsHTML = "";


        if (candidate.skills) {

            const skills =
                candidate.skills
                    .split(",")
                    .map(skill => skill.trim())
                    .filter(Boolean);


            skillsHTML =
                skills.map(skill => {

                    return `
                        <span class="skill">
                            ${escapeHtml(skill)}
                        </span>
                    `;

                }).join("");

        }


        /* -------------------------------------------------
           Location
        ------------------------------------------------- */

        const locationParts = [

            candidate.city,

            candidate.state,

            candidate.region

        ].filter(Boolean);


        const location =
            locationParts.length
                ? locationParts.join(", ")
                : (
                    candidate.location ||
                    "Location not specified"
                );


        /* -------------------------------------------------
           Professional details
        ------------------------------------------------- */

        const role =
            candidate.current_role ||
            "Role not specified";


        const company =
            candidate.company ||
            "Company not specified";


        const experience =
            candidate.experience ||
            "Experience not specified";


        const gender =
            candidate.gender ||
            "Not specified";


        const financeCategory =
            candidate.finance_category ||
            "";


        const financeSubcategory =
            candidate.finance_subcategory ||
            "";


        const status =
            candidate.status ||
            "active";


        /* -------------------------------------------------
           Candidate card
        ------------------------------------------------- */

        card.innerHTML = `

            <div class="candidate-main">

                <div class="avatar">
                    ${initials}
                </div>


                <div>

                    <div class="candidate-name">

                        ${escapeHtml(
                            candidate.name ||
                            "Unnamed Candidate"
                        )}

                    </div>


                    <div class="candidate-role">

                        ${escapeHtml(role)}

                        ${
                            candidate.company
                                ? ` • ${escapeHtml(company)}`
                                : ""
                        }

                    </div>


                    <div class="skills">

                        ${skillsHTML}

                    </div>

                </div>

            </div>


            <div class="candidate-actions">

                <div>

                    <div class="match">

                        ${escapeHtml(status)}

                    </div>


                    <div class="source">

                        📍 ${escapeHtml(location)}

                    </div>

                </div>


                <div class="talent-details">

                    <div>
                        <strong>
                            Experience
                        </strong>

                        <span>
                            ${escapeHtml(experience)}
                        </span>
                    </div>


                    <div>
                        <strong>
                            Gender
                        </strong>

                        <span>
                            ${escapeHtml(gender)}
                        </span>
                    </div>


                    ${
                        financeCategory
                        ?
                        `
                        <div>
                            <strong>
                                Finance
                            </strong>

                            <span>
                                ${escapeHtml(
                                    financeCategory
                                )}
                            </span>
                        </div>
                        `
                        :
                        ""
                    }


                    ${
                        financeSubcategory
                        ?
                        `
                        <div>
                            <strong>
                                Specialization
                            </strong>

                            <span>
                                ${escapeHtml(
                                    financeSubcategory
                                )}
                            </span>
                        </div>
                        `
                        :
                        ""
                    }

                </div>


                <div class="candidate-buttons">

                    ${
                        candidate.linkedin_url
                        ?
                        `
                        <a
                            class="view-button"
                            href="${escapeAttribute(
                                candidate.linkedin_url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View Profile →
                        </a>
                        `
                        :
                        ""
                    }


                    <button
                        class="view-button"
                        type="button"
                        onclick="removeCandidate(${candidate.id})"
                    >
                        Remove
                    </button>

                </div>

            </div>

        `;


        results.appendChild(card);

    });

}


/* ---------------------------------------------------------
   Remove candidate
--------------------------------------------------------- */

async function removeCandidate(candidateId) {

    const confirmed =
        confirm(
            "Remove this candidate from your Talent Pool?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/candidates/${candidateId}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not remove candidate."
            );

        }


        await loadTalentPool();


    } catch (error) {

        console.error(
            "Remove candidate error:",
            error
        );


        alert(
            error.message
        );

    }

}


/* ---------------------------------------------------------
   Get initials
--------------------------------------------------------- */

function getInitials(name) {

    if (!name) {
        return "?";
    }


    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word =>
            word.charAt(0).toUpperCase()
        )
        .join("");
}


/* ---------------------------------------------------------
   Escape HTML
--------------------------------------------------------- */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }


    const div =
        document.createElement("div");


    div.textContent =
        String(value);


    return div.innerHTML;
}


/* ---------------------------------------------------------
   Escape URL attribute
--------------------------------------------------------- */

function escapeAttribute(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/"/g, "&quot;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;");
}


/* ---------------------------------------------------------
   Start Talent Pool
--------------------------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadTalentPool();

    }
);