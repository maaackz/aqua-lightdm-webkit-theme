/*
 * greeter.js - Migrated for web-greeter
 */

let selected_user = null;

function show_prompt(text) {
  const password_container = document.querySelector("#password_container");
  const password_entry = document.querySelector("#password_entry");
  const background = document.querySelector("#background");
  if (!isVisiblePass(password_container)) {
    const users = document.querySelectorAll(".user");
    const user_node = document.querySelector("#" + selected_user);
    const rect = user_node.getClientRects()[0];
    const parentRect = user_node.parentElement.getClientRects()[0];
    const center = parentRect.width / 2;

    let left = center - rect.width / 2 - rect.left;

    if (left < 5 && left > -5) {
      left = 0;
    }

    for (let user of users) {
      setVisible(user, user.id === selected_user);
      user.style.left = left;
    }

    setVisiblePass(password_container, true);
    password_entry.placeholder = text.replace(":", "");

    const back = document.querySelector("#back");
    const enter = document.querySelector("#enter");

    back.onclick = show_users;
    setVisible(back, true);

    enter.onclick = provide_secret;
    setVisible(enter, true);
  }

  background.classList.add("blurred");
  password_entry.value = "";
  password_entry.focus();
}

function show_message(text) {
  const message = document.querySelector("#message_content");

  message.innerHTML = text;

  if (text) {
    document.querySelector("#message").classList.remove("hidden");
  } else {
    document.querySelector("#message").classList.add("hidden");
  }

  message.classList.remove("error");
}

function show_error(text) {
  show_message(text);
  const message = document.querySelector("#message_content");

  message.classList.add("error");
}

function onAuthenticationComplete() {
  if (window.lightdm?.is_authenticated) {
    const session = window.lightdm.default_session;
    window.lightdm.start_session(session);
  } else {
    const password_container = document.querySelector("#password_container");

    password_container.classList.add("apply_shake");
    password_container.addEventListener("animationend", err => {
      password_container.classList.remove("apply_shake");
    });
    start_authentication(selected_user);
  }
}

function timed_login(user) {
  window.lightdm?.start_session(window.lightdm.timed_login_user);
}

function start_authentication(username) {
  if (!window.lightdm) return;
  
  window.lightdm.cancel_authentication();
  selected_user = username;
  window.lightdm.authenticate(username);
}

function provide_secret() {
  const entry = document.querySelector("#password_entry");
  window.lightdm?.respond(entry.value);
}

function show_users() {
  const users = document.querySelectorAll(".user");
  const background = document.querySelector("#background");
  for (let user of users) {
    setVisible(user, true);
    user.style.left = 0;
  }
  setVisible(document.querySelector("#back"), false);
  setVisible(document.querySelector("#enter"), false);
  setVisiblePass(document.querySelector("#password_container"), false);
  selected_user = null;
  background.classList.remove("blurred");
}

function user_clicked(event) {
  if (selected_user !== null) {
    selected_user = null;
    window.lightdm?.cancel_authentication();
    show_users();
  } else {
    selected_user = event.currentTarget.id;
    start_authentication(event.currentTarget.id);
  }

  show_message("");
  event.stopPropagation();

  return false;
}

function setVisible(element, visible) {
  if (visible) {
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

function setVisiblePass(element, visible) {
  if (visible) {
    element.classList.remove("passhidden");
  } else {
    element.classList.add("passhidden");
  }
}

function isVisible(element) {
  return !element.classList.contains("hidden");
}

function isVisiblePass(element) {
  return !element.classList.contains("passhidden");
}

function on_image_error(err) {
  err.currentTarget.src = "resources/img/avatar.svg";
}

function key_press_handler(event) {
  let action = null;
  switch (event.code) {
    case "Enter":
      action =
        selected_user != null
          ? provide_secret
          : start_authentication(window.lightdm?.users[0]?.name);

      event.preventDefault();
      event.stopPropagation();
      break;
    case "Escape":
      action = show_users;
      break;
  }
  if (action instanceof Function) {
    action();
  }
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initializeClock() {
  const time = document.querySelector("#time");

  time.innerHTML = getCurrentTime();
  setInterval(
    () => (time.innerHTML = getCurrentTime()),
    60000
  );
}

function initializeUsers() {
  if (!window.lightdm?.users) return;
  
  const template = document.querySelector("#user_template");
  const parent = template.parentElement;

  parent.removeChild(template);

  for (const user of window.lightdm.users) {
    const userNode = template.cloneNode(true);
    const image = userNode.querySelectorAll(".user_image")[0];
    const name = userNode.querySelectorAll(".user_name")[0];

    name.innerHTML = user.display_name;

    if (user.image) {
      image.src = user.image;
      image.onerror = on_image_error;
    } else {
      image.src = "resources/img/avatar.svg";
    }

    userNode.id = user.name;
    userNode.onclick = user_clicked;
    parent.appendChild(userNode);
  }
  setTimeout(show_users, 400);
}

function initGreeter() {
  window.lightdm?.authentication_complete.connect(onAuthenticationComplete);
  initializeUsers();
  initializeClock();
  document.addEventListener("keydown", key_press_handler);
}

window.addEventListener("GreeterReady", initGreeter);
