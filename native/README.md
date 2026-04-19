# SnipSnip Agent Bridge

*Ez pz*

```sh
go install github.com/kjanat/snipsnip/native/cmd/snipsnip@latest
go install github.com/kjanat/snipsnip/native/cmd/snipsnip-native-host@latest
```

Desktop companion binaries for the SnipSnip browser extension.

---

Files:

- Windows: `snipsnip.exe` and `snipsnip-native-host.exe`
- macOS/Linux: `snipsnip` and `snipsnip-native-host`

Typical setup:

**Windows**

```powershell
.\snipsnip.exe install-host
```

**macOS/Linux**

```bash
./snipsnip install-host
```

Typical usage:

**Windows**

```powershell
.\snipsnip.exe status
.\snipsnip.exe clip
.\snipsnip.exe clip --json
.\snipsnip.exe clip --fresh
```

**macOS/Linux**

```bash
./snipsnip status
./snipsnip clip
./snipsnip clip --json
./snipsnip clip --fresh
```
