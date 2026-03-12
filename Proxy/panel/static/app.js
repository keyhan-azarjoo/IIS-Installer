/* ─── Internationalization ───────────────────────────────────────────────── */

const translations = {
    en: {
        // Nav
        nav_overview: "Overview",
        nav_users: "Users",
        nav_bandwidth: "Bandwidth",
        nav_connections: "Connections",
        nav_service: "Service",
        logout: "Logout",

        // Overview
        overview_title: "System Overview",
        server_ip: "Server IP",
        uptime: "Uptime",
        layer: "Layer",
        os_label: "OS",
        cpu_usage: "CPU Usage",
        memory_usage: "Memory",
        disk_usage: "Disk",
        service_status: "Service Status",

        // Users
        users_title: "User Management",
        add_user: "Add User",
        total_users: "Total users",
        th_username: "Username",
        th_type: "Type",
        th_status: "Status",
        th_created: "Created",
        th_password: "Password",
        th_usage: "Usage",
        th_actions: "Actions",
        no_users: "No users found. Add your first user.",
        connected: "Connected",
        offline: "Offline",
        config: "Config",
        delete: "Delete",
        show_password: "Show password",
        hide_password: "Hide password",
        change_password: "Change Password",
        new_password: "New Password",
        update_password: "Update Password",
        password_updated: "Password updated successfully",
        add_new_user: "Add New User",
        username: "Username",
        password: "Password",
        username_hint: "Alphanumeric, dash, underscore. 3-32 characters.",
        password_hint: "Minimum 8 characters.",
        cancel: "Cancel",
        adding_user: "Adding...",
        user_added: "User added successfully",
        user_deleted: "User deleted successfully",

        // Delete
        confirm_delete: "Confirm Delete",
        delete_confirm_text: "Are you sure you want to delete user",
        deleting: "Deleting...",

        // Config
        connection_config: "Connection Config",
        quick_connect: "Quick Connect URI",
        client_config: "Client Configuration",
        copy: "Copy",
        copy_config: "Copy Config",
        copied: "Copied!",
        close: "Close",

        // Bandwidth
        bandwidth_title: "Bandwidth Usage",
        system_bandwidth: "System Bandwidth",
        today: "Today",
        today_usage: "Today",
        this_week: "This Week",
        this_month: "This Month",
        all_time: "All Time",
        per_user_bandwidth: "Per-User Bandwidth",
        upload: "Upload (Total)",
        download: "Download (Total)",
        upload_label: "Upload",
        download_label: "Download",
        total_label: "Total",
        auto_refresh_note: "Auto refresh every 10s",
        auto_refresh_note_5s: "Auto refresh every 5s",

        // Connections
        connections_title: "Active Connections",
        refresh: "Refresh",
        th_remote: "Remote Address",
        th_local: "Local Port",
        th_state: "State",
        th_process: "Process",
        active_connections: "Active connections",

        // Service
        service_title: "Service Control",
        restart_service: "Restart Service",
        restarting: "Restarting...",
        service_restarted: "Service restarted successfully",
        service_logs: "Service Logs",
        load_logs: "Load Logs",
        click_load_logs: "Click \"Load Logs\" to view service logs...",

        // Settings / Layer Switching
        nav_settings: "Settings",
        settings_title: "Settings",
        layer_switching: "Layer Switching",
        layer_switching_desc: "Switch between proxy layers. This will uninstall the current layer and install the selected one.",
        current_layer: "Current Layer",
        activate: "Activate",
        confirm_switch: "Confirm Layer Switch",
        switch_warning_text: "This will uninstall the current proxy layer and install a new one. All existing users will be preserved but the service will be interrupted during the switch.",
        current_layer_label: "Current:",
        new_layer_label: "New:",
        domain_label: "Domain (FQDN)",
        email_label: "Email (for Let's Encrypt)",
        duckdns_token_label: "DuckDNS Token (optional)",
        domain_hint: "Your domain must point to this server's IP",
        duckdns_hint: "Only needed for .duckdns.org domains",
        activate_layer: "Activate Layer",
        switching_layer: "Switching Layer...",
        switch_complete: "Layer switch complete!",
        switch_back_settings: "Back to Settings",
        switch_phase_uninstalling: "Uninstalling",
        switch_phase_installing: "Installing",
        switch_phase_reinstalling_panel: "Reinstalling panel",
        switch_phase_finalizing: "Finalizing",
        switch_phase_done: "Complete",
        switch_phase_error: "Error",
        switch_phase_starting: "Starting",
        layer_needs_domain: "Requires domain + email",
    },
    fa: {
        nav_overview: "\u0646\u0645\u0627\u06cc \u06a9\u0644\u06cc",
        nav_users: "\u06a9\u0627\u0631\u0628\u0631\u0627\u0646",
        nav_bandwidth: "\u067e\u0647\u0646\u0627\u06cc \u0628\u0627\u0646\u062f",
        nav_connections: "\u0627\u062a\u0635\u0627\u0644\u0627\u062a",
        nav_service: "\u0633\u0631\u0648\u06cc\u0633",
        logout: "\u062e\u0631\u0648\u062c",

        overview_title: "\u0646\u0645\u0627\u06cc \u06a9\u0644\u06cc \u0633\u06cc\u0633\u062a\u0645",
        server_ip: "\u0622\u06cc\u067e\u06cc \u0633\u0631\u0648\u0631",
        uptime: "\u0632\u0645\u0627\u0646 \u0641\u0639\u0627\u0644\u06cc\u062a",
        layer: "\u0644\u0627\u06cc\u0647",
        os_label: "\u0633\u06cc\u0633\u062a\u0645 \u0639\u0627\u0645\u0644",
        cpu_usage: "\u0645\u0635\u0631\u0641 CPU",
        memory_usage: "\u062d\u0627\u0641\u0638\u0647",
        disk_usage: "\u062f\u06cc\u0633\u06a9",
        service_status: "\u0648\u0636\u0639\u06cc\u062a \u0633\u0631\u0648\u06cc\u0633\u200c\u0647\u0627",

        users_title: "\u0645\u062f\u06cc\u0631\u06cc\u062a \u06a9\u0627\u0631\u0628\u0631\u0627\u0646",
        add_user: "\u0627\u0641\u0632\u0648\u062f\u0646 \u06a9\u0627\u0631\u0628\u0631",
        total_users: "\u062a\u0639\u062f\u0627\u062f \u06a9\u0627\u0631\u0628\u0631\u0627\u0646",
        th_username: "\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc",
        th_type: "\u0646\u0648\u0639",
        th_status: "\u0648\u0636\u0639\u06cc\u062a",
        th_created: "\u062a\u0627\u0631\u06cc\u062e \u0633\u0627\u062e\u062a",
        th_password: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        th_usage: "\u0645\u0635\u0631\u0641",
        th_actions: "\u0639\u0645\u0644\u06cc\u0627\u062a",
        no_users: "\u06a9\u0627\u0631\u0628\u0631\u06cc \u06cc\u0627\u0641\u062a \u0646\u0634\u062f. \u0627\u0648\u0644\u06cc\u0646 \u06a9\u0627\u0631\u0628\u0631 \u0631\u0627 \u0627\u0636\u0627\u0641\u0647 \u06a9\u0646\u06cc\u062f.",
        connected: "\u0645\u062a\u0635\u0644",
        offline: "\u0622\u0641\u0644\u0627\u06cc\u0646",
        config: "\u067e\u06cc\u06a9\u0631\u0628\u0646\u062f\u06cc",
        delete: "\u062d\u0630\u0641",
        show_password: "\u0646\u0645\u0627\u06cc\u0634 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        hide_password: "\u067e\u0646\u0647\u0627\u0646 \u06a9\u0631\u062f\u0646 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        change_password: "\u062a\u063a\u06cc\u06cc\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        new_password: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062c\u062f\u06cc\u062f",
        update_password: "\u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        password_updated: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0628\u0647\u200c\u0631\u0648\u0632 \u0634\u062f",
        add_new_user: "\u0627\u0641\u0632\u0648\u062f\u0646 \u06a9\u0627\u0631\u0628\u0631 \u062c\u062f\u06cc\u062f",
        username: "\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc",
        password: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        username_hint: "\u062d\u0631\u0648\u0641 \u0627\u0646\u06af\u0644\u06cc\u0633\u06cc\u060c \u0639\u062f\u062f\u060c \u062e\u0637 \u062a\u06cc\u0631\u0647\u060c \u0632\u06cc\u0631\u062e\u0637. \u06f3 \u062a\u0627 \u06f3\u06f2 \u06a9\u0627\u0631\u0627\u06a9\u062a\u0631.",
        password_hint: "\u062d\u062f\u0627\u0642\u0644 \u06f8 \u06a9\u0627\u0631\u0627\u06a9\u062a\u0631.",
        cancel: "\u0627\u0646\u0635\u0631\u0627\u0641",
        adding_user: "\u062f\u0631 \u062d\u0627\u0644 \u0627\u0641\u0632\u0648\u062f\u0646...",
        user_added: "\u06a9\u0627\u0631\u0628\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0627\u0636\u0627\u0641\u0647 \u0634\u062f",
        user_deleted: "\u06a9\u0627\u0631\u0628\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u062d\u0630\u0641 \u0634\u062f",

        confirm_delete: "\u062a\u0627\u06cc\u06cc\u062f \u062d\u0630\u0641",
        delete_confirm_text: "\u0622\u06cc\u0627 \u0627\u0632 \u062d\u0630\u0641 \u06a9\u0627\u0631\u0628\u0631 \u0627\u0637\u0645\u06cc\u0646\u0627\u0646 \u062f\u0627\u0631\u06cc\u062f\u061f",
        deleting: "\u062f\u0631 \u062d\u0627\u0644 \u062d\u0630\u0641...",

        connection_config: "\u067e\u06cc\u06a9\u0631\u0628\u0646\u062f\u06cc \u0627\u062a\u0635\u0627\u0644",
        quick_connect: "\u0644\u06cc\u0646\u06a9 \u0627\u062a\u0635\u0627\u0644 \u0633\u0631\u06cc\u0639",
        client_config: "\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u06a9\u0644\u0627\u06cc\u0646\u062a",
        copy: "\u06a9\u067e\u06cc",
        copy_config: "\u06a9\u067e\u06cc \u062a\u0646\u0638\u06cc\u0645\u0627\u062a",
        copied: "\u06a9\u067e\u06cc \u0634\u062f!",
        close: "\u0628\u0633\u062a\u0646",

        bandwidth_title: "\u0645\u0635\u0631\u0641 \u067e\u0647\u0646\u0627\u06cc \u0628\u0627\u0646\u062f",
        system_bandwidth: "\u067e\u0647\u0646\u0627\u06cc \u0628\u0627\u0646\u062f \u0633\u06cc\u0633\u062a\u0645",
        today: "\u0627\u0645\u0631\u0648\u0632",
        today_usage: "\u0627\u0645\u0631\u0648\u0632",
        this_week: "\u0627\u06cc\u0646 \u0647\u0641\u062a\u0647",
        this_month: "\u0627\u06cc\u0646 \u0645\u0627\u0647",
        all_time: "\u06a9\u0644",
        per_user_bandwidth: "\u067e\u0647\u0646\u0627\u06cc \u0628\u0627\u0646\u062f \u0647\u0631 \u06a9\u0627\u0631\u0628\u0631",
        upload: "\u0622\u067e\u0644\u0648\u062f (\u06a9\u0644)",
        download: "\u062f\u0627\u0646\u0644\u0648\u062f (\u06a9\u0644)",
        upload_label: "\u0622\u067e\u0644\u0648\u062f",
        download_label: "\u062f\u0627\u0646\u0644\u0648\u062f",
        total_label: "\u06a9\u0644",
        auto_refresh_note: "\u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u062e\u0648\u062f\u06a9\u0627\u0631 \u0647\u0631 \u06f1\u06f0 \u062b\u0627\u0646\u06cc\u0647",
        auto_refresh_note_5s: "\u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u062e\u0648\u062f\u06a9\u0627\u0631 \u0647\u0631 \u06f5 \u062b\u0627\u0646\u06cc\u0647",

        connections_title: "\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0641\u0639\u0627\u0644",
        refresh: "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc",
        th_remote: "\u0622\u062f\u0631\u0633 \u0631\u0627\u0647 \u062f\u0648\u0631",
        th_local: "\u067e\u0648\u0631\u062a \u0645\u062d\u0644\u06cc",
        th_state: "\u0648\u0636\u0639\u06cc\u062a",
        th_process: "\u0641\u0631\u0622\u06cc\u0646\u062f",
        active_connections: "\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0641\u0639\u0627\u0644",

        service_title: "\u06a9\u0646\u062a\u0631\u0644 \u0633\u0631\u0648\u06cc\u0633",
        restart_service: "\u0631\u0627\u0647\u200c\u0627\u0646\u062f\u0627\u0632\u06cc \u0645\u062c\u062f\u062f",
        restarting: "\u062f\u0631 \u062d\u0627\u0644 \u0631\u0627\u0647\u200c\u0627\u0646\u062f\u0627\u0632\u06cc...",
        service_restarted: "\u0633\u0631\u0648\u06cc\u0633 \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0631\u0627\u0647\u200c\u0627\u0646\u062f\u0627\u0632\u06cc \u0634\u062f",
        service_logs: "\u0644\u0627\u06af\u200c\u0647\u0627\u06cc \u0633\u0631\u0648\u06cc\u0633",
        load_logs: "\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0644\u0627\u06af",
        click_load_logs: "\u0628\u0631\u0627\u06cc \u0645\u0634\u0627\u0647\u062f\u0647 \u0644\u0627\u06af\u200c\u0647\u0627 \u0631\u0648\u06cc \"\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0644\u0627\u06af\" \u06a9\u0644\u06cc\u06a9 \u06a9\u0646\u06cc\u062f...",

        // Settings / Layer Switching
        nav_settings: "\u062a\u0646\u0638\u06cc\u0645\u0627\u062a",
        settings_title: "\u062a\u0646\u0638\u06cc\u0645\u0627\u062a",
        layer_switching: "\u062a\u063a\u06cc\u06cc\u0631 \u0644\u0627\u06cc\u0647",
        layer_switching_desc: "\u0628\u06cc\u0646 \u0644\u0627\u06cc\u0647\u200c\u0647\u0627\u06cc \u067e\u0631\u0648\u06a9\u0633\u06cc \u062c\u0627\u0628\u062c\u0627 \u0634\u0648\u06cc\u062f. \u0627\u06cc\u0646 \u06a9\u0627\u0631 \u0644\u0627\u06cc\u0647 \u0641\u0639\u0644\u06cc \u0631\u0627 \u062d\u0630\u0641 \u0648 \u0644\u0627\u06cc\u0647 \u062c\u062f\u06cc\u062f \u0631\u0627 \u0646\u0635\u0628 \u0645\u06cc\u200c\u06a9\u0646\u062f.",
        current_layer: "\u0644\u0627\u06cc\u0647 \u0641\u0639\u0644\u06cc",
        activate: "\u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc",
        confirm_switch: "\u062a\u0627\u06cc\u06cc\u062f \u062a\u063a\u06cc\u06cc\u0631 \u0644\u0627\u06cc\u0647",
        switch_warning_text: "\u0627\u06cc\u0646 \u06a9\u0627\u0631 \u0644\u0627\u06cc\u0647 \u0641\u0639\u0644\u06cc \u0631\u0627 \u062d\u0630\u0641 \u0648 \u0644\u0627\u06cc\u0647 \u062c\u062f\u06cc\u062f \u0631\u0627 \u0646\u0635\u0628 \u0645\u06cc\u200c\u06a9\u0646\u062f. \u06a9\u0627\u0631\u0628\u0631\u0627\u0646 \u062d\u0641\u0638 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0627\u0645\u0627 \u0633\u0631\u0648\u06cc\u0633 \u0645\u0648\u0642\u062a\u0627 \u0642\u0637\u0639 \u0645\u06cc\u200c\u0634\u0648\u062f.",
        current_layer_label: "\u0641\u0639\u0644\u06cc:",
        new_layer_label: "\u062c\u062f\u06cc\u062f:",
        domain_label: "\u062f\u0627\u0645\u0646\u0647 (FQDN)",
        email_label: "\u0627\u06cc\u0645\u06cc\u0644 (Let's Encrypt)",
        duckdns_token_label: "\u062a\u0648\u06a9\u0646 DuckDNS (\u0627\u062e\u062a\u06cc\u0627\u0631\u06cc)",
        domain_hint: "\u062f\u0627\u0645\u0646\u0647 \u0628\u0627\u06cc\u062f \u0628\u0647 \u0622\u06cc\u067e\u06cc \u0627\u06cc\u0646 \u0633\u0631\u0648\u0631 \u0627\u0634\u0627\u0631\u0647 \u06a9\u0646\u062f",
        duckdns_hint: "\u0641\u0642\u0637 \u0628\u0631\u0627\u06cc \u062f\u0627\u0645\u0646\u0647\u200c\u0647\u0627\u06cc .duckdns.org",
        activate_layer: "\u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc \u0644\u0627\u06cc\u0647",
        switching_layer: "\u062f\u0631 \u062d\u0627\u0644 \u062a\u063a\u06cc\u06cc\u0631 \u0644\u0627\u06cc\u0647...",
        switch_complete: "\u062a\u063a\u06cc\u06cc\u0631 \u0644\u0627\u06cc\u0647 \u06a9\u0627\u0645\u0644 \u0634\u062f!",
        switch_back_settings: "\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a",
        switch_phase_uninstalling: "\u062d\u0630\u0641 \u0644\u0627\u06cc\u0647 \u0641\u0639\u0644\u06cc",
        switch_phase_installing: "\u0646\u0635\u0628 \u0644\u0627\u06cc\u0647 \u062c\u062f\u06cc\u062f",
        switch_phase_reinstalling_panel: "\u0646\u0635\u0628 \u0645\u062c\u062f\u062f \u067e\u0646\u0644",
        switch_phase_finalizing: "\u0646\u0647\u0627\u06cc\u06cc\u200c\u0633\u0627\u0632\u06cc",
        switch_phase_done: "\u06a9\u0627\u0645\u0644 \u0634\u062f",
        switch_phase_error: "\u062e\u0637\u0627",
        switch_phase_starting: "\u0634\u0631\u0648\u0639",
        layer_needs_domain: "\u0646\u06cc\u0627\u0632 \u0628\u0647 \u062f\u0627\u0645\u0646\u0647 + \u0627\u06cc\u0645\u06cc\u0644",
    }
};

