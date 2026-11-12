/*jslint browser: true*/ // IDK
//Tableau cliquable de la page planètes
function toggleRow(rowId) {
  var row = document.getElementById(rowId);  //var = variable (replaced every time you click) ; document = is a web page ;
  var isOpen = row.classList.contains("open"); //current state of the row selected. Open or not ? True / false
  document.querySelectorAll(".open").forEach(function(r) //collects list of all objects that have the class open. Fore everyone found, do this...
    { r.classList.remove("open"); }); //anything else is open, close it
  if (!isOpen) {
    row.classList.add("open"); //if selected one isn't already open, open it
  }
}


//Filtres pour le tableau des films
const tbody = document.querySelector(".table_dvd tbody");
// If the page has no table (like shows.html), use empty lists instead of crashing
const rows = tbody ? [...tbody.querySelectorAll(".accordion-header")] : [];
const originalRows = [...rows];

function sortTable(mode) {
  if (!tbody) return; // nothing to sort on this page
  const sorted = (
    mode === "alpha"
      ? [...rows].sort(function(a, b) {
          return a.cells[0].textContent.localeCompare(b.cells[0].textContent, "fr");
        })
      : originalRows
  );
  sorted.forEach(function(r) { tbody.append(r, r.nextElementSibling); });
}


//Filtres pour le tableau des films
/*const tbody = document.querySelector(".table_dvd tbody"); //const = constant ; Selector = only the first one ; copy of table in original order
const rows = [...tbody.querySelectorAll(".accordion-header")]; //selectorall = select all the .accordion.headers
const originalRows = [...rows]; //copy

function sortTable(mode) {
  const sorted = (
    mode === "alpha" //alphabétique. === is a better =
      ? [...rows].sort(function(a, b) { return a.cells[0].textContent. // ? = if ; Code to sort
        localeCompare(b.cells[0].textContent, "fr"); })
      : originalRows // : = else
  );
  sorted.forEach(function(r) { tbody.append(r, r.nextElementSibling); }); //réinsère la ligne et son panneau dans le tableau dans le nouvel ordre. tbody.append(r, r.nextElementSibling = always keep header and content together
}
*/


//https://cassidoo.co/post/html-dialog-on-image-click/

const isDesktop = window.matchMedia("(hover: hover)").matches;

if (isDesktop) {
  const images = document.querySelectorAll("img");
  const dialog = document.createElement("dialog");

  // Create the elements of the popup
  const captionSpan = document.createElement("span");
  const authorDiv = document.createElement("div");
  const body = document.createElement("div");
  const img = document.createElement("img");
  const bannerDiv = document.createElement("div");   // banner
  const rightDiv = document.createElement("div");
  const descDiv = document.createElement("div");
  const closeBtn = document.createElement("button");

  // Give them their CSS classes
  captionSpan.className = "modal-caption";
  authorDiv.className = "modal-author";
  body.className = "modal-body";
  bannerDiv.className = "modal-banner";              // banner
  rightDiv.className = "modal-side";
  descDiv.className = "modal-description";

  // Close button
  closeBtn.className = "modal-close";
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", () => dialog.close());

  // Order: title, author, then [cover + banner + extra info + description]
  body.append(img, bannerDiv, rightDiv, descDiv);    // banner goes right after the cover
  dialog.append(closeBtn, captionSpan, authorDiv, body);
  document.body.appendChild(dialog);

  // Copies one named part of a template into a container
  function fillSlot(target, template, slotName) {
    target.replaceChildren();
    const source = template?.content.querySelector(`[data-slot="${slotName}"]`);
    if (source) {
      target.append(...source.cloneNode(true).childNodes);
    }
  }

  // When an image is clicked
  let savedScroll = 0; // remembers where you were on the page
  images.forEach((image) => {
    image.addEventListener("click", () => {
      img.src = image.src;
      captionSpan.textContent = image.getAttribute("data-caption") || "";

      const template = document.getElementById(image.dataset.descriptionId);

      fillSlot(authorDiv, template, "author");
      authorDiv.style.display = authorDiv.hasChildNodes() ? "" : "none";

      fillSlot(bannerDiv, template, "banner");
      bannerDiv.style.display = bannerDiv.hasChildNodes() ? "" : "none";

      fillSlot(rightDiv, template, "right");
      fillSlot(descDiv, template, "description");
      descDiv.style.display = descDiv.hasChildNodes() ? "" : "none";

      savedScroll = window.scrollY;   // remember the scroll position

      dialog.showModal();
    });
  });

  // Close when clicking on the background
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dialog.close();
    }
  });

  // When the popup closes (button, Escape, or click outside), go back to where you were
  dialog.addEventListener("close", () => {
    window.scrollTo(0, savedScroll);
  });
}

//Neko

