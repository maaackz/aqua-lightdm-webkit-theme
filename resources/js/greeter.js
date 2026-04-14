/*
 * greeter.js - Compatibility layer for modern web-greeter
 */

const state = {
  selectedUsername: null,
  selectedSessionKey: null,
  promptVisible: false,
  initialized: false,
  userCards: new Map(),
  usersByUsername: new Map(),
};

function $(selector) {
  return document.querySelector(selector);
}

function setVisible(element, visible) {
  if (!element) return;
  element.classList.toggle("hidden", !visible);
}

function setPromptVisible(visible) {
  const passwordContainer = $("#password_container");

  state.promptVisible = visible;

  if (!passwordContainer) return;
  passwordContainer.classList.toggle("passhidden", !visible);
}

function clearMessage() {
  renderMessage("", 0);
}

function renderMessage(text, type) {
  const wrapper = $("#message");
  const content = $("#message_content");

  if (!wrapper || !content) return;

  content.textContent = text || "";
  content.classList.toggle("error", !!text && type !== 0);
  wrapper.classList.toggle("hidden", !text);
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initializeClock() {
  const time = $("#time");

  if (!time) return;

  time.textContent =
    window.theme_utils?.get_current_localized_time() || getCurrentTime();
  window.setInterval(() => {
    time.textContent =
      window.theme_utils?.get_current_localized_time() || getCurrentTime();
  }, 60000);
}

function onImageError(event) {
  event.currentTarget.src = "resources/img/avatar.svg";
}

function getPasswordPromptType() {
  return 1;
}

function getSelectedUserCard() {
  if (!state.selectedUsername) return null;
  return state.userCards.get(state.selectedUsername) || null;
}

function updateCardLayout() {
  const selectedCard = getSelectedUserCard();
  const cards = document.querySelectorAll(".user");
  let left = 0;

  if (selectedCard) {
    const rect = selectedCard.getBoundingClientRect();
    const parentRect = selectedCard.parentElement?.getBoundingClientRect();

    if (rect.width > 0 && parentRect) {
      left = parentRect.width / 2 - rect.width / 2 - rect.left;
      if (Math.abs(left) < 5) {
        left = 0;
      }
    }
  }

  for (const card of cards) {
    const isSelected =
      !!state.selectedUsername &&
      card.dataset.username === state.selectedUsername;

    setVisible(card, !state.selectedUsername || isSelected);
    card.style.left = isSelected ? `${left}px` : "0px";
  }
}

function showUserList() {
  const background = $("#background");
  const passwordEntry = $("#password_entry");

  state.selectedUsername = null;
  state.selectedSessionKey = null;
  setPromptVisible(false);
  updateCardLayout();
  setVisible($("#back"), false);
  setVisible($("#enter"), false);
  clearMessage();

  if (background) {
    background.classList.remove("blurred");
  }
  if (passwordEntry) {
    passwordEntry.value = "";
  }
}

function resolveSessionKey(user) {
  const sessionFromUser = user?.session;
  const defaultSession = window.lightdm?.default_session;
  const firstSession = window.lightdm?.sessions?.[0]?.key;

  return sessionFromUser || defaultSession || firstSession || null;
}

function cancelAuthentication() {
  if (!window.lightdm) return;
  if (window.lightdm.in_authentication) {
    window.lightdm.cancel_authentication();
  }
}

function armSelectedUserAuthentication() {
  if (!window.lightdm || !state.selectedUsername) return;

  cancelAuthentication();
  setPromptVisible(false);
  window.lightdm.authenticate(state.selectedUsername);
}

function selectUserByUsername(username) {
  const user = state.usersByUsername.get(username);

  if (!user || !window.lightdm) return;

  state.selectedUsername = user.username;
  state.selectedSessionKey = resolveSessionKey(user);
  clearMessage();
  updateCardLayout();
  armSelectedUserAuthentication();
}

function handleUserClick(event) {
  const username = event.currentTarget?.dataset?.username;

  if (!username) return;
  if (state.selectedUsername === username && state.promptVisible) return;

  selectUserByUsername(username);
  event.preventDefault();
  event.stopPropagation();
}

function showPrompt(text, type) {
  const passwordEntry = $("#password_entry");
  const background = $("#background");
  const promptText = (text || "").replace(/:$/, "");

  if (type !== getPasswordPromptType()) {
    return;
  }
  if (!state.selectedUsername) {
    return;
  }

  updateCardLayout();
  setPromptVisible(true);
  setVisible($("#back"), true);
  setVisible($("#enter"), true);

  if (passwordEntry) {
    passwordEntry.placeholder = promptText || "Password";
    passwordEntry.value = "";
    passwordEntry.disabled = false;
    passwordEntry.focus();
  }
  if (background) {
    background.classList.add("blurred");
  }
}

function showMessage(text, type) {
  renderMessage(text, type);
}

function shakePasswordContainer() {
  const passwordContainer = $("#password_container");

  if (!passwordContainer) return;

  passwordContainer.classList.add("apply_shake");
  passwordContainer.addEventListener(
    "animationend",
    () => {
      passwordContainer.classList.remove("apply_shake");
    },
    { once: true }
  );
}

function handleAuthenticationComplete() {
  const passwordEntry = $("#password_entry");

  if (!window.lightdm) return;

  if (window.lightdm.is_authenticated) {
    const sessionKey =
      state.selectedSessionKey ||
      window.lightdm.default_session ||
      window.lightdm.sessions?.[0]?.key ||
      null;

    if (sessionKey) {
      window.lightdm.start_session(sessionKey);
    } else {
      renderMessage("No session is available", 1);
    }
    return;
  }

  shakePasswordContainer();
  if (passwordEntry) {
    passwordEntry.value = "";
    passwordEntry.disabled = false;
    passwordEntry.focus();
  }
  if (!$("#message_content")?.textContent?.trim()) {
    renderMessage("Authentication failed", 1);
  }
  if (state.selectedUsername) {
    armSelectedUserAuthentication();
  }
}

function submitPassword() {
  const passwordEntry = $("#password_entry");

  if (!window.lightdm || !passwordEntry || !state.selectedUsername) return;
  if (!state.promptVisible) return;

  clearMessage();
  passwordEntry.disabled = true;
  window.lightdm.respond(passwordEntry.value);
}

function bindPasswordForm() {
  const passwordForm = $("#password_form");
  const enterButton = $("#enter");
  const backButton = $("#back");

  passwordForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPassword();
  });
  enterButton?.addEventListener("click", submitPassword);
  backButton?.addEventListener("click", () => {
    cancelAuthentication();
    showUserList();
  });
}

