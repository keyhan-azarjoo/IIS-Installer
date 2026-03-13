#!/usr/bin/env python3
import importlib.util
import inspect
import os
import ssl
import sys
from pathlib import Path
from wsgiref.simple_server import make_server


def _env(name, default=""):
    return str(os.environ.get(name, default) or "").strip()


def _load_module(app_file):
    target = Path(app_file).resolve()
    spec = importlib.util.spec_from_file_location("serverinstaller_user_app", str(target))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load Python app file: {target}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _pick_app(module, explicit_name=""):
    if explicit_name:
        value = getattr(module, explicit_name, None)
        if value is None:
            raise RuntimeError(f"App object '{explicit_name}' was not found in {module.__file__}.")
        return value, explicit_name

    for name in ("app", "application", "api"):
        value = getattr(module, name, None)
        if value is not None:
            return value, name

    factory = getattr(module, "create_app", None)
    if callable(factory):
        return factory(), "create_app()"

    raise RuntimeError(
        "No app object was found. Expose one of: app, application, api, or create_app()."
    )


def _callable_arity(value):
    target = value
    if not inspect.isfunction(target) and not inspect.ismethod(target):
        target = getattr(value, "__call__", None)
    if target is None:
        return None
    try:
        params = list(inspect.signature(target).parameters.values())
    except Exception:
        return None
    if inspect.ismethod(target) and params and params[0].name == "self":
        params = params[1:]
    return len(params)


def _is_asgi_app(app):
    if inspect.iscoroutinefunction(app):
        return True
    arity = _callable_arity(app)
    return arity == 3


def _serve_wsgi(app, host, port, certfile="", keyfile=""):
    httpd = make_server(host, port, app)
    if certfile and keyfile:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile, keyfile)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


def main():
    app_file = _env("SERVER_INSTALLER_APP_FILE")
    app_name = _env("SERVER_INSTALLER_APP_OBJECT")
    host = _env("SERVER_INSTALLER_HOST", "127.0.0.1")
    port = int(_env("SERVER_INSTALLER_PORT", "8080"))
    certfile = _env("SERVER_INSTALLER_CERTFILE")
    keyfile = _env("SERVER_INSTALLER_KEYFILE")

    if not app_file:
      raise RuntimeError("SERVER_INSTALLER_APP_FILE is required.")

    app_dir = str(Path(app_file).resolve().parent)
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)

    module = _load_module(app_file)
    app, app_label = _pick_app(module, app_name)

    if _is_asgi_app(app):
        try:
            import uvicorn
        except Exception as ex:
            raise RuntimeError(f"ASGI app '{app_label}' requires uvicorn: {ex}") from ex
        uvicorn.run(
            app,
            host=host,
            port=port,
            ssl_certfile=certfile or None,
            ssl_keyfile=keyfile or None,
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
        return

    _serve_wsgi(app, host, port, certfile=certfile, keyfile=keyfile)


if __name__ == "__main__":
    main()
