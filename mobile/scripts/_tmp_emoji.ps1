$root = 'C:\Users\digienes\Documents\ila_v8_agy_cmd\mobile'
$pat = [regex]'[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]'
$files = @()
$files += Get-ChildItem -Path (Join-Path $root 'src\utils\notifications') -Filter *.ts -File
$files += Get-ChildItem -Path (Join-Path $root 'src\services') -Filter 'caregiver*.ts' -File
$files += Get-Item (Join-Path $root 'index.ts')
foreach ($f in $files) {
  $n = 0
  foreach ($line in Get-Content $f.FullName) {
    $n++
    if ($pat.IsMatch($line)) {
      $rel = $f.FullName.Replace($root + '\', '')
      "$rel`:$n`: $($line.Trim())"
    }
  }
}
