(function () {
  if (window.lightdm !== undefined) {
    return;
  }

  class Signal {
    constructor(name) {
      this.name = name;
      this.callbacks = [];
    }

    connect(callback) {
      if (typeof callback !== "function") return;
      this.callbacks.push(callback);
    }

    disconnect(callback) {
      this.callbacks = this.callbacks.filter((item) => item !== callback);
    }

    emit(...args) {
      for (const callback of this.callbacks) {
        callback(...args);
      }
    }
  }

  function emitLater(signal, ...args) {
    window.setTimeout(() => signal.emit(...args), 0);
  }

  function getUser(username) {
    return window.lightdm.users.find((user) => user.username === username) || null;
  }

  function finishAuthentication(success, message) {
    window.lightdm.is_authenticated = success;
    window.lightdm.in_authentication = false;

    if (!success) {
      emitLater(window.lightdm.show_message, message || "Authentication failed", 1);
    } else {
      emitLater(window.lightdm.show_message, "", 0);
    }

    emitLater(window.lightdm.authentication_complete);
  }

  window.lightdm = {
    hostname: "mock-host",
    languages: [
      { code: "en_US", name: "English (US)", territory: "USA" },
      { code: "en_GB", name: "English (UK)", territory: "UK" },
    ],
    layouts: [
      {
        name: "us",
        description: "English (US)",
        short_description: "en",
      },
    ],
    layout: {
      name: "us",
      description: "English (US)",
      short_description: "en",
    },
    sessions: [
      { key: "lxqt", name: "LXQt", comment: "LXQt desktop" },
      { key: "openbox", name: "Openbox", comment: "Openbox session" },
    ],
    default_session: "lxqt",
    authentication_user: "",
    autologin_guest: false,
    autologin_timeout: 0,
    autologin_user: "",
    can_hibernate: true,
    can_restart: true,
    can_shutdown: true,
    can_suspend: true,
    default_language: null,
    has_guest_account: false,
    hide_users_hint: false,
    in_authentication: false,
    is_authenticated: false,
    lock_hint: false,
    select_guest_hint: false,
    select_user_hint: "",
    show_manual_login_hint: true,
    show_remote_login_hint: false,
    users: [
      {
        username: "clarkk",
        display_name: "Clark Kent",
        image: "",
        language: "en_US",
        layout: "us",
        layouts: ["us"],
        session: "lxqt",
        logged_in: false,
        home_directory: "/home/clarkk",
      },
      {
        username: "brucew",
        display_name: "Bruce Wayne",
        image: "/home/broken-image.png",
        language: "en_US",
        layout: "us",
        layouts: ["us"],
        session: "openbox",
        logged_in: false,
        home_directory: "/home/brucew",
      },
      {
        username: "peterp",
        display_name: "Peter Parker",
        image: "",
        language: "en_US",
        layout: "us",
        layouts: ["us"],
        session: "",
        logged_in: true,
        home_directory: "/home/peterp",
      },
    ],
    show_prompt: new Signal("show_prompt"),
    show_message: new Signal("show_message"),
    authentication_complete: new Signal("authentication_complete"),
    autologin_timer_expired: new Signal("autologin_timer_expired"),
    mock_password: "password",

    authenticate(username) {
      this.is_authenticated = false;
      this.in_authentication = true;
      this.authentication_user = username || "";

      if (!username) {
        emitLater(this.show_prompt, "login:", 0);
      } else {
        emitLater(this.show_prompt, "Password: ", 1);
      }
      return true;
    },

    authenticate_as_guest() {
      return false;
    },

    cancel_authentication() {
      this.authentication_user = "";
      this.in_authentication = false;
      return true;
    },

    cancel_autologin() {
      return true;
    },

    respond(response) {
      if (!this.in_authentication) return false;

      if (!this.authentication_user) {
        const user = getUser(response);

        if (!user) {
          emitLater(this.show_message, `${response} is an invalid user`, 1);
          emitLater(this.show_prompt, "login:", 0);
          return false;
        }

        this.authentication_user = user.username;
        emitLater(this.show_prompt, "Password: ", 1);
        return true;
      }

      if (!getUser(this.authentication_user)) {
        finishAuthentication(false, `${this.authentication_user} is an invalid user`);
        return false;
      }

      finishAuthentication(response === this.mock_password);
      return true;
    },

    start_session(session) {
      const resolved = session || this.default_session;
      console.log("Mock session started:", resolved);
      return true;
    },

    suspend() {
      console.log("Suspend requested");
      return true;
    },

    hibernate() {
      console.log("Hibernate requested");
      return true;
    },

    restart() {
      console.log("Restart requested");
      return true;
    },

    shutdown() {
      console.log("Shutdown requested");
      return true;
    },
  };

  window.greeter_config = {
    branding: {
      background_images_dir: "/usr/share/backgrounds",
      logo: "",
      user_image: "",
    },
    greeter: {
      debug_mode: true,
      detect_theme_errors: true,
      secure_mode: true,
      theme: "aqua",
      time_language: "",
    },
  };

  if (window.theme_utils === undefined) {
    window.theme_utils = {
      get_current_localized_time() {
        return new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    };
  }

  window._ready_event = new Event("GreeterReady");

  function dispatchReady() {
    window.dispatchEvent(window._ready_event);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", dispatchReady, { once: true });
  } else {
    window.setTimeout(dispatchReady, 0);
  }
})();
