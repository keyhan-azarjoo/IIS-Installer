(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};
  ns.pages = ns.pages || {};

  ns.pages["python-api"] = function renderPythonApiPage(p) {
    const {
      Grid, Card, CardContent, Typography, Stack, Button, NavCard,
      cfg, startNewPythonApiDeployment, renderPythonApiRunsCard,
      setPage,
    } = p;

    const pythonApiTargets = [];
    pythonApiTargets.push(
      <Grid item xs={12} md={6} key="python-system">
        <NavCard
          title="API as OS service"
          text={cfg.os === "windows" ? "Run a Python API app as a Windows service." : "Run a Python API app as an OS service."}
          onClick={() => startNewPythonApiDeployment("python-system")}
        />
      </Grid>
    );
    pythonApiTargets.push(
      <Grid item xs={12} md={6} key="python-docker">
        <NavCard
          title="Docker"
          text="Use the Docker target for a containerized Python API app."
          onClick={() => startNewPythonApiDeployment("python-docker")}
          outlined
        />
      </Grid>
    );
    if (cfg.os === "windows") {
      pythonApiTargets.push(
        <Grid item xs={12} md={6} key="python-iis">
          <NavCard
            title="IIS"
            text="Use the IIS target for Python API hosting on Windows."
            onClick={() => startNewPythonApiDeployment("python-iis")}
            outlined
          />
        </Grid>
      );
    }
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: "1px solid #dbe5f6" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>Python APIs</Typography>
                <Button variant="outlined" size="small" onClick={() => setPage("api-docs-python")} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, borderColor: "#0d9488", color: "#0d9488" }}>API Documents</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        {pythonApiTargets}
        {renderPythonApiRunsCard()}
      </Grid>
    );
  };
})();