function bindPowerButtons() {
  const actions = [
    ["#action_suspend", "suspend", "can_suspend"],
    ["#action_restart", "restart", "can_restart"],
    ["#action_shutdown", "shutdown", "can_shutdown"],
  ];

  for (const [selector, methodName, capability] of actions) {
    const element = $(selector);
    const isEnabled = window.lightdm?.[capability];

    setVisible(element, !!isEnabled);
    element?.addEventListener("click", () => {
      window.lightdm?.[methodName]?.();
    });
  }
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && state.selectedUsername) {
      event.preventDefault();
      cancelAuthentication();
      showUserList();
      return;
    }

    if (event.code !== "Enter") return;
    if (event.target === $("#password_entry")) return;

    event.preventDefault();

    if (state.selectedUsername && state.promptVisible) {
      submitPassword();
      return;
    }

    const firstUser = window.lightdm?.users?.[0]?.username;
    if (firstUser) {
      selectUserByUsername(firstUser);
    }
  });
}

function initializeUsers() {
  const template = $("#user_template");
  const parent = template?.parentElement;

  if (!window.lightdm?.users || !template || !parent) return;

  state.userCards.clear();
  state.usersByUsername.clear();
  parent.removeChild(template);

  for (const user of window.lightdm.users) {
    const userNode = template.cloneNode(true);
    const image = userNode.querySelector(".user_image");
    const name = userNode.querySelector(".user_name");

    userNode.removeAttribute("id");
    userNode.dataset.username = user.username;

    if (name) {
      name.textContent = user.display_name || user.username;
    }
    if (image) {
      image.src = user.image || "resources/img/avatar.svg";
      image.addEventListener("error", onImageError);
    }

    userNode.addEventListener("click", handleUserClick);
    parent.appendChild(userNode);
    state.userCards.set(user.username, userNode);
    state.usersByUsername.set(user.username, user);
  }

  showUserList();
}

function initGreeter() {
  if (state.initialized || !window.lightdm) return;

  state.initialized = true;

  window.lightdm.show_prompt.connect(showPrompt);
  window.lightdm.show_message.connect(showMessage);
  window.lightdm.authentication_complete.connect(
    handleAuthenticationComplete
  );

  bindPasswordForm();
  bindPowerButtons();
  bindKeyboardShortcuts();
  initializeUsers();
  initializeClock();
}

window.addEventListener("GreeterReady", initGreeter);
