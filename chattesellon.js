alert("JAVASCRIPT IS WORKING!");

document.addEventListener("DOMContentLoaded", () => {
    alert("HTML IS READY!");

    const form = document.getElementById("postForm");

    alert("FORM FOUND: " + Boolean(form));

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        alert("PUBLISH BUTTON WORKS!");
    });
});
