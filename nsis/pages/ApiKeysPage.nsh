; ---------------------------------------------------------------------------
; ApiKeysPage.nsh — AI Provider API Keys custom installer page
; Single dropdown to pick provider + single password input for the key.
; The key is verified against the provider's API before proceeding.
; ---------------------------------------------------------------------------

; Storage variables (one per provider — WriteDotEnv writes only non-empty ones)
Var ApiKeys.AnthropicKey
Var ApiKeys.OpenAIKey
Var ApiKeys.GeminiKey
Var ApiKeys.OpenRouterKey

; UI controls
Var ApiKeys.Dialog
Var ApiKeys.SectionLabel
Var ApiKeys.ProviderLabel
Var ApiKeys.ProviderDrop
Var ApiKeys.KeyLabel
Var ApiKeys.KeyEdit
Var ApiKeys.HintLabel
Var ApiKeys.VerifyNote

!macro OPENCLAW_API_KEYS_PAGE
  Page custom ApiKeysPage_Create ApiKeysPage_Leave
!macroend

; Called whenever the provider dropdown selection changes.
Function ApiKeysPage_OnProviderChange
  ${NSD_GetText} $ApiKeys.ProviderDrop $R0

  ${If} $R0 == "Anthropic"
    ${NSD_SetText} $ApiKeys.HintLabel "Get yours at https://console.anthropic.com"
  ${ElseIf} $R0 == "OpenAI"
    ${NSD_SetText} $ApiKeys.HintLabel "Get yours at https://platform.openai.com/api-keys"
  ${ElseIf} $R0 == "Google Gemini"
    ${NSD_SetText} $ApiKeys.HintLabel "Get yours at https://aistudio.google.com/app/apikey"
  ${ElseIf} $R0 == "OpenRouter"
    ${NSD_SetText} $ApiKeys.HintLabel "Get yours at https://openrouter.ai/keys"
  ${EndIf}
  SetCtlColors $ApiKeys.HintLabel "808080" "f0f0f0"
FunctionEnd

Function ApiKeysPage_Create
  nsDialogs::Create 1018
  Pop $ApiKeys.Dialog
  ${If} $ApiKeys.Dialog == error
    Abort
  ${EndIf}

  ; Section title
  ${NSD_CreateLabel} 0 0 100% 12u "AI Provider API Key"
  Pop $ApiKeys.SectionLabel

  ; Provider selector
  ${NSD_CreateLabel} 0 18u 100% 10u "Select your AI provider:"
  Pop $ApiKeys.ProviderLabel

  ${NSD_CreateDropList} 0 30u 100% 14u ""
  Pop $ApiKeys.ProviderDrop
  ${NSD_CB_AddString} $ApiKeys.ProviderDrop "Anthropic"
  ${NSD_CB_AddString} $ApiKeys.ProviderDrop "OpenAI"
  ${NSD_CB_AddString} $ApiKeys.ProviderDrop "Google Gemini"
  ${NSD_CB_AddString} $ApiKeys.ProviderDrop "OpenRouter"

  ; Pre-populate from existing values (back-button support)
  ${If} $ApiKeys.OpenAIKey != ""
    ${NSD_CB_SelectString} $ApiKeys.ProviderDrop "OpenAI"
    StrCpy $R1 $ApiKeys.OpenAIKey
  ${ElseIf} $ApiKeys.GeminiKey != ""
    ${NSD_CB_SelectString} $ApiKeys.ProviderDrop "Google Gemini"
    StrCpy $R1 $ApiKeys.GeminiKey
  ${ElseIf} $ApiKeys.OpenRouterKey != ""
    ${NSD_CB_SelectString} $ApiKeys.ProviderDrop "OpenRouter"
    StrCpy $R1 $ApiKeys.OpenRouterKey
  ${Else}
    ${NSD_CB_SelectString} $ApiKeys.ProviderDrop "Anthropic"
    StrCpy $R1 $ApiKeys.AnthropicKey
  ${EndIf}

  ; API key input
  ${NSD_CreateLabel} 0 54u 100% 10u "API Key:"
  Pop $ApiKeys.KeyLabel

  ${NSD_CreatePassword} 0 66u 100% 14u ""
  Pop $ApiKeys.KeyEdit
  ${If} $R1 != ""
    ${NSD_SetText} $ApiKeys.KeyEdit $R1
  ${EndIf}

  ; Hint label — URL for the selected provider (updated on dropdown change)
  ${NSD_CreateLabel} 0 83u 100% 10u ""
  Pop $ApiKeys.HintLabel
  SetCtlColors $ApiKeys.HintLabel "808080" "f0f0f0"

  ; Verification note
  ${NSD_CreateLabel} 0 97u 100% 10u "Your key will be verified before installation continues."
  Pop $ApiKeys.VerifyNote
  SetCtlColors $ApiKeys.VerifyNote "4a9eff" "f0f0f0"

  ; Wire up OnChange and fire once to set initial hint text
  ${NSD_OnChange} $ApiKeys.ProviderDrop ApiKeysPage_OnProviderChange
  Call ApiKeysPage_OnProviderChange

  nsDialogs::Show
FunctionEnd

