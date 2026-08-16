const roleButton = document.querySelector("#draw-roles");
const roleResult = document.querySelector("#role-result");
const filterInputs = [...document.querySelectorAll("#category-filters input")];
const categoryButton = document.querySelector("#draw-categories");
const categoryResults = document.querySelector("#category-results");
const categoryCount = document.querySelector("#category-count");
const canvas = document.querySelector("#category-wheel");
const context = canvas.getContext("2d");
const showWheelInput = document.querySelector("#show-wheel");
const wheelVisual = document.querySelector("#wheel-visual");
const videosSection = document.querySelector("#videos-section");
const videosTitle = document.querySelector("#videos-title");
const videoStatus = document.querySelector("#video-status");
const videoGrid = document.querySelector("#video-grid");
const pornhubSearch = document.querySelector("#pornhub-search");

let categoryData = {};
let activeCategories = [];
let wheelRotation = 0;

const cleanName = (name) => name.replaceAll("-", " ");

function drawRoles() {
  const categoryPicker = Math.random() < 0.5 ? "Piotr" : "Paulina";
  const filmPicker = categoryPicker === "Piotr" ? "Paulina" : "Piotr";

  roleResult.innerHTML = `Kategorię wybiera <strong>${categoryPicker}</strong>, a film wybiera <strong>${filmPicker}</strong>.`;
}

function getSelectedCategories() {
  return filterInputs
    .filter((input) => input.checked)
    .flatMap((input) =>
      (categoryData[input.value] ?? []).map((category) => ({
        ...category,
        group: input.value,
        label: cleanName(category.name),
      })),
    );
}

function colorForSlice(index, total) {
  const hue = Math.round((index * 360) / Math.max(total, 1));
  const lightness = index % 2 === 0 ? 52 : 42;
  return `hsl(${hue} 72% ${lightness}%)`;
}

function fitLabel(label, maxCharacters) {
  if (label.length <= maxCharacters) return label;
  return `${label.slice(0, Math.max(3, maxCharacters - 1))}…`;
}

function renderWheel() {
  activeCategories = getSelectedCategories();
  const total = activeCategories.length;
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;

  context.clearRect(0, 0, size, size);

  if (!total) {
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = "#262734";
    context.fill();
    context.fillStyle = "#aaa8b4";
    context.font = "700 30px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Zaznacz co najmniej jedną grupę", center, center - 75);
    categoryCount.textContent = "Brak kategorii do losowania.";
    categoryButton.disabled = true;
    return;
  }

  const sliceAngle = (Math.PI * 2) / total;
  const fontSize = Math.max(9, Math.min(24, 800 / total));
  const maxCharacters = Math.max(7, Math.floor(1050 / total));

  activeCategories.forEach((category, index) => {
    const startAngle = -Math.PI / 2 + index * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, startAngle, endAngle);
    context.closePath();
    context.fillStyle = colorForSlice(index, total);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.34)";
    context.lineWidth = total > 70 ? 1 : 2;
    context.stroke();

    context.save();
    context.translate(center, center);
    context.rotate(startAngle + sliceAngle / 2);
    context.fillStyle = "white";
    context.font = `800 ${fontSize}px system-ui`;
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0,0,0,0.7)";
    context.shadowBlur = 3;
    context.fillText(fitLabel(category.label, maxCharacters), radius - 18, 0);
    context.restore();
  });

  categoryCount.textContent = `W losowaniu bierze udział ${total} kategorii.`;
  categoryButton.disabled = total < 5;
}

function sampleCategories(categories, amount) {
  const shuffled = [...categories];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, amount);
}

