; ---------------------------------------------------------------------------
; InstallOptionsPage.nsh — Startup and shortcut options
; ---------------------------------------------------------------------------

Var InstallOptions.StartAtLogin
Var InstallOptions.DesktopShortcut

Var InstallOptions.Dialog
Var InstallOptions.HeaderLabel
Var InstallOptions.StartAtLoginCheck
Var InstallOptions.DesktopShortcutCheck

!macro OPENCLAW_INSTALL_OPTIONS_PAGE
  Page custom InstallOptionsPage_Create InstallOptionsPage_Leave
!macroend

Function InstallOptionsPage_Create
  ; Defaults
  ${If} $InstallOptions.StartAtLogin == ""
    StrCpy $InstallOptions.StartAtLogin "1"
  ${EndIf}
  ${If} $InstallOptions.DesktopShortcut == ""
    StrCpy $InstallOptions.DesktopShortcut "1"
  ${EndIf}

  nsDialogs::Create 1018
  Pop $InstallOptions.Dialog
  ${If} $InstallOptions.Dialog == error
    Abort
  ${EndIf}

  ; Header
  ${NSD_CreateLabel} 0 0 100% 12u "Installation Options"
  Pop $InstallOptions.HeaderLabel

  ; Auto-start at login
  ${NSD_CreateCheckbox} 0 24u 100% 14u "Start OpenClaw automatically when Windows starts"
  Pop $InstallOptions.StartAtLoginCheck
  ${If} $InstallOptions.StartAtLogin == "1"
    ${NSD_Check} $InstallOptions.StartAtLoginCheck
  ${EndIf}

  ; Desktop shortcut
  ${NSD_CreateCheckbox} 0 44u 100% 14u "Create desktop shortcut"
  Pop $InstallOptions.DesktopShortcutCheck
  ${If} $InstallOptions.DesktopShortcut == "1"
    ${NSD_Check} $InstallOptions.DesktopShortcutCheck
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function InstallOptionsPage_Leave
  ${NSD_GetState} $InstallOptions.StartAtLoginCheck $InstallOptions.StartAtLogin
  ${NSD_GetState} $InstallOptions.DesktopShortcutCheck $InstallOptions.DesktopShortcut

  ${If} $InstallOptions.StartAtLogin == ${BST_CHECKED}
    StrCpy $InstallOptions.StartAtLogin "1"
  ${Else}
    StrCpy $InstallOptions.StartAtLogin "0"
  ${EndIf}

  ${If} $InstallOptions.DesktopShortcut == ${BST_CHECKED}
    StrCpy $InstallOptions.DesktopShortcut "1"
  ${Else}
    StrCpy $InstallOptions.DesktopShortcut "0"
  ${EndIf}
FunctionEnd
