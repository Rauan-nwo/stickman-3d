# Пробы голосов рассказчика Fish Audio на тексте холодного начала L001 -> voice_fish/samples/*.mp3
$k = (Get-Content C:\dev\projects\youtube-video\raw\_secrets\fish-api-key.txt -Raw).Trim()
$out = Join-Path $PSScriptRoot 'samples'; New-Item -ItemType Directory -Force $out | Out-Null
$text = "Picture this. In Singapore, the man who runs the most valuable company on Earth sits down to dinner across from a woman American intelligence believes is a Chinese spy. He's Jensen Huang, the man in the leather jacket who runs Nvidia. She's Alice Huang. Same last name, no relation. And across the street, someone is listening."
$voices = [ordered]@{
  '1_Ethan'            = '536d3a5e000945adb7038665781a4aca'
  '2_Adrian'           = 'bf322df2096a46f18c579d0baa36f41d'
  '3_CalmStoryteller'  = 'e686ae649ee44f219a108aacba206c1a'
  '4_Guyzo'            = '8ec9973300874562962bbcb300f82213'
  '5_Slax'             = 'c5f56a6cc2ec4fa8920cb4c5889a3fb7'
  '6_Documentary'      = 'c3958f083c2d407982263c77cfa831e3'
}
foreach ($n in $voices.Keys) {
  $f = Join-Path $out "$n.mp3"; if (Test-Path $f) { continue }
  $body = @{ text = $text; reference_id = $voices[$n]; format = 'mp3' } | ConvertTo-Json
  try {
    Invoke-WebRequest -Uri 'https://api.fish.audio/v1/tts' -Method Post -Headers @{ Authorization = "Bearer $k"; model = 's2.1-pro-free' } -ContentType 'application/json' -Body $body -OutFile $f
    $d = ffprobe -v error -show_entries format=duration -of csv=p=0 $f
    $w = ($text -split '\s+').Count
    "{0}: {1:n1} s, {2:n0} слов/мин" -f $n, [double]$d, ($w / [double]$d * 60)
  } catch { "$n ошибка: $($_.ErrorDetails.Message)" }
}
