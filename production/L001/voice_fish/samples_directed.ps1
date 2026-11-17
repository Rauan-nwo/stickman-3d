# Пробы с режиссурой: метки эмоций/ударений/пауз Fish S2 + скорость под ~160 слов/мин -> samples_directed/*.mp3
$k = (Get-Content C:\dev\projects\youtube-video\raw\_secrets\fish-api-key.txt -Raw).Trim()
$out = Join-Path $PSScriptRoot 'samples_directed'; New-Item -ItemType Directory -Force $out | Out-Null
$text = "[confident] Picture this. [break] In Singapore, the man who runs [emphasis] the most valuable company on Earth sits down to dinner [break] across from a woman American intelligence believes is [emphasis] a Chinese spy. [long-break] He's Jensen Huang, the man in the leather jacket who runs Nvidia. [break] She's Alice Huang. [break] Same last name, [sarcastic] no relation. [long-break] [soft tone] And across the street, [break] someone is listening."
# голос -> id, замеренный темп без режиссуры (слов/мин) — скорость = 160 / темп (с паузами режиссуры чуть выше)
$voices = [ordered]@{
  '1_Ethan'='536d3a5e000945adb7038665781a4aca|173'; '2_Adrian'='bf322df2096a46f18c579d0baa36f41d|145'
  '3_CalmStoryteller'='e686ae649ee44f219a108aacba206c1a|175'; '4_Guyzo'='8ec9973300874562962bbcb300f82213|173'
  '5_Slax'='c5f56a6cc2ec4fa8920cb4c5889a3fb7|155'; '6_Documentary'='c3958f083c2d407982263c77cfa831e3|166'
  '7_Markiplier'='a2346273eb314b6cb82ba83dbc9d9fee|149'; '8_VoiceDL'='1936333080804be19655c6749b2ae7b2|139'
  '9_Stoic'='2947ec32c7e1479c8ec5628a1fc035f1|145'
}
foreach ($n in $voices.Keys) {
  $id, $wpm = $voices[$n] -split '\|'; $speed = [math]::Round([math]::Min(1.25, [math]::Max(0.9, 168 / [double]$wpm)), 2)
  $f = Join-Path $out "$n.mp3"; if (Test-Path $f) { continue }
  $body = @{ text = $text; reference_id = $id; format = 'mp3'; temperature = 0.75; top_p = 0.75; prosody = @{ speed = $speed } } | ConvertTo-Json -Depth 4
  try {
    Invoke-WebRequest -Uri 'https://api.fish.audio/v1/tts' -Method Post -Headers @{ Authorization = "Bearer $k"; model = 's2.1-pro-free' } -ContentType 'application/json' -Body $body -OutFile $f
    $d = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 $f)
    "{0}: speed {1}, {2:n1} s, {3:n0} слов/мин" -f $n, $speed, $d, (55 / $d * 60)
  } catch { "$n ошибка: $($_.ErrorDetails.Message)" }
}
