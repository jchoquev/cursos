$lines = Get-Content 'd:\Mis archivos\Mis APPs\cursos\src\app\pages\intranet\intranet.html'
$depth = 0
for($i = 87; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $opens = ([regex]::Matches($line, '<div[\s>]')).Count
    $closes = ([regex]::Matches($line, '</div>')).Count
    $depth += $opens - $closes
    if($depth -le 0) {
        $preview = $line.Substring(0, [Math]::Min(100, $line.Length))
        Write-Host "Dashboard div closes at Line $($i+1): depth=$depth | $preview"
        break
    }
}

# Now check what's between that close and the payment modal
Write-Host ""
Write-Host "=== Lines around dashboard closure ==="
$closeLineIdx = $i
for($j = [Math]::Max(0, $closeLineIdx - 3); $j -le [Math]::Min($lines.Length - 1, $closeLineIdx + 5); $j++) {
    Write-Host "Line $($j+1): $($lines[$j])"
}
