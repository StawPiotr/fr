const climateButtons = [...document.querySelectorAll("[data-climate]")];
const climates = climateButtons.map((button) => button.dataset.climate);
const instruction = document.querySelector("#session-instruction");
const confirmButton = document.querySelector("#confirm-choice");
const resetButton = document.querySelector("#reset-choices");
const sharePreviewInput = document.querySelector("#share-preview");
const soloModeInput = document.querySelector("#solo-mode");
const options = document.querySelector("#session-options");
const confirmation = document.querySelector("#session-results");
const resultsList = document.querySelector("#session-results-list");
const outcome = document.querySelector("#session-outcome");
const resetSessionButton = document.querySelector("#reset-session");
const followUpPanel = document.querySelector("#session-follow-up");
const followUpForm = document.querySelector("#follow-up-form");
const climateControls = document.querySelector(".session-controls");
const sessionActions = document.querySelector(".session-actions");
const sliderPhase = document.querySelector("#slider-phase");
const sliderFields = document.querySelector("#slider-fields");
const sliderInstruction = document.querySelector("#slider-instruction");
const confirmSlidersButton = document.querySelector("#confirm-sliders");

let phase = "prefer";
let selectedClimate = null;
let currentFavorite = null;
let sharePreview = false;
let soloMode = false;
let savedChoices = [];
let followUpState = null;
let sliderState = null;

const sliderDefinitions = ["Roleplay", "Bondage", "Pain", "Pleasure"];

function currentPlayerNumber() {
  return savedChoices.length + 1;
}

function setInstruction() {
  if (followUpState) {
    instruction.textContent = `Osoba ${followUpState.playerIndex + 1}: wybierz preferencje w obu grupach.`;
    return;
  }
  const person = `Osoba ${currentPlayerNumber()}`;
  instruction.textContent = phase === "prefer"
    ? `${person}: wybierz najbardziej preferowany klimat.`
    : `${person}: wybierz klimat, który banujesz z puli.`;
}

function updateClimateButtons() {
  const sharedBan = currentPlayerNumber() === 2 && sharePreview ? savedChoices[0]?.banned : null;
  const sharedFavorite = currentPlayerNumber() === 2 && sharePreview ? savedChoices[0]?.preferred : null;

  climateButtons.forEach((button) => {
    const climate = button.dataset.climate;
    const isSharedBan = climate === sharedBan;
    const isOwnFavorite = phase === "ban" && climate === currentFavorite;
    const isSharedFavorite = climate === sharedFavorite;
    const isSelected = climate === selectedClimate;

    button.disabled = isSharedBan || (phase === "ban" && isOwnFavorite);
    button.setAttribute("aria-pressed", String(isSelected || isOwnFavorite));
    button.classList.toggle("session-control--primary", isSelected || isOwnFavorite);
    button.classList.toggle("is-shared-preference", isSharedFavorite);
    button.classList.toggle("is-shared-ban", isSharedBan);

    let badge = "";
    if (isSharedBan) badge = "Zbanowane";
    else if (isSharedFavorite) badge = "Preferowane przez osobę 1";
    else if (isOwnFavorite) badge = "Twoja preferencja";

    button.innerHTML = `<span>${climate}</span>${badge ? `<small class="climate-badge">${badge}</small>` : ""}`;
    button.setAttribute("aria-label", badge ? `${climate} — ${badge}` : climate);
  });

  confirmButton.disabled = !selectedClimate;
}

function addResultCard(choice, index) {
  const card = document.createElement("article");
  card.className = "session-result-card";
  const title = document.createElement("h3");
  title.textContent = soloMode ? "Twój wybór" : `Osoba ${index + 1}`;
  const preferred = document.createElement("p");
  const preferredLabel = document.createElement("strong");
  preferredLabel.textContent = "Preferowany klimat: ";
  preferred.append(preferredLabel, document.createTextNode(choice.preferred));
  const banned = document.createElement("p");
  const bannedLabel = document.createElement("strong");
  bannedLabel.textContent = "Zbanowany klimat: ";
  const bannedClimate = document.createElement("s");
  bannedClimate.textContent = choice.banned;
  banned.append(bannedLabel, bannedClimate);
  card.append(title, preferred, banned);
  resultsList.append(card);
}

