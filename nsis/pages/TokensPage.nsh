; ---------------------------------------------------------------------------
; TokensPage.nsh — Bot Token inputs for selected channels
; Only shows inputs for channels that were checked in ChannelsPage
; ---------------------------------------------------------------------------

; Token variables
Var Tokens.TelegramToken
Var Tokens.DiscordToken
Var Tokens.SlackBotToken
Var Tokens.SlackAppToken

; Controls
Var Tokens.Dialog
Var Tokens.HeaderLabel
Var Tokens.SubLabel
Var Tokens.TelegramLabel
Var Tokens.TelegramEdit
Var Tokens.DiscordLabel
Var Tokens.DiscordEdit
Var Tokens.SlackBotLabel
Var Tokens.SlackBotEdit
Var Tokens.SlackAppLabel
Var Tokens.SlackAppEdit

!macro OPENCLAW_TOKENS_PAGE
  Page custom TokensPage_Create TokensPage_Leave
!macroend

Function TokensPage_Create
  ; Skip page if no bot channels selected
  ${If} $Channels.Telegram != "1"
  ${AndIf} $Channels.Discord != "1"
  ${AndIf} $Channels.Slack != "1"
    ; No tokens needed — skip this page
    Abort
  ${EndIf}

  nsDialogs::Create 1018
  Pop $Tokens.Dialog
  ${If} $Tokens.Dialog == error
    Abort
  ${EndIf}

  ; Header
  ${NSD_CreateLabel} 0 0 100% 12u "Bot Tokens & Credentials"
  Pop $Tokens.HeaderLabel

  ${NSD_CreateLabel} 0 16u 100% 10u "Enter tokens for the channels you selected:"
  Pop $Tokens.SubLabel

  ; Track vertical position
  StrCpy $R0 "32"   ; y position in dialog units

  ; --- Telegram ---
  ${If} $Channels.Telegram == "1"
    IntOp $R1 $R0 + 0
    ${NSD_CreateLabel} 0 $R1u 100% 10u "Telegram Bot Token:"
    Pop $Tokens.TelegramLabel
    IntOp $R1 $R0 + 12
    ${NSD_CreatePassword} 0 $R1u 100% 14u ""
    Pop $Tokens.TelegramEdit
    ${If} $Tokens.TelegramToken != ""
      ${NSD_SetText} $Tokens.TelegramEdit $Tokens.TelegramToken
    ${EndIf}
    IntOp $R0 $R0 + 30
  ${EndIf}

  ; --- Discord ---
  ${If} $Channels.Discord == "1"
    IntOp $R1 $R0 + 0
    ${NSD_CreateLabel} 0 $R1u 100% 10u "Discord Bot Token:"
    Pop $Tokens.DiscordLabel
    IntOp $R1 $R0 + 12
    ${NSD_CreatePassword} 0 $R1u 100% 14u ""
    Pop $Tokens.DiscordEdit
    ${If} $Tokens.DiscordToken != ""
      ${NSD_SetText} $Tokens.DiscordEdit $Tokens.DiscordToken
    ${EndIf}
    IntOp $R0 $R0 + 30
  ${EndIf}

  ; --- Slack ---
  ${If} $Channels.Slack == "1"
    IntOp $R1 $R0 + 0
    ${NSD_CreateLabel} 0 $R1u 100% 10u "Slack Bot Token (xoxb-...):"
    Pop $Tokens.SlackBotLabel
    IntOp $R1 $R0 + 12
    ${NSD_CreatePassword} 0 $R1u 100% 14u ""
    Pop $Tokens.SlackBotEdit
    ${If} $Tokens.SlackBotToken != ""
      ${NSD_SetText} $Tokens.SlackBotEdit $Tokens.SlackBotToken
    ${EndIf}
    IntOp $R0 $R0 + 30

    IntOp $R1 $R0 + 0
    ${NSD_CreateLabel} 0 $R1u 100% 10u "Slack App-Level Token (xapp-..., for Socket Mode):"
    Pop $Tokens.SlackAppLabel
    IntOp $R1 $R0 + 12
    ${NSD_CreatePassword} 0 $R1u 100% 14u ""
    Pop $Tokens.SlackAppEdit
    ${If} $Tokens.SlackAppToken != ""
      ${NSD_SetText} $Tokens.SlackAppEdit $Tokens.SlackAppToken
    ${EndIf}
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function TokensPage_Leave
  ; Read token values for each enabled channel
  ${If} $Channels.Telegram == "1"
    ${NSD_GetText} $Tokens.TelegramEdit $Tokens.TelegramToken
  ${EndIf}
  ${If} $Channels.Discord == "1"
    ${NSD_GetText} $Tokens.DiscordEdit $Tokens.DiscordToken
  ${EndIf}
  ${If} $Channels.Slack == "1"
    ${NSD_GetText} $Tokens.SlackBotEdit $Tokens.SlackBotToken
    ${NSD_GetText} $Tokens.SlackAppEdit $Tokens.SlackAppToken
  ${EndIf}
FunctionEnd
