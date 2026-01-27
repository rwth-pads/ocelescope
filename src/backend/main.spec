# -*- mode: python ; coding: utf-8 -*-
import os
import pkgutil
import platform
import PyInstaller.config

PyInstaller.config.CONF['distpath'] = "../frontend/src-tauri/bin/api"

# -----------------------------
#  Dynamic target name (ONLY ADDITION)
# -----------------------------
system = platform.system().lower()
arch = platform.machine().lower()

arch_map = {
    "x86_64": "x86_64",
    "amd64": "x86_64",
    "arm64": "aarch64",
    "aarch64": "aarch64",
}

machine = arch_map.get(arch, arch)

target_triple_map = {
    ("linux", "x86_64"): "x86_64-unknown-linux-gnu",
    ("linux", "aarch64"): "aarch64-unknown-linux-gnu",
    ("darwin", "x86_64"): "x86_64-apple-darwin",
    ("darwin", "aarch64"): "aarch64-apple-darwin",
    ("windows", "x86_64"): "x86_64-pc-windows-msvc.exe",
}

target_triple = target_triple_map.get((system, machine), f"{machine}-{system}")
binary_name = f"main-{target_triple}"
# -----------------------------


a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=[("modules", "modules"), ("app", "app")],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=binary_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

