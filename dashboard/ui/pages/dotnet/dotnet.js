(() => {
  const ns = window.ServerInstallerUI = window.ServerInstallerUI || {};
  ns.pages = ns.pages || {};

  const { ServiceListCard, ServiceRow, PageDescription } = ns.shared || {};

  ns.pages.dotnet = function renderDotnetPage(p) {
    const {
      Alert, Grid, Typography, Button,
      NavCard,
      cfg, serviceBusy,
      dotnetServices, dockerServices,
      isScopeLoading, loadDotnetInfo, loadDotnetServices, loadDockerServices,
      hasStoppedServices, batchServiceAction, setPage,
      onServiceAction,
      renderServiceUrls, renderServicePorts, renderServiceStatus, renderFolderIcon,
    } = p;

    const dotnetDockerServices = (dockerServices || []).filter((s) => {
      const text = String(s.name || "") + " " + String(s.image || "");
      return /(dotnet|aspnet|dotnetapp)/i.test(text) && !/python/i.test(text);
    });
    const allServices = [...(dotnetServices || []), ...dotnetDockerServices];

    const serviceRows = (svcs) =>
      svcs.map((svc) => (
        <ServiceRow
          key={`dotnet-all-${svc.kind}-${svc.name}`}
          svc={svc}
          serviceBusy={serviceBusy}
          onServiceAction={onServiceAction}
          renderServiceUrls={renderServiceUrls}
          renderServicePorts={renderServicePorts}
          renderServiceStatus={renderServiceStatus}
          renderFolderIcon={renderFolderIcon}
          showRestart={false}
        />
      ));

    const batchButton = allServices.length > 0 && (
      <Button
        variant="outlined"
        color={hasStoppedServices(allServices) ? "success" : "error"}
        disabled={serviceBusy}
        onClick={() => batchServiceAction(allServices, "DotNet", hasStoppedServices(allServices) ? "start" : "stop")}
        sx={{ textTransform: "none" }}
      >
        {hasStoppedServices(allServices) ? "Start All" : "Stop All"}
      </Button>
    );

    const onRefresh = () => Promise.all([loadDotnetInfo.current(), loadDotnetServices.current(), loadDockerServices.current()]);
    const refreshLoading = isScopeLoading("dotnet") || isScopeLoading("docker");

    if (cfg.os === "windows") {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <PageDescription title="DotNet Services">
              <Typography variant="body2" color="text.secondary">
                Manage your ASP.NET and .NET Core services. Use the cards below to deploy via IIS or Docker, and monitor all running DotNet services from the list.
              </Typography>
            </PageDescription>
          </Grid>
          <Grid item xs={12} md={6}>
            <NavCard title="IIS" text="Install and deploy on IIS." onClick={() => setPage("dotnet-iis")} />
          </Grid>
          <Grid item xs={12} md={6}>
            <NavCard title="Docker" text="Install and deploy on Docker." onClick={() => setPage("dotnet-docker")} />
          </Grid>
          <Grid item xs={12} sx={{ display: "flex", flexDirection: "column" }}>
            <ServiceListCard
              title="All DotNet Services"
              services={allServices}
              emptyText="No DotNet-related services found."
              loading={refreshLoading}
              onRefresh={onRefresh}
              extraActions={batchButton}
              serviceBusy={serviceBusy}
            >
              {serviceRows(allServices)}
            </ServiceListCard>
          </Grid>
        </Grid>
      );
    }
    if (cfg.os === "linux") {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <PageDescription title="DotNet Services">
              <Typography variant="body2" color="text.secondary">
                Manage your ASP.NET and .NET Core services. Use the cards below to deploy natively on Linux or via Docker, and monitor all running DotNet services from the list.
              </Typography>
            </PageDescription>
          </Grid>
          <Grid item xs={12} md={6}>
            <NavCard title="Linux" text="Install and deploy on Linux." onClick={() => setPage("dotnet-linux")} />
          </Grid>
          <Grid item xs={12} md={6}>
            <NavCard title="Docker" text="Install and deploy on Docker (Linux)." onClick={() => setPage("dotnet-docker")} />
          </Grid>
          <Grid item xs={12} sx={{ display: "flex", flexDirection: "column" }}>
            <ServiceListCard
              title="All DotNet Services"
              services={allServices}
              emptyText="No DotNet-related services found."
              loading={refreshLoading}
              onRefresh={onRefresh}
              extraActions={batchButton}
              serviceBusy={serviceBusy}
            >
              {serviceRows(allServices)}
            </ServiceListCard>
          </Grid>
        </Grid>
      );
    }
    return <Alert severity="info">macOS installer actions are not configured yet.</Alert>;
  };
})();