let currentLang = localStorage.getItem("lang") || "en";
let currentLayerIsV2Ray = false;
let pendingDeleteUser = null;
let pendingPasswordUser = null;
let currentBandwidthPeriod = "today";
let bandwidthData = null;
let bandwidthLoading = false;
let bandwidthRefreshInterval = null;
const BANDWIDTH_REFRESH_MS = 10000;
let layersData = null;
let switchPollInterval = null;
let pendingSwitchLayer = null;
let sectionRefreshInterval = null;
const SECTION_REFRESH_MS = {
    overview: 20000,
    users: 5000,
    bandwidth: 10000,
    connections: 5000,
    settings: 30000
};

/* ─── Language ──────────────────────────────────────────────────────────── */

function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
}

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

    const langToggle = document.getElementById("langToggle");
    if (langToggle) langToggle.textContent = lang === "en" ? "\u0641\u0627\u0631\u0633\u06cc" : "English";

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

function toggleLang() {
    applyLang(currentLang === "en" ? "fa" : "en");
}

/* ─── Navigation ────────────────────────────────────────────────────────── */

function showSection(name, navEl) {
    // Hide all sections
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item[data-section]").forEach(n => n.classList.remove("active"));

    // Show selected
    const section = document.getElementById("section-" + name);
    if (section) section.classList.add("active");
    if (navEl) navEl.classList.add("active");

    // Close mobile sidebar
    document.getElementById("sidebar").classList.remove("open");

    // Load data for section
    stopBandwidthAutoRefresh();
    stopSectionAutoRefresh();

    if (name === "overview") loadOverview();
    else if (name === "users") loadUsers();
    else if (name === "bandwidth") loadBandwidth();
    else if (name === "connections") loadConnections();
    else if (name === "settings") loadLayers();

    startSectionAutoRefresh(name);
}