function weightedChoice(categories) {
  const weighted = categories.map((category) => ({
    category,
    weight: category.group === "femdom" ? 0.5 : 1,
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let target = Math.random() * totalWeight;

  for (const entry of weighted) {
    target -= entry.weight;
    if (target <= 0) return entry.category;
  }

  return weighted.at(-1)?.category;
}

function drawRiggedCategories() {
  const selected = [];
  const selectedGroups = new Set(
    filterInputs.filter((input) => input.checked).map((input) => input.value),
  );
  const ffmPool = selectedGroups.has("ffm")
    ? activeCategories.filter((category) => category.group === "ffm")
    : [];
  const lesbianPool = selectedGroups.has("basic_categories")
    ? activeCategories.filter(
        (category) => category.group === "basic_categories" && category.name.includes("lesbian"),
      )
    : [];

  if (ffmPool.length) selected.push(sampleCategories(ffmPool, 1)[0]);
  if (lesbianPool.length) selected.push(sampleCategories(lesbianPool, 1)[0]);

  const selectedNames = new Set(selected.map((category) => category.name));
  let remaining = activeCategories.filter(
    (category) => category.group !== "ffm" && !selectedNames.has(category.name),
  );

  while (selected.length < 5 && remaining.length) {
    const category = weightedChoice(remaining);
    selected.push(category);
    remaining = remaining.filter((entry) => entry.name !== category.name);
  }

  if (selected.length < 5) {
    const fallback = activeCategories.filter(
      (category) => !selected.some((entry) => entry.name === category.name),
    );
    selected.push(...sampleCategories(fallback, 5 - selected.length));
  }

  return sampleCategories(selected, selected.length);
}

function drawCategories() {
  if (activeCategories.length < 5) return;

  const selected = drawRiggedCategories();
  wheelRotation += 1080 + Math.floor(Math.random() * 720);
  canvas.style.transform = `rotate(${wheelRotation}deg)`;

  categoryResults.innerHTML = selected
    .map(
      (category, index) =>
        `<li style="animation-delay: ${index * 80}ms" title="${category.description ?? ""}"><button class="category-choice" type="button" data-category="${category.name}">${category.label}</button></li>`,
    )
    .join("");

  videosSection.hidden = true;
  videoGrid.innerHTML = "";
}

function createVideoCard(video) {
  const card = document.createElement("article");
  card.className = "video-card";
  const link = document.createElement("a");
  link.href = video.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const thumbnail = document.createElement("div");
  thumbnail.className = "video-thumbnail";
  const image = document.createElement("img");
  image.src = video.thumbnails[0] ?? "";
  image.alt = "";
  image.loading = "lazy";
  thumbnail.append(image);

  if (video.previewUrl) {
    const preview = document.createElement("video");
    preview.className = "video-preview";
    preview.dataset.src = `/api/preview?url=${encodeURIComponent(video.previewUrl)}`;
    preview.muted = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.preload = "none";
    thumbnail.append(preview);
    preview.addEventListener("playing", () => thumbnail.classList.add("is-previewing"));
    preview.addEventListener("error", () => thumbnail.classList.remove("is-previewing"));

    card.addEventListener("mouseenter", () => {
      if (!preview.src) {
        preview.src = preview.dataset.src;
        preview.load();
      }
      preview.play().catch(() => {
        thumbnail.classList.remove("is-previewing");
      });
    });
    card.addEventListener("mouseleave", () => {
      preview.pause();
      preview.currentTime = 0;
      thumbnail.classList.remove("is-previewing");
    });
  }

  const title = document.createElement("p");
  title.className = "video-title";
  title.textContent = video.title;
  link.append(thumbnail, title);
  card.append(link);
  return card;
}

async function showVideos(categoryName) {
  const query = cleanName(categoryName);
  videosSection.hidden = false;
  videosTitle.textContent = `Filmy dla: ${query}`;
  pornhubSearch.href = `https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`;
  videoStatus.textContent = "Pobieranie losowych filmów…";
  videoGrid.innerHTML = "";
  videosSection.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const response = await fetch(`/api/videos?query=${encodeURIComponent(query)}&t=${Date.now()}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);

    videoStatus.textContent = `Znaleziono ${payload.videos.length} losowych propozycji z pierwszej strony dla kategorii „${query}”.`;
    payload.videos.forEach((video) => videoGrid.append(createVideoCard(video)));
  } catch (error) {
    videoStatus.textContent = "Nie udało się pobrać filmów.";
    videoGrid.innerHTML = `<p class="video-error">${error.message} Skorzystaj z przycisku „Szukaj na Pornhubie”.</p>`;
  }
}

async function loadCategories() {
  try {
    const response = await fetch("category_list.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    categoryData = await response.json();
    renderWheel();
  } catch (error) {
    categoryCount.textContent = "Nie udało się wczytać pliku category_list.json.";
    categoryResults.innerHTML = '<li class="result-placeholder">Uruchom stronę przez lokalny serwer HTTP.</li>';
    categoryButton.disabled = true;
    console.error("Błąd wczytywania kategorii:", error);
  }
}

roleButton.addEventListener("click", drawRoles);
categoryButton.addEventListener("click", drawCategories);
categoryResults.addEventListener("click", (event) => {
  const choice = event.target.closest(".category-choice");
  if (choice) showVideos(choice.dataset.category);
});
filterInputs.forEach((input) => input.addEventListener("change", renderWheel));
showWheelInput.addEventListener("change", () => {
  wheelVisual.hidden = !showWheelInput.checked;
  if (showWheelInput.checked) renderWheel();
});

loadCategories();
