(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};
  const { Box, Button, IconButton, LinearProgress, Paper, Stack, Tooltip, Typography } = MaterialUI;
  const { clampPercent } = ns.utils || {};

  function MiniMetric({ label, valueText, percent, color }) {
    return (
      <Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.3 }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="caption" fontWeight={700}>{valueText}</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={clampPercent(percent)}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: "rgba(15,23,42,.08)",
            "& .MuiLinearProgress-bar": { bgcolor: color || "#2563eb" },
          }}
        />
      </Paper>
    );
  }

  function ActionIcon({ title, onClick, disabled, color = "primary", variant = "outlined", IconComp, fallback }) {
    return (
      <Button
        type="button"
        color={color}
        variant={variant}
        disabled={disabled}
        onClick={onClick}
        aria-label={title}
        startIcon={IconComp ? <IconComp fontSize="small" /> : null}
        sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
      >
        {title}
        {!IconComp && fallback ? ` ${fallback}` : ""}
      </Button>
    );
  }

  function IconOnlyAction({ title, onClick, disabled, color = "default", variant = "outlined", IconComp, fallback }) {
    const showFallback = !IconComp && !!fallback;
    return (
      <Tooltip title={title}>
        <span>
          <IconButton
            type="button"
            color={color}
            disabled={disabled}
            onClick={onClick}
            aria-label={title}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: variant === "contained" ? "transparent" : "rgba(37,99,235,.22)",
              bgcolor: variant === "contained" ? "primary.main" : "transparent",
              color: variant === "contained" ? "#fff" : "inherit",
              borderRadius: 2,
              px: showFallback ? 1 : 0.8,
              minWidth: showFallback ? 40 : "auto",
              "&:hover": {
                bgcolor: variant === "contained" ? "primary.dark" : "rgba(37,99,235,.08)",
              },
            }}
          >
            {IconComp ? <IconComp fontSize="small" /> : (
              showFallback ? <Typography component="span" variant="caption" fontWeight={800}>{fallback}</Typography> : null
            )}
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  function isServiceRunningStatus(status, subStatus = "") {
    const primary = String(status || "").trim();
    const secondary = String(subStatus || "").trim();
    if (/running|up/i.test(secondary)) return true;
    if (/dead|failed|inactive|exited/i.test(secondary)) return false;
    return /running|active|up/i.test(primary);
  }

  function formatServiceState(status, subStatus = "") {
    const primary = String(status || "").trim();
    const secondary = String(subStatus || "").trim();
    if (primary && secondary && primary.toLowerCase() !== secondary.toLowerCase()) {
      return `${primary}/${secondary}`;
    }
    return primary || secondary || "-";
  }

  ns.actions = {
    ActionIcon,
    formatServiceState,
    IconOnlyAction,
    isServiceRunningStatus,
    MiniMetric,
  };
})();
