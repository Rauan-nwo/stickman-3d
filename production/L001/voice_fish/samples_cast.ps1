# Пробы голосов героев L001 (Fish S2, режиссура метками) -> samples_cast/<герой>_<голос>.mp3
$k = (Get-Content C:\dev\projects\youtube-video\raw\_secrets\fish-api-key.txt -Raw).Trim()
$out = Join-Path $PSScriptRoot 'samples_cast'; New-Item -ItemType Directory -Force $out | Out-Null
$lines = @{
  HOST   = "[confident] Evening. [break] Mind the box, [sarcastic] it's expensive. [break] Inside, [emphasis] the most wanted chips on Earth. [long-break] And the man at that table held the key to every one of them."
  JENSEN = "[happy] To the next shipment! [long-break] [confident] People who don't know yet. [long-break] [calm] Completely normal, and not unusual."
  ALICE  = "[calm] To good partners. [long-break] [soft tone] No. You can borrow them. [break] By the hour. [break] Or the year."
  AGENT  = "[whispering] She's talking to an American. [long-break] [calm] The one in the jacket. [long-break] Not tonight."
}
$cast = @(
  @('HOST','1_Paddington','5e79e8f5d2b345f98baa8c83c947532d'), @('HOST','2_Jarvis','05b36da8574341d0803391491850db20'),
  @('HOST','3_AngeloBronte','94f9d1fa29b441c1b445e7ebdadfee51'),
  @('JENSEN','1_Alok','b7204d4e40ef4a548c7c8547b7f73492'), @('JENSEN','2_Slax','c5f56a6cc2ec4fa8920cb4c5889a3fb7'),
  @('JENSEN','3_Ethan','536d3a5e000945adb7038665781a4aca'),
  @('ALICE','1_JaneDoe','9c90cae418834058b5aa51adb21dac41'), @('ALICE','2_Yixuan','7940371a089e4353bde2fc687dadaab4'),
  @('ALICE','3_FemaleNarration','0af969cba6c24e74b5600d6df78e8975'),
  @('AGENT','1_SecretAgent','77daaa587ee54edaa5c92931b49f4fa0'), @('AGENT','2_SleeplessHistorian','beb44e5fac1e4b33a15dfcdcc2a9421d')
)
foreach ($c in $cast) {
  $f = Join-Path $out ("{0}_{1}.mp3" -f $c[0], $c[1]); if (Test-Path $f) { continue }
  $body = @{ text = $lines[$c[0]]; reference_id = $c[2]; format = 'mp3'; temperature = 0.75; top_p = 0.75 } | ConvertTo-Json
  try {
    Invoke-WebRequest -Uri 'https://api.fish.audio/v1/tts' -Method Post -Headers @{ Authorization = "Bearer $k"; model = 's2.1-pro-free' } -ContentType 'application/json' -Body $body -OutFile $f
    "{0}_{1}: {2:n1} s" -f $c[0], $c[1], [double](ffprobe -v error -show_entries format=duration -of csv=p=0 $f)
  } catch { "$($c[0])_$($c[1]) ошибка: $($_.ErrorDetails.Message)" }
}
