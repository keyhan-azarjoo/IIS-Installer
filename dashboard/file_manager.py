import os
import re
import shutil
from pathlib import Path


def file_manager_roots():
    if os.name == "nt":
        roots = []
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            drive = f"{letter}:\\"
            if Path(drive).exists():
                roots.append(drive)
        return roots or ["C:\\"]
    return ["/"]


def normalize_file_manager_path(path_value):
    raw = str(path_value or "").strip()
    if not raw:
        return ""
    path = Path(raw).expanduser()
    if not path.is_absolute():
        raise RuntimeError("File manager path must be absolute.")
    return str(path.resolve(strict=False))


def is_file_manager_root(path_value):
    normalized = str(path_value or "").strip()
    if not normalized:
        return False
    if os.name == "nt":
        return bool(re.fullmatch(r"(?i)[a-z]:\\?", normalized))
    return normalized == "/"


def file_manager_entry(path_obj):
    stat_result = path_obj.stat()
    is_dir = path_obj.is_dir()
    return {
        "name": path_obj.name or str(path_obj),
        "path": str(path_obj),
        "is_dir": is_dir,
        "size": 0 if is_dir else int(stat_result.st_size),
        "modified_ts": int(stat_result.st_mtime),
        "readonly": not os.access(str(path_obj), os.W_OK),
    }


def file_manager_list(path_value=""):
    normalized = normalize_file_manager_path(path_value)
    if not normalized:
        roots = []
        for root in file_manager_roots():
            root_path = Path(root)
            roots.append({
                "name": str(root_path),
                "path": str(root_path),
                "is_dir": True,
                "size": 0,
                "modified_ts": 0,
                "readonly": not os.access(str(root_path), os.W_OK),
            })
        return {
            "path": "",
            "name": "Computer" if os.name == "nt" else "/",
            "parent": "",
            "is_dir": True,
            "entries": roots,
        }

    target = Path(normalized)
    if not target.exists():
        raise RuntimeError(f"Path not found: {normalized}")
    if not target.is_dir():
        raise RuntimeError("Selected path is not a directory.")

    entries = []
    for child in sorted(target.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower())):
        try:
            entries.append(file_manager_entry(child))
        except Exception:
            continue

    parent = ""
    if target.parent != target:
        parent = str(target.parent)
    elif os.name != "nt":
        parent = "/"

    return {
        "path": str(target),
        "name": target.name or str(target),
        "parent": parent if parent != str(target) else "",
        "is_dir": True,
        "entries": entries,
    }


def file_manager_read_file(path_value, max_bytes=1024 * 1024):
    normalized = normalize_file_manager_path(path_value)
    if not normalized:
        raise RuntimeError("File path is required.")
    path = Path(normalized)
    if not path.exists() or not path.is_file():
        raise RuntimeError(f"File not found: {normalized}")
    size = path.stat().st_size
    if size > max_bytes:
        raise RuntimeError(f"File is too large to open in editor ({size} bytes). Limit is {max_bytes} bytes.")
    try:
        content = path.read_text(encoding="utf-8")
        encoding = "utf-8"
    except UnicodeDecodeError:
        content = path.read_text(encoding="utf-8", errors="replace")
        encoding = "utf-8 (lossy)"
    return {
        "path": str(path),
        "name": path.name,
        "size": int(size),
        "encoding": encoding,
        "content": content,
    }


def file_manager_write_file(path_value, content):
    normalized = normalize_file_manager_path(path_value)
    if not normalized:
        raise RuntimeError("File path is required.")
    path = Path(normalized)
    if path.exists() and path.is_dir():
        raise RuntimeError("Cannot overwrite a directory with file content.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(content), encoding="utf-8")
    return {"path": str(path), "size": int(path.stat().st_size)}


def file_manager_make_directory(path_value):
    normalized = normalize_file_manager_path(path_value)
    if not normalized:
        raise RuntimeError("Folder path is required.")
    path = Path(normalized)
    path.mkdir(parents=True, exist_ok=True)
    return {"path": str(path)}


def file_manager_delete_path(path_value):
    normalized = normalize_file_manager_path(path_value)
    if not normalized:
        raise RuntimeError("Path is required.")
    if is_file_manager_root(normalized):
        raise RuntimeError("Deleting the filesystem root is not allowed.")
    path = Path(normalized)
    if not path.exists():
        raise RuntimeError(f"Path not found: {normalized}")
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()
    return {"path": normalized}


def file_manager_rename_path(source_value, target_value):
    source = normalize_file_manager_path(source_value)
    target = normalize_file_manager_path(target_value)
    if not source or not target:
        raise RuntimeError("Both source and target paths are required.")
    if is_file_manager_root(source):
        raise RuntimeError("Renaming the filesystem root is not allowed.")
    source_path = Path(source)
    target_path = Path(target)
    if not source_path.exists():
        raise RuntimeError(f"Path not found: {source}")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    source_path.rename(target_path)
    return {"path": str(target_path)}


def file_manager_save_uploads(parts, target_dir):
    base_dir = Path(normalize_file_manager_path(target_dir))
    if not base_dir.exists() or not base_dir.is_dir():
        raise RuntimeError("Upload target must be an existing folder.")
    written = []
    for part in parts:
        filename = str(part.get("filename") or "").strip()
        if not filename:
            continue
        safe_rel = filename.replace("\\", "/").lstrip("/")
        rel_path = Path(safe_rel)
        dest_path = (base_dir / rel_path).resolve(strict=False)
        try:
            dest_path.relative_to(base_dir.resolve(strict=False))
        except Exception as ex:
            raise RuntimeError(f"Invalid upload path: {filename}") from ex
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(part.get("content", b""))
        written.append(str(dest_path))
    return written