Function ApiKeysPage_Leave
  ${NSD_GetText} $ApiKeys.ProviderDrop $R0  ; selected provider name
  ${NSD_GetText} $ApiKeys.KeyEdit      $R1  ; entered key

  ; Require a non-empty key
  ${If} $R1 == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please enter an API key for $R0.$\r$\nYou can add additional provider keys later from the Settings window."
    Abort
  ${EndIf}

  ; ── Write the key to a temp file to avoid any shell-escaping issues ──────
  FileOpen $9 "$PLUGINSDIR\oc_keytest_key.txt" w
  FileWrite $9 $R1
  FileClose $9

  ; ── Write the PowerShell validation script ────────────────────────────────
  ; Note: PowerShell $ signs are escaped as $$ so NSIS does not treat them as
  ; NSIS variables. NSIS expands $$ to a single literal $ in the output file.
  FileOpen $9 "$PLUGINSDIR\oc_keytest.ps1" w
  FileWrite $9 'param([string]$$Provider, [string]$$KeyFile)$\r$\n'
  FileWrite $9 '$$key = (Get-Content -LiteralPath $$KeyFile -Raw).Trim()$\r$\n'
  FileWrite $9 '$$headers = @{}; $$url = ""$\r$\n'
  FileWrite $9 'if ($$Provider -eq "Anthropic") {$\r$\n'
  FileWrite $9 '    $$url = "https://api.anthropic.com/v1/models"$\r$\n'
  FileWrite $9 '    $$headers["x-api-key"] = $$key$\r$\n'
  FileWrite $9 '    $$headers["anthropic-version"] = "2023-06-01"$\r$\n'
  FileWrite $9 '} elseif ($$Provider -eq "OpenAI") {$\r$\n'
  FileWrite $9 '    $$url = "https://api.openai.com/v1/models"$\r$\n'
  FileWrite $9 '    $$headers["Authorization"] = "Bearer $$key"$\r$\n'
  FileWrite $9 '} elseif ($$Provider -eq "Google Gemini") {$\r$\n'
  FileWrite $9 '    $$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$$key"$\r$\n'
  FileWrite $9 '} elseif ($$Provider -eq "OpenRouter") {$\r$\n'
  FileWrite $9 '    $$url = "https://openrouter.ai/api/v1/models"$\r$\n'
  FileWrite $9 '    $$headers["Authorization"] = "Bearer $$key"$\r$\n'
  FileWrite $9 '}$\r$\n'
  FileWrite $9 'try {$\r$\n'
  FileWrite $9 '    Invoke-WebRequest -Uri $$url -Headers $$headers -UseBasicParsing -TimeoutSec 10 | Out-Null$\r$\n'
  FileWrite $9 '    exit 0$\r$\n'
  FileWrite $9 '} catch [System.Net.WebException] {$\r$\n'
  FileWrite $9 '    $$code = 0$\r$\n'
  FileWrite $9 '    if ($$_.Exception.Response) { $$code = [int]$$_.Exception.Response.StatusCode }$\r$\n'
  FileWrite $9 '    if ($$code -ge 400 -and $$code -lt 500) { exit 1 }$\r$\n'
  FileWrite $9 '    exit 2$\r$\n'
  FileWrite $9 '} catch { exit 2 }$\r$\n'
  FileClose $9

  ; ── Update hint to signal that verification is running ───────────────────
  ${NSD_SetText} $ApiKeys.HintLabel "Verifying key with $R0, please wait..."
  SetCtlColors $ApiKeys.HintLabel "808080" "f0f0f0"

  ; ── Run the validation script (blocks until the HTTP request completes) ───
  nsExec::ExecToStack 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\oc_keytest.ps1" -Provider "$R0" -KeyFile "$PLUGINSDIR\oc_keytest_key.txt"'
  Pop $R5  ; exit code: "0"=valid  "1"=invalid key  "2"=network error  "error"=launch failed
  Pop $R6  ; console output (discarded)

  ; ── Clean up temp files ───────────────────────────────────────────────────
  Delete "$PLUGINSDIR\oc_keytest.ps1"
  Delete "$PLUGINSDIR\oc_keytest_key.txt"

  ; ── Handle result ─────────────────────────────────────────────────────────
  ${If} $R5 == "0"
    ; Key is valid — fall through to store it

  ${ElseIf} $R5 == "1"
    ; Provider rejected the key (4xx response)
    ${NSD_SetText} $ApiKeys.HintLabel "Key rejected. Please check your key and try again."
    SetCtlColors $ApiKeys.HintLabel "f85149" "f0f0f0"
    MessageBox MB_OK|MB_ICONEXCLAMATION "The $R0 API key was rejected (invalid key).$\r$\nPlease double-check your key and try again."
    Abort

  ${Else}
    ; Network error, timeout, or PowerShell unavailable — let user decide
    MessageBox MB_YESNO|MB_ICONQUESTION "Could not reach $R0 servers to verify your key.$\r$\nThis may be a temporary network issue.$\r$\n$\r$\nContinue without verifying?" IDYES +2
    Abort
  ${EndIf}

  ; ── Store key in the correct provider variable (clear all others) ─────────
  StrCpy $ApiKeys.AnthropicKey  ""
  StrCpy $ApiKeys.OpenAIKey     ""
  StrCpy $ApiKeys.GeminiKey     ""
  StrCpy $ApiKeys.OpenRouterKey ""

  ${If} $R0 == "Anthropic"
    StrCpy $ApiKeys.AnthropicKey $R1
  ${ElseIf} $R0 == "OpenAI"
    StrCpy $ApiKeys.OpenAIKey $R1
  ${ElseIf} $R0 == "Google Gemini"
    StrCpy $ApiKeys.GeminiKey $R1
  ${ElseIf} $R0 == "OpenRouter"
    StrCpy $ApiKeys.OpenRouterKey $R1
  ${EndIf}
FunctionEnd
