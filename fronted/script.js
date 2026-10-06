/* =====================================================
   CIVEXA JAVASCRIPT
===================================================== */


/* =====================================================
   MOBILE NAVIGATION
===================================================== */

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if (menuBtn && navLinks) {

    menuBtn.addEventListener("click", function () {

        navLinks.classList.toggle("mobile-open");

    });

}


/* =====================================================
   HERO BUTTONS
===================================================== */

function goToReport() {

    alert(
        "CIVEXA Report Issue page will be connected here."
    );

}


function goToIssues() {

    alert(
        "CIVEXA Browse Issues page will be connected here."
    );

}


/* =====================================================
   CLOSE MOBILE MENU AFTER CLICK
===================================================== */

const navItems =
    document.querySelectorAll(".nav-links a");


navItems.forEach(function (item) {

    item.addEventListener("click", function () {

        if (navLinks) {

            navLinks.classList.remove("mobile-open");

        }

    });

});


/* =====================================================
   CIVEXA FONT
   Change website font using JavaScript
===================================================== */

const fontLink = document.createElement("link");

fontLink.rel = "stylesheet";

fontLink.href =
    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap";

document.head.appendChild(fontLink);


const fontStyle = document.createElement("style");

fontStyle.textContent = `
    body,
    button,
    input,
    textarea,
    select,
    a {
        font-family: "Poppins", sans-serif !important;
    }
`;

document.head.appendChild(fontStyle);