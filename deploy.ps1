# Script de Déploiement Firebase pour OptiManager Pro 3
# Usage: .\deploy.ps1

Write-Host "🚀 Déploiement de OptiManager Pro 3 sur Firebase Hosting" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Firebase CLI est installé
Write-Host "📋 Vérification de Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI installé (version: $firebaseVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI n'est pas installé!" -ForegroundColor Red
    Write-Host "Installez-le avec: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Vérifier la connexion Firebase
Write-Host "🔐 Vérification de la connexion Firebase..." -ForegroundColor Yellow
try {
    $currentProject = firebase use
    Write-Host "✅ Connecté au projet Firebase" -ForegroundColor Green
} catch {
    Write-Host "❌ Non connecté à Firebase!" -ForegroundColor Red
    Write-Host "Connectez-vous avec: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Demander confirmation
Write-Host "⚠️  Vous êtes sur le point de déployer en PRODUCTION" -ForegroundColor Yellow
Write-Host "Projet: optimanager-pro-3-34449" -ForegroundColor White
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

# Build de production
Write-Host "🔨 Build de production en cours..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

try {
    npm run build
    Write-Host ""
    Write-Host "✅ Build terminé avec succès!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors du build!" -ForegroundColor Red
    Write-Host "Vérifiez les erreurs ci-dessus et corrigez-les avant de redéployer." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Déploiement sur Firebase
Write-Host "🚀 Déploiement sur Firebase Hosting..." -ForegroundColor Yellow
Write-Host "Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

try {
    firebase deploy --only hosting
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
Write-Host "Votre application est maintenant en ligne à:" -ForegroundColor White
Write-Host "https://optimanager-pro-3-34449.web.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Yellow
Write-Host "1. Testez votre application en production" -ForegroundColor White
Write-Host "2. Vérifiez que la connexion fonctionne" -ForegroundColor White
Write-Host "3. Testez les fonctionnalités principales" -ForegroundColor White
Write-Host "4. Configurez un domaine personnalisé (optionnel)" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
