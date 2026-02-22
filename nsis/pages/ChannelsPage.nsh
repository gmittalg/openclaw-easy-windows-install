; ---------------------------------------------------------------------------
; ChannelsPage.nsh — Messaging Channel Selection custom installer page
; ---------------------------------------------------------------------------

; Channel enable flags (0 or 1 stored as strings)
Var Channels.Telegram
Var Channels.Discord
Var Channels.Slack
Var Channels.WhatsApp
Var Channels.WebChat

; Controls
Var Channels.Dialog
Var Channels.TelegramCheck
Var Channels.DiscordCheck
Var Channels.SlackCheck
Var Channels.WhatsAppCheck
Var Channels.WebChatCheck
Var Channels.HeaderLabel
Var Channels.SubLabel

!macro OPENCLAW_CHANNELS_PAGE
  Page custom ChannelsPage_Create ChannelsPage_Leave
!macroend

Function ChannelsPage_Create
  ; Default: WebChat on, others off
  ${If} $Channels.WebChat == ""
    StrCpy $Channels.WebChat "1"
  ${EndIf}
  ${If} $Channels.Telegram == ""
    StrCpy $Channels.Telegram "0"
  ${EndIf}
  ${If} $Channels.Discord == ""
    StrCpy $Channels.Discord "0"
  ${EndIf}
  ${If} $Channels.Slack == ""
    StrCpy $Channels.Slack "0"
  ${EndIf}
  ${If} $Channels.WhatsApp == ""
    StrCpy $Channels.WhatsApp "0"
  ${EndIf}

  nsDialogs::Create 1018
  Pop $Channels.Dialog
  ${If} $Channels.Dialog == error
    Abort
  ${EndIf}

  ; Header
  ${NSD_CreateLabel} 0 0 100% 12u "Messaging Channels"
  Pop $Channels.HeaderLabel

  ${NSD_CreateLabel} 0 16u 100% 10u "Select the channels you want OpenClaw to connect to:"
  Pop $Channels.SubLabel

  ; Checkboxes
  ${NSD_CreateCheckbox} 0 32u 100% 14u "Web Chat (built-in browser interface)"
  Pop $Channels.WebChatCheck
  ${If} $Channels.WebChat == "1"
    ${NSD_Check} $Channels.WebChatCheck
  ${EndIf}

  ${NSD_CreateCheckbox} 0 50u 100% 14u "Telegram Bot"
  Pop $Channels.TelegramCheck
  ${If} $Channels.Telegram == "1"
    ${NSD_Check} $Channels.TelegramCheck
  ${EndIf}

  ${NSD_CreateCheckbox} 0 68u 100% 14u "Discord Bot"
  Pop $Channels.DiscordCheck
  ${If} $Channels.Discord == "1"
    ${NSD_Check} $Channels.DiscordCheck
  ${EndIf}

  ${NSD_CreateCheckbox} 0 86u 100% 14u "Slack App"
  Pop $Channels.SlackCheck
  ${If} $Channels.Slack == "1"
    ${NSD_Check} $Channels.SlackCheck
  ${EndIf}

  ${NSD_CreateCheckbox} 0 104u 100% 14u "WhatsApp (requires WhatsApp account scan)"
  Pop $Channels.WhatsAppCheck
  ${If} $Channels.WhatsApp == "1"
    ${NSD_Check} $Channels.WhatsAppCheck
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function ChannelsPage_Leave
  ; Read checkbox states
  ${NSD_GetState} $Channels.TelegramCheck $Channels.Telegram
  ${NSD_GetState} $Channels.DiscordCheck $Channels.Discord
  ${NSD_GetState} $Channels.SlackCheck $Channels.Slack
  ${NSD_GetState} $Channels.WhatsAppCheck $Channels.WhatsApp
  ${NSD_GetState} $Channels.WebChatCheck $Channels.WebChat

  ; Convert ${BST_CHECKED} to "1", else "0"
  ${If} $Channels.Telegram == ${BST_CHECKED}
    StrCpy $Channels.Telegram "1"
  ${Else}
    StrCpy $Channels.Telegram "0"
  ${EndIf}
  ${If} $Channels.Discord == ${BST_CHECKED}
    StrCpy $Channels.Discord "1"
  ${Else}
    StrCpy $Channels.Discord "0"
  ${EndIf}
  ${If} $Channels.Slack == ${BST_CHECKED}
    StrCpy $Channels.Slack "1"
  ${Else}
    StrCpy $Channels.Slack "0"
  ${EndIf}
  ${If} $Channels.WhatsApp == ${BST_CHECKED}
    StrCpy $Channels.WhatsApp "1"
  ${Else}
    StrCpy $Channels.WhatsApp "0"
  ${EndIf}
  ${If} $Channels.WebChat == ${BST_CHECKED}
    StrCpy $Channels.WebChat "1"
  ${Else}
    StrCpy $Channels.WebChat "0"
  ${EndIf}
FunctionEnd