function showConfirmation() {
  resultsList.replaceChildren();
  savedChoices.forEach(addResultCard);
  confirmation.hidden = false;
  followUpPanel.hidden = true;
  climateControls.hidden = true;
  sessionActions.hidden = true;
  options.hidden = true;
  outcome.hidden = true;
  document.querySelector(".session-sliders").hidden = true;
  document.querySelector("#session-results-title").textContent = "Wyniki wyboru";
  showDrawResult();
}

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function drawFinalClimate() {
  const preferences = savedChoices.map((choice) => choice.preferred);
  const banned = new Set(savedChoices.map((choice) => choice.banned));
  const preferred = [...new Set(preferences)];

  if (preferences.length === 2 && preferences[0] === preferences[1]) return preferences[0];

  const availablePreferences = preferred.filter((climate) => !banned.has(climate));
  if (availablePreferences.length === 1) return availablePreferences[0];
  if (availablePreferences.length > 1) return chooseRandom(availablePreferences);

  const fallback = climates.filter((climate) => !preferred.includes(climate) && !banned.has(climate));
  return fallback.length ? chooseRandom(fallback) : null;
}

function renderFollowUpForm() {
  followUpPanel.hidden = false;
  followUpForm.replaceChildren();
  setInstruction();

  followUpState.groups.forEach((group, groupIndex) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "follow-up-group";
    const legend = document.createElement("legend");
    legend.textContent = group.title;
    fieldset.append(legend);
    const choices = document.createElement("div");
    choices.className = "follow-up-choices";

    group.choices.forEach((choice) => {
      const label = document.createElement("label");
      label.className = "follow-up-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `follow-up-${groupIndex}`;
      input.value = choice;
      input.checked = followUpState.selections[groupIndex] === choice;
      input.required = true;
      input.addEventListener("change", () => {
        followUpState.selections[groupIndex] = choice;
        const submitButton = followUpForm.querySelector(".follow-up-submit");
        submitButton.disabled = followUpState.selections.some((selection) => !selection);
      });
      label.classList.toggle(
        "is-shared-preference",
        followUpState.playerIndex === 1 && sharePreview && followUpState.choices[0]?.[groupIndex] === choice,
      );
      const caption = document.createElement("span");
      caption.textContent = choice;
      label.append(input, caption);
      choices.append(label);
    });

    fieldset.append(choices);
    followUpForm.append(fieldset);
  });

  const actions = document.createElement("div");
  actions.className = "follow-up-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button button--primary follow-up-submit";
  submit.disabled = followUpState.selections.some((selection) => !selection);
  submit.textContent = "Zatwierdź preferencje";
  actions.append(submit);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "button button--secondary";
  reset.textContent = "Resetuj swój wybór";
  reset.addEventListener("click", () => {
    followUpState.selections = followUpState.groups.map(() => null);
    renderFollowUpForm();
  });
  actions.append(reset);
  followUpForm.append(actions);
  followUpForm.onsubmit = submitFollowUpForm;
}

function submitFollowUpForm(event) {
  event.preventDefault();
  const formData = new FormData(followUpForm);
  const selections = followUpState.groups.map((_, index) => formData.get(`follow-up-${index}`));
  if (selections.some((choice) => !choice)) return;

  followUpState.choices.push(selections);
  if (soloMode || followUpState.choices.length === 2) {
    followUpState.results = followUpState.groups.map((group, index) => {
      const preferences = followUpState.choices.map((playerChoices) => playerChoices[index]);
      return {
        title: group.title,
        choice: preferences[0] === preferences[1] || preferences.length === 1
          ? preferences[0]
          : chooseRandom(preferences),
      };
    });
    renderFollowUpResults();
    return;
  }

  followUpState.playerIndex = 1;
  followUpState.selections = followUpState.groups.map(() => null);
  renderFollowUpForm();
}

function renderFollowUpResults() {
  followUpForm.replaceChildren();
  followUpState.results.forEach((result) => {
    const line = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = `${result.title}: `;
    line.append(label, document.createTextNode(result.choice));
    followUpForm.append(line);
  });
  instruction.textContent = "Dodatkowe wybory zostały zatwierdzone.";
  resetSessionButton.hidden = false;
}

function addFollowUpOptions() {
  followUpPanel.hidden = false;
  followUpState = {
    groups: [
      { title: "Wtrysk", choices: ["Z połyskiem", "Na twarz", "Na ciało"] },
      { title: "Film", choices: ["Tak", "Nie"] },
    ],
    playerIndex: 0,
    selections: [null, null],
    choices: [],
    results: [],
  };
  renderFollowUpForm();
}

function showDrawResult() {
  const chosenClimate = drawFinalClimate();
  document.querySelector("#session-results-title").textContent = "Wynik losowania";
  outcome.hidden = false;
  outcome.textContent = chosenClimate
    ? `Wybrany klimat sesji: ${chosenClimate}`
    : "Brak dostępnego klimatu do wylosowania.";

  if (chosenClimate === "Blowjob" || chosenClimate === "Vanilla") {
    addFollowUpOptions();
  } else if (chosenClimate === "BDSM" || chosenClimate === "Femdom") {
    followUpPanel.hidden = true;
    startSliderPhase();
  }
}

