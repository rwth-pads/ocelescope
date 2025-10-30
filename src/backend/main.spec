import platform
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules
import PyInstaller.config

PyInstaller.config.CONF['distpath'] = "../frontend/src-tauri/bin/api"
# 🧠 Detect OS + architecture
system = platform.system().lower()
arch = platform.machine().lower()

arch_map = {
    "x86_64": "x86_64",
    "amd64": "x86_64",
    "arm64": "aarch64",
    "aarch64": "aarch64",
}

machine = arch_map.get(arch, arch)

# 🎯 Map to Rust-style triples
target_triple_map = {
    ("linux", "x86_64"): "x86_64-unknown-linux-gnu",
    ("linux", "aarch64"): "aarch64-unknown-linux-gnu",
    ("darwin", "x86_64"): "x86_64-apple-darwin",
    ("darwin", "aarch64"): "aarch64-apple-darwin",
    ("windows", "x86_64"): "x86_64-pc-windows-msvc.exe",
}

target_triple = target_triple_map.get((system, machine), f"{machine}-{system}")

binary_name = f"main-{target_triple}"

# 🏠 Base directory
base_dir = Path.cwd()

# 🧩 Collect all hidden imports from your modules
hidden_imports = collect_submodules("modules")

block_cipher = None

# 🧱 Step 1: Analyze imports and dependencies
a = Analysis(
    ['main.py'],
    pathex=[str(base_dir)],
    binaries=[],
    datas=[],
    hiddenimports=hidden_imports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

# 🧱 Step 2: Build the Python archive
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 🧱 Step 3: Define the executable
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=binary_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)

# 🧱 Step 4: Collect everything into the final output folder
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=binary_name,
)

