# Windows Fix: `lstatSync` Returns `dev=0`, Breaking Control UI File Serving

## Summary

On Windows, `fs.lstatSync()` always returns `dev=0` for files on NTFS volumes, while
`fs.fstatSync()` (called after opening a file descriptor) returns the real volume serial
number. The gateway's TOCTOU security check in `openVerifiedFileSync` requires both
`dev` **and** `ino` to match between the pre-open `lstat` and the post-open `fstat`.
This check always fails on Windows, causing every static file serve attempt to return
`null`, which manifests as an HTTP `404 Not Found` on the Control UI root (`GET /`).

## Symptom

After installing OpenClaw on Windows and launching the app, the Electron window shows
**"Not Found"** instead of the OpenClaw Control UI. The gateway process starts and
responds on port 18789, but `GET /` returns `HTTP 404` with full CSP security headers
(proving the request reaches the file-serving handler) and a `text/plain` body of
`Not Found`.

## Root Cause

`openVerifiedFileSync` in `src/infra/safe-open-sync.ts` performs a TOCTOU guard:

```typescript
const preOpenStat = fs.lstatSync(realPath);  // dev=0 on Windows
// ...
fd = fs.openSync(realPath, OPEN_READ_FLAGS);
const openedStat = fs.fstatSync(fd);          // dev=<volume serial> on Windows

if (!sameFileIdentity(preOpenStat, openedStat)) {
  return { ok: false, reason: "validation" }; // always fails on Windows!
}
```

And `sameFileIdentity` was originally:

```typescript
export function sameFileIdentity(left: fs.Stats, right: fs.Stats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
  //                ^^^ 0 !== <volume serial> on Windows → always false
}
```

### Why `dev` differs

On POSIX systems, both `lstat` and `fstat` report the same device number. On Windows,
Node.js implements `lstat`/`stat` via `_stat64()` (a CRT function that maps the drive
letter to a small integer, typically returning 0 for NTFS volumes with no drive-letter
mapping in certain contexts), while `fstat` uses `GetFileInformationByHandle()` which
returns the volume serial number directly from the kernel. These values are never equal.

### Why `ino` is safe alone on Windows

On Windows NTFS, `ino` is the **file index** returned by `GetFileInformationByHandle`.
This is the 64-bit NTFS file record number, unique per volume. Combined with the
`isContainedPath` check that guards directory traversal, using `ino` alone is sufficient
to confirm "the file I opened is the same file I stated" within a controlled directory.

## Fix

`src/infra/safe-open-sync.ts` — `sameFileIdentity` function:

```typescript
export function sameFileIdentity(left: fs.Stats, right: fs.Stats): boolean {
  // On Windows, fs.lstatSync() returns dev=0 for files on NTFS volumes, while
  // fs.fstatSync() (called after opening an fd) returns the real volume serial
  // number. Requiring both to match causes the identity check to always fail on
  // Windows. When either dev is 0 we fall back to ino-only comparison, which is
  // reliable on NTFS where the file index (ino) is unique per volume.
  if (left.dev === 0 || right.dev === 0) {
    return left.ino === right.ino;
  }
  return left.dev === right.dev && left.ino === right.ino;
}
```

## Debugging Journey

The 404 response included `X-Frame-Options: DENY` and `Content-Security-Policy` headers
that are set **before** any file-serving code runs (`applyControlUiSecurityHeaders` in
`gateway/control-ui.ts`). This confirmed the request _was_ reaching the handler and the
control-ui root path _was_ resolving correctly — the failure was deeper in the file-open
path.

Temporary `console.error` patches injected into the compiled `gateway-cli-CN7FWRDI.js`
revealed:

```
[DEBUG-SAFE-FILE] isFile=true  ino=2814749767538333 dev=0         ← lstatSync
[DEBUG-SAFE-FILE] identOk=false ino2=2814749767538333 dev2=2728190709 ← fstatSync
```

`dev` differs (0 vs real serial), `ino` matches — classic Windows lstat/fstat mismatch.

## Affected versions

Reproduced on Windows 11 (build 26200) with Node.js v22.14.0. Expected to affect all
Windows installations prior to this fix being compiled in.

## Applied patches

- **Source fix** (permanent): `../openclaw/src/infra/safe-open-sync.ts`
- **Runtime patch** (temporary, for the installed copy before rebuild):
  `areSameFileIdentity` patched in both compiled gateway bundle files at
  `resources/gateway/dist/gateway-cli-*.js` in the installed app directory.
  These patches are superseded once the installer is rebuilt from the fixed source.
