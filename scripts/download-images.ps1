# Скачивание тематических фото для лендинга (Unsplash)
# Запуск: .\scripts\download-images.ps1
# Или: pwsh -File scripts\download-images.ps1

$base = Join-Path $PSScriptRoot "..\public\images"
$urls = @{
    "about.jpg"     = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
    "how.jpg"       = "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80"
    "adapt.jpg"     = "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
    "forWho.jpg"    = "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80"
    "faq.jpg"       = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80"
    "contacts.jpg"  = "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80"
    "card-waiter.jpg"  = "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80"
    "card-courier.jpg" = "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400&q=80"
    "card-salon.jpg"   = "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80"
    "card-hotel.jpg"   = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80"
}

foreach ($file in $urls.Keys) {
    $path = Join-Path $base $file
    $url = $urls[$file]
    Write-Host "Downloading $file ..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing
        Write-Host "  OK"
    } catch {
        Write-Host "  FAIL: $_"
    }
}
Write-Host "Done. Update config/site.ts to use /images/*.jpg"
