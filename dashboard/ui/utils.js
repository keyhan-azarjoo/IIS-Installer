(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};

  function formatBytes(v) {
    const n = Number(v || 0);
    if (!n || n < 0) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let idx = 0;
    let size = n;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx += 1;
    }
    return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  function formatUptime(v) {
    const sec = Number(v || 0);
    if (!sec) return "-";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  function clampPercent(v) {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  function isSelectableHostIp(ip) {
    const value = String(ip || "").trim();
    if (!value) return false;
    if (value.includes(":")) return false;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return false;
    const octets = value.split(".").map((part) => Number(part));
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    if (value.startsWith("127.")) return false;
    if (value.startsWith("169.254.")) return false;
    if (value === "0.0.0.0") return false;
    if (octets[0] === 172 && (octets[1] < 16 || octets[1] > 31)) return false;
    return true;
  }

  function getSelectableIps(systemInfo) {
    const values = [];
    const pushIp = (ip) => {
      if (!isSelectableHostIp(ip)) return;
      if (!values.includes(ip)) values.push(ip);
    };
    (systemInfo?.ips || []).forEach(pushIp);
    pushIp(systemInfo?.public_ip);
    values.push("localhost"); // always offer local-only binding
    return values;
  }

  // Returns the one network IP to pre-select when there is exactly one non-localhost IP,
  // preserving the old auto-select UX. Returns "" when there are 0 or 2+ network IPs.
  function getDefaultSelectableIp(selectableIps) {
    const networkIps = (selectableIps || []).filter((ip) => ip !== "localhost" && ip !== "127.0.0.1");
    return networkIps.length === 1 ? networkIps[0] : "";
  }

  function trimDetectedUrl(value) {
    return String(value || "").trim().replace(/[),.;]+$/, "");
  }

  function extractLabeledUrl(text, label) {
    const source = String(text || "");
    const safeLabel = String(label || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`${safeLabel}\\s*:\\s*(https?:\\/\\/\\S+)`, "i"));
    return match ? trimDetectedUrl(match[1]) : "";
  }

  function uniqUrls(items) {
    const values = [];
    (items || []).forEach((item) => {
      const url = trimDetectedUrl(item);
      if (!url || values.includes(url)) return;
      values.push(url);
    });
    return values;
  }

  function defaultNotebookDirForOs(osName) {
    const value = String(osName || "").toLowerCase();
    if (value === "windows") return "C:\\ServerInstaller-Notebooks";
    return "/root/notebooks";
  }

  function defaultPythonApiDirForOs(osName) {
    const value = String(osName || "").toLowerCase();
    if (value === "windows") return "C:\\ServerInstaller-PythonApi";
    if (value === "darwin") return "/usr/local/serverinstaller/python-api";
    return "/opt/serverinstaller/python-api";
  }

  function defaultWebsiteDirForOs(osName) {
    const value = String(osName || "").toLowerCase();
    if (value === "windows") return "C:\\ServerInstaller-Websites";
    return "/var/www/site";
  }

  ns.utils = {
    clampPercent,
    defaultNotebookDirForOs,
    defaultPythonApiDirForOs,
    defaultWebsiteDirForOs,
    extractLabeledUrl,
    formatBytes,
    formatUptime,
    getDefaultSelectableIp,
    getSelectableIps,
    isSelectableHostIp,
    trimDetectedUrl,
    uniqUrls,
  };
})();