function renderSliderFields() {
  sliderFields.replaceChildren();
  sliderDefinitions.forEach((label, index) => {
    const field = document.createElement("label");
    field.className = "session-slider";
    const title = document.createElement("span");
    title.textContent = label;
    const output = document.createElement("output");
    output.textContent = `${sliderState.values[index]} / 10`;
    if (sliderState.playerIndex === 1 && sharePreview && sliderState.submissions[0]) {
      output.textContent += ` (osoba 1: ${sliderState.submissions[0][index]} / 10)`;
    }
    const input = document.createElement("input");
    input.type = "range";
    input.min = "1";
    input.max = "10";
    input.step = "1";
    input.value = sliderState.values[index];
    input.addEventListener("input", () => {
      sliderState.values[index] = Number(input.value);
      output.textContent = `${input.value} / 10`;
      if (sliderState.playerIndex === 1 && sharePreview && sliderState.submissions[0]) {
        output.textContent += ` (osoba 1: ${sliderState.submissions[0][index]} / 10)`;
      }
    });
    field.append(title, output, input);
    sliderFields.append(field);
  });
}

function startSliderPhase() {
  sliderState = {
    playerIndex: 0,
    values: sliderDefinitions.map(() => 5),
    submissions: [],
  };
  sliderPhase.hidden = false;
  renderSliderFields();
  sliderInstruction.textContent = "Osoba 1: ustaw i zatwierdź swoje preferencje.";
}

function finishSliderPhase() {
  const averages = sliderDefinitions.map((_, index) => Math.floor(
    sliderState.submissions.reduce((sum, values) => sum + values[index], 0) / sliderState.submissions.length,
  ));
  sliderFields.replaceChildren();
  averages.forEach((value, index) => {
    const result = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = `${sliderDefinitions[index]}: `;
    result.append(label, document.createTextNode(`${value} / 10`));
    sliderFields.append(result);
  });
  sliderInstruction.textContent = "Średnie preferencje obu osób (zaokrąglone w dół).";
  confirmSlidersButton.hidden = true;
  resetSessionButton.hidden = false;
}

confirmSlidersButton.addEventListener("click", () => {
  sliderState.submissions.push([...sliderState.values]);
  if (soloMode || sliderState.submissions.length === 2) {
    finishSliderPhase();
    return;
  }
  sliderState.playerIndex = 1;
  sliderState.values = sliderDefinitions.map(() => 5);
  renderSliderFields();
  sliderInstruction.textContent = "Osoba 2: ustaw i zatwierdź swoje preferencje.";
});

function resetSession() {
  phase = "prefer";
  selectedClimate = null;
  currentFavorite = null;
  sharePreview = false;
  soloMode = false;
  savedChoices = [];
  followUpState = null;
  sliderState = null;
  sharePreviewInput.checked = false;
  soloModeInput.checked = false;
  sharePreviewInput.disabled = false;
  soloModeInput.disabled = false;
  confirmation.hidden = true;
  followUpPanel.hidden = true;
  climateControls.hidden = false;
  sessionActions.hidden = false;
  options.hidden = false;
  outcome.hidden = true;
  resetSessionButton.hidden = true;
  sliderPhase.hidden = true;
  confirmSlidersButton.hidden = false;
  document.querySelector("#session-results-title").textContent = "Potwierdzenie wyborów";
  setInstruction();
  updateClimateButtons();
}

climateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedClimate = button.dataset.climate;
    updateClimateButtons();
  });
});

confirmButton.addEventListener("click", () => {
  if (!selectedClimate) return;

  if (phase === "prefer") {
    currentFavorite = selectedClimate;
    selectedClimate = null;
    phase = "ban";
    setInstruction();
    updateClimateButtons();
    return;
  }

  savedChoices.push({ preferred: currentFavorite, banned: selectedClimate });
  selectedClimate = null;

  if (savedChoices.length === 1) {
    sharePreview = sharePreviewInput.checked;
    soloMode = soloModeInput.checked;
    sharePreviewInput.disabled = true;
    soloModeInput.disabled = true;
  }

  if (soloMode || savedChoices.length === 2) {
    showConfirmation();
    return;
  }

  currentFavorite = null;
  phase = "prefer";
  setInstruction();
  updateClimateButtons();
});

resetButton.addEventListener("click", () => {
  currentFavorite = null;
  selectedClimate = null;
  phase = "prefer";
  setInstruction();
  updateClimateButtons();
});

resetSessionButton.addEventListener("click", resetSession);

sharePreviewInput.addEventListener("change", () => {
  if (savedChoices.length === 0) sharePreview = sharePreviewInput.checked;
});

soloModeInput.addEventListener("change", () => {
  if (savedChoices.length === 0) soloMode = soloModeInput.checked;
});

setInstruction();
updateClimateButtons();