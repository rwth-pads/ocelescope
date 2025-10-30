import PyInstaller.__main__  # pyright: ignore[]


def build_executable():
    PyInstaller.__main__.run(
        [
            "-c",
            "-F",
            "--clean",
            "--name=main-x86_64-pc-windows-msvc",
            "--distpath=../../frontend/src-tauri/bin/api",
            "../backend/main.py",
        ]
    )


if __name__ == "__main__":
    build_executable()
