# Script de Déploiement Vercel pour OptiManager Pro 3
# Usage: .\deploy-vercel.ps1

Write-Host "🚀 Déploiement de OptiManager Pro 3 sur Vercel" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Vercel CLI est installé
Write-Host "📋 Vérification de Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI installé (version: $vercelVersion)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Vercel CLI n'est pas installé" -ForegroundColor Yellow
    Write-Host "Installation en cours..." -ForegroundColor Gray
    npm install -g vercel
    Write-Host "✅ Vercel CLI installé" -ForegroundColor Green
}

Write-Host ""

# Demander confirmation
Write-Host "⚠️  Vous êtes sur le point de déployer en PRODUCTION sur Vercel" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Continuer? (o/n)"
if ($confirmation -ne "o" -and $confirmation -ne "O") {
    Write-Host "❌ Déploiement annulé" -ForegroundColor Red
    exit 0
}

Write-Host ""

# Nettoyer les builds précédents
Write-Host "🧹 Nettoyage des builds précédents..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Dossier .next supprimé" -ForegroundColor Green
}

Write-Host ""

# Déploiement sur Vercel
Write-Host "🚀 Déploiement sur Vercel..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

try {
    vercel --prod
    Write-Host ""
    Write-Host "✅ Déploiement terminé avec succès!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors du déploiement!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🎉 Déploiement réussi!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Visitez le dashboard Vercel pour voir votre URL" -ForegroundColor White
Write-Host "2. Configurez les variables d'environnement dans Vercel" -ForegroundColor White
Write-Host "3. Testez votre application en production" -ForegroundColor White
Write-Host "4. Configurez un domaine personnalisé (optionnel)" -ForegroundColor White
Write-Host ""
Write-Host "Dashboard Vercel: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