/* ─── API Helper ────────────────────────────────────────────────────────── */

async function api(path, options = {}) {
    const defaults = {
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        }
    };
    const resp = await fetch(path, { ...defaults, ...options });
    if (resp.status === 401) {
        window.location.href = "/login";
        return null;
    }
    return resp;
}

/* ─── Overview ──────────────────────────────────────────────────────────── */

async function loadOverview() {
    try {
        const [infoResp, statusResp] = await Promise.all([
            api("/api/system/info"),
            api("/api/system/status")
        ]);

        if (infoResp) {
            const info = await infoResp.json();
            document.getElementById("stat-ip").textContent = info.ip || "-";
            document.getElementById("stat-uptime").textContent = info.uptime || "-";
            document.getElementById("stat-layer").textContent = info.layer || "-";
            document.getElementById("stat-os").textContent = info.os || "-";

            // CPU
            const cpuPct = info.cpu_usage || 0;
            document.getElementById("stat-cpu").textContent = cpuPct + "%";
            const cpuBar = document.getElementById("cpu-bar");
            cpuBar.style.width = cpuPct + "%";
            cpuBar.className = "progress-fill" + (cpuPct > 80 ? " danger" : cpuPct > 60 ? " warn" : "");

            // Memory
            const mem = info.memory || {};
            const memPct = mem.percent || 0;
            document.getElementById("stat-mem").textContent = `${mem.used || 0} / ${mem.total || 0} GB (${memPct}%)`;
            const memBar = document.getElementById("mem-bar");
            memBar.style.width = memPct + "%";
            memBar.className = "progress-fill" + (memPct > 80 ? " danger" : memPct > 60 ? " warn" : "");

            // Disk
            const disk = info.disk || {};
            const diskPct = disk.percent || 0;
            document.getElementById("stat-disk").textContent = `${disk.used || 0} / ${disk.total || 0} GB (${diskPct}%)`;
            const diskBar = document.getElementById("disk-bar");
            diskBar.style.width = diskPct + "%";
            diskBar.className = "progress-fill" + (diskPct > 80 ? " danger" : diskPct > 60 ? " warn" : "");

            // Track layer type
            currentLayerIsV2Ray = (info.layer || "").startsWith("layer7");
        }

        if (statusResp) {
            const status = await statusResp.json();
            const container = document.getElementById("service-status-list");
            container.innerHTML = "";
            for (const [svc, st] of Object.entries(status)) {
                const dotClass = st === "active" ? "active" : st === "inactive" ? "inactive" : "unknown";
                container.innerHTML += `
                    <div class="service-badge">
                        <span class="service-dot ${dotClass}"></span>
                        <span>${svc}: ${st}</span>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Failed to load overview:", err);
    }
}

/* ─── Users ─────────────────────────────────────────────────────────────── */

async function loadUsers() {
    try {
        const [resp, bandwidthResp] = await Promise.all([
            api("/api/users"),
            api("/api/bandwidth/users").catch(() => null)
        ]);
        if (!resp) return;
        const users = await resp.json();
        const usageMap = bandwidthResp ? await bandwidthResp.json() : {};
        const tbody = document.getElementById("users-tbody");
        const noUsers = document.getElementById("no-users");
        const countEl = document.getElementById("user-count");

        countEl.textContent = users.length;

        if (users.length === 0) {
            tbody.innerHTML = "";
            noUsers.style.display = "block";
            document.querySelector(".table-container")?.style && (document.querySelector("#section-users .table-container").style.display = "none");
            return;
        }

        noUsers.style.display = "none";
        const tableContainer = document.querySelector("#section-users .table-container");
        if (tableContainer) tableContainer.style.display = "";

        tbody.innerHTML = users.map(u => {
            const statusClass = u.connected ? "connected" : "offline";
            const statusText = u.connected ? t("connected") : t("offline");
            const usage = usageMap?.[u.username] || {};
            const usageTotal = Number(u.usage_total || ((usage.uplink || 0) + (usage.downlink || 0)));
            const hasPassword = u.type === "ssh" && u.password;
            const passwordValue = hasPassword ? String(u.password) : "";
            const passwordAttr = hasPassword ? escapeHtml(passwordValue) : "";
            const maskedPassword = hasPassword ? maskPassword(passwordValue) : "-";
            const passwordCell = u.type === "ssh"
                ? `<div class="password-cell">
                        <span class="password-text" data-password="${passwordAttr}" data-visible="false">${escapeHtml(maskedPassword)}</span>
                        <button class="icon-btn" type="button" onclick="togglePasswordVisibility(this)" ${hasPassword ? "" : "disabled"} title="${t("show_password")}" aria-label="${t("show_password")}">
                            ${eyeIcon(false)}
                        </button>
                   </div>`
                : "-";
            const configBtn = u.type === "v2ray"
                ? `<button class="btn btn-sm btn-secondary" onclick="showConfig('${u.username}')">${t("config")}</button>`
                : "";
            const changePwBtn = u.type === "ssh"
                ? `<button class="btn btn-sm btn-secondary" onclick="showChangePasswordModal('${u.username}')">${t("change_password")}</button>`
                : "";

            return `<tr>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${u.type || "ssh"}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${u.created || "-"}</td>
                <td>${passwordCell}</td>
                <td>${formatBytes(usageTotal)}</td>
                <td>
                    <div class="user-actions">
                        ${configBtn}
                        ${changePwBtn}
                        <button class="btn btn-sm btn-danger" onclick="showDeleteModal('${escapeHtml(u.username)}')">${t("delete")}</button>
                    </div>
                </td>
            </tr>`;
        }).join("");
    } catch (err) {
        console.error("Failed to load users:", err);
    }
}

function showAddUserModal() {
    document.getElementById("addUserModal").style.display = "flex";
    document.getElementById("addUserError").style.display = "none";
    document.getElementById("addUserForm").reset();
    resetAddUserPasswordToggle();

    // Show/hide password field based on layer type
    const pwGroup = document.getElementById("passwordGroup");
    if (currentLayerIsV2Ray) {
        pwGroup.style.display = "none";
        document.getElementById("newPassword").required = false;
    } else {
        pwGroup.style.display = "block";
        document.getElementById("newPassword").required = true;
    }

    document.getElementById("newUsername").focus();
}

function toggleAddUserPassword() {
    const input = document.getElementById("newPassword");
    if (!input) return;
    const btn = input.parentElement?.querySelector(".icon-btn");
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    if (btn) {
        btn.innerHTML = eyeIcon(!isVisible);
        const label = isVisible ? t("show_password") : t("hide_password");
        btn.setAttribute("title", label);
        btn.setAttribute("aria-label", label);
    }
}

function resetAddUserPasswordToggle() {
    const input = document.getElementById("newPassword");
    if (!input) return;
    input.type = "password";
    const btn = input.parentElement?.querySelector(".icon-btn");
    if (btn) {
        btn.innerHTML = eyeIcon(false);
        btn.setAttribute("title", t("show_password"));
        btn.setAttribute("aria-label", t("show_password"));
    }
}

function showChangePasswordModal(username) {
    if (currentLayerIsV2Ray) return;
    pendingPasswordUser = username;
    document.getElementById("changePasswordUsername").value = username;
    document.getElementById("changePasswordInput").value = "";
    document.getElementById("changePasswordError").style.display = "none";
    document.getElementById("changePasswordModal").style.display = "flex";
    document.getElementById("changePasswordInput").focus();
}

async function handleAddUser(e) {
    e.preventDefault();
    const btn = document.getElementById("addUserBtn");
    const errorDiv = document.getElementById("addUserError");
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;

    btn.disabled = true;
    btn.querySelector("span").textContent = t("adding_user");
    errorDiv.style.display = "none";

    try {
        const body = { username };
        if (!currentLayerIsV2Ray && password) {
            body.password = password;
        }

        const resp = await api("/api/users", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await resp.json();
        if (data.success) {
            closeModal("addUserModal");
            showToast(t("user_added"), "success");
            loadUsers();
            // Show connection config for V2Ray users
            if (currentLayerIsV2Ray && data.uri) {
                displayConfigModal(data);
            }
        } else {
            errorDiv.textContent = data.error || "Failed to add user";
            errorDiv.style.display = "block";
        }
    } catch (err) {
        errorDiv.textContent = "Network error";
        errorDiv.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = t("add_user");
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    if (!pendingPasswordUser) return;

    const btn = document.getElementById("changePasswordBtn");
    const errorDiv = document.getElementById("changePasswordError");
    const password = document.getElementById("changePasswordInput").value;

    btn.disabled = true;
    btn.querySelector("span").textContent = t("update_password");
    errorDiv.style.display = "none";

    try {
        const resp = await api(`/api/users/${encodeURIComponent(pendingPasswordUser)}/password`, {
            method: "POST",
            body: JSON.stringify({ password })
        });

        const data = await resp.json();
        if (data.success) {
            closeModal("changePasswordModal");
            showToast(t("password_updated"), "success");
            loadUsers();
        } else {
            errorDiv.textContent = data.error || "Failed to update password";
            errorDiv.style.display = "block";
        }
    } catch (err) {
        errorDiv.textContent = "Network error";
        errorDiv.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = t("update_password");
        pendingPasswordUser = null;
    }
}

function showDeleteModal(username) {
    pendingDeleteUser = username;
    document.getElementById("deleteUsername").textContent = username;
    document.getElementById("deleteError").style.display = "none";
    document.getElementById("deleteModal").style.display = "flex";
}

async function confirmDelete() {
    if (!pendingDeleteUser) return;
    const btn = document.getElementById("deleteBtn");
    const errorDiv = document.getElementById("deleteError");

    btn.disabled = true;
    btn.querySelector("span").textContent = t("deleting");

    try {
        const resp = await api(`/api/users/${encodeURIComponent(pendingDeleteUser)}`, {
            method: "DELETE"
        });

        const data = await resp.json();
        if (data.success) {
            closeModal("deleteModal");
            showToast(t("user_deleted"), "success");
            loadUsers();
        } else {
            errorDiv.textContent = data.error || "Failed to delete user";
            errorDiv.style.display = "block";
        }
    } catch (err) {
        errorDiv.textContent = "Network error";
        errorDiv.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = t("delete");
        pendingDeleteUser = null;
    }
}

async function showConfig(username) {
    try {
        const resp = await api(`/api/users/${encodeURIComponent(username)}/config`);
        if (!resp) return;
        const data = await resp.json();
        if (data.success) {
            displayConfigModal(data);
        } else {
            showToast(data.error || "Failed to get config", "error");
        }
    } catch (err) {
        showToast("Network error", "error");
    }
}

function displayConfigModal(data) {
    document.getElementById("configUri").textContent = data.uri || "";
    document.getElementById("configIos").textContent = JSON.stringify(data.ios_config || data.config || {}, null, 2);
    document.getElementById("configAndroid").textContent = JSON.stringify(data.android_config || {}, null, 2);
    document.getElementById("configModal").style.display = "flex";
}

/* ─── Bandwidth ─────────────────────────────────────────────────────────── */

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
        val /= 1024;
        i++;
    }
    return val.toFixed(1) + " " + units[i];
}

function setBandwidthPeriod(period, btn) {
    currentBandwidthPeriod = period;
    document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (bandwidthData) {
        renderUserBandwidth(bandwidthData);
    }
}

function getPeriodData(data) {
    const p = currentBandwidthPeriod;
    if (p === "today") return { up: data.today_uplink || 0, down: data.today_downlink || 0 };
    if (p === "week") return { up: data.week_uplink || 0, down: data.week_downlink || 0 };
    if (p === "month") return { up: data.month_uplink || 0, down: data.month_downlink || 0 };
    return { up: data.uplink || 0, down: data.downlink || 0 };
}

function renderUserBandwidth(users) {
    const tbody = document.getElementById("bandwidth-tbody");
    const chartContainer = document.getElementById("user-bandwidth-chart");
    const entries = Object.entries(users);

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">No data</td></tr>`;
        chartContainer.innerHTML = `<p style="text-align:center;color:var(--text-dim)">No per-user data available</p>`;
        return;
    }

    tbody.innerHTML = entries.map(([name, data]) => {
        const { up, down } = getPeriodData(data);
        return `<tr>
            <td><strong>${escapeHtml(name)}</strong></td>
            <td>${formatBytes(up)}</td>
            <td>${formatBytes(down)}</td>
            <td>${formatBytes(up + down)}</td>
        </tr>`;
    }).join("");

    renderBandwidthChart(chartContainer, entries);
}

async function loadBandwidth() {
    if (bandwidthLoading) return;
    bandwidthLoading = true;
    const refreshBtn = document.getElementById("bandwidthRefreshBtn");
    if (refreshBtn) refreshBtn.disabled = true;
    try {
        const [sysResp, userResp] = await Promise.all([
            api("/api/bandwidth/system"),
            api("/api/bandwidth/users")
        ]);

        if (sysResp) {
            const sys = await sysResp.json();
            const todayTotal = (sys.today?.rx || 0) + (sys.today?.tx || 0);
            const monthTotal = (sys.month?.rx || 0) + (sys.month?.tx || 0);
            const allTotal = (sys.total?.rx || 0) + (sys.total?.tx || 0);

            document.getElementById("bw-today").textContent = formatBytes(todayTotal);
            document.getElementById("bw-month").textContent = formatBytes(monthTotal);
            document.getElementById("bw-total").textContent = formatBytes(allTotal);
        }

        if (userResp) {
            bandwidthData = await userResp.json();
            renderUserBandwidth(bandwidthData);
        }
    } catch (err) {
        console.error("Failed to load bandwidth:", err);
    } finally {
        bandwidthLoading = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

async function refreshBandwidth() {
    await loadBandwidth();
}

function startBandwidthAutoRefresh() {
    stopBandwidthAutoRefresh();
    bandwidthRefreshInterval = setInterval(() => {
        const activeSection = document.querySelector(".section.active");
        if (activeSection && activeSection.id === "section-bandwidth") {
            loadBandwidth();
        }
    }, BANDWIDTH_REFRESH_MS);
}

function stopBandwidthAutoRefresh() {
    if (bandwidthRefreshInterval) {
        clearInterval(bandwidthRefreshInterval);
        bandwidthRefreshInterval = null;
    }
}

function startSectionAutoRefresh(sectionName) {
    const interval = SECTION_REFRESH_MS[sectionName];
    if (!interval) return;
    sectionRefreshInterval = setInterval(() => {
        const activeSection = document.querySelector(".section.active");
        if (!activeSection || activeSection.id !== `section-${sectionName}`) return;
        if (sectionName === "overview") loadOverview();
        else if (sectionName === "users") loadUsers();
        else if (sectionName === "bandwidth") loadBandwidth();
        else if (sectionName === "connections") loadConnections();
        else if (sectionName === "settings") loadLayers();
    }, interval);
}

function stopSectionAutoRefresh() {
    if (sectionRefreshInterval) {
        clearInterval(sectionRefreshInterval);
        sectionRefreshInterval = null;
    }
}

function renderBandwidthChart(container, entries) {
    if (entries.length === 0) {
        container.innerHTML = "";
        return;
    }

    const maxVal = Math.max(...entries.map(([, d]) => {
        const { up, down } = getPeriodData(d);
        return up + down;
    }), 1);
    const barHeight = 24;
    const rowHeight = 56;
    const gap = 8;
    const labelWidth = 120;
    const chartWidth = container.clientWidth - 40 || 500;
    const svgHeight = entries.length * (rowHeight + gap) + 30;
    const barAreaWidth = chartWidth - labelWidth - 20;

    // Legend
    let svg = `<svg width="100%" height="${svgHeight}" viewBox="0 0 ${chartWidth} ${svgHeight}">`;
    svg += `<rect x="${labelWidth}" y="4" width="10" height="10" rx="2" fill="#5b8af5"/>`;
    svg += `<text x="${labelWidth + 16}" y="13" fill="#8b8fa3" font-size="11">${t("upload_label")}</text>`;
    svg += `<rect x="${labelWidth + 80}" y="4" width="10" height="10" rx="2" fill="#4ade80"/>`;
    svg += `<text x="${labelWidth + 96}" y="13" fill="#8b8fa3" font-size="11">${t("download_label")}</text>`;

    entries.forEach(([name, data], i) => {
        const { up, down } = getPeriodData(data);
        const upBarW = Math.max((up / maxVal) * barAreaWidth, up > 0 ? 2 : 0);
        const downBarW = Math.max((down / maxVal) * barAreaWidth, down > 0 ? 2 : 0);
        const y = i * (rowHeight + gap) + 28;

        // Label
        const displayName = name.length > 14 ? name.substring(0, 14) + "..." : name;
        svg += `<text x="${labelWidth - 8}" y="${y + 18}" fill="#8b8fa3" font-size="12" text-anchor="end">${escapeHtml(displayName)}</text>`;

        // Upload bar
        svg += `<rect x="${labelWidth}" y="${y}" width="${upBarW}" height="${barHeight}" rx="4" fill="#5b8af5" opacity="0.8"/>`;
        svg += `<text x="${labelWidth + upBarW + 8}" y="${y + barHeight / 2 + 4}" fill="#e4e6eb" font-size="11">${formatBytes(up)}</text>`;

        // Download bar
        svg += `<rect x="${labelWidth}" y="${y + barHeight + 2}" width="${downBarW}" height="${barHeight}" rx="4" fill="#4ade80" opacity="0.7"/>`;
        if (down > 0) {
            svg += `<text x="${labelWidth + downBarW + 8}" y="${y + barHeight + 2 + barHeight / 2 + 4}" fill="#4ade80" font-size="10">${formatBytes(down)}</text>`;
        }
    });

    svg += "</svg>";
    container.innerHTML = svg;
}

/* ─── Connections ───────────────────────────────────────────────────────── */

async function loadConnections() {
    try {
        const resp = await api("/api/connections");
        if (!resp) return;
        const connections = await resp.json();
        const tbody = document.getElementById("connections-tbody");
        const countEl = document.getElementById("conn-count");

        countEl.textContent = `${t("active_connections")}: ${connections.length}`;

        if (connections.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">No active connections</td></tr>`;
            return;
        }

        tbody.innerHTML = connections.map(c => `<tr>
            <td>${escapeHtml(c.remote)}</td>
            <td>${escapeHtml(c.local)}</td>
            <td>${escapeHtml(c.state)}</td>
            <td>${escapeHtml(c.process || "-")}</td>
        </tr>`).join("");
    } catch (err) {
        console.error("Failed to load connections:", err);
    }
}

/* ─── Service Control ───────────────────────────────────────────────────── */

async function restartService() {
    const btn = document.getElementById("restartBtn");
    btn.disabled = true;
    btn.querySelector("span").textContent = t("restarting");

    try {
        const resp = await api("/api/service/restart", { method: "POST" });
        const data = await resp.json();
        if (data.success) {
            showToast(t("service_restarted"), "success");
        } else {
            showToast(data.error || "Failed to restart", "error");
        }
    } catch (err) {
        showToast("Network error", "error");
    } finally {
        btn.disabled = false;
        btn.querySelector("span").textContent = t("restart_service");
    }
}

async function loadLogs() {
    const viewer = document.getElementById("log-viewer");
    viewer.textContent = "Loading...";

    try {
        const resp = await api("/api/service/logs");
        if (!resp) return;
        const data = await resp.json();
        viewer.textContent = data.logs || "No logs available";
        viewer.scrollTop = viewer.scrollHeight;
    } catch (err) {
        viewer.textContent = "Failed to load logs";
    }
}

/* ─── Layer Switching ───────────────────────────────────────────────────── */

async function loadLayers() {
    try {
        const resp = await api("/api/layers");
        if (!resp) return;
        layersData = await resp.json();
        renderLayerCards(layersData);
        checkSwitchStatus();
    } catch (err) {
        console.error("Failed to load layers:", err);
    }
}

function renderLayerCards(data) {
    const container = document.getElementById("layerCards");
    const current = data.current;

    container.innerHTML = data.layers.map(layer => {
        const isActive = layer.id === current;
        const activeClass = isActive ? "layer-card-active" : "";
        const badgeHtml = isActive
            ? `<span class="layer-badge active">${t("current_layer")}</span>`
            : "";
        const domainNote = layer.needs_domain
            ? `<span class="layer-note">${t("layer_needs_domain")}</span>`
            : "";
        const btnHtml = isActive
            ? ""
            : `<button class="btn btn-sm btn-primary" onclick="showSwitchModal('${layer.id}')">${t("activate")}</button>`;

        return `
            <div class="layer-card ${activeClass}" data-layer="${layer.id}">
                <div class="layer-card-header">
                    <div class="layer-card-title">
                        <h3>${escapeHtml(layer.name)}</h3>
                        ${badgeHtml}
                    </div>
                    ${btnHtml}
                </div>
                <p class="layer-card-desc">${escapeHtml(layer.description)}</p>
                ${domainNote}
            </div>
        `;
    }).join("");
}

function showSwitchModal(layerId) {
    if (!layersData) return;
    const layer = layersData.layers.find(l => l.id === layerId);
    if (!layer) return;

    pendingSwitchLayer = layer;

    document.getElementById("switchCurrentLayer").textContent = layersData.current;
    document.getElementById("switchTargetLayer").textContent = layer.name;
    document.getElementById("switchModalError").style.display = "none";

    const domainFields = document.getElementById("switchDomainFields");
    const duckdnsField = document.getElementById("switchDuckdnsField");

    if (layer.needs_domain) {
        domainFields.style.display = "block";
        document.getElementById("switchDomain").value = "";
        document.getElementById("switchEmail").value = "";
        document.getElementById("switchDuckdns").value = "";
        duckdnsField.style.display = layer.needs_duckdns ? "block" : "none";
    } else {
        domainFields.style.display = "none";
    }

    document.getElementById("switchConfirmBtn").disabled = false;
    document.getElementById("switchConfirmBtn").querySelector("span").textContent = t("activate_layer");
    document.getElementById("switchModal").style.display = "flex";
}

async function confirmLayerSwitch() {
    if (!pendingSwitchLayer) return;

    const btn = document.getElementById("switchConfirmBtn");
    const errorDiv = document.getElementById("switchModalError");
    errorDiv.style.display = "none";

    const body = { layer_id: pendingSwitchLayer.id };

    if (pendingSwitchLayer.needs_domain) {
        body.domain = document.getElementById("switchDomain").value.trim();
        body.email = document.getElementById("switchEmail").value.trim();
        body.duckdns_token = document.getElementById("switchDuckdns").value.trim();

        if (!body.domain || !body.email) {
            errorDiv.textContent = t("switch_error_domain_required") || "Domain and email are required";
            errorDiv.style.display = "block";
            return;
        }
    }

    btn.disabled = true;
    btn.querySelector("span").textContent = t("switching_layer");

    try {
        const resp = await api("/api/layer/switch", {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await resp.json();
        if (data.success) {
            closeModal("switchModal");
            showSwitchProgress();
            startSwitchPolling();
        } else {
            errorDiv.textContent = data.error || "Failed to start switch";
            errorDiv.style.display = "block";
            btn.disabled = false;
            btn.querySelector("span").textContent = t("activate_layer");
        }
    } catch (err) {
        errorDiv.textContent = "Network error";
        errorDiv.style.display = "block";
        btn.disabled = false;
        btn.querySelector("span").textContent = t("activate_layer");
    }
}

function showSwitchProgress() {
    document.getElementById("layerCards").style.display = "none";
    const status = document.getElementById("layerSwitchStatus");
    status.style.display = "block";
    document.getElementById("switchProgressBar").style.width = "0%";
    document.getElementById("switchProgressText").textContent = "0%";
    document.getElementById("switchLog").textContent = "";
    document.getElementById("switchError").style.display = "none";
    document.getElementById("switchDone").style.display = "none";
    document.getElementById("switchBackBtn").style.display = "none";
    document.getElementById("switchProgressBar").className = "progress-fill";
}

function startSwitchPolling() {
    if (switchPollInterval) clearInterval(switchPollInterval);
    switchPollInterval = setInterval(pollSwitchStatus, 2000);
}

async function pollSwitchStatus() {
    try {
        const resp = await api("/api/layer/switch/status");
        if (!resp) return;
        const data = await resp.json();
        updateSwitchUI(data);

        if (!data.in_progress && (data.phase === "done" || data.phase === "error")) {
            clearInterval(switchPollInterval);
            switchPollInterval = null;
        }
    } catch (err) {
        // Server may be restarting during panel reinstall - keep polling
        console.warn("Switch status poll failed (server may be restarting):", err);
    }
}

async function checkSwitchStatus() {
    try {
        const resp = await api("/api/layer/switch/status");
        if (!resp) return;
        const data = await resp.json();
        if (data.in_progress || data.phase === "done" || data.phase === "error") {
            showSwitchProgress();
            updateSwitchUI(data);
            if (data.in_progress) {
                startSwitchPolling();
            }
        }
    } catch (err) {
        // ignore
    }
}

function updateSwitchUI(data) {
    const bar = document.getElementById("switchProgressBar");
    const text = document.getElementById("switchProgressText");
    const logEl = document.getElementById("switchLog");
    const badge = document.getElementById("switchPhaseBadge");
    const errorDiv = document.getElementById("switchError");
    const doneDiv = document.getElementById("switchDone");

    bar.style.width = data.progress_pct + "%";
    text.textContent = data.progress_pct + "%";

    if (data.phase) {
        const phaseKey = "switch_phase_" + data.phase;
        badge.textContent = t(phaseKey) || data.phase;
        badge.className = "phase-badge phase-" + data.phase;
        badge.style.display = "";
    } else {
        badge.style.display = "none";
    }

    if (data.log_lines && data.log_lines.length > 0) {
        logEl.textContent = data.log_lines.join("\n");
        logEl.scrollTop = logEl.scrollHeight;
    }

    const backBtn = document.getElementById("switchBackBtn");

    if (data.phase === "error") {
        errorDiv.textContent = data.error || "Unknown error";
        errorDiv.style.display = "block";
        backBtn.style.display = "block";
        bar.className = "progress-fill error-fill";
    }

    if (data.phase === "done") {
        doneDiv.style.display = "flex";
        backBtn.style.display = "block";
        bar.className = "progress-fill success-fill";
    }
}

async function resetSwitchAndShowLayers() {
    try {
        await api("/api/layer/switch/clear", { method: "POST" });
    } catch (err) {
        // best effort
    }
    document.getElementById("layerSwitchStatus").style.display = "none";
    document.getElementById("layerCards").style.display = "";
    loadLayers();
}

/* ─── Utilities ─────────────────────────────────────────────────────────── */

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

function maskPassword(password) {
    if (!password) return "-";
    return "********";
}

function eyeIcon(visible) {
    if (visible) {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.17-6.62"></path>
        <path d="M1 1l22 22"></path>
        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-3.2 4.83"></path>
        <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"></path>
    </svg>`;
}

function togglePasswordVisibility(btn) {
    const wrapper = btn.closest(".password-cell");
    if (!wrapper) return;
    const textEl = wrapper.querySelector(".password-text");
    if (!textEl) return;

    const password = textEl.getAttribute("data-password") || "";
    if (!password) return;

    const isVisible = textEl.getAttribute("data-visible") === "true";
    textEl.textContent = isVisible ? maskPassword(password) : password;
    textEl.setAttribute("data-visible", isVisible ? "false" : "true");
    btn.innerHTML = eyeIcon(!isVisible);
    const label = isVisible ? t("show_password") : t("hide_password");
    btn.setAttribute("title", label);
    btn.setAttribute("aria-label", label);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function copyText(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast(t("copied"), "success");
    }).catch(() => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast(t("copied"), "success");
    });
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function handleLogout() {
    try {
        await fetch("/api/logout", { method: "POST" });
    } catch (e) {}
    window.location.href = "/login";
}

/* ─── Initialize ────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
    applyLang(currentLang);
    loadOverview();
    startSectionAutoRefresh("overview");
});

// Close modal on backdrop click
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
        e.target.style.display = "none";
    }
});

// Close modal on Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none");
    }
});
