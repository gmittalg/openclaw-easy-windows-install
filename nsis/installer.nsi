; OpenClaw Windows Installer - Root NSIS Script
; Included by electron-builder's NSIS target

; ---------------------------------------------------------------------------
; Required NSIS headers (safe to include multiple times — guarded internally)
; ---------------------------------------------------------------------------
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; ---------------------------------------------------------------------------
; Include custom pages only during installer build (not uninstaller build)
; electron-builder runs NSIS twice: once for the uninstaller (BUILD_UNINSTALLER
; defined), and once for the installer. Page functions must only be compiled
; for the installer pass, otherwise NSIS warns 6010 (unreferenced function).
; ---------------------------------------------------------------------------
!ifndef BUILD_UNINSTALLER
!include "${PROJECT_DIR}\nsis\pages\ApiKeysPage.nsh"
!include "${PROJECT_DIR}\nsis\pages\ChannelsPage.nsh"
!include "${PROJECT_DIR}\nsis\pages\TokensPage.nsh"
!include "${PROJECT_DIR}\nsis\pages\InstallOptionsPage.nsh"
!include "${PROJECT_DIR}\nsis\WriteDotEnv.nsh"
!endif

; ---------------------------------------------------------------------------
; Custom pages — injected via customWelcomePage (runs before license + dir page)
; electron-builder calls !insertmacro customWelcomePage when this macro is defined.
; ---------------------------------------------------------------------------
!macro customWelcomePage
  !insertmacro OPENCLAW_API_KEYS_PAGE
  !insertmacro OPENCLAW_CHANNELS_PAGE
  !insertmacro OPENCLAW_TOKENS_PAGE
  !insertmacro OPENCLAW_INSTALL_OPTIONS_PAGE
!macroend

; Called after files are installed — write config files
!macro customInstall
  Call WriteOpenClawConfig
!macroend

; Called during uninstall
!macro customUninstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "OpenClaw"
!macroend
